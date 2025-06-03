import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { AuthService } from 'src/app/demo/services/auth.service';

export interface Introducer {
    _id?: string;
    type: 'NATURAL' | 'JURIDICAL';
    firstName?: string;
    lastName?: string;
    companyName?: string;
    legalRepresentative?: string;
    idNumber: string;
    ruc?: string;
    phone?: string;
    email?: string;
    address?: string;
    introducerType: 'BOVINE_MAJOR' | 'PORCINE_MINOR' | 'MIXED';
    registrationStatus: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
    identificationCard?: {
        cardNumber?: string;
        issueDate?: Date;
        expirationDate?: Date;
        isActive: boolean;
    };
    inscriptionPayments?: Array<{
        year: number;
        amount: number;
        paymentDate?: Date;
        status: 'PENDING' | 'PAID' | 'OVERDUE';
        receiptNumber?: string;
    }>;
    pendingFines?: Array<{
        type: string;
        amount: number;
        reason: string;
        issueDate: Date;
        status: 'PENDING' | 'PAID' | 'FORGIVEN';
        paymentDate?: Date;
    }>;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IntroducerSearchResponse {
    data: Introducer[];
    total: number;
    page: number;
    limit: number;
}

export interface IntroducerStatistics {
    total: number;
    active: number;
    pending: number;
    suspended: number;
    expired: number;
    byType: {
        natural: number;
        juridical: number;
    };
    byIntroducerType: {
        bovine: number;
        porcine: number;
        mixed: number;
    };
}

export interface PendingPayments {
    introducerId: string;
    introducerName: string;
    pendingInscriptions: Array<{
        year: number;
        amount: number;
        status: string;
    }>;
    pendingFines: Array<{
        type: string;
        amount: number;
        reason: string;
        issueDate: Date;
    }>;
    totalAmount: number;
}

@Injectable({
    providedIn: 'root',
})
export class IntroducerService {
    private apiUrl = `${GLOBAL.url_zoosanitario}introducer`;

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
     * Obtener todos los introductores
     */
    getAllIntroducers(): Observable<Introducer[]> {
        return this.http
            .get<Introducer[]>(this.apiUrl, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener introductor por ID
     */
    getIntroducerById(id: string): Observable<Introducer> {
        return this.http
            .get<{ success: boolean; data: Introducer }>(
                `${this.apiUrl}/${id}`,
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(
                map((response) => response.data),
                catchError(this.handleError)
            );
    }

    /**
     * Validar si un introductor puede realizar faenamiento
     */
    validateSlaughter(id: string): Observable<{
        canSlaughter: boolean;
        reason?: string;
        pendingAmount?: number;
    }> {
        return this.http
            .get<{
                canSlaughter: boolean;
                reason?: string;
                pendingAmount?: number;
            }>(`${this.apiUrl}/${id}/validate-slaughter`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener pagos pendientes
     */
    getPendingPayments(): Observable<PendingPayments[]> {
        return this.http
            .get<PendingPayments[]>(`${this.apiUrl}/pending-payments`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Buscar introductores
     */
    searchIntroducers(params: {
        query?: string;
        type?: string;
        introducerType?: string;
        registrationStatus?: string;
        page?: number;
        limit?: number;
    }): Observable<IntroducerSearchResponse> {
        let httpParams = new HttpParams();

        if (params.query) httpParams = httpParams.set('query', params.query);
        if (params.type) httpParams = httpParams.set('type', params.type);
        if (params.introducerType)
            httpParams = httpParams.set(
                'introducerType',
                params.introducerType
            );
        if (params.registrationStatus)
            httpParams = httpParams.set(
                'registrationStatus',
                params.registrationStatus
            );
        if (params.page)
            httpParams = httpParams.set('page', params.page.toString());
        if (params.limit)
            httpParams = httpParams.set('limit', params.limit.toString());

        return this.http
            .get<IntroducerSearchResponse>(`${this.apiUrl}/search`, {
                params: httpParams,
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener estadísticas de introductores
     */
    getStatistics(): Observable<IntroducerStatistics> {
        return this.http
            .get<{ success: boolean; data: IntroducerStatistics }>(
                `${this.apiUrl}/statistics`,
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(
                map((response) => response.data),
                catchError(this.handleError)
            );
    }

    /**
     * Crear nuevo introductor
     */
    createIntroducer(introducer: Partial<Introducer>): Observable<Introducer> {
        console.log('IntroducerService.createIntroducer:', introducer);
        return this.http
            .post<Introducer>(this.apiUrl, introducer, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Aplicar multa a un introductor
     */
    applyFine(
        id: string,
        fine: {
            type: string;
            amount: number;
            reason: string;
        }
    ): Observable<Introducer> {
        return this.http
            .post<Introducer>(`${this.apiUrl}/${id}/fine`, fine, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Procesar pago de inscripción
     */
    processInscriptionPayment(
        id: string,
        payment: {
            year: number;
            amount: number;
            paymentMethod: string;
            receiptNumber?: string;
        }
    ): Observable<Introducer> {
        return this.http
            .post<Introducer>(
                `${this.apiUrl}/${id}/payment/inscription`,
                payment,
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Actualizar introductor
     */
    updateIntroducer(
        id: string,
        introducer: Partial<Introducer>
    ): Observable<Introducer> {
        return this.http
            .put<Introducer>(`${this.apiUrl}/${id}`, introducer, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Pagar multa
     */
    payFine(
        id: string,
        fineId: string,
        payment: {
            amount: number;
            paymentMethod: string;
            receiptNumber?: string;
        }
    ): Observable<Introducer> {
        return this.http
            .put<Introducer>(
                `${this.apiUrl}/${id}/fine/${fineId}/pay`,
                payment,
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Renovar carnet de identificación
     */
    renewCard(id: string): Observable<Introducer> {
        return this.http
            .put<Introducer>(
                `${this.apiUrl}/${id}/renew-card`,
                {},
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Eliminar introductor
     */
    deleteIntroducer(id: string): Observable<void> {
        return this.http
            .delete<void>(`${this.apiUrl}/${id}`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Buscar introductor por cédula
     */
    getIntroducerByCedula(cedula: string): Observable<Introducer> {
        return this.http
            .get<Introducer>(`${this.apiUrl}/camal/cedula/${cedula}`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Manejo de errores
     */
    private handleError(error: any): Observable<never> {
        console.error('Error en IntroducerService:', error);

        let errorMessage = 'Error desconocido';

        if (error.error?.message) {
            errorMessage = error.error.message;
        } else if (error.message) {
            errorMessage = error.message;
        } else if (error.status) {
            switch (error.status) {
                case 400:
                    errorMessage = 'Datos inválidos';
                    break;
                case 401:
                    errorMessage = 'No autorizado';
                    break;
                case 403:
                    errorMessage = 'Acceso denegado';
                    break;
                case 404:
                    errorMessage = 'Introductor no encontrado';
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
