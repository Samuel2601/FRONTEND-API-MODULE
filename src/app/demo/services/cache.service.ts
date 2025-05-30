import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';

interface CacheItem<T> {
    data: T;
    expiry: number; // Timestamp for when the cache item expires
}

@Injectable({
    providedIn: 'root',
})
export class CacheService {
    // Observable for tracking cache changes
    private cacheUpdates = new BehaviorSubject<string | null>(null);
    private defaultExpiry = 5 * 60 * 1000; // 5 minutes default

    constructor() {
        // Set up periodic cache cleanup
        setInterval(() => this.cleanExpiredCache(), 60000);
    }
    /**
     * Check if a key exists in the cache
     */
    has(key: string): boolean {
        const item = this.getWithMetadata<any>(key);
        if (!item) return false;

        // Check if expired
        if (item.expiry && item.expiry < Date.now()) {
            this.remove(key);
            return false;
        }

        return true;
    }

    /**
     * Get cached data with metadata
     */
    private getWithMetadata<T>(key: string): CacheItem<T> | null {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;

            return JSON.parse(item) as CacheItem<T>;
        } catch (error) {
            console.error(`Error retrieving cache for key ${key}:`, error);
            this.remove(key);
            return null;
        }
    }

    /**
     * Get cached data
     */
    get<T>(key: string): T | null {
        const item = this.getWithMetadata<T>(key);
        if (!item) return null;

        // Check if expired
        if (item.expiry && item.expiry < Date.now()) {
            this.remove(key);
            return null;
        }

        return item.data;
    }

    /**
     * Set data in cache with an optional TTL
     */
    set<T>(key: string, data: T, ttl?: number): void {
        try {
            const item: CacheItem<T> = {
                data,
                expiry: ttl ? Date.now() + ttl : 0, // 0 means no expiry
            };

            localStorage.setItem(key, JSON.stringify(item));

            // Dispatch storage event for cross-tab communication
            this.dispatchStorageEvent(key);
        } catch (error) {
            console.error(`Error setting cache for key ${key}:`, error);

            // If storage quota exceeded, clear some space
            if (
                error instanceof DOMException &&
                error.name === 'QuotaExceededError'
            ) {
                this.clearOldestCache();
                this.set(key, data, ttl); // Try again
            }
        }
    }

    /**
     * Remove item from cache
     */
    remove(key: string): void {
        localStorage.removeItem(key);

        // Dispatch storage event for cross-tab communication
        this.dispatchStorageEvent(key);
    }

    /**
     * Clear all cache
     */
    clear(): void {
        localStorage.clear();
    }

    /**
     * Check if cached data is still valid
     */
    isValid(key: string): boolean {
        return this.has(key);
    }

    /**
     * Save chunked data for large datasets
     */
    saveChunkedData<T>(
        data: T[],
        baseKey: string,
        chunkSize: number = 50,
        ttl?: number
    ): void {
        // Clear existing chunks first
        this.clearChunks(baseKey);

        // Store chunk count for easy retrieval
        this.set(`${baseKey}_count`, data.length, ttl);

        // Split data into chunks
        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            const chunkKey = `${baseKey}_${Math.floor(i / chunkSize)}`;
            this.set(chunkKey, chunk, ttl);
        }

        // Dispatch storage event for cross-tab communication
        this.dispatchStorageEvent(baseKey);
    }

    /**
     * Get all chunked data
     */
    getChunkedData<T>(baseKey: string): T[] {
        const count = this.get<number>(`${baseKey}_count`);
        if (!count) return [];

        let result: T[] = [];
        let chunkIndex = 0;
        let chunkKey = `${baseKey}_${chunkIndex}`;

        // Retrieve all chunks
        while (this.has(chunkKey)) {
            const chunk = this.get<T[]>(chunkKey);
            if (chunk) {
                result = result.concat(chunk);
            }
            chunkIndex++;
            chunkKey = `${baseKey}_${chunkIndex}`;
        }

        return result;
    }

    /**
     * Clear all chunks for a given base key
     */
    clearChunks(baseKey: string): void {
        // Get chunk count if available
        const count = this.has(`${baseKey}_count`)
            ? this.get<number>(`${baseKey}_count`)
            : 0;

        // Remove the count key
        this.remove(`${baseKey}_count`);

        // Clear known chunks based on count
        if (count > 0) {
            for (let i = 0; i < count; i++) {
                this.remove(`${baseKey}_${i}`);
            }
        } else {
            // Fallback to checking all possible chunks
            let chunkIndex = 0;
            let chunkKey = `${baseKey}_${chunkIndex}`;

            while (localStorage.getItem(chunkKey) !== null) {
                this.remove(chunkKey);
                chunkIndex++;
                chunkKey = `${baseKey}_${chunkIndex}`;
            }
        }

        // Dispatch storage event for cross-tab communication
        this.dispatchStorageEvent(baseKey);
    }

    /**
     * Check if chunked data is valid
     */
    isChunkedDataValid(baseKey: string): boolean {
        return this.has(`${baseKey}_count`);
    }

    /**
     * Clear oldest cache items when storage is full
     */
    private clearOldestCache(): void {
        let oldestKey: string | null = null;
        let oldestTimestamp = Infinity;

        // Find the oldest cache item
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;

            try {
                const item = JSON.parse(localStorage.getItem(key) || '{}');
                if (item && item.expiry && item.expiry < oldestTimestamp) {
                    oldestTimestamp = item.expiry;
                    oldestKey = key;
                }
            } catch (e) {
                // Skip non-JSON items
                continue;
            }
        }

        // Remove oldest item if found
        if (oldestKey) {
            this.remove(oldestKey);
        } else {
            // If no expiring items found, remove random items
            for (let i = 0; i < Math.min(5, localStorage.length); i++) {
                const key = localStorage.key(i);
                if (key) this.remove(key);
            }
        }
    }

    /**
     * Get or fetch data using the provided fetcher function
     */
    getOrFetch<T>(
        key: string,
        fetcher: () => Observable<T>,
        expiryMs: number = this.defaultExpiry
    ): Observable<T> {
        // If we have valid cached data, return it
        if (this.has(key)) {
            return new Observable<T>((observer) => {
                observer.next(this.get<T>(key));
                observer.complete();
            });
        }

        // Otherwise fetch, cache and return
        return fetcher().pipe(
            tap((data) => {
                this.set(key, data, expiryMs);
            })
        );
    }

    /**
     * Get notifications when cache changes
     */
    getCacheUpdates(): Observable<string | null> {
        return this.cacheUpdates.asObservable();
    }

    /**
     * Clean expired items from cache
     */
    private cleanExpiredCache(): void {
        const now = Date.now();
        let hasChanges = false;

        // Iterate through localStorage to find expired items
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;

            try {
                const item = JSON.parse(localStorage.getItem(key) || '{}');
                if (item && item.expiry && item.expiry < now) {
                    localStorage.removeItem(key);
                    hasChanges = true;

                    // Notify about the removal
                    this.cacheUpdates.next(key);
                }
            } catch (e) {
                // Skip non-JSON items
                continue;
            }
        }
    }

    /**
     * Manually dispatch storage event for cross-tab communication
     * This is needed because localStorage events don't fire in the same tab
     */
    private dispatchStorageEvent(key: string): void {
        // Only run in browser environment
        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new StorageEvent('storage', {
                    key: key,
                    newValue: localStorage.getItem(key),
                    storageArea: localStorage,
                })
            );
        }

        // Also notify through RxJS for in-app communication
        this.cacheUpdates.next(key);
    }

    /*
     * clearByPattern
     */

    clearByPattern(pattern: string): void {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;

            if (key.startsWith(pattern)) {
                this.remove(key);
            }
        }
    }
}
