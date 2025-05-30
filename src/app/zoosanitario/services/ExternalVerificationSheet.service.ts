import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { HttpClient } from '@angular/common/http';
import { CacheService } from 'src/app/demo/services/cache.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ExternalVerificationSheetService extends BaseService<any> {
    constructor(
        http: HttpClient,
        cacheService: CacheService,
        auth: AuthService
    ) {
        super(http, cacheService, auth, '/externalverificationsheet');
    }

    getByCertificateId(certificateId: string): Observable<any[]> {
        const token = this.token();
        return this.http.get<any[]>(
            `${this.url}${this.endpoint}/certificate/${certificateId}`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    updateStatus(id: string, status: string): Observable<any> {
        const token = this.token();
        return this.http.patch(
            `${this.url}${this.endpoint}/${id}/status`,
            { status },
            {
                headers: this.getHeaders(token),
            }
        );
    }
}
