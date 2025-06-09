import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/demo/services/auth.service';
import { BaseService } from './base.service';
import { ApiResponse, ReferenceValue } from '../interfaces/slaughter.interface';
import { CacheService } from 'src/app/demo/services/cache.service';

@Injectable({
    providedIn: 'root',
})
export class ReferenceValueService extends BaseService<ReferenceValue> {
    constructor(
        protected override http: HttpClient,
        protected override cacheService: CacheService,
        protected override auth: AuthService
    ) {
        super(http, cacheService, auth, 'rates/reference-values');
    }

    updateRBU(value: number): Observable<ApiResponse<ReferenceValue>> {
        const token = this.token();
        return this.http.put<ApiResponse<ReferenceValue>>(
            `${this.url}rates/reference-value/RBU`,
            { value },
            {
                headers: this.getHeaders(token),
            }
        );
    }

    updateSBU(value: number): Observable<ApiResponse<ReferenceValue>> {
        const token = this.token();
        return this.http.put<ApiResponse<ReferenceValue>>(
            `${this.url}rates/reference-value/SBU`,
            { value },
            {
                headers: this.getHeaders(token),
            }
        );
    }

    getActiveValues(): Observable<ApiResponse<ReferenceValue[]>> {
        const token = this.token();
        let httpParams = new HttpParams().set('isActive', 'true');

        return this.http.get<ApiResponse<ReferenceValue[]>>(
            `${this.url}${this.endpoint}`,
            {
                headers: this.getHeaders(token),
                params: httpParams,
            }
        );
    }

    getValueByCode(code: string): Observable<ApiResponse<ReferenceValue>> {
        const token = this.token();
        return this.http.get<ApiResponse<ReferenceValue>>(
            `${this.url}${this.endpoint}/by-code/${code}`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    updateValueConfig(
        code: string,
        config: any
    ): Observable<ApiResponse<ReferenceValue>> {
        const token = this.token();
        return this.http.put<ApiResponse<ReferenceValue>>(
            `${this.url}rates/reference-value/${code}`,
            config,
            {
                headers: this.getHeaders(token),
            }
        );
    }
}
