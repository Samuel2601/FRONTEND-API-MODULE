import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { AuthService } from 'src/app/demo/services/auth.service';

export interface Invoice {
    _id?: string;
    invoiceNumber: string;
    type:
        | 'INSCRIPTION'
        | 'SLAUGHTER_SERVICE'
        | 'ADDITIONAL_SERVICE'
        | 'FINE'
        | 'MIXED';
    introducerId: string;
    slaughterProcessId?: string;

    items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
        tariffConfigId?: string;
    }>;

    subtotal: number;
    taxes: number;
    totalAmount: number;

    paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    dueDate?: Date;

    payments: Array<{
        paymentDate: Date;
        amount: number;
        paymentMethod: 'CASH' | 'TRANSFER' | 'CHECK' | 'CARD' | 'OTHER';
        reference?: string;
        receivedBy?: string;
        _id?: string;
    }>;

    notes?: string;
    createdBy?: string;
    createdAt?: Date;
    updatedAt?: Date;

    // Información expandida (populate)
    introducer?: {
        _id: string;
        firstName?: string;
        lastName?: string;
        companyName?: string;
        idNumber: string;
        type: 'NATURAL' | 'JURIDICAL';
    };
    slaughterProcess?: {
        _id: string;
        processNumber: string;
        overallStatus: string;
    };
}

export interface InvoiceFinancialSummary {
    totalInvoices: number;
    totalAmount: number;
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    byType: {
        inscription: { count: number; amount: number };
        slaughterService: { count: number; amount: number };
        additionalService: { count: number; amount: number };
        fine: { count: number; amount: number };
        mixed: { count: number; amount: number };
    };
    byStatus: {
        pending: { count: number; amount: number };
        partial: { count: number; amount: number };
        paid: { count: number; amount: number };
        overdue: { count: number; amount: number };
        cancelled: { count: number; amount: number };
    };
}

export interface MonthlyRevenue {
    month: string;
    year: number;
    totalRevenue: number;
    totalInvoices: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
}

export interface InvoiceReport {
    period: {
        startDate: Date;
        endDate: Date;
    };
    summary: InvoiceFinancialSummary;
    monthlyBreakdown: MonthlyRevenue[];
    topIntroducers: Array<{
        introducerId: string;
        introducerName: string;
        totalAmount: number;
        invoiceCount: number;
    }>;
    paymentMethods: Array<{
        method: string;
        count: number;
        amount: number;
    }>;
}

export interface PaymentData {
    amount: number;
    paymentMethod: 'CASH' | 'TRANSFER' | 'CHECK' | 'CARD' | 'OTHER';
    reference?: string;
    paymentDate?: Date;
}

@Injectable({
    providedIn: 'root',
})
export class InvoiceService {
    private apiUrl = `${GLOBAL.url_zoosanitario}/invoice`;

    constructor(private http: HttpClient, private auth: AuthService) {}

    token() {
        return this.auth.token();
    }

    getHeaders(token: string): HttpHeaders {
        return new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
    }

