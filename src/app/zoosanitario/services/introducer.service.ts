import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, shareReplay, tap } from 'rxjs';
import { AuthService } from 'src/app/demo/services/auth.service';
import { BaseService } from './base.service';
import {
    ApiResponse,
    Introducer,
    SlaughterProcess,
} from '../interfaces/slaughter.interface';
import { CacheService } from 'src/app/demo/services/cache.service';

@Injectable({
    providedIn: 'root',
})
export class IntroducerService extends BaseService<Introducer> {
    constructor(
        protected override http: HttpClient,
        protected override cacheService: CacheService,
        protected override auth: AuthService
    ) {
        super('introducers');
    }
    findByIdNumber(idNumber: string): Observable<ApiResponse<Introducer>> {
        const cacheKey = `${this.endpoint}_idnumber_${idNumber}`;
        const cachedData =
            this.cacheService.get<ApiResponse<Introducer>>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        return this.http
            .get<ApiResponse<Introducer>>(
                `${this.url}${this.endpoint}/by-id/${idNumber}`,
                { headers: this.getHeaders() }
            )
            .pipe(
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                shareReplay(1)
            );
    }

    findByRuc(ruc: string): Observable<ApiResponse<Introducer>> {
        const cacheKey = `${this.endpoint}_ruc_${ruc}`;
        const cachedData =
            this.cacheService.get<ApiResponse<Introducer>>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        return this.http
            .get<ApiResponse<Introducer>>(
                `${this.url}${this.endpoint}/by-ruc/${ruc}`,
                { headers: this.getHeaders() }
            )
            .pipe(
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                shareReplay(1)
            );
    }

    validateForProcess(introducerId: string): Observable<ApiResponse<any>> {
        return this.http
            .get<ApiResponse<any>>(
                `${this.url}${this.endpoint}/${introducerId}/validate-process`,
                { headers: this.getHeaders() }
            )
            .pipe(
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error de validación',
                        detail: 'No se pudo validar el introductor para el proceso',
                    });
                    throw error;
                })
            );
    }

    getProcessHistory(
        introducerId: string
    ): Observable<ApiResponse<SlaughterProcess[]>> {
        const cacheKey = `${this.endpoint}_process_history_${introducerId}`;
        const cachedData =
            this.cacheService.get<ApiResponse<SlaughterProcess[]>>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        return this.http
            .get<ApiResponse<SlaughterProcess[]>>(
                `${this.url}${this.endpoint}/${introducerId}/process-history`,
                { headers: this.getHeaders() }
            )
            .pipe(
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                shareReplay(1)
            );
    }

    getCheckPayment(introducerId: string): Observable<ApiResponse<any>> {
        return this.http
            .get<ApiResponse<any>>(
                `${this.url}${this.endpoint}/${introducerId}/check-payment`,
                { headers: this.getHeaders() }
            )
            .pipe(
                map((response) => ({
                    ...response,
                    data: {
                        ...response.data,
                        lastUpdated: new Date(),
                    },
                }))
            );
    }

    getCheckPendingFines(introducerId: string): Observable<ApiResponse<any>> {
        return this.http
            .get<ApiResponse<any>>(
                `${this.url}${this.endpoint}/${introducerId}/check-fines`,
                { headers: this.getHeaders() }
            )
            .pipe(
                map((response) => ({
                    ...response,
                    data: {
                        ...response.data,
                        lastUpdated: new Date(),
                    },
                }))
            );
    }

    updateRegistrationStatus(
        introducerId: string,
        status: string
    ): Observable<ApiResponse<Introducer>> {
        return this.http
            .put<ApiResponse<Introducer>>(
                `${this.url}${this.endpoint}/${introducerId}/status`,
                { status },
                { headers: this.getHeaders() }
            )
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(
                        `${this.endpoint}_${introducerId}`
                    );
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Estado actualizado',
                        detail: `El estado del introductor ha sido cambiado a ${status}`,
                    });
                })
            );
    }

    // Nuevos métodos basados en el backend actualizado
    getIntroducerDashboard(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(
            `${this.url}${this.endpoint}/dashboard`,
            { headers: this.getHeaders() }
        );
    }

    activateIntroducer(
        introducerId: string
    ): Observable<ApiResponse<Introducer>> {
        return this.updateRegistrationStatus(introducerId, 'ACTIVE');
    }

    suspendIntroducer(
        introducerId: string,
        reason: string
    ): Observable<ApiResponse<Introducer>> {
        return this.http
            .put<ApiResponse<Introducer>>(
                `${this.url}${this.endpoint}/${introducerId}/suspend`,
                { reason },
                { headers: this.getHeaders() }
            )
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Introductor suspendido',
                        detail: `El introductor ha sido suspendido: ${reason}`,
                    });
                })
            );
    }

    getAuditHistory(
        introducerId: string,
        params?: any
    ): Observable<ApiResponse<any>> {
        let httpParams = new HttpParams();
        if (params) {
            Object.keys(params).forEach((key) => {
                if (params[key] !== null && params[key] !== undefined) {
                    httpParams = httpParams.set(key, params[key]);
                }
            });
        }

        return this.http.get<ApiResponse<any>>(
            `${this.url}${this.endpoint}/${introducerId}/audit`,
            { headers: this.getHeaders(), params: httpParams }
        );
    }

    consumeFreeProcess(
        introducerId: string
    ): Observable<ApiResponse<Introducer>> {
        return this.http
            .post<ApiResponse<Introducer>>(
                `${this.url}${this.endpoint}/${introducerId}/consume-free`,
                {},
                { headers: this.getHeaders() }
            )
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(
                        `${this.endpoint}_${introducerId}`
                    );
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Proceso gratuito',
                        detail: 'Proceso gratuito consumido correctamente',
                    });
                })
            );
    }

    getStatistics(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(
            `${this.url}${this.endpoint}/stats/overview`,
            { headers: this.getHeaders() }
        );
    }
}
