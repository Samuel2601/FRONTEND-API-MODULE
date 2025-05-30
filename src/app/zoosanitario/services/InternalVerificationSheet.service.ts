import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { HttpClient } from '@angular/common/http';
import { CacheService } from 'src/app/demo/services/cache.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class InternalVerificationSheetService extends BaseService<any> {
    constructor(
        http: HttpClient,
        cacheService: CacheService,
        auth: AuthService
    ) {
        super(http, cacheService, auth, 'internalverificationsheet');
    }

    getBySlaughterRecordId(slaughterRecordId: string): Observable<any[]> {
        const token = this.token();
        return this.http.get<any[]>(
            `${this.url}${this.endpoint}/slaughter-record/${slaughterRecordId}`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    classifyProduct(
        id: string,
        productId: string,
        classification: string
    ): Observable<any> {
        const token = this.token();
        return this.http.patch(
            `${this.url}${this.endpoint}/${id}?classify=${productId}`,
            { classification },
            {
                headers: this.getHeaders(token),
            }
        );
    }
}
