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
        super('certificates');
    }

    findByCZPM(
        numeroCZPM: string
    ): Observable<ApiResponse<AnimalHealthCertificate>> {
        return this.http.get<ApiResponse<AnimalHealthCertificate>>(
            `${this.url}${this.endpoint}/by-czpm/${numeroCZPM}`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    validateQR(qrData: string): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(
            `${this.url}${this.endpoint}/validate-qr`,
            { qrData },
            {
                headers: this.getHeaders(),
            }
        );
    }

    validateForReception(certificateId: string): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(
            `${this.url}${this.endpoint}/${certificateId}/validate-for-reception`,
            {},
            {
                headers: this.getHeaders(),
            }
        );
    }

    generateQR(certificateId: string): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(
            `${this.url}${this.endpoint}/${certificateId}/generate-qr`,
            {},
            {
                headers: this.getHeaders(),
            }
        );
    }

    annulCertificate(
        certificateId: string,
        reason: string
    ): Observable<ApiResponse<AnimalHealthCertificate>> {
        return this.http.post<ApiResponse<AnimalHealthCertificate>>(
            `${this.url}${this.endpoint}/${certificateId}/annul`,
            { reason },
            {
                headers: this.getHeaders(),
            }
        );
    }

    getExpiringAlerts(): Observable<ApiResponse<AnimalHealthCertificate[]>> {
        return this.http.get<ApiResponse<AnimalHealthCertificate[]>>(
            `${this.url}${this.endpoint}/alerts/expiring`,
            {
                headers: this.getHeaders(),
            }
        );
    }
}
