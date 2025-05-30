import { Injectable } from '@angular/core';
import { BaseService } from './base.service';
import { HttpClient } from '@angular/common/http';
import { CacheService } from 'src/app/demo/services/cache.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ShippingSheetService extends BaseService<any> {
    constructor(
        http: HttpClient,
        cacheService: CacheService,
        auth: AuthService
    ) {
        super(http, cacheService, auth, 'shippingsheet');
    }

    getByInternalSheetId(internalSheetId: string): Observable<any[]> {
        const token = this.token();
        return this.http.get<any[]>(
            `${this.url}${this.endpoint}/internal-sheet/${internalSheetId}`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    updateTracking(id: string, trackingData: any): Observable<any> {
        const token = this.token();
        return this.http.patch(
            `${this.url}${this.endpoint}/${id}/tracking`,
            trackingData,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    markAsDelivered(id: string, deliveryData: any): Observable<any> {
        const token = this.token();
        return this.http.patch(
            `${this.url}${this.endpoint}/${id}/delivered`,
            deliveryData,
            {
                headers: this.getHeaders(token),
            }
        );
    }
}
