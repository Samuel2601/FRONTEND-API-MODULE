import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/demo/services/auth.service';
import { BaseService } from './base.service';
import {
    ApiResponse,
    Invoice,
    Rate,
    RateCalculationRequest,
    RateCalculationResponse,
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
        super(http, cacheService, auth, 'rates');
    }

    setupDefaultRates(): Observable<ApiResponse<any>> {
        const token = this.token();
        return this.http.post<ApiResponse<any>>(
            `${this.url}${this.endpoint}/setup-defaults`,
            {},
            {
                headers: this.getHeaders(token),
            }
        );
    }

    getInscriptionRates(): Observable<ApiResponse<Rate[]>> {
        const token = this.token();
        return this.http.get<ApiResponse<Rate[]>>(
            `${this.url}${this.endpoint}/inscription-rates`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    getRateByCode(code: string): Observable<ApiResponse<Rate>> {
        const token = this.token();
        return this.http.get<ApiResponse<Rate>>(
            `${this.url}${this.endpoint}/by-code/${code}`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    getRatesByType(type: string): Observable<ApiResponse<Rate[]>> {
        const token = this.token();
        return this.http.get<ApiResponse<Rate[]>>(
            `${this.url}${this.endpoint}/by-type/${type}`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    validateFormula(data: {
        formula: string;
        testData?: any;
    }): Observable<ApiResponse<any>> {
        const token = this.token();
        return this.http.post<ApiResponse<any>>(
            `${this.url}${this.endpoint}/validate-formula`,
            data,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    simulateRateApplication(data: {
        rateId: string;
        testScenarios: any[];
    }): Observable<ApiResponse<any>> {
        const token = this.token();
        return this.http.post<ApiResponse<any>>(
            `${this.url}${this.endpoint}/simulate`,
            data,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    getReferenceValues(): Observable<ApiResponse<ReferenceValue[]>> {
        const token = this.token();
        return this.http.get<ApiResponse<ReferenceValue[]>>(
            `${this.url}${this.endpoint}/reference-values`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    updateReferenceValue(
        code: string,
        data: { value: number | any }
    ): Observable<ApiResponse<ReferenceValue>> {
        const token = this.token();
        return this.http.put<ApiResponse<ReferenceValue>>(
            `${this.url}${this.endpoint}/reference-value/${code}`,
            data,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    getRateHistory(id: string): Observable<ApiResponse<any[]>> {
        const token = this.token();
        return this.http.get<ApiResponse<any[]>>(
            `${this.url}${this.endpoint}/${id}/history`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    createRateDetail(
        rateId: string,
        data: Partial<RateDetail>
    ): Observable<ApiResponse<RateDetail>> {
        const token = this.token();
        return this.http.post<ApiResponse<RateDetail>>(
            `${this.url}${this.endpoint}/${rateId}/detail`,
            data,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    getRateDetails(rateId: string): Observable<ApiResponse<RateDetail[]>> {
        const token = this.token();
        return this.http.get<ApiResponse<RateDetail[]>>(
            `${this.url}${this.endpoint}/${rateId}/details`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    updateRateDetail(
        detailId: string,
        data: Partial<RateDetail>
    ): Observable<ApiResponse<RateDetail>> {
        const token = this.token();
        return this.http.put<ApiResponse<RateDetail>>(
            `${this.url}${this.endpoint}/detail/${detailId}`,
            data,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    calculateRateDetailValue(
        detailId: string,
        data: any
    ): Observable<ApiResponse<any>> {
        const token = this.token();
        return this.http.post<ApiResponse<any>>(
            `${this.url}${this.endpoint}/detail/${detailId}/calculate`,
            data,
            {
                headers: this.getHeaders(token),
            }
        );
    }
}
