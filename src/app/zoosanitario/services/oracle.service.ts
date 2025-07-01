// src/app/demo/services/oracle.service.ts

import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import {
    Observable,
    of,
    catchError,
    tap,
    shareReplay,
    map,
    throwError,
} from 'rxjs';
import { BaseService } from './base.service';

export interface OracleCredentials {
    oracleUser: string;
    oraclePassword: string;
    connectString: string;
}

export interface ConnectionTestResult {
    success: boolean;
    message: string;
    connectionStatus?: boolean;
    error?: any;
}

@Injectable({
    providedIn: 'root',
})
export class OracleService extends BaseService<void> {
    constructor() {
        super('oracle');
    }

    testConnection(): Observable<ConnectionTestResult> {
        return this.http
            .get<ConnectionTestResult>(
                `${this.url}${this.endpoint}/test-connection`,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(
                catchError((error) => {
                    if (
                        error.status === 400 &&
                        error.error?.message?.includes('credenciales activas')
                    ) {
                        return throwError(() => ({
                            ...error,
                            needsCredentials: true,
                        }));
                    }
                    return throwError(() => error);
                })
            );
    }

    setupConnection(
        credentials: OracleCredentials
    ): Observable<ConnectionTestResult> {
        return this.http.post<ConnectionTestResult>(
            `${this.url}${this.endpoint}/setup-connection`,
            credentials,
            {
                headers: this.getHeaders(),
            }
        );
    }

    createIntroducer(introducerId: string): Observable<any> {
        return this.http
            .post<any>(
                `${this.url}${this.endpoint}/introductor/${introducerId}`,
                {},
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(catchError((error) => this.handleCredentialsError(error)));
    }

    createInvoiceEmiaut(invoiceId: string): Observable<any> {
        return this.http
            .post<any>(
                `${this.url}${this.endpoint}/factura/emiaut/${invoiceId}`,
                {},
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(catchError((error) => this.handleCredentialsError(error)));
    }

    checkPaymentStatusUpdated(invoiceId: string): Observable<any> {
        return this.http
            .get<any>(
                `${this.url}${this.endpoint}/factura/payment/updated/${invoiceId}`,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(catchError((error) => this.handleCredentialsError(error)));
    }

    getStatusTitleNumber(titleNumber: string): Observable<any> {
        return this.http
            .get<any>(
                `${this.url}${this.endpoint}/titulo/${titleNumber}/estado`,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(catchError((error) => this.handleCredentialsError(error)));
    }

    syncInvoicesBatch(invoiceIds: string[]): Observable<any> {
        return this.http
            .post<any>(
                `${this.url}${this.endpoint}/factura/sync/batch`,
                { invoiceIds },
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(catchError((error) => this.handleCredentialsError(error)));
    }

    checkPaymentsBatch(invoiceIds: string[]): Observable<any> {
        return this.http
            .post<any>(
                `${this.url}${this.endpoint}/factura/payment/batch`,
                { invoiceIds },
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(catchError((error) => this.handleCredentialsError(error)));
    }

    calculateInvoice(invoiceId: string): Observable<any> {
        return this.http
            .post<any>(
                `${this.url}${this.endpoint}/factura/calculate/${invoiceId}`,
                {},
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(catchError((error) => this.handleCredentialsError(error)));
    }

    calculateInvoiceItems(items: any[]): Observable<any> {
        return this.http
            .post<any>(
                `${this.url}${this.endpoint}/factura/calculate/items`,
                { items },
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(catchError((error) => this.handleCredentialsError(error)));
    }

    getSimulationData(titleNumber: string): Observable<any> {
        return this.http
            .get<any>(
                `${this.url}${this.endpoint}/simulation-data/${titleNumber}`,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(catchError((error) => this.handleCredentialsError(error)));
    }

    getPaymentStatusDetails(invoiceId: string): Observable<any> {
        return this.http
            .get<any>(
                `${this.url}${this.endpoint}/payment-status-details/${invoiceId}`,
                {
                    headers: this.getHeaders(),
                }
            )
            .pipe(catchError((error) => this.handleCredentialsError(error)));
    }

    private handleCredentialsError(error: any): Observable<never> {
        if (
            error.status === 400 &&
            error.error?.message?.includes('credenciales activas')
        ) {
            return throwError(() => ({
                ...error,
                needsCredentials: true,
            }));
        }
        return throwError(() => error);
    }
}
