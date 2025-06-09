import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/demo/services/auth.service';
import { BaseService } from './base.service';
import {
    ApiResponse,
    Invoice,
    RateCalculationRequest,
    RateCalculationResponse,
} from '../interfaces/slaughter.interface';
import { CacheService } from 'src/app/demo/services/cache.service';

@Injectable({
    providedIn: 'root',
})
export class InvoiceService extends BaseService<Invoice> {
    constructor(
        protected override http: HttpClient,
        protected override cacheService: CacheService,
        protected override auth: AuthService
    ) {
        super(http, cacheService, auth, 'invoices');
    }

    generateInscriptionInvoice(data: {
        introducerId: string;
        animalType: string;
    }): Observable<ApiResponse<Invoice>> {
        const token = this.token();
        return this.http.post<ApiResponse<Invoice>>(
            `${this.url}${this.endpoint}/inscription`,
            data,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    generateSlaughterServicesInvoice(data: {
        slaughterProcessId: string;
        services: any[];
        additionalCharges?: any[];
        penalties?: any[];
        permits?: any[];
    }): Observable<ApiResponse<Invoice>> {
        const token = this.token();
        return this.http.post<ApiResponse<Invoice>>(
            `${this.url}${this.endpoint}/slaughter-services`,
            data,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    calculateInvoiceCosts(
        data: RateCalculationRequest
    ): Observable<ApiResponse<RateCalculationResponse>> {
        const token = this.token();
        return this.http.post<ApiResponse<RateCalculationResponse>>(
            `${this.url}${this.endpoint}/calculate`,
            data,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    calculateStageSpecificCosts(data: {
        stage:
            | 'external_inspection'
            | 'slaughter'
            | 'internal_inspection'
            | 'dispatch';
        introducerId: string;
        animals?: any[];
        additionalServices?: any[];
        penalties?: any[];
        permits?: any[];
        prolongedStayHours?: number;
        externalProducts?: any[];
        poultryProducts?: any[];
    }): Observable<ApiResponse<RateCalculationResponse>> {
        const token = this.token();
        return this.http.post<ApiResponse<RateCalculationResponse>>(
            `${this.url}${this.endpoint}/process/calculate-stage`,
            data,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    registerPayment(
        id: string,
        data: {
            amount: number;
            method: string;
            reference?: string;
            notes?: string;
        }
    ): Observable<ApiResponse<Invoice>> {
        const token = this.token();
        return this.http.post<ApiResponse<Invoice>>(
            `${this.url}${this.endpoint}/${id}/payment`,
            data,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    checkFreeUses(introducerId: string): Observable<ApiResponse<any>> {
        const token = this.token();
        return this.http.get<ApiResponse<any>>(
            `${this.url}${this.endpoint}/free-uses/${introducerId}`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    getPendingInvoices(
        introducerId: string
    ): Observable<ApiResponse<Invoice[]>> {
        const token = this.token();
        return this.http.get<ApiResponse<Invoice[]>>(
            `${this.url}${this.endpoint}/pending/${introducerId}`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    getBillingStatistics(): Observable<ApiResponse<any>> {
        const token = this.token();
        return this.http.get<ApiResponse<any>>(
            `${this.url}${this.endpoint}/statistics/billing`,
            {
                headers: this.getHeaders(token),
            }
        );
    }
}
