import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap, of, map } from 'rxjs';
import { BaseService } from './base.service';
import { MessageService } from 'primeng/api';
import { CacheService } from 'src/app/demo/services/cache.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';

// ========================================
// INTERFACES DE RESPUESTA DEL BACKEND
// ========================================

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    timestamp: string;
}

export interface PaginatedResponse<T> {
    docs: T[];
    totalDocs: number;
    limit: number;
    totalPages: number;
    page: number;
    pagingCounter: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    prevPage: number | null;
    nextPage: number | null;
}

// ========================================
// INTERFACES DE DATOS
// ========================================

export interface SlaughterProcess {
    _id?: string;
    numeroOrden: string;
    introductor: string | Introducer;
    recepcion?: string | Reception;
    inspeccionesExternas?: string[] | ExternalInspection[];
    factura?: string[] | Invoice[];
    faenamientos?: string[] | Slaughtering[];
    inspeccionesInternas?: string[] | InternalInspection[];
    despachos?: string[] | Dispatch[];
    estado:
        | 'Iniciado'
        | 'PreFaenamiento'
        | 'Pagado'
        | 'EnProceso'
        | 'Finalizado'
        | 'Anulado';
    createdBy: User;
    updatedBy?: User;
    deletedBy?: string;
    deletedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    id?: string;
}

export interface User {
    _id: string;
    name: string;
    last_name: string;
}

export interface Introducer {
    _id: string;
    name: string;
    idNumber?: string;
    ruc?: string;
    personType: 'Natural' | 'Jurídica';
    email?: string;
    phone?: string;
    address?: string;
}

export interface Reception {
    _id: string;
    fechaHoraRecepcion: Date;
    estado: 'Pendiente' | 'Procesando' | 'Completado' | 'Rechazado';
    prioridad: number;
    animalHealthCertificate?: {
        _id: string;
        numeroCZPM: string;
        totalProductos: number;
        origen?: string;
        destino?: string;
        autorizadoA?: string;
    };
}

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

export interface Invoice {
    _id: string;
    invoiceNumber: string;
    status: 'Generated' | 'Issued' | 'Paid' | 'Cancelled';
    totalAmount: number;
    issueDate: Date;
    dueDate?: Date;
}

export interface Slaughtering {
    _id: string;
    fechaFaenamiento: Date;
    numeroCanal: string;
    estado: string;
}

export interface InternalInspection {
    _id: string;
    numeroInspeccion: string;
    resultado: string;
    fechaInspeccion: Date;
}

export interface Dispatch {
    _id: string;
    numeroDespacho: string;
    fechaDespacho: Date;
    destino: string;
    estado: string;
}

export interface SlaughterProcessSummary {
    proceso: {
        id: string;
        numeroOrden: string;
        estado: string;
        fechaCreacion: Date;
    };
    introductor: {
        id: string;
        nombre: string;
        tipo: string;
    };
    recepcion: {
        id: string;
        fecha: Date;
        certificado: string;
    };
    inspecciones: {
        total: number;
        pendientes: number;
        aptas: number;
        devolucion: number;
        cuarentena: number;
        comision: number;
    };
    facturacion: {
        tieneFactura: boolean;
        numeroFactura?: string;
        estadoFactura?: string;
        montoTotal?: number;
    };
    faenamientos: {
        total: number;
    };
    despachos: {
        total: number;
    };
}

export interface SlaughterProcessStatistics {
    total: number;
    withInvoice: number;
    paidInvoices: number;
    stateBreakdown: {
        iniciado: number;
        preFaenamiento: number;
        pagado: number;
        enProceso: number;
        finalizado: number;
        anulado: number;
    };
    introducerTypeBreakdown: {
        natural: number;
        juridica: number;
    };
    averages: {
        inspections: number;
        slaughterings: number;
        dispatches: number;
    };
    totalInvoiceAmount: number;
    completionRate: number;
    paymentRate: number;
}

export interface StateTransition {
    currentState: string;
    validTransitions: string[];
    processId: string;
}

export interface PerformanceMetrics {
    period: {
        dateFrom?: string;
        dateTo?: string;
        groupBy: string;
    };
    metrics: SlaughterProcessStatistics;
}

// ========================================
// SERVICIO
// ========================================

@Injectable({
    providedIn: 'root',
})
export class SlaughterProcessService extends BaseService<SlaughterProcess> {
    constructor(
        http: HttpClient,
        messageService: MessageService,
        cacheService: CacheService,
        auth: AuthService
    ) {
        super('slaughter-processes');
    }

