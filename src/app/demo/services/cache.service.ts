import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class CacheService {
    private cache: { [key: string]: any } = {};
    private cacheExpiry: { [key: string]: number } = {};
    private defaultExpiry = 5 * 60 * 1000; // 5 minutes default

    // Observable for tracking cache changes
    private cacheUpdates = new BehaviorSubject<string | null>(null);

    constructor() {
        // Initialize with any cached data from localStorage
        this.initializeFromStorage();

        // Set up periodic cache cleanup
        setInterval(() => this.cleanExpiredCache(), 60000);
    }

    /**
     * Initialize cache from localStorage
     */
    private initializeFromStorage(): void {
        try {
            const savedCache = localStorage.getItem('appCache');
            if (savedCache) {
                const parsed = JSON.parse(savedCache);
                this.cache = parsed.cache || {};
                this.cacheExpiry = parsed.expiry || {};

                // Clean expired items on load
                this.cleanExpiredCache();
            }
        } catch (error) {
            console.error('Error loading cache from storage:', error);
            // Reset cache if corrupted
            this.cache = {};
            this.cacheExpiry = {};
        }
    }

    /**
     * Save current cache to localStorage
     */
    private saveToStorage(): void {
        try {
            const saveObj = {
                cache: this.cache,
                expiry: this.cacheExpiry,
            };
            localStorage.setItem('appCache', JSON.stringify(saveObj));
        } catch (error) {
            console.error('Error saving cache to storage:', error);
        }
    }

    /**
     * Get data from cache or retrieve it using the provided fetcher function
     */
    getOrFetch<T>(
        key: string,
        fetcher: () => Observable<T>,
        expiryMs: number = this.defaultExpiry
    ): Observable<T> {
        // If we have valid cached data, return it
        if (this.has(key)) {
            return of(this.get<T>(key));
        }

        // Otherwise fetch, cache and return
        return fetcher().pipe(
            tap((data) => {
                this.set(key, data, expiryMs);
            })
        );
    }

    /**
     * Check if cache contains valid (non-expired) data for the key
     */
    has(key: string): boolean {
        const hasKey = key in this.cache;
        const notExpired = this.cacheExpiry[key] > Date.now();
        return hasKey && notExpired;
    }

    /**
     * Get data from cache
     */
    get<T>(key: string): T {
        if (this.has(key)) {
            return this.cache[key] as T;
        }
        return null as any;
    }

    /**
     * Set data in cache with expiration
     */
    set<T>(key: string, data: T, expiryMs: number = this.defaultExpiry): void {
        this.cache[key] = data;
        this.cacheExpiry[key] = Date.now() + expiryMs;

        // Notify subscribers that cache has been updated
        this.cacheUpdates.next(key);

        // Save to localStorage
        this.saveToStorage();
    }

    /**
     * Remove specific item from cache
     */
    remove(key: string): void {
        if (key in this.cache) {
            delete this.cache[key];
            delete this.cacheExpiry[key];

            // Notify subscribers that cache has been updated
            this.cacheUpdates.next(key);

            // Save to localStorage
            this.saveToStorage();
        }
    }

    /**
     * Clear entire cache
     */
    clear(): void {
        this.cache = {};
        this.cacheExpiry = {};

        // Notify subscribers that cache has been cleared
        this.cacheUpdates.next(null);

        // Save to localStorage
        localStorage.removeItem('appCache');
    }

    /**
     * Clean expired items from cache
     */
    private cleanExpiredCache(): void {
        const now = Date.now();
        let hasChanges = false;

        Object.keys(this.cacheExpiry).forEach((key) => {
            if (this.cacheExpiry[key] < now) {
                delete this.cache[key];
                delete this.cacheExpiry[key];
                hasChanges = true;
            }
        });

        // Only save if changes were made
        if (hasChanges) {
            this.saveToStorage();
        }
    }

    /**
     * Get notifications when cache changes
     */
    getCacheUpdates(): Observable<string | null> {
        return this.cacheUpdates.asObservable();
    }

    /**
     * Save chunked data for large datasets
     */
    saveChunkedData(
        data: any[],
        prefix: string = 'data',
        chunkSize: number = 100
    ): void {
        // Clear existing chunks for this prefix
        this.clearChunks(prefix);

        // Store how many chunks we have
        const chunkCount = Math.ceil(data.length / chunkSize);
        this.set(`${prefix}_count`, chunkCount);

        // Store each chunk
        for (let i = 0; i < chunkCount; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, data.length);
            const chunk = data.slice(start, end);
            this.set(`${prefix}_${i}`, chunk);
        }
    }

    /**
     * Get all chunked data
     */
    getChunkedData<T>(prefix: string = 'data'): T[] {
        if (!this.has(`${prefix}_count`)) {
            return [];
        }

        const chunkCount = this.get<number>(`${prefix}_count`);
        let result: T[] = [];

        for (let i = 0; i < chunkCount; i++) {
            const key = `${prefix}_${i}`;
            if (this.has(key)) {
                result = result.concat(this.get<T[]>(key));
            }
        }

        return result;
    }

    /**
     * Clear all chunks for a prefix
     */
    clearChunks(prefix: string): void {
        const count = this.has(`${prefix}_count`)
            ? this.get<number>(`${prefix}_count`)
            : 0;

        // Clear the count
        this.remove(`${prefix}_count`);

        // Clear each chunk
        for (let i = 0; i < count; i++) {
            this.remove(`${prefix}_${i}`);
        }
    }
}
