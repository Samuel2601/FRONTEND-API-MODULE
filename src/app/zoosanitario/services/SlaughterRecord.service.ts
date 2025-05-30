import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { HttpClient } from '@angular/common/http';
import { CacheService } from 'src/app/demo/services/cache.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class SlaughterRecordService extends BaseService<any> {
    constructor(
        http: HttpClient,
        cacheService: CacheService,
        auth: AuthService
    ) {
        super(http, cacheService, auth, 'slaughterrecord');
    }

    getByExternalSheetId(externalSheetId: string): Observable<any[]> {
        const token = this.token();
        return this.http.get<any[]>(
            `${this.url}${this.endpoint}/external-sheet/${externalSheetId}`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    calculateSummary(id: string): Observable<any> {
        const token = this.token();
        return this.http.post(
            `${this.url}${this.endpoint}/${id}/calculate-summary`,
            {},
            {
                headers: this.getHeaders(token),
            }
        );
    }
}
