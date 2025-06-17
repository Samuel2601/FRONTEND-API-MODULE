// src/app/demo/services/invoice.service.ts

import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, of, catchError, tap, shareReplay, map } from 'rxjs';
import { BaseService } from './base.service';
import {
    Invoice,
    InvoiceFilters,
    InvoiceSummary,
    CreateInvoiceDto,
    UpdateInvoiceDto,
    ApiResponse,
    PaginatedResponse,
    PaginationOptions,
    InvoiceStatistics,
    InvoiceStatus,
} from '../interfaces/invoice.interface';

@Injectable({
    providedIn: 'root',
})
export class InvoiceService extends BaseService<Invoice> {
    constructor() {
        super('invoices');
    }

    /**
     * Obtener facturas con filtros y paginación
     */
    getInvoices(
        filters?: InvoiceFilters,
        options?: PaginationOptions
    ): Observable<PaginatedResponse<Invoice>> {
        const cacheKey = `${this.endpoint}_paginated_${JSON.stringify(
            filters
        )}_${JSON.stringify(options)}`;
        const cachedData =
            this.cacheService.get<PaginatedResponse<Invoice>>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        let httpParams = new HttpParams();

        // Agregar filtros
        if (filters) {
            Object.keys(filters).forEach((key) => {
                const value = filters[key as keyof InvoiceFilters];
                if (value !== null && value !== undefined) {
                    httpParams = httpParams.set(key, value.toString());
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

        return this.http
            .get<PaginatedResponse<Invoice>>(`${this.url}${this.endpoint}`, {
                headers: this.getHeaders(),
                params: httpParams,
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
                        detail: 'Error al obtener las facturas',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Crear nueva factura
     */
    override create(data: Invoice): Observable<Invoice> {
        return this.http
            .post<ApiResponse<Invoice>>(`${this.url}${this.endpoint}`, data, {
                headers: this.getHeaders(),
            })
            .pipe(
                map((response) => response.data),
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Factura creada correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail:
                            error.error?.message || 'Error al crear la factura',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Emitir factura (cambiar estado a Issued)
     */
    issueInvoice(id: string): Observable<Invoice> {
        return this.http
            .post<ApiResponse<Invoice>>(
                `${this.url}${this.endpoint}/${id}/issue`,
                {},
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                map((response) => response.data),
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Factura emitida correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail:
                            error.error?.message ||
                            'Error al emitir la factura',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Marcar factura como pagada
     */
    markAsPaid(
        id: string,
        paymentData?: { payDate?: Date | string; notes?: string }
    ): Observable<Invoice> {
        return this.http
            .post<ApiResponse<Invoice>>(
                `${this.url}${this.endpoint}/${id}/mark-paid`,
                paymentData || {},
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                map((response) => response.data),
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Factura marcada como pagada',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail:
                            error.error?.message ||
                            'Error al marcar la factura como pagada',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Cancelar factura
     */
    cancelInvoice(id: string, reason?: string): Observable<Invoice> {
        return this.http
            .post<ApiResponse<Invoice>>(
                `${this.url}${this.endpoint}/${id}/cancel`,
                { reason },
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                map((response) => response.data),
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Factura cancelada correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail:
                            error.error?.message ||
                            'Error al cancelar la factura',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Obtener resumen de facturas por introductor
     */
    getIntroducerSummary(introducerId: string): Observable<InvoiceSummary> {
        const cacheKey = `${this.endpoint}_summary_${introducerId}`;
        const cachedData = this.cacheService.get<InvoiceSummary>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        return this.http
            .get<ApiResponse<InvoiceSummary>>(
                `${this.url}${this.endpoint}/introducer/${introducerId}/summary`,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                map((response) => response.data),
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                shareReplay(1),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener el resumen del introductor',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Obtener estadísticas de facturas
     */
    getStatistics(filters?: {
        dateFrom?: Date | string;
        dateTo?: Date | string;
    }): Observable<InvoiceStatistics> {
        const cacheKey = `${this.endpoint}_statistics_${JSON.stringify(
            filters
        )}`;
        const cachedData = this.cacheService.get<InvoiceStatistics>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        let httpParams = new HttpParams();
        if (filters?.dateFrom)
            httpParams = httpParams.set(
                'dateFrom',
                filters.dateFrom.toString()
            );
        if (filters?.dateTo)
            httpParams = httpParams.set('dateTo', filters.dateTo.toString());

        return this.http
            .get<ApiResponse<InvoiceStatistics>>(
                `${this.url}${this.endpoint}/statistics`,
                {
                    headers: this.getHeaders(),
                    params: httpParams,
                }
            )
            .pipe(
                map((response) => response.data),
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                shareReplay(1),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener las estadísticas',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Buscar factura por número
     */
    findByInvoiceNumber(invoiceNumber: string): Observable<Invoice> {
        const cacheKey = `${this.endpoint}_by_number_${invoiceNumber}`;
        const cachedData = this.cacheService.get<Invoice>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        const params = new HttpParams().set('invoiceNumber', invoiceNumber);

        return this.http
            .get<ApiResponse<Invoice>>(`${this.url}${this.endpoint}`, {
                headers: this.getHeaders(),
                params: params,
            })
            .pipe(
                map((response) => response.data),
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                shareReplay(1),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al buscar la factura',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Descargar factura en PDF
     */
    downloadInvoicePDF(id: string): Observable<Blob> {
        return this.http
            .get(`${this.url}${this.endpoint}/${id}/pdf`, {
                headers: this.getHeaders(),
                responseType: 'blob',
            })
            .pipe(
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al descargar la factura',
                    });
                    throw error.error;
                })
            );
    }

    postInvoiceSlaughterProcesses(processId: string): Observable<any> {
        return this.http
            .post<any>(
                `${this.url}${this.endpoint}/slaughter-process/${processId}`,
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
                        detail: 'Procesos de slaughter enviados correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al enviar procesos de slaughter',
                    });
                    throw error.error;
                })
            );
    }

    /**
     * Calcular total de items
     */
    calculateItemsTotal(
        items: { quantity: number; unitPrice: number }[]
    ): number {
        return items.reduce((total, item) => {
            return total + item.quantity * item.unitPrice;
        }, 0);
    }

    /**
     * Validar si una factura puede ser emitida
     */
    canBeIssued(invoice: Invoice): boolean {
        return invoice.status === InvoiceStatus.GENERATED;
    }

    /**
     * Validar si una factura puede ser pagada
     */
    canBePaid(invoice: Invoice): boolean {
        return invoice.status === InvoiceStatus.ISSUED;
    }

    /**
     * Validar si una factura puede ser cancelada
     */
    canBeCancelled(invoice: Invoice): boolean {
        return (
            invoice.status === InvoiceStatus.GENERATED ||
            invoice.status === InvoiceStatus.ISSUED
        );
    }
}
