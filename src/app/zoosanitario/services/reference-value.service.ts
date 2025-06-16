import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { AuthService } from 'src/app/demo/services/auth.service';
import { BaseService } from './base.service';
import { ApiResponse, ReferenceValue } from '../interfaces/slaughter.interface';
import { CacheService } from 'src/app/demo/services/cache.service';
import { catchError, tap } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ReferenceValueService extends BaseService<ReferenceValue> {
    constructor(
        protected override http: HttpClient,
        protected override cacheService: CacheService,
        protected override auth: AuthService
    ) {
        super('reference-values');
    }

    // ========== MÉTODOS PÚBLICOS (solo lectura) ==========

    /**
     * Obtener valores de referencia activos
     */
    getActiveValues(): Observable<ApiResponse<ReferenceValue[]>> {
        const cacheKey = `${this.endpoint}_active`;
        const cachedData =
            this.cacheService.get<ApiResponse<ReferenceValue[]>>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        return this.http
            .get<ApiResponse<ReferenceValue[]>>(
                `${this.url}${this.endpoint}/active`,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener valores activos',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Obtener valor de referencia por código
     */
    getValueByCode(code: string): Observable<ApiResponse<ReferenceValue>> {
        const cacheKey = `${this.endpoint}_code_${code}`;
        const cachedData =
            this.cacheService.get<ApiResponse<ReferenceValue>>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        return this.http
            .get<ApiResponse<ReferenceValue>>(
                `${this.url}${this.endpoint}/code/${code}`,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener valor por código',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Obtener valores por tipo
     */
    getValuesByType(
        valueType: string
    ): Observable<ApiResponse<ReferenceValue[]>> {
        return this.http
            .get<ApiResponse<ReferenceValue[]>>(
                `${this.url}${this.endpoint}/type/${valueType}`,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener valores por tipo',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Buscar valores por código parcial
     */
    searchByCode(
        searchTerm: string
    ): Observable<ApiResponse<ReferenceValue[]>> {
        let httpParams = new HttpParams().set('code', searchTerm);

        return this.http
            .get<ApiResponse<ReferenceValue[]>>(
                `${this.url}${this.endpoint}/search`,
                {
                    headers: this.getHeaders(),
                    params: httpParams,
                }
            )
            .pipe(
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al buscar valores',
                    });
                    throw error.error;
                })
            );
    }

    // ========== MÉTODOS PROTEGIDOS ==========

    /**
     * Obtener dashboard de valores de referencia
     */
    getDashboard(): Observable<ApiResponse<any>> {
        return this.http
            .get<ApiResponse<any>>(`${this.url}${this.endpoint}/dashboard`, {
                headers: this.getHeaders(),
            })
            .pipe(
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener dashboard',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Obtener estadísticas de valores de referencia
     */
    getStatistics(): Observable<ApiResponse<any>> {
        return this.http
            .get<ApiResponse<any>>(`${this.url}${this.endpoint}/statistics`, {
                headers: this.getHeaders(),
            })
            .pipe(
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener estadísticas',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Obtener historial de un código de referencia
     */
    getValueHistory(code: string): Observable<ApiResponse<ReferenceValue[]>> {
        return this.http
            .get<ApiResponse<ReferenceValue[]>>(
                `${this.url}${this.endpoint}/history/${code}`,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener historial',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Obtener valores por fuente oficial
     */
    getValuesBySource(
        source: string
    ): Observable<ApiResponse<ReferenceValue[]>> {
        return this.http
            .get<ApiResponse<ReferenceValue[]>>(
                `${this.url}${this.endpoint}/source/${source}`,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener valores por fuente',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Obtener valores por frecuencia de actualización
     */
    getValuesByFrequency(
        frequency: string
    ): Observable<ApiResponse<ReferenceValue[]>> {
        return this.http
            .get<ApiResponse<ReferenceValue[]>>(
                `${this.url}${this.endpoint}/frequency/${frequency}`,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener valores por frecuencia',
                    });
                    throw error.error;
                })
            );
    }

    // ========== MÉTODOS DE ADMINISTRACIÓN ==========

    /**
     * Configurar valores por defecto del sistema
     */
    setupDefaultValues(defaultConfig: any): Observable<ApiResponse<any>> {
        return this.http
            .post<ApiResponse<any>>(
                `${this.url}${this.endpoint}/setup-defaults`,
                defaultConfig,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Valores por defecto configurados correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al configurar valores por defecto',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Activar/desactivar valor de referencia
     */
    toggleActiveStatus(id: string): Observable<ApiResponse<ReferenceValue>> {
        return this.http
            .patch<ApiResponse<ReferenceValue>>(
                `${this.url}${this.endpoint}/${id}/toggle-status`,
                {},
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Estado actualizado correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cambiar estado',
                    });
                    throw error.error;
                })
            );
    }

    // ========== MÉTODOS LEGACY/ESPECÍFICOS ==========

    /**
     * Actualizar RBU (método legacy)
     */
    updateRBU(value: number): Observable<ApiResponse<ReferenceValue>> {
        return this.http
            .put<ApiResponse<ReferenceValue>>(
                `${this.url}rates/reference-value/RBU`,
                { value },
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'RBU actualizado correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al actualizar RBU',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Actualizar SBU (método legacy)
     */
    updateSBU(value: number): Observable<ApiResponse<ReferenceValue>> {
        return this.http
            .put<ApiResponse<ReferenceValue>>(
                `${this.url}rates/reference-value/SBU`,
                { value },
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'SBU actualizado correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al actualizar SBU',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Actualizar configuración de valor (método legacy)
     */
    updateValueConfig(
        code: string,
        config: any
    ): Observable<ApiResponse<ReferenceValue>> {
        return this.http
            .put<ApiResponse<ReferenceValue>>(
                `${this.url}rates/reference-value/${code}`,
                config,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Configuración actualizada correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al actualizar configuración',
                    });
                    throw error.error;
                })
            );
    }
}
