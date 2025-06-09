import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/demo/services/auth.service';
import { BaseService } from './base.service';
import {
    ApiResponse,
    SlaughterProcess,
} from '../interfaces/slaughter.interface';
import { CacheService } from 'src/app/demo/services/cache.service';

@Injectable({
    providedIn: 'root',
})
export class SlaughterProcessService extends BaseService<SlaughterProcess> {
    constructor(
        protected override http: HttpClient,
        protected override cacheService: CacheService,
        protected override auth: AuthService
    ) {
        super(http, cacheService, auth, 'process/slaughter');
    }

    createSlaughterProcess(data: {
        introducerId: string;
        receptionId: string;
        externalInspectionIds: string[];
    }): Observable<ApiResponse<SlaughterProcess>> {
        const token = this.token();
        return this.http.post<ApiResponse<SlaughterProcess>>(
            `${this.url}${this.endpoint}`,
            data,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    updateProcessStatus(
        processId: string,
        status: string
    ): Observable<ApiResponse<SlaughterProcess>> {
        const token = this.token();
        return this.http.put<ApiResponse<SlaughterProcess>>(
            `${this.url}${this.endpoint}/${processId}/status`,
            { status },
            {
                headers: this.getHeaders(token),
            }
        );
    }

    addInternalInspection(
        processId: string,
        inspectionId: string
    ): Observable<ApiResponse<SlaughterProcess>> {
        const token = this.token();
        return this.http.post<ApiResponse<SlaughterProcess>>(
            `${this.url}${this.endpoint}/${processId}/internal-inspection`,
            { inspectionId },
            {
                headers: this.getHeaders(token),
            }
        );
    }

    getProcessSummary(processId: string): Observable<ApiResponse<any>> {
        const token = this.token();
        return this.http.get<ApiResponse<any>>(
            `${this.url}${this.endpoint}/${processId}/summary`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    generateProcessReport(processId: string): Observable<ApiResponse<any>> {
        const token = this.token();
        return this.http.get<ApiResponse<any>>(
            `${this.url}${this.endpoint}/${processId}/report`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    getProcessesByIntroducer(
        introducerId: string
    ): Observable<ApiResponse<SlaughterProcess[]>> {
        const token = this.token();
        return this.http.get<ApiResponse<SlaughterProcess[]>>(
            `${this.url}${this.endpoint}/by-introducer/${introducerId}`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    getProcessStatistics(): Observable<ApiResponse<any>> {
        const token = this.token();
        return this.http.get<ApiResponse<any>>(
            `${this.url}${this.endpoint}/statistics`,
            {
                headers: this.getHeaders(token),
            }
        );
    }
}
