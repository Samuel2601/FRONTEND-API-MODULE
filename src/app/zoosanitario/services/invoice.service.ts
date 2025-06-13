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
import { MessageService } from 'primeng/api';

@Injectable({
    providedIn: 'root',
})
export class InvoiceService extends BaseService<Invoice> {
    constructor(
        http: HttpClient,
        messageService: MessageService,
        cacheService: CacheService,
        auth: AuthService
    ) {
        super('invoices');
    }

    generateInscriptionInvoice(data: {
        introducerId: string;
        animalType: string;
    }): Observable<ApiResponse<Invoice>> {
        return this.http.post<ApiResponse<Invoice>>(
            `${this.url}${this.endpoint}/inscription`,
            data,
            {
                headers: this.getHeaders(),
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
        return this.http.post<ApiResponse<Invoice>>(
            `${this.url}${this.endpoint}/slaughter-services`,
            data,
            {
                headers: this.getHeaders(),
            }
        );
    }

    calculateInvoiceCosts(
        data: RateCalculationRequest
    ): Observable<ApiResponse<RateCalculationResponse>> {
        return this.http.post<ApiResponse<RateCalculationResponse>>(
            `${this.url}${this.endpoint}/calculate`,
            data,
            {
                headers: this.getHeaders(),
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
        return this.http.post<ApiResponse<RateCalculationResponse>>(
            `${this.url}${this.endpoint}/process/calculate-stage`,
            data,
            {
                headers: this.getHeaders(),
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
        return this.http.post<ApiResponse<Invoice>>(
            `${this.url}${this.endpoint}/${id}/payment`,
            data,
            {
                headers: this.getHeaders(),
            }
        );
    }

    checkFreeUses(introducerId: string): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(
            `${this.url}${this.endpoint}/free-uses/${introducerId}`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    getPendingInvoices(
        introducerId: string
    ): Observable<ApiResponse<Invoice[]>> {
        return this.http.get<ApiResponse<Invoice[]>>(
            `${this.url}${this.endpoint}/pending/${introducerId}`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    getBillingStatistics(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(
            `${this.url}${this.endpoint}/statistics/billing`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    postInvoiceSlaughterProcesses(
        slaughterProcessId: string
    ): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(
            `${this.url}${this.endpoint}/slaughter-process/${slaughterProcessId}`,
            {},
            {
                headers: this.getHeaders(),
            }
        );
    }
}
