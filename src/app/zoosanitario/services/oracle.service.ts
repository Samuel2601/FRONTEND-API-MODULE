// src/app/demo/services/invoice.service.ts

import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, of, catchError, tap, shareReplay, map } from 'rxjs';
import { BaseService } from './base.service';

@Injectable({
    providedIn: 'root',
})
export class OracleService extends BaseService<void> {
    constructor() {
        super('oracle');
    }

    testConnection(): Observable<any> {
        return this.http.get<any>(
            `${this.url}${this.endpoint}/test-connection`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    createIntroducer(introducerId: string): Observable<any> {
        return this.http.post<any>(
            `${this.url}${this.endpoint}/introductor/${introducerId}`,
            {},
            {
                headers: this.getHeaders(),
            }
        );
    }

    createInvoiceEmiaut(invoiceId: string): Observable<any> {
        return this.http.post<any>(
            `${this.url}${this.endpoint}/factura/emiaut/${invoiceId}`,
            {},
            {
                headers: this.getHeaders(),
            }
        );
    }

    checkPaymentStatusUpdated(invoiceId: string): Observable<any> {
        return this.http.get<any>(
            `${this.url}${this.endpoint}/factura/payment/updated/${invoiceId}`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    getStatusTitleNumber(titleNumber: string): Observable<any> {
        return this.http.get<any>(
            `${this.url}${this.endpoint}/titulo/${titleNumber}/estado`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    syncInvoicesBatch(invoiceIds: string[]): Observable<any> {
        return this.http.post<any>(
            `${this.url}${this.endpoint}/factura/sync/batch`,
            { invoiceIds },
            {
                headers: this.getHeaders(),
            }
        );
    }

    checkPaymentsBatch(invoiceIds: string[]): Observable<any> {
        return this.http.post<any>(
            `${this.url}${this.endpoint}/factura/payment/batch`,
            { invoiceIds },
            {
                headers: this.getHeaders(),
            }
        );
    }

    calculateInvoice(invoiceId: string): Observable<any> {
        return this.http.post<any>(
            `${this.url}${this.endpoint}/factura/calculate/${invoiceId}`,
            {},
            {
                headers: this.getHeaders(),
            }
        );
    }

    calculateInvoiceItems(items: any[]): any {
        return this.http.post<any>(
            `${this.url}${this.endpoint}/factura/calculate/items`,
            { items },
            {
                headers: this.getHeaders(),
            }
        );
    }
}