    /**
     * Obtener todas las facturas
     */
    getAllInvoices(params?: {
        page?: number;
        limit?: number;
        status?: string;
        type?: string;
        introducerId?: string;
    }): Observable<{
        invoices: Invoice[];
        total: number;
        page: number;
        limit: number;
    }> {
        let httpParams = new HttpParams();

        if (params?.page)
            httpParams = httpParams.set('page', params.page.toString());
        if (params?.limit)
            httpParams = httpParams.set('limit', params.limit.toString());
        if (params?.status)
            httpParams = httpParams.set('status', params.status);
        if (params?.type) httpParams = httpParams.set('type', params.type);
        if (params?.introducerId)
            httpParams = httpParams.set('introducerId', params.introducerId);

        return this.http
            .get<{
                invoices: Invoice[];
                total: number;
                page: number;
                limit: number;
            }>(this.apiUrl, {
                params: httpParams,
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener factura por ID
     */
    getInvoiceById(id: string): Observable<Invoice> {
        return this.http
            .get<Invoice>(`${this.apiUrl}/${id}`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener resumen financiero
     */
    getFinancialSummary(params?: {
        startDate?: Date;
        endDate?: Date;
        introducerId?: string;
    }): Observable<InvoiceFinancialSummary> {
        let httpParams = new HttpParams();

        if (params?.startDate)
            httpParams = httpParams.set(
                'startDate',
                params.startDate.toISOString()
            );
        if (params?.endDate)
            httpParams = httpParams.set(
                'endDate',
                params.endDate.toISOString()
            );
        if (params?.introducerId)
            httpParams = httpParams.set('introducerId', params.introducerId);

        return this.http
            .get<InvoiceFinancialSummary>(`${this.apiUrl}/financial-summary`, {
                params: httpParams,
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener facturas por introductor
     */
    getInvoicesByIntroducer(introducerId: string): Observable<Invoice[]> {
        return this.http
            .get<Invoice[]>(`${this.apiUrl}/introducer/${introducerId}`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener ingresos mensuales
     */
    getMonthlyRevenue(params?: {
        year?: number;
        months?: number;
    }): Observable<MonthlyRevenue[]> {
        let httpParams = new HttpParams();

        if (params?.year)
            httpParams = httpParams.set('year', params.year.toString());
        if (params?.months)
            httpParams = httpParams.set('months', params.months.toString());

        return this.http
            .get<MonthlyRevenue[]>(`${this.apiUrl}/monthly-revenue`, {
                params: httpParams,
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener factura por número
     */
    getInvoiceByNumber(invoiceNumber: string): Observable<Invoice> {
        return this.http
            .get<Invoice>(`${this.apiUrl}/number/${invoiceNumber}`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener facturas vencidas
     */
    getOverdueInvoices(): Observable<Invoice[]> {
        return this.http
            .get<Invoice[]>(`${this.apiUrl}/overdue`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener facturas pendientes
     */
    getPendingInvoices(): Observable<Invoice[]> {
        return this.http
            .get<Invoice[]>(`${this.apiUrl}/pending`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener reporte de facturas
     */
    getInvoiceReport(params: {
        startDate: Date;
        endDate: Date;
        type?: string;
        status?: string;
        format?: 'json' | 'excel' | 'pdf';
    }): Observable<InvoiceReport | Blob> {
        let httpParams = new HttpParams()
            .set('startDate', params.startDate.toISOString())
            .set('endDate', params.endDate.toISOString());

        if (params.type) httpParams = httpParams.set('type', params.type);
        if (params.status) httpParams = httpParams.set('status', params.status);
        if (params.format) httpParams = httpParams.set('format', params.format);

        if (params.format === 'excel' || params.format === 'pdf') {
            return this.http
                .get(`${this.apiUrl}/report`, {
                    params: httpParams,
                    responseType: 'blob',
                    headers: this.getHeaders(this.token()),
                })
                .pipe(catchError(this.handleError));
        } else {
            return this.http
                .get<InvoiceReport>(`${this.apiUrl}/report`, {
                    params: httpParams,
                    headers: this.getHeaders(this.token()),
                })
                .pipe(catchError(this.handleError));
        }
    }

    /**
     * Procesar pago de factura
     */
    processPayment(id: string, payment: PaymentData): Observable<Invoice> {
        return this.http
            .post<Invoice>(`${this.apiUrl}/${id}/payment`, payment, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Actualizar factura
     */
    updateInvoice(id: string, invoice: Partial<Invoice>): Observable<Invoice> {
        return this.http
            .put<Invoice>(`${this.apiUrl}/${id}`, invoice, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Cancelar factura
     */
    cancelInvoice(id: string, reason?: string): Observable<Invoice> {
        const body = reason ? { reason } : {};
        return this.http
            .put<Invoice>(`${this.apiUrl}/${id}/cancel`, body, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Marcar facturas como vencidas (solo admin)
     */
    markOverdueInvoices(): Observable<{
        message: string;
        updatedCount: number;
    }> {
        return this.http
            .put<{ message: string; updatedCount: number }>(
                `${this.apiUrl}/admin/mark-overdue`,
                {},
                { headers: this.getHeaders(this.token()) }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Eliminar factura
     */
    deleteInvoice(id: string): Observable<void> {
        return this.http
            .delete<void>(`${this.apiUrl}/${id}`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Crear factura automática desde proceso de faenamiento
     */
    createFromSlaughterProcess(
        slaughterProcessId: string
    ): Observable<Invoice> {
        return this.http
            .post<Invoice>(
                `${this.apiUrl}/create-from-process`,
                {
                    slaughterProcessId,
                },
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener facturas por estado de pago
     */
    getInvoicesByPaymentStatus(
        status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED'
    ): Observable<Invoice[]> {
        return this.getAllInvoices({ status }).pipe(
            map((response) => response.invoices),
            catchError(this.handleError)
        );
    }

    /**
     * Obtener estadísticas de pagos
     */
    getPaymentStatistics(params?: {
        startDate?: Date;
        endDate?: Date;
    }): Observable<{
        totalPayments: number;
        totalAmount: number;
        byMethod: Array<{
            method: string;
            count: number;
            amount: number;
            percentage: number;
        }>;
        avgPaymentAmount: number;
        paymentsThisMonth: number;
        paymentsLastMonth: number;
        growthRate: number;
    }> {
        let httpParams = new HttpParams();

        if (params?.startDate)
            httpParams = httpParams.set(
                'startDate',
                params.startDate.toISOString()
            );
        if (params?.endDate)
            httpParams = httpParams.set(
                'endDate',
                params.endDate.toISOString()
            );

        return this.http
            .get<any>(`${this.apiUrl}/payment-statistics`, {
                params: httpParams,
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Buscar facturas con filtros avanzados
     */
    searchInvoices(filters: {
        invoiceNumber?: string;
        introducerId?: string;
        introducerName?: string;
        minAmount?: number;
        maxAmount?: number;
        dateFrom?: Date;
        dateTo?: Date;
        dueDateFrom?: Date;
        dueDateTo?: Date;
        status?: string[];
        type?: string[];
        paymentMethod?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Observable<{
        invoices: Invoice[];
        total: number;
        page: number;
        limit: number;
    }> {
        let httpParams = new HttpParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    httpParams = httpParams.set(key, value.join(','));
                } else if (value instanceof Date) {
                    httpParams = httpParams.set(key, value.toISOString());
                } else {
                    httpParams = httpParams.set(key, value.toString());
                }
            }
        });

        return this.http
            .get<{
                invoices: Invoice[];
                total: number;
                page: number;
                limit: number;
            }>(`${this.apiUrl}/search`, {
                params: httpParams,
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Generar número de factura automático
     */
    generateInvoiceNumber(type: string): Observable<{ invoiceNumber: string }> {
        return this.http
            .post<{ invoiceNumber: string }>(
                `${this.apiUrl}/generate-number`,
                {
                    type,
                },
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Validar si se puede eliminar una factura
     */
    canDeleteInvoice(
        id: string
    ): Observable<{ canDelete: boolean; reason?: string }> {
        return this.http
            .get<{ canDelete: boolean; reason?: string }>(
                `${this.apiUrl}/${id}/can-delete`,
                { headers: this.getHeaders(this.token()) }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener historial de pagos de un introductor
     */
    getIntroducerPaymentHistory(
        introducerId: string,
        params?: {
            startDate?: Date;
            endDate?: Date;
            limit?: number;
        }
    ): Observable<{
        payments: Array<{
            invoiceId: string;
            invoiceNumber: string;
            paymentDate: Date;
            amount: number;
            paymentMethod: string;
            reference?: string;
        }>;
        totalPaid: number;
        paymentCount: number;
    }> {
        let httpParams = new HttpParams();

        if (params?.startDate)
            httpParams = httpParams.set(
                'startDate',
                params.startDate.toISOString()
            );
        if (params?.endDate)
            httpParams = httpParams.set(
                'endDate',
                params.endDate.toISOString()
            );
        if (params?.limit)
            httpParams = httpParams.set('limit', params.limit.toString());

        return this.http
            .get<any>(
                `${this.apiUrl}/introducer/${introducerId}/payment-history`,
                { params: httpParams, headers: this.getHeaders(this.token()) }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Calcular totales de una factura
     */
    calculateInvoiceTotals(
        items: Array<{ quantity: number; unitPrice: number }>
    ): {
        subtotal: number;
        taxes: number;
        total: number;
    } {
        const subtotal = items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
        );
        const taxes = subtotal * 0.12; // IVA 12%
        const total = subtotal + taxes;

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            taxes: Math.round(taxes * 100) / 100,
            total: Math.round(total * 100) / 100,
        };
    }

    /**
     * Validar datos de factura antes de crear/actualizar
     */
    validateInvoiceData(invoice: Partial<Invoice>): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        if (!invoice.introducerId) {
            errors.push('El introductor es requerido');
        }

        if (!invoice.type) {
            errors.push('El tipo de factura es requerido');
        }

        if (!invoice.items || invoice.items.length === 0) {
            errors.push('La factura debe tener al menos un item');
        }

        if (invoice.items) {
            invoice.items.forEach((item, index) => {
                if (!item.description || item.description.trim() === '') {
                    errors.push(
                        `El item ${index + 1} debe tener una descripción`
                    );
                }
                if (item.quantity <= 0) {
                    errors.push(
                        `El item ${index + 1} debe tener una cantidad mayor a 0`
                    );
                }
                if (item.unitPrice <= 0) {
                    errors.push(
                        `El item ${
                            index + 1
                        } debe tener un precio unitario mayor a 0`
                    );
                }
            });
        }

        if (invoice.totalAmount && invoice.totalAmount <= 0) {
            errors.push('El monto total debe ser mayor a 0');
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Formatear número de factura para mostrar
     */
    formatInvoiceNumber(invoiceNumber: string): string {
        // Formato: INS-2024-001, SLA-2024-001, etc.
        if (invoiceNumber.includes('-')) {
            return invoiceNumber;
        }
        // Si es un número simple, agregarle formato
        const year = new Date().getFullYear();
        return `FAC-${year}-${invoiceNumber.padStart(3, '0')}`;
    }

    /**
     * Obtener estado de pago en español
     */
    getPaymentStatusLabel(status: string): string {
        const labels: { [key: string]: string } = {
            PENDING: 'Pendiente',
            PARTIAL: 'Pago Parcial',
            PAID: 'Pagado',
            OVERDUE: 'Vencido',
            CANCELLED: 'Cancelado',
        };
        return labels[status] || status;
    }

    /**
     * Obtener tipo de factura en español
     */
    getInvoiceTypeLabel(type: string): string {
        const labels: { [key: string]: string } = {
            INSCRIPTION: 'Inscripción',
            SLAUGHTER_SERVICE: 'Servicio de Faenamiento',
            ADDITIONAL_SERVICE: 'Servicios Adicionales',
            FINE: 'Multa',
            MIXED: 'Mixta',
        };
        return labels[type] || type;
    }

    /**
     * Obtener método de pago en español
     */
    getPaymentMethodLabel(method: string): string {
        const labels: { [key: string]: string } = {
            CASH: 'Efectivo',
            TRANSFER: 'Transferencia',
            CHECK: 'Cheque',
            CARD: 'Tarjeta',
            OTHER: 'Otro',
        };
        return labels[method] || method;
    }

    /**
     * Manejo de errores
     */
    private handleError(error: any): Observable<never> {
        console.error('Error en InvoiceService:', error);

        let errorMessage = 'Error desconocido';

        if (error.error?.message) {
            errorMessage = error.error.message;
        } else if (error.message) {
            errorMessage = error.message;
        } else if (error.status) {
            switch (error.status) {
                case 400:
                    errorMessage = 'Datos de factura inválidos';
                    break;
                case 401:
                    errorMessage = 'No autorizado';
                    break;
                case 403:
                    errorMessage = 'Acceso denegado';
                    break;
                case 404:
                    errorMessage = 'Factura no encontrada';
                    break;
                case 409:
                    errorMessage =
                        'Conflicto - factura ya existe o no se puede modificar';
                    break;
                case 422:
                    errorMessage =
                        'No se puede procesar - requisitos no cumplidos';
                    break;
                case 500:
                    errorMessage = 'Error interno del servidor';
                    break;
                default:
                    errorMessage = `Error ${error.status}: ${error.statusText}`;
            }
        }

        return throwError(() => new Error(errorMessage));
    }
}
