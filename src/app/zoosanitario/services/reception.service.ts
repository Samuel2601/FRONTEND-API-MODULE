import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/demo/services/auth.service';
import { BaseService } from './base.service';
import {
    ApiResponse,
    Reception,
    ReceptionAnimal,
} from '../interfaces/slaughter.interface';
import { CacheService } from 'src/app/demo/services/cache.service';

@Injectable({
    providedIn: 'root',
})
export class ReceptionService extends BaseService<Reception> {
    constructor(
        protected override http: HttpClient,
        protected override cacheService: CacheService,
        protected override auth: AuthService
    ) {
        super('process/reception');
    }

    createReception(data: {
        introducerId: string;
        certificadoZoosanitario: string;
        animales: ReceptionAnimal[];
        transporte: any;
        observaciones?: string;
    }): Observable<ApiResponse<Reception>> {
        return this.http.post<ApiResponse<Reception>>(
            `${this.url}${this.endpoint}`,
            data,
            {
                headers: this.getHeaders(),
            }
        );
    }

    updateReceptionStatus(
        receptionId: string,
        status: string,
        observations?: string
    ): Observable<ApiResponse<Reception>> {
        return this.http.put<ApiResponse<Reception>>(
            `${this.url}${this.endpoint}/${receptionId}/status`,
            { status, observations },
            {
                headers: this.getHeaders(),
            }
        );
    }

    getReceptionsByIntroducer(
        introducerId: string
    ): Observable<ApiResponse<Reception[]>> {
        return this.http.get<ApiResponse<Reception[]>>(
            `${this.url}${this.endpoint}/by-introducer/${introducerId}`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    getReceptionStatistics(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(
            `${this.url}${this.endpoint}/statistics`,
            {
                headers: this.getHeaders(),
            }
        );
    }
}
