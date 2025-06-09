import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/demo/services/auth.service';
import { BaseService } from './base.service';
import {
    AnimalHealthCertificate,
    ApiResponse,
} from '../interfaces/slaughter.interface';
import { CacheService } from 'src/app/demo/services/cache.service';

@Injectable({
    providedIn: 'root',
})
export class AnimalHealthCertificateService extends BaseService<AnimalHealthCertificate> {
    constructor(
        protected override http: HttpClient,
        protected override cacheService: CacheService,
        protected override auth: AuthService
    ) {
        super(http, cacheService, auth, 'certificates');
    }

    findByCZPM(
        numeroCZPM: string
    ): Observable<ApiResponse<AnimalHealthCertificate>> {
        const token = this.token();
        return this.http.get<ApiResponse<AnimalHealthCertificate>>(
            `${this.url}${this.endpoint}/by-czpm/${numeroCZPM}`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    validateQR(qrData: string): Observable<ApiResponse<any>> {
        const token = this.token();
        return this.http.post<ApiResponse<any>>(
            `${this.url}${this.endpoint}/validate-qr`,
            { qrData },
            {
                headers: this.getHeaders(token),
            }
        );
    }

    validateForReception(certificateId: string): Observable<ApiResponse<any>> {
        const token = this.token();
        return this.http.post<ApiResponse<any>>(
            `${this.url}${this.endpoint}/${certificateId}/validate-for-reception`,
            {},
            {
                headers: this.getHeaders(token),
            }
        );
    }

    generateQR(certificateId: string): Observable<ApiResponse<any>> {
        const token = this.token();
        return this.http.post<ApiResponse<any>>(
            `${this.url}${this.endpoint}/${certificateId}/generate-qr`,
            {},
            {
                headers: this.getHeaders(token),
            }
        );
    }

    annulCertificate(
        certificateId: string,
        reason: string
    ): Observable<ApiResponse<AnimalHealthCertificate>> {
        const token = this.token();
        return this.http.post<ApiResponse<AnimalHealthCertificate>>(
            `${this.url}${this.endpoint}/${certificateId}/annul`,
            { reason },
            {
                headers: this.getHeaders(token),
            }
        );
    }

    getExpiringAlerts(): Observable<ApiResponse<AnimalHealthCertificate[]>> {
        const token = this.token();
        return this.http.get<ApiResponse<AnimalHealthCertificate[]>>(
            `${this.url}${this.endpoint}/alerts/expiring`,
            {
                headers: this.getHeaders(token),
            }
        );
    }
}
