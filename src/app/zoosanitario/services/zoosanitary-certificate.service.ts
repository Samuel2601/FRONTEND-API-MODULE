import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { AuthService } from 'src/app/demo/services/auth.service';

export interface ZoosanitaryCertificate {
    _id?: string;
    czpmNumber?: string;
    authorizedTo: string;
    originAreaCode: string;
    destinationAreaCode: string;
    vehiclePlate: string;
    totalProducts: number;
    validTo: Date;
    certificateNumber: string;
    introducerId: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ZoosanitaryCertificateSearchResponse {
    certificates: ZoosanitaryCertificate[];
    total: number;
    page: number;
    limit: number;
}

export interface ZoosanitaryCertificateStatistics {
    total: number;
    active: number;
    expired: number;
    expiringSoon: number;
    byMonth: Array<{
        month: string;
        count: number;
    }>;
    byIntroducer: Array<{
        introducerId: string;
        introducerName: string;
        count: number;
    }>;
}

export interface IntroducerCertificateSummary {
    introducerId: string;
    introducerName: string;
    totalCertificates: number;
    activeCertificates: number;
    expiredCertificates: number;
    expiringSoonCertificates: number;
    lastCertificateDate?: Date;
}

export interface CertificateValidationResponse {
    isValid: boolean;
    certificate?: ZoosanitaryCertificate;
    reason?: string;
    daysUntilExpiration?: number;
}

export interface BatchCertificateRequest {
    certificates: Partial<ZoosanitaryCertificate>[];
}

export interface BatchCertificateResponse {
    created: ZoosanitaryCertificate[];
    errors: Array<{
        index: number;
        error: string;
        data: Partial<ZoosanitaryCertificate>;
    }>;
}

@Injectable({
    providedIn: 'root',
})
export class ZoosanitaryCertificateService {
    private apiUrl = `${GLOBAL.url_zoosanitario}zoosanitary-certificate`;

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

    getPublicHeaders(): HttpHeaders {
        return new HttpHeaders({
            'Content-Type': 'application/json',
        });
    }

    /**
     * Obtener todos los certificados zoosanitarios
     */
    getAllCertificates(): Observable<ZoosanitaryCertificate[]> {
        return this.http
            .get<ZoosanitaryCertificate[]>(this.apiUrl, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener certificado por ID
     */
    getCertificateById(id: string): Observable<ZoosanitaryCertificate> {
        return this.http
            .get<ZoosanitaryCertificate>(`${this.apiUrl}/${id}`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Validar certificado
     */
    validateCertificate(id: string): Observable<CertificateValidationResponse> {
        return this.http
            .get<CertificateValidationResponse>(
                `${this.apiUrl}/${id}/validate`,
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Buscar certificado por número de certificado
     */
    getCertificateByNumber(
        certificateNumber: string
    ): Observable<ZoosanitaryCertificate> {
        return this.http
            .get<ZoosanitaryCertificate>(
                `${this.apiUrl}/certificate-number/${certificateNumber}`,
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Buscar certificado por número CZPM
     */
    getCertificateByCzpm(
        czpmNumber: string
    ): Observable<ZoosanitaryCertificate> {
        return this.http
            .get<ZoosanitaryCertificate>(`${this.apiUrl}/czpm/${czpmNumber}`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener certificados expirados
     */
    getExpiredCertificates(): Observable<ZoosanitaryCertificate[]> {
        return this.http
            .get<ZoosanitaryCertificate[]>(`${this.apiUrl}/expired`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener certificados que expiran pronto
     */
    getExpiringSoonCertificates(): Observable<ZoosanitaryCertificate[]> {
        return this.http
            .get<ZoosanitaryCertificate[]>(`${this.apiUrl}/expiring-soon`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener certificados por introductor
     */
    getCertificatesByIntroducer(
        introducerId: string
    ): Observable<ZoosanitaryCertificate[]> {
        return this.http
            .get<ZoosanitaryCertificate[]>(
                `${this.apiUrl}/introducer/${introducerId}`,
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener resumen de certificados por introductor
     */
    getIntroducerCertificateSummary(
        introducerId: string
    ): Observable<IntroducerCertificateSummary> {
        return this.http
            .get<IntroducerCertificateSummary>(
                `${this.apiUrl}/introducer/${introducerId}/summary`,
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Buscar certificados
     */
    searchCertificates(params: {
        query?: string;
        introducerId?: string;
        status?: 'active' | 'expired' | 'expiring-soon';
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }): Observable<ZoosanitaryCertificateSearchResponse> {
        let httpParams = new HttpParams();

        if (params.query) httpParams = httpParams.set('query', params.query);
        if (params.introducerId)
            httpParams = httpParams.set('introducerId', params.introducerId);
        if (params.status) httpParams = httpParams.set('status', params.status);
        if (params.startDate)
            httpParams = httpParams.set('startDate', params.startDate);
        if (params.endDate)
            httpParams = httpParams.set('endDate', params.endDate);
        if (params.page)
            httpParams = httpParams.set('page', params.page.toString());
        if (params.limit)
            httpParams = httpParams.set('limit', params.limit.toString());

        return this.http
            .get<ZoosanitaryCertificateSearchResponse>(
                `${this.apiUrl}/search`,
                {
                    params: httpParams,
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener estadísticas de certificados zoosanitarios (público)
     */
    getStatistics(): Observable<ZoosanitaryCertificateStatistics> {
        return this.http
            .get<ZoosanitaryCertificateStatistics>(
                `${this.apiUrl}/statistics`,
                {
                    headers: this.getPublicHeaders(),
                }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Crear nuevo certificado zoosanitario
     */
    createCertificate(
        certificate: Partial<ZoosanitaryCertificate>
    ): Observable<ZoosanitaryCertificate> {
        return this.http
            .post<ZoosanitaryCertificate>(this.apiUrl, certificate, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Renovar certificado
     */
    renewCertificate(
        id: string,
        renewalData: {
            validTo: Date;
            totalProducts?: number;
            vehiclePlate?: string;
        }
    ): Observable<ZoosanitaryCertificate> {
        return this.http
            .post<ZoosanitaryCertificate>(
                `${this.apiUrl}/${id}/renew`,
                renewalData,
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Crear certificados en lote
     */
    createBatchCertificates(
        batchRequest: BatchCertificateRequest
    ): Observable<BatchCertificateResponse> {
        return this.http
            .post<BatchCertificateResponse>(
                `${this.apiUrl}/batch`,
                batchRequest,
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Actualizar certificado
     */
    updateCertificate(
        id: string,
        certificate: Partial<ZoosanitaryCertificate>
    ): Observable<ZoosanitaryCertificate> {
        return this.http
            .put<ZoosanitaryCertificate>(`${this.apiUrl}/${id}`, certificate, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Eliminar certificado
     */
    deleteCertificate(id: string): Observable<void> {
        return this.http
            .delete<void>(`${this.apiUrl}/${id}`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Manejo de errores
     */
    private handleError(error: any): Observable<never> {
        console.error('Error en ZoosanitaryCertificateService:', error);

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
                    errorMessage = 'Certificado zoosanitario no encontrado';
                    break;
                case 409:
                    errorMessage = 'Certificado ya existe';
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
