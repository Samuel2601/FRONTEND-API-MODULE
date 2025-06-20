import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap } from 'rxjs';
import { BaseService } from './base.service';
import { MessageService } from 'primeng/api';
import { CacheService } from 'src/app/demo/services/cache.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';

export interface ExternalInspection {
    _id?: string;
    recepcion: string;
    numero: string;
    especie?: any;
    sexo?: 'Macho' | 'Hembra' | 'Pendiente';
    edad?: number;
    peso?: number;

    // Inspección de Recepción
    inspeccionRecepcion?: {
        temperatura?: number;
        frecuenciaCardiaca?: number;
        frecuenciaRespiratoria?: number;
        horaChequeo?: Date;
        estadoGeneral?: string;
        lesionesVisibles?: string;
        caracteristicas?: {
            tamano?: 'Grande' | 'Mediano' | 'Pequeño';
            parasito?: boolean;
            movilidad?: 'Solo' | 'Con Ayuda';
            destino?: string;
        };
        resultado?:
            | 'Pendiente'
            | 'Apto'
            | 'Devolución'
            | 'Cuarentena'
            | 'Comisión';
        motivoDictamen?: string;
        fotografias?: string[];
        veterinarioResponsable?: string;
    };

    // Examen Ante Mortem
    examenAnteMortem?: {
        temperatura?: number;
        frecuenciaCardiaca?: number;
        frecuenciaRespiratoria?: number;
        horaChequeo?: Date;
        estadoGeneralOptimo?: boolean;
        comportamientoNormal?: boolean;
        lesiones?: boolean;
        parasito?: boolean;
        secreciones?: {
            ocular?: boolean;
            nasal?: boolean;
        };
        signos?: {
            nervioso?: boolean;
            respiratorio?: boolean;
            digestivo?: boolean;
            vesicular?: boolean;
        };
        caracteristicasAnimal?: {
            color?: string;
            tamanoCacho?: string;
        };
        resultado?:
            | 'Pendiente'
            | 'Apto'
            | 'Devolución'
            | 'Cuarentena'
            | 'Comisión';
        motivoDictamen?: string;
        fotografias?: string[];
        veterinarioResponsable?: string;
    };

    createdBy: string;
    updatedBy?: string;
    deletedBy?: string;
    deletedAt?: Date;
}

export interface InspectionSummary {
    total: number;
    pendientes: number;
    aptas: number;
    devolucion: number;
    cuarentena: number;
    comision: number;
    porcentajeCompletado: number;
}

export interface InspectionStatistics {
    recepcionStats: any;
    anteMortemStats: any;
    filtered?: any;
}

@Injectable({
    providedIn: 'root',
})
export class ExternalInspectionService extends BaseService<ExternalInspection> {
    constructor(
        http: HttpClient,
        messageService: MessageService,
        cacheService: CacheService,
        auth: AuthService
    ) {
        super('external-inspections');
    }