    // ========================================
    // MÉTODOS AUXILIARES PARA MANEJO DE RESPUESTAS
    // ========================================

    private handleApiResponse<T>(response: ApiResponse<T>): T {
        if (!response.success) {
            throw new Error(
                response.message || 'Error en la respuesta del servidor'
            );
        }
        return response.data;
    }

    private handleApiError(error: any): Observable<never> {
        console.error('Error en API:', error);
        let errorMessage = 'Error en el servidor';

        if (error.error && error.error.message) {
            errorMessage = error.error.message;
        } else if (error.message) {
            errorMessage = error.message;
        }

        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
        });

        throw error;
    }

    /**
     * Método mejorado para limpiar caché
     * Incluye limpieza de cachés relacionados
     */
    clearCache(): void {
        // Limpiar caché específico de este servicio
        this.cacheService.clearByPrefix(this.endpoint);

        // Limpiar cachés relacionados
        this.cacheService.clearByPrefix('statistics');
        this.cacheService.clearByPrefix('summary');
        this.cacheService.clearByPrefix('metrics');
        this.cacheService.clearByPrefix('audit');
        this.cacheService.clearByPrefix('search');
        this.cacheService.clearByPrefix('count');
        this.cacheService.clearByPrefix('transitions');

        console.log(
            'Caché limpiado completamente para procesos de faenamiento'
        );
    }

    /**
     * Método para limpiar caché después de operaciones que modifican datos
     */
    private clearCacheAfterModification(): void {
        this.clearCache();

        // También limpiar caché de otros servicios relacionados si es necesario
        this.cacheService.clearByPrefix('invoice');
        this.cacheService.clearByPrefix('reception');
        this.cacheService.clearByPrefix('inspection');
    }

    // ========================================
    // MÉTODOS DE CONSULTA BÁSICOS
    // ========================================

    /**
     * Obtener procesos de faenamiento con filtros avanzados
     */
    getSlaughterProcesses(
        queryParams: any = {}
    ): Observable<PaginatedResponse<SlaughterProcess>> {
        const cacheKey = `${this.endpoint}_filtered_${JSON.stringify(
            queryParams
        )}`;
        const cachedData =
            this.cacheService.get<PaginatedResponse<SlaughterProcess>>(
                cacheKey
            );

        if (cachedData) {
            return of(cachedData);
        }

        // Construir parámetros
        let params: any = {};

        if (queryParams.page) params.page = queryParams.page;
        if (queryParams.limit) params.limit = queryParams.limit;
        if (queryParams.sort) params.sort = queryParams.sort;
        if (queryParams.populate) params.populate = queryParams.populate;
        if (queryParams.includeDeleted)
            params.includeDeleted = queryParams.includeDeleted;

        if (
            queryParams.filters &&
            Object.keys(queryParams.filters).length > 0
        ) {
            params.filters = JSON.stringify(queryParams.filters);
        }

        console.log(
            'Parámetros enviados al servicio SlaughterProcess:',
            params
        );

        return this.http
            .get<ApiResponse<PaginatedResponse<SlaughterProcess>>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}`,
                {
                    headers: this.getHeaders(),
                    params,
                }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => this.handleApiError(error))
            );
    }

    /**
     * Obtener proceso por ID (override del método base)
     */
    override getById(id: string): Observable<SlaughterProcess> {
        const cacheKey = `${this.endpoint}_${id}`;
        const cachedData = this.cacheService.get<SlaughterProcess>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        return this.http
            .get<ApiResponse<SlaughterProcess>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/${id}`,
                { headers: this.getHeaders() }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => this.handleApiError(error))
            );
    }

    /**
     * Obtener proceso por número de orden
     */
    getSlaughterProcessByNumber(
        numeroOrden: string
    ): Observable<PaginatedResponse<SlaughterProcess>> {
        const cacheKey = `${this.endpoint}_number_${numeroOrden}`;
        const cachedData =
            this.cacheService.get<PaginatedResponse<SlaughterProcess>>(
                cacheKey
            );

        if (cachedData) {
            return of(cachedData);
        }

        const params = { numeroOrden };

        return this.http
            .get<ApiResponse<PaginatedResponse<SlaughterProcess>>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}`,
                {
                    headers: this.getHeaders(),
                    params,
                }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => this.handleApiError(error))
            );
    }

    /**
     * Obtener procesos por estado
     */
    getSlaughterProcessesByState(
        state: string,
        queryParams: any = {}
    ): Observable<PaginatedResponse<SlaughterProcess>> {
        const cacheKey = `${this.endpoint}_state_${state}_${JSON.stringify(
            queryParams
        )}`;
        const cachedData =
            this.cacheService.get<PaginatedResponse<SlaughterProcess>>(
                cacheKey
            );

        if (cachedData) {
            return of(cachedData);
        }

        let params: any = { estado: state };
        if (queryParams.page) params.page = queryParams.page;
        if (queryParams.limit) params.limit = queryParams.limit;
        if (queryParams.sort) params.sort = queryParams.sort;

        return this.http
            .get<ApiResponse<PaginatedResponse<SlaughterProcess>>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}`,
                {
                    headers: this.getHeaders(),
                    params,
                }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => this.handleApiError(error))
            );
    }

    /**
     * Obtener procesos por introductor
     */
    getSlaughterProcessesByIntroducer(
        introducerId: string,
        queryParams: any = {}
    ): Observable<PaginatedResponse<SlaughterProcess>> {
        const cacheKey = `${
            this.endpoint
        }_introducer_${introducerId}_${JSON.stringify(queryParams)}`;
        const cachedData =
            this.cacheService.get<PaginatedResponse<SlaughterProcess>>(
                cacheKey
            );

        if (cachedData) {
            return of(cachedData);
        }

        let params: any = { introductor: introducerId };
        if (queryParams.page) params.page = queryParams.page;
        if (queryParams.limit) params.limit = queryParams.limit;
        if (queryParams.sort) params.sort = queryParams.sort;

        return this.http
            .get<ApiResponse<PaginatedResponse<SlaughterProcess>>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}`,
                {
                    headers: this.getHeaders(),
                    params,
                }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => this.handleApiError(error))
            );
    }

    /**
     * Obtener procesos activos
     */
    getActiveSlaughterProcesses(
        queryParams: any = {}
    ): Observable<PaginatedResponse<SlaughterProcess>> {
        const cacheKey = `${this.endpoint}_active_${JSON.stringify(
            queryParams
        )}`;
        const cachedData =
            this.cacheService.get<PaginatedResponse<SlaughterProcess>>(
                cacheKey
            );

        if (cachedData) {
            return of(cachedData);
        }

        let params: any = {
            filters: JSON.stringify({
                estado: { $ne: 'Anulado' },
                deletedAt: null,
            }),
        };
        if (queryParams.page) params.page = queryParams.page;
        if (queryParams.limit) params.limit = queryParams.limit;
        if (queryParams.sort) params.sort = queryParams.sort;

        return this.http
            .get<ApiResponse<PaginatedResponse<SlaughterProcess>>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}`,
                {
                    headers: this.getHeaders(),
                    params,
                }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => this.handleApiError(error))
            );
    }

    // ========================================
    // MÉTODOS DE GESTIÓN DE ESTADO
    // ========================================

    /**
     * Actualizar estado del proceso
     */
    updateSlaughterProcessState(
        id: string,
        newState: string,
        reason?: string
    ): Observable<SlaughterProcess> {
        const body: any = { newState };
        if (reason) body.reason = reason;

        return this.http
            .patch<ApiResponse<SlaughterProcess>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/${id}/state`,
                body,
                { headers: this.getHeaders() }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap(() => {
                    this.clearCacheAfterModification();
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: `Estado actualizado a '${newState}' correctamente`,
                    });
                }),
                catchError((error) => this.handleApiError(error))
            );
    }

    /**
     * Anular proceso de faenamiento
     */
    cancelSlaughterProcess(
        id: string,
        reason: string
    ): Observable<SlaughterProcess> {
        return this.http
            .patch<ApiResponse<SlaughterProcess>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/${id}/cancel`,
                { reason },
                { headers: this.getHeaders() }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap(() => {
                    this.clearCacheAfterModification();
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Proceso anulado correctamente',
                    });
                }),
                catchError((error) => this.handleApiError(error))
            );
    }

    /**
     * Restaurar proceso eliminado
     */
    restoreSlaughterProcess(id: string): Observable<SlaughterProcess> {
        return this.http
            .patch<ApiResponse<SlaughterProcess>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/${id}/restore`,
                {},
                { headers: this.getHeaders() }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap(() => {
                    this.clearCacheAfterModification();
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Proceso restaurado correctamente',
                    });
                }),
                catchError((error) => this.handleApiError(error))
            );
    }

    /**
     * Eliminar proceso con justificación
     */
    deleteSlaughterProcessWithJustification(
        id: string,
        reason: string
    ): Observable<void> {
        return this.http
            .delete<ApiResponse<void>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/${id}`,
                {
                    headers: this.getHeaders(),
                    body: { reason },
                }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap(() => {
                    this.clearCacheAfterModification();
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Proceso eliminado correctamente',
                    });
                }),
                catchError((error) => this.handleApiError(error))
            );
    }

    // ========================================
    // MÉTODOS DE INFORMACIÓN Y ESTADÍSTICAS
    // ========================================

    /**
     * Obtener resumen del proceso
     */
    getSlaughterProcessSummary(
        id: string
    ): Observable<SlaughterProcessSummary> {
        const cacheKey = `${this.endpoint}_summary_${id}`;
        const cachedData =
            this.cacheService.get<SlaughterProcessSummary>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        return this.http
            .get<ApiResponse<SlaughterProcessSummary>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/${id}/summary`,
                { headers: this.getHeaders() }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => this.handleApiError(error))
            );
    }

    /**
     * Obtener transiciones de estado válidas
     */
    getValidStateTransitions(id: string): Observable<StateTransition> {
        const cacheKey = `${this.endpoint}_transitions_${id}`;
        const cachedData = this.cacheService.get<StateTransition>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        return this.http
            .get<ApiResponse<StateTransition>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/${id}/valid-transitions`,
                { headers: this.getHeaders() }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => this.handleApiError(error))
            );
    }

    /**
     * Obtener estadísticas de procesos
     */
    getStatistics(filters: any = {}): Observable<SlaughterProcessStatistics> {
        const cacheKey = `${this.endpoint}_stats_${JSON.stringify(filters)}`;
        const cachedData =
            this.cacheService.get<SlaughterProcessStatistics>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        let params: any = {};
        if (filters && Object.keys(filters).length > 0) {
            params.filters = JSON.stringify(filters);
        }

        return this.http
            .get<ApiResponse<SlaughterProcessStatistics>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/statistics`,
                {
                    headers: this.getHeaders(),
                    params,
                }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => this.handleApiError(error))
            );
    }

    /**
     * Obtener métricas de rendimiento
     */
    getPerformanceMetrics(
        queryParams: any = {}
    ): Observable<PerformanceMetrics> {
        const cacheKey = `${this.endpoint}_metrics_${JSON.stringify(
            queryParams
        )}`;
        const cachedData = this.cacheService.get<PerformanceMetrics>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        let params: any = {};
        if (queryParams.dateFrom) params.dateFrom = queryParams.dateFrom;
        if (queryParams.dateTo) params.dateTo = queryParams.dateTo;
        if (queryParams.groupBy) params.groupBy = queryParams.groupBy;

        return this.http
            .get<ApiResponse<PerformanceMetrics>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/metrics`,
                {
                    headers: this.getHeaders(),
                    params,
                }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => this.handleApiError(error))
            );
    }

    /**
     * Contar procesos usados por introductor
     */
    countUsedProcessesByIntroducer(
        introducerId: string,
        dateFrom?: string
    ): Observable<{ introducerId: string; count: number; dateFrom?: string }> {
        const cacheKey = `${this.endpoint}_count_${introducerId}_${
            dateFrom || 'all'
        }`;
        const cachedData = this.cacheService.get<any>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        let params: any = {};
        if (dateFrom) params.dateFrom = dateFrom;

        return this.http
            .get<ApiResponse<any>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/introducer/${introducerId}/count`,
                {
                    headers: this.getHeaders(),
                    params,
                }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => this.handleApiError(error))
            );
    }

    /**
     * Obtener historial de auditoría
     */
    getAuditHistory(id: string, queryParams: any = {}): Observable<any> {
        const cacheKey = `${this.endpoint}_audit_${id}_${JSON.stringify(
            queryParams
        )}`;
        const cachedData = this.cacheService.get<any>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        let params: any = {};
        if (queryParams.page) params.page = queryParams.page;
        if (queryParams.limit) params.limit = queryParams.limit;
        if (queryParams.sort) params.sort = queryParams.sort;

        return this.http
            .get<ApiResponse<any>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/${id}/audit-history`,
                {
                    headers: this.getHeaders(),
                    params,
                }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => this.handleApiError(error))
            );
    }

    // ========================================
    // MÉTODOS DE BÚSQUEDA AVANZADA
    // ========================================

    /**
     * Búsqueda avanzada de procesos
     */
    searchSlaughterProcesses(
        searchParams: any,
        queryParams: any = {}
    ): Observable<PaginatedResponse<SlaughterProcess>> {
        const cacheKey = `${this.endpoint}_search_${JSON.stringify({
            searchParams,
            queryParams,
        })}`;
        const cachedData =
            this.cacheService.get<PaginatedResponse<SlaughterProcess>>(
                cacheKey
            );

        if (cachedData) {
            return of(cachedData);
        }

        let params: any = {};
        if (queryParams.page) params.page = queryParams.page;
        if (queryParams.limit) params.limit = queryParams.limit;
        if (queryParams.sort) params.sort = queryParams.sort;
        if (queryParams.includeDeleted)
            params.includeDeleted = queryParams.includeDeleted;

        return this.http
            .post<ApiResponse<PaginatedResponse<SlaughterProcess>>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/search`,
                searchParams,
                {
                    headers: this.getHeaders(),
                    params,
                }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => this.handleApiError(error))
            );
    }

    /**
     * Obtener mis procesos (creados por el usuario actual)
     */
    getMySlaughterProcesses(
        queryParams: any = {}
    ): Observable<PaginatedResponse<SlaughterProcess>> {
        const cacheKey = `${this.endpoint}_my_processes_${JSON.stringify(
            queryParams
        )}`;
        const cachedData =
            this.cacheService.get<PaginatedResponse<SlaughterProcess>>(
                cacheKey
            );

        if (cachedData) {
            return of(cachedData);
        }

        let params: any = {};
        if (queryParams.page) params.page = queryParams.page;
        if (queryParams.limit) params.limit = queryParams.limit;
        if (queryParams.sort) params.sort = queryParams.sort;

        return this.http
            .get<ApiResponse<PaginatedResponse<SlaughterProcess>>>(
                `${GLOBAL.url_zoosanitario}${this.endpoint}/my/processes`,
                {
                    headers: this.getHeaders(),
                    params,
                }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => this.handleApiError(error))
            );
    }

    // ========================================
    // MÉTODOS AUXILIARES
    // ========================================

    /**
     * Validar si un estado es válido
     */
    isValidState(state: string): boolean {
        const validStates = [
            'Iniciado',
            'PreFaenamiento',
            'Pagado',
            'EnProceso',
            'Finalizado',
            'Anulado',
        ];
        return validStates.includes(state);
    }

    /**
     * Obtener estados disponibles
     */
    getAvailableStates(): string[] {
        return [
            'Iniciado',
            'PreFaenamiento',
            'Pagado',
            'EnProceso',
            'Finalizado',
            'Anulado',
        ];
    }

    /**
     * Obtener color del estado para UI
     */
    getStateColor(state: string): string {
        const stateColors: { [key: string]: string } = {
            Iniciado: 'primary',
            PreFaenamiento: 'warning',
            Pagado: 'info',
            EnProceso: 'warning',
            Finalizado: 'success',
            Anulado: 'danger',
        };
        return stateColors[state] || 'secondary';
    }

    /**
     * Obtener severidad del estado para PrimeNG
     */
    getStateSeverity(
        state: string
    ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
        const stateSeverities: { [key: string]: any } = {
            Iniciado: 'info',
            PreFaenamiento: 'warning',
            Pagado: 'info',
            EnProceso: 'warning',
            Finalizado: 'success',
            Anulado: 'danger',
        };
        return stateSeverities[state] || 'secondary';
    }

    /**
     * Override del método delete base para requerir justificación
     */
    override delete(id: string): Observable<void> {
        throw new Error(
            'Use deleteSlaughterProcessWithJustification() instead. La eliminación de procesos requiere justificación.'
        );
    }

    /**
     * Override del método create base
     */
    override create(
        data: Partial<SlaughterProcess>
    ): Observable<SlaughterProcess> {
        return this.http
            .post<ApiResponse<SlaughterProcess>>(
                `${this.url}${this.endpoint}`,
                data,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap(() => {
                    this.clearCacheAfterModification();
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Proceso creado correctamente',
                    });
                }),
                catchError((error) => this.handleApiError(error))
            );
    }

    /**
     * Override del método update base
     */
    override update(
        id: string,
        data: Partial<SlaughterProcess>
    ): Observable<SlaughterProcess> {
        return this.http
            .put<ApiResponse<SlaughterProcess>>(
                `${this.url}${this.endpoint}/${id}`,
                data,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                map((response) => this.handleApiResponse(response)),
                tap(() => {
                    this.clearCacheAfterModification();
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Proceso actualizado correctamente',
                    });
                }),
                catchError((error) => this.handleApiError(error))
            );
    }
}
