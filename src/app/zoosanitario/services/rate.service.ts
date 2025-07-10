// src/app/zoosanitario/services/rate.service.ts

import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, of, catchError, tap, shareReplay, map } from 'rxjs';
import { BaseService } from './base.service';
import {
    Rate,
    RateFilters,
    RateSearchParams,
    PaginationOptions,
    PaginatedResponse,
    ApiResponse,
} from '../interfaces/rate.interface';

@Injectable({
    providedIn: 'root',
})
export class RateService extends BaseService<Rate> {
    constructor() {
        super('rates'); // endpoint para las rutas de rate
    }

    /**
     * FUNCIÓN PRINCIPAL: Buscar rate por filtros específicos
     * Ejemplo: findRateByFilters('TASA', '6846df24a4691ab809e78af2', 'Natural')
     */
    findRateByFilters(
        type: 'TASA' | 'TARIFA' | 'SERVICIOS',
        animalTypeId: string,
        personType: 'Natural' | 'Jurídica'
    ): Observable<ApiResponse<Rate>> {
        const cacheKey = `${this.endpoint}_search_${type}_${animalTypeId}_${personType}`;
        const cachedData = this.cacheService.get<ApiResponse<Rate>>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        let params = new HttpParams()
            .set('type', type)
            .set('animalTypeId', animalTypeId)
            .set('personType', personType);

        return this.http
            .get<ApiResponse<Rate>>(`${this.url}${this.endpoint}/search`, {
                headers: this.getHeaders(),
                params: params,
            })
            .pipe(
                tap((response) =>
                    this.cacheService.set(cacheKey, response, this.cacheExpiry)
                ),
                shareReplay(1),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: `Error al buscar la tarifa: ${
                            error.error?.message || 'Error desconocido'
                        }`,
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Obtener todas las tarifas con filtros opcionales
     * Sobrescribe el método del BaseService para manejar la respuesta con formato ApiResponse
     */
    override getAll(
        filters?: RateFilters,
        cache: boolean = true
    ): Observable<Rate[]> {
        const cacheKey = `${this.endpoint}_all_filtered_${JSON.stringify(
            filters
        )}`;
        const cachedData = this.cacheService.get<Rate[]>(cacheKey);

        if (cachedData && cache) {
            return of(cachedData);
        }

        let httpParams = new HttpParams();
        if (filters) {
            Object.keys(filters).forEach((key) => {
                const value = filters[key as keyof RateFilters];
                if (value !== null && value !== undefined) {
                    if (key === 'sort') {
                        // Manejar ordenamiento como JSON string
                        httpParams = httpParams.set(key, JSON.stringify(value));
                    } else {
                        httpParams = httpParams.set(key, value.toString());
                    }
                }
            });
        }

        return this.http
            .get<ApiResponse<Rate[]>>(`${this.url}${this.endpoint}`, {
                headers: this.getHeaders(),
                params: httpParams,
            })
            .pipe(
                tap((response) =>
                    this.cacheService.set(
                        cacheKey,
                        response.data,
                        this.cacheExpiry
                    )
                ),
                shareReplay(1),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener las tarifas',
                    });
                    throw error.error;
                }),
                // Extraer solo los datos del wrapper ApiResponse
                map((response: ApiResponse<Rate[]>) => response.data || [])
            );
    }

    /**
     * Obtener tarifas con paginación (MÉTODO PRINCIPAL MEJORADO)
     */
    getRatesWithPagination(
        filters?: RateFilters,
        options?: PaginationOptions,
        skipCache: boolean = false
    ): Observable<PaginatedResponse<Rate>> {
        const cacheKey = `${this.endpoint}_paginated_${JSON.stringify(
            filters
        )}_${JSON.stringify(options)}`;

        // Si no se quiere saltar el cache, verificar si existe
        if (!skipCache) {
            const cachedData =
                this.cacheService.get<PaginatedResponse<Rate>>(cacheKey);
            if (cachedData) {
                return of(cachedData);
            }
        } else {
            // Si se quiere saltar el cache, eliminarlo primero
            this.cacheService.remove(cacheKey);
        }

        let httpParams = new HttpParams();

        // Agregar filtros
        if (filters) {
            Object.keys(filters).forEach((key) => {
                const value = filters[key as keyof RateFilters];
                if (value !== null && value !== undefined) {
                    if (key === 'sort') {
                        // Manejar ordenamiento como JSON string
                        httpParams = httpParams.set(key, JSON.stringify(value));
                    } else {
                        httpParams = httpParams.set(key, value.toString());
                    }
                }
            });
        }

        // Agregar opciones de paginación
        if (options) {
            if (options.page)
                httpParams = httpParams.set('page', options.page.toString());
            if (options.limit)
                httpParams = httpParams.set('limit', options.limit.toString());
            if (options.sort)
                httpParams = httpParams.set(
                    'sort',
                    JSON.stringify(options.sort)
                );
        }

        console.log('Parámetros enviados al servidor:', httpParams.toString());

        return this.http
            .get<PaginatedResponse<Rate>>(
                `${this.url}${this.endpoint}/paginated`,
                {
                    headers: this.getHeaders(),
                    params: httpParams,
                }
            )
            .pipe(
                tap((response) => {
                    console.log('Respuesta del servidor (servicio):', response);
                    // Solo cachear si no se saltó el cache intencionalmente
                    if (!skipCache) {
                        this.cacheService.set(
                            cacheKey,
                            response,
                            this.cacheExpiry
                        );
                    }
                }),
                shareReplay(1),
                catchError((error) => {
                    console.error('Error en getRatesWithPagination:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener las tarifas paginadas',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Obtener tarifas por tipo de animal
     */
    getRatesByAnimalType(
        animalTypeId: string
    ): Observable<ApiResponse<Rate[]>> {
        const cacheKey = `${this.endpoint}_by_animal_${animalTypeId}`;
        const cachedData = this.cacheService.get<ApiResponse<Rate[]>>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        return this.http
            .get<ApiResponse<Rate[]>>(
                `${this.url}${this.endpoint}/animal-type/${animalTypeId}`,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                tap((response) =>
                    this.cacheService.set(cacheKey, response, this.cacheExpiry)
                ),
                shareReplay(1),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener tarifas por tipo de animal',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Obtener tarifas por tipo
     */
    getRatesByType(
        type: 'TASA' | 'TARIFA' | 'SERVICIOS'
    ): Observable<ApiResponse<Rate[]>> {
        const cacheKey = `${this.endpoint}_by_type_${type}`;
        const cachedData = this.cacheService.get<ApiResponse<Rate[]>>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        return this.http
            .get<ApiResponse<Rate[]>>(
                `${this.url}${this.endpoint}/type/${type}`,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                tap((response) =>
                    this.cacheService.set(cacheKey, response, this.cacheExpiry)
                ),
                shareReplay(1),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: `Error al obtener tarifas de tipo ${type}`,
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Buscar rate por código
     */
    findByCode(code: string): Observable<ApiResponse<Rate>> {
        const cacheKey = `${this.endpoint}_by_code_${code}`;
        const cachedData = this.cacheService.get<ApiResponse<Rate>>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        let params = new HttpParams().set('code', code);

        return this.http
            .get<ApiResponse<Rate>>(`${this.url}${this.endpoint}`, {
                headers: this.getHeaders(),
                params: params,
            })
            .pipe(
                tap((response) =>
                    this.cacheService.set(cacheKey, response, this.cacheExpiry)
                ),
                shareReplay(1),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: `Error al buscar tarifa con código ${code}`,
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Método auxiliar para limpiar el caché específico de rates
     */
    clearRateCache(): void {
        this.cacheService.clearByPrefix(this.endpoint);
        console.log('Cache de rates limpiado');
    }

    /**
     * Validar si existe un código de tarifa
     */
    validateCodeExists(
        code: string,
        excludeId?: string
    ): Observable<{ exists: boolean }> {
        let params = new HttpParams().set('code', code);
        if (excludeId) {
            params = params.set('excludeId', excludeId);
        }

        return this.http
            .get<{ exists: boolean }>(
                `${this.url}${this.endpoint}/validate-code`,
                {
                    headers: this.getHeaders(),
                    params: params,
                }
            )
            .pipe(
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al validar el código',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Método para exportar datos (placeholder)
     */
    exportToExcel(filters?: RateFilters): Observable<Blob> {
        let httpParams = new HttpParams();
        if (filters) {
            Object.keys(filters).forEach((key) => {
                const value = filters[key as keyof RateFilters];
                if (value !== null && value !== undefined) {
                    if (key === 'sort') {
                        httpParams = httpParams.set(key, JSON.stringify(value));
                    } else {
                        httpParams = httpParams.set(key, value.toString());
                    }
                }
            });
        }

        return this.http
            .get(`${this.url}${this.endpoint}/export/excel`, {
                headers: this.getHeaders(),
                params: httpParams,
                responseType: 'blob',
            })
            .pipe(
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al exportar los datos',
                    });
                    throw error.error;
                })
            );
    }
}
