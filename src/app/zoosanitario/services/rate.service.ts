import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/demo/services/auth.service';
import { BaseService } from './base.service';
import {
    ApiResponse,
    Rate,
    RateDetail,
    ReferenceValue,
} from '../interfaces/slaughter.interface';
import { CacheService } from 'src/app/demo/services/cache.service';

@Injectable({
    providedIn: 'root',
})
export class RateService extends BaseService<Rate> {
    constructor(
        protected override http: HttpClient,
        protected override cacheService: CacheService,
        protected override auth: AuthService
    ) {
        super('rates');
    }

    setupDefaultRates(): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(
            `${this.url}${this.endpoint}/setup-defaults`,
            {},
            {
                headers: this.getHeaders(),
            }
        );
    }

    getInscriptionRates(): Observable<ApiResponse<Rate[]>> {
        return this.http.get<ApiResponse<Rate[]>>(
            `${this.url}${this.endpoint}/inscription-rates`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    getRateByCode(code: string): Observable<ApiResponse<Rate>> {
        return this.http.get<ApiResponse<Rate>>(
            `${this.url}${this.endpoint}/by-code/${code}`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    getRatesByType(type: string): Observable<ApiResponse<Rate[]>> {
        return this.http.get<ApiResponse<Rate[]>>(
            `${this.url}${this.endpoint}/by-type/${type}`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    validateFormula(data: {
        formula: string;
        testData?: any;
    }): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(
            `${this.url}${this.endpoint}/validate-formula`,
            data,
            {
                headers: this.getHeaders(),
            }
        );
    }

    simulateRateApplication(data: {
        rateId: string;
        testScenarios: any[];
    }): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(
            `${this.url}${this.endpoint}/simulate`,
            data,
            {
                headers: this.getHeaders(),
            }
        );
    }

    getReferenceValues(): Observable<ApiResponse<ReferenceValue[]>> {
        return this.http.get<ApiResponse<ReferenceValue[]>>(
            `${this.url}${this.endpoint}/reference-values`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    updateReferenceValue(
        code: string,
        data: { value: number | any }
    ): Observable<ApiResponse<ReferenceValue>> {
        return this.http.put<ApiResponse<ReferenceValue>>(
            `${this.url}${this.endpoint}/reference-value/${code}`,
            data,
            {
                headers: this.getHeaders(),
            }
        );
    }

    getRateHistory(id: string): Observable<ApiResponse<any[]>> {
        return this.http.get<ApiResponse<any[]>>(
            `${this.url}${this.endpoint}/${id}/history`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    createRateDetail(
        rateId: string,
        data: Partial<RateDetail>
    ): Observable<ApiResponse<RateDetail>> {
        return this.http.post<ApiResponse<RateDetail>>(
            `${this.url}${this.endpoint}/${rateId}/detail`,
            data,
            {
                headers: this.getHeaders(),
            }
        );
    }

    getRateDetails(rateId: string): Observable<ApiResponse<RateDetail[]>> {
        return this.http.get<ApiResponse<RateDetail[]>>(
            `${this.url}${this.endpoint}/${rateId}/details`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    updateRateDetail(
        detailId: string,
        data: Partial<RateDetail>
    ): Observable<ApiResponse<RateDetail>> {
        return this.http.put<ApiResponse<RateDetail>>(
            `${this.url}${this.endpoint}/detail/${detailId}`,
            data,
            {
                headers: this.getHeaders(),
            }
        );
    }

    calculateRateDetailValue(
        detailId: string,
        data: any
    ): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(
            `${this.url}${this.endpoint}/detail/${detailId}/calculate`,
            data,
            {
                headers: this.getHeaders(),
            }
        );
    }
}
