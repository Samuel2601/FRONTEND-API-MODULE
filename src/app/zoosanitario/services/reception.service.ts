import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { BaseService } from './base.service';
import { HttpParams } from '@angular/common/http';
import { tap, catchError } from 'rxjs/operators';

// Interfaces
export interface Transporte {
    temperatura: number;
    humedadAmbiental: number;
    condicionesHigienicas: 'Óptimas' | 'Aceptables' | 'Deficientes';
    condicionAnimales: string;
    observaciones?: string;
    fotografias?: string[];
    inspeccionadoPor: string;
    fechaInspeccion: Date;
}

export interface Reception {
    _id?: string;
    animalHealthCertificate: string;
    transporte: Transporte;
    fechaHoraRecepcion: Date;
    prioridad?: number;
    fechaProgramada?: Date;
    observaciones?: string;
    estado: 'Pendiente' | 'Procesando' | 'Completado' | 'Rechazado';
    responsable?: string;
    createdBy: string;
    updatedBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ReceptionFilters {
    estado?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
    certificado?: string;
    responsable?: string;
}

export interface ReceptionStats {
    total: number;
    pendientes: number;
    procesando: number;
    completados: number;
    rechazados: number;
}

@Injectable({
    providedIn: 'root',
})
export class ReceptionService extends BaseService<Reception> {
    constructor() {
        super('/reception');
    }

    // Crear recepción con archivos
    createWithFiles(
        data: Partial<Reception>,
        files?: File[]
    ): Observable<Reception> {
        const formData = new FormData();

        // Agregar datos JSON
        formData.append('data', JSON.stringify(data));

        // Agregar archivos si existen
        if (files && files.length > 0) {
            files.forEach((file, index) => {
                formData.append('fotografias', file);
            });
        }

        return this.http
            .post<Reception>(`${this.url}${this.endpoint}`, formData, {
                headers: this.getFormDataHeaders(),
            })
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Recepción creada correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail:
                            error.error?.message ||
                            'Error al crear la recepción',
                    });
                    throw error;
                })
            );
    }

    // Obtener recepciones con filtros avanzados
    getReceptions(
        filters?: ReceptionFilters,
        page: number = 1,
        limit: number = 10
    ): Observable<any> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('limit', limit.toString());

        if (filters) {
            const filterObj = { ...filters };
            params = params.set('filters', JSON.stringify(filterObj));
        }

        const cacheKey = `${this.endpoint}_filtered_${JSON.stringify({
            filters,
            page,
            limit,
        })}`;
        const cachedData = this.cacheService.get<any>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        return this.http
            .get<any>(`${this.url}${this.endpoint}`, {
                headers: this.getHeaders(),
                params,
            })
            .pipe(
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener las recepciones',
                    });
                    throw error;
                })
            );
    }

    // Actualizar estado de recepción
    updateStatus(id: string, status: string): Observable<Reception> {
        return this.http
            .patch<Reception>(
                `${this.url}${this.endpoint}/${id}/estado`,
                { status },
                { headers: this.getHeaders() }
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
                        detail:
                            error.error?.message ||
                            'Error al actualizar el estado',
                    });
                    throw error;
                })
            );
    }

    // Eliminación permanente
    forceDelete(id: string): Observable<void> {
        return this.http
            .delete<void>(`${this.url}${this.endpoint}/${id}/force`, {
                headers: this.getHeaders(),
            })
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Recepción eliminada permanentemente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al eliminar la recepción',
                    });
                    throw error;
                })
            );
    }

    // Obtener estadísticas
    getStatistics(): Observable<ReceptionStats> {
        const cacheKey = `${this.endpoint}_stats`;
        const cachedData = this.cacheService.get<ReceptionStats>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        return this.http
            .get<ReceptionStats>(`${this.url}${this.endpoint}/estadisticas`, {
                headers: this.getHeaders(),
            })
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

    // Obtener recepciones por estado
    getByStatus(status: string): Observable<Reception[]> {
        return this.getReceptions({ estado: status });
    }

    // Obtener recepciones pendientes
    getPending(): Observable<Reception[]> {
        return this.getByStatus('Pendiente');
    }

    // Buscar por certificado
    getByCertificate(certificateId: string): Observable<Reception[]> {
        return this.getReceptions({ certificado: certificateId });
    }
}
