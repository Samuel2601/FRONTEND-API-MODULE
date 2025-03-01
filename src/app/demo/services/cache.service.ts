import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Observable, from, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class CacheService {
    private CACHE_KEY = 'fichas_sectoriales_cache';
    private CACHE_TIMESTAMP_KEY = 'fichas_sectoriales_timestamp';
    private CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

    constructor() {}

    /**
     * Guarda datos en la caché con timestamp
     */
    async saveToCache(data: any): Promise<void> {
        try {
            const timestamp = new Date().getTime();
            await Preferences.set({
                key: this.CACHE_TIMESTAMP_KEY,
                value: timestamp.toString(),
            });
            await Preferences.set({
                key: this.CACHE_KEY,
                value: JSON.stringify(data),
            });
            console.log('Datos guardados en caché:', data.length);
        } catch (error) {
            console.error('Error al guardar en caché:', error);
        }
    }

    /**
     * Obtiene datos de la caché si son válidos
     */
    async getFromCache(): Promise<any> {
        try {
            // Verificar si la caché está vigente
            const { value: timestampValue } = await Preferences.get({
                key: this.CACHE_TIMESTAMP_KEY,
            });
            if (!timestampValue) {
                return null;
            }

            const timestamp = parseInt(timestampValue, 10);
            const now = new Date().getTime();

            // Si la caché ha expirado
            if (now - timestamp > this.CACHE_DURATION) {
                console.log('Caché expirada');
                return null;
            }

            // Obtener datos de la caché
            const { value } = await Preferences.get({ key: this.CACHE_KEY });
            if (!value) {
                return null;
            }

            const cachedData = JSON.parse(value);
            console.log('Datos obtenidos de caché:', cachedData.length);
            return cachedData;
        } catch (error) {
            console.error('Error al obtener de caché:', error);
            return null;
        }
    }

    /**
     * Limpia la caché
     */
    async clearCache(): Promise<void> {
        try {
            await Preferences.remove({ key: this.CACHE_KEY });
            await Preferences.remove({ key: this.CACHE_TIMESTAMP_KEY });
            console.log('Caché limpiada con éxito');
        } catch (error) {
            console.error('Error al limpiar caché:', error);
        }
    }

    /**
     * Verifica si la caché está vigente
     */
    async isCacheValid(): Promise<boolean> {
        try {
            const { value: timestampValue } = await Preferences.get({
                key: this.CACHE_TIMESTAMP_KEY,
            });
            if (!timestampValue) {
                return false;
            }

            const timestamp = parseInt(timestampValue, 10);
            const now = new Date().getTime();

            return now - timestamp <= this.CACHE_DURATION;
        } catch (error) {
            console.error('Error al verificar validez de caché:', error);
            return false;
        }
    }

    /**
     * Para datos muy grandes, fragmentarlos en chunks
     * Capacitor Preferences tiene un límite aproximado de 2MB por clave
     */
    async saveChunkedData(data: any[]): Promise<void> {
        try {
            const jsonData = JSON.stringify(data);
            const chunkSize = 500000; // Aproximadamente 500KB por chunk
            const chunks = [];

            // Dividir los datos en chunks
            for (let i = 0; i < jsonData.length; i += chunkSize) {
                chunks.push(jsonData.substring(i, i + chunkSize));
            }

            // Guardar número de chunks
            await Preferences.set({
                key: `${this.CACHE_KEY}_chunks`,
                value: chunks.length.toString(),
            });

            // Guardar cada chunk
            for (let i = 0; i < chunks.length; i++) {
                await Preferences.set({
                    key: `${this.CACHE_KEY}_chunk_${i}`,
                    value: chunks[i],
                });
            }

            // Guardar timestamp
            const timestamp = new Date().getTime();
            await Preferences.set({
                key: this.CACHE_TIMESTAMP_KEY,
                value: timestamp.toString(),
            });

            console.log(`Datos guardados en ${chunks.length} fragmentos`);
        } catch (error) {
            console.error('Error al guardar datos fragmentados:', error);
        }
    }

    /**
     * Recuperar datos fragmentados
     */
    async getChunkedData(): Promise<any> {
        try {
            // Verificar timestamp primero
            const { value: timestampValue } = await Preferences.get({
                key: this.CACHE_TIMESTAMP_KEY,
            });
            if (!timestampValue) {
                return null;
            }

            const timestamp = parseInt(timestampValue, 10);
            const now = new Date().getTime();

            if (now - timestamp > this.CACHE_DURATION) {
                console.log('Caché expirada');
                return null;
            }

            // Obtener número de chunks
            const { value: chunksCountStr } = await Preferences.get({
                key: `${this.CACHE_KEY}_chunks`,
            });
            if (!chunksCountStr) {
                return null;
            }

            const chunksCount = parseInt(chunksCountStr, 10);
            let jsonData = '';

            // Recuperar y concatenar todos los chunks
            for (let i = 0; i < chunksCount; i++) {
                const { value: chunk } = await Preferences.get({
                    key: `${this.CACHE_KEY}_chunk_${i}`,
                });
                if (chunk) {
                    jsonData += chunk;
                } else {
                    console.error(`No se encontró el fragmento ${i}`);
                    return null;
                }
            }

            const data = JSON.parse(jsonData);
            console.log(`Datos recuperados de ${chunksCount} fragmentos`);
            return data;
        } catch (error) {
            console.error('Error al recuperar datos fragmentados:', error);
            return null;
        }
    }

    /**
     * Limpia los datos fragmentados
     */
    async clearChunkedData(): Promise<void> {
        try {
            const { value: chunksCountStr } = await Preferences.get({
                key: `${this.CACHE_KEY}_chunks`,
            });
            if (chunksCountStr) {
                const chunksCount = parseInt(chunksCountStr, 10);

                // Eliminar cada chunk
                for (let i = 0; i < chunksCount; i++) {
                    await Preferences.remove({
                        key: `${this.CACHE_KEY}_chunk_${i}`,
                    });
                }

                // Eliminar metadatos
                await Preferences.remove({ key: `${this.CACHE_KEY}_chunks` });
                await Preferences.remove({ key: this.CACHE_TIMESTAMP_KEY });
            }

            console.log('Caché fragmentada limpiada con éxito');
        } catch (error) {
            console.error('Error al limpiar caché fragmentada:', error);
        }
    }
}
