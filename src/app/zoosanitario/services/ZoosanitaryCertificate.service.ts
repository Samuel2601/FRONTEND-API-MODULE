import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { HttpClient } from '@angular/common/http';
import { CacheService } from 'src/app/demo/services/cache.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { Observable, tap } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ZoosanitaryCertificateService extends BaseService<any> {
    constructor(
        http: HttpClient,
        cacheService: CacheService,
        auth: AuthService
    ) {
        super(http, cacheService, auth, '/zoosanitarycertificate');
    }

    validateByQR(certificateNumber: string): Observable<any> {
        const token = this.token();
        return this.http.get(
            `${this.url}${this.endpoint}/validate/${certificateNumber}`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    checkValidUntil(certificateId: string): Observable<boolean> {
        return this.getById(certificateId).pipe(
            tap((cert) => {
                const validUntil = new Date(cert.validUntil);
                const now = new Date();
                return validUntil > now;
            })
        );
    }
}