    // Extended CRUD operations
    getInspections(
        queryParams: any = {},
        cache: boolean = true
    ): Observable<ExternalInspection[]> {
        const cacheKey = `${this.endpoint}_filtered_${JSON.stringify(
            queryParams
        )}`;
        const cachedData =
            this.cacheService.get<ExternalInspection[]>(cacheKey);
        if (cache) {
            if (cachedData) {
                return new Observable((observer) => {
                    observer.next(cachedData);
                    observer.complete();
                });
            }
        }

        // Construir los parámetros correctamente
        let params: any = {};

        // Parámetros de paginación y ordenamiento
        if (queryParams.page) params.page = queryParams.page;
        if (queryParams.limit) params.limit = queryParams.limit;
        if (queryParams.sort) params.sort = queryParams.sort;
        if (queryParams.populate) params.populate = queryParams.populate;

        // Filtros como JSON string
        if (
            queryParams.filters &&
            Object.keys(queryParams.filters).length > 0
        ) {
            params.filters = JSON.stringify(queryParams.filters);
        }

        console.log('Parámetros enviados al servicio:', params);

        return this.http
            .get<ExternalInspection[]>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}`,
                {
                    headers: this.getHeaders(),
                    params,
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
                        detail: 'Error al obtener las inspecciones',
                    });
                    throw error;
                })
            );
    }

    getInspectionByNumber(numero: string): Observable<ExternalInspection> {
        const cacheKey = `${this.endpoint}_number_${numero}`;
        const cachedData = this.cacheService.get<ExternalInspection>(cacheKey);

        if (cachedData) {
            return new Observable((observer) => {
                observer.next(cachedData);
                observer.complete();
            });
        }

        return this.http
            .get<ExternalInspection>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/numero/${numero}`,
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
                        detail: 'Error al obtener la inspección por número',
                    });
                    throw error;
                })
            );
    }

    getInspectionsByReception(
        receptionId: string
    ): Observable<ExternalInspection[]> {
        const cacheKey = `${this.endpoint}_reception_${receptionId}`;
        const cachedData =
            this.cacheService.get<ExternalInspection[]>(cacheKey);

        if (cachedData) {
            return new Observable((observer) => {
                observer.next(cachedData);
                observer.complete();
            });
        }

        return this.http
            .get<ExternalInspection[]>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/recepcion/${receptionId}`,
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
                        detail: 'Error al obtener las inspecciones por recepción',
                    });
                    throw error;
                })
            );
    }

    // Specialized methods
    createForcedInspection(
        data: Partial<ExternalInspection>,
        files: File[] = [],
        justification: string,
        phase: 'recepcion' | 'anteMortem' = 'recepcion'
    ): Observable<ExternalInspection> {
        const formData = new FormData();
        formData.append('data', JSON.stringify({ ...data, phase }));
        formData.append('justification', justification);

        files.forEach((file) => {
            formData.append('fotografias', file);
        });

        return this.http
            .post<ExternalInspection>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/forzada`,
                formData,
                { headers: this.getFormDataHeaders() }
            )
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Inspección forzada creada correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al crear inspección forzada',
                    });
                    throw error;
                })
            );
    }

    updateInspectionWithFiles(
        id: string,
        data: Partial<ExternalInspection>,
        files: File[] = [],
        phase: 'recepcion' | 'anteMortem' = 'recepcion'
    ): Observable<ExternalInspection> {
        const formData = new FormData();
        formData.append('data', JSON.stringify({ ...data, phase }));

        files.forEach((file) => {
            formData.append('fotografias', file);
        });

        return this.http
            .put<ExternalInspection>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/${id}`,
                formData,
                { headers: this.getFormDataHeaders() }
            )
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Inspección actualizada correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al actualizar inspección',
                    });
                    throw error;
                })
            );
    }

    // Nuevos métodos específicos para cada fase

    getReceptionInspections(
        receptionId: string
    ): Observable<ExternalInspection[]> {
        return this.http.get<ExternalInspection[]>(
            `${GLOBAL.url_zoosanitario}${this.endpoint}/recepcion/${receptionId}`,
            { headers: this.getHeaders() }
        );
    }

    getAnteMortemInspections(
        processId: string
    ): Observable<ExternalInspection[]> {
        return this.http.get<ExternalInspection[]>(
            `${GLOBAL.url_zoosanitario}${this.endpoint}/proceso/${processId}/ante-mortem`,
            { headers: this.getHeaders() }
        );
    }

    getReceptionSummary(receptionId: string): Observable<InspectionSummary> {
        return this.http.get<InspectionSummary>(
            `${GLOBAL.url_zoosanitario}${this.endpoint}/recepcion/${receptionId}/resumen`,
            { headers: this.getHeaders() }
        );
    }

    getAnteMortemSummary(processId: string): Observable<InspectionSummary> {
        return this.http.get<InspectionSummary>(
            `${GLOBAL.url_zoosanitario}${this.endpoint}/proceso/${processId}/ante-mortem/resumen`,
            { headers: this.getHeaders() }
        );
    }

    deleteInspectionWithJustification(
        id: string,
        justification: string
    ): Observable<void> {
        return this.http
            .delete<void>(`${GLOBAL.url_zoosanitario}${this.endpoint}/${id}`, {
                headers: this.getHeaders(),
                body: { justification },
            })
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Inspección eliminada correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al eliminar inspección',
                    });
                    throw error;
                })
            );
    }

    updateInspectionsBatch(
        inspectionIds: string[],
        updateData: any
    ): Observable<ExternalInspection[]> {
        return this.http
            .put<ExternalInspection[]>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/actualizar/lote`,
                { inspectionIds, updateData },
                { headers: this.getHeaders() }
            )
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Inspecciones actualizadas en lote correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al actualizar inspecciones en lote',
                    });
                    throw error;
                })
            );
    }

    getStatistics(
        filters: any = {},
        cache: boolean = true
    ): Observable<InspectionStatistics> {
        const cacheKey = `${this.endpoint}_stats_${JSON.stringify(filters)}`;
        const cachedData =
            this.cacheService.get<InspectionStatistics>(cacheKey);

        if (cachedData && cache) {
            return new Observable((observer) => {
                observer.next(cachedData);
                observer.complete();
            });
        }

        // Construir parámetros correctamente para estadísticas
        let params: any = {};

        // Filtros como JSON string si existen
        if (filters && Object.keys(filters).length > 0) {
            params.filters = JSON.stringify(filters);
        }

        console.log('Parámetros de estadísticas enviados:', params);

        return this.http
            .get<InspectionStatistics>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/estadisticas`,
                {
                    headers: this.getHeaders(),
                    params,
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
                        detail: 'Error al obtener estadísticas',
                    });
                    throw error;
                })
            );
    }

    /*getReceptionSummary(receptionId: string): Observable<InspectionSummary> {
        const cacheKey = `${this.endpoint}_summary_${receptionId}`;
        const cachedData = this.cacheService.get<InspectionSummary>(cacheKey);

        if (cachedData) {
            return new Observable((observer) => {
                observer.next(cachedData);
                observer.complete();
            });
        }

        return this.http
            .get<InspectionSummary>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/recepcion/${receptionId}/resumen`,
                { headers: this.getHeaders() }
            )
            .pipe(
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener resumen de recepción',
                    });
                    throw error;
                })
            );
    }*/
}
