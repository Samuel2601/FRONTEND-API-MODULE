import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
        super(http, cacheService, auth, 'introducers');
    }

    findByIdNumber(idNumber: string): Observable<ApiResponse<Introducer>> {
        const token = this.token();
        return this.http.get<ApiResponse<Introducer>>(
            `${this.url}${this.endpoint}/by-id/${idNumber}`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    findByRuc(ruc: string): Observable<ApiResponse<Introducer>> {
        const token = this.token();
        return this.http.get<ApiResponse<Introducer>>(
            `${this.url}${this.endpoint}/by-ruc/${ruc}`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    validateForProcess(introducerId: string): Observable<ApiResponse<any>> {
        const token = this.token();
        return this.http.get<ApiResponse<any>>(
            `${this.url}${this.endpoint}/${introducerId}/validate-process`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    getProcessHistory(
        introducerId: string
    ): Observable<ApiResponse<SlaughterProcess[]>> {
        const token = this.token();
        return this.http.get<ApiResponse<SlaughterProcess[]>>(
            `${this.url}${this.endpoint}/${introducerId}/process-history`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    getFinancialSummary(introducerId: string): Observable<ApiResponse<any>> {
        const token = this.token();
        return this.http.get<ApiResponse<any>>(
            `${this.url}${this.endpoint}/${introducerId}/financial-summary`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    updateRegistrationStatus(
        introducerId: string,
        status: string
    ): Observable<ApiResponse<Introducer>> {
        const token = this.token();
        return this.http.put<ApiResponse<Introducer>>(
            `${this.url}${this.endpoint}/${introducerId}/status`,
            { status },
            {
                headers: this.getHeaders(token),
            }
        );
    }
}
