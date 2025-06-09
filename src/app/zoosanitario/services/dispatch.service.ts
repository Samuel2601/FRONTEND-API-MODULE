import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/demo/services/auth.service';
import { BaseService } from './base.service';
import {
    ApiResponse,
    Dispatch,
    DispatchProduct,
} from '../interfaces/slaughter.interface';
import { CacheService } from 'src/app/demo/services/cache.service';

@Injectable({
    providedIn: 'root',
})
export class DispatchService extends BaseService<Dispatch> {
    constructor(
        protected override http: HttpClient,
        protected override cacheService: CacheService,
        protected override auth: AuthService
    ) {
        super(http, cacheService, auth, 'process/dispatch');
    }

    createDispatch(data: {
        slaughterProcessId: string;
        tipoDespacho:
            | 'PRODUCTOS_FAENADOS'
            | 'ANIMALES_DEVUELTOS'
            | 'PRODUCTOS_RECHAZADOS';
        vehiculo: any;
        productos: DispatchProduct[];
        destino: any;
        observaciones?: string;
    }): Observable<ApiResponse<Dispatch>> {
        const token = this.token();
        return this.http.post<ApiResponse<Dispatch>>(
            `${this.url}${this.endpoint}`,
            data,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    updateDispatchStatus(
        dispatchId: string,
        status: string
    ): Observable<ApiResponse<Dispatch>> {
        const token = this.token();
        return this.http.put<ApiResponse<Dispatch>>(
            `${this.url}${this.endpoint}/${dispatchId}/status`,
            { status },
            {
                headers: this.getHeaders(token),
            }
        );
    }

    getDispatchesByProcess(
        processId: string
    ): Observable<ApiResponse<Dispatch[]>> {
        const token = this.token();
        return this.http.get<ApiResponse<Dispatch[]>>(
            `${this.url}${this.endpoint}/by-process/${processId}`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    generateDispatchGuide(dispatchId: string): Observable<ApiResponse<any>> {
        const token = this.token();
        return this.http.get<ApiResponse<any>>(
            `${this.url}${this.endpoint}/${dispatchId}/guide`,
            {
                headers: this.getHeaders(token),
            }
        );
    }

    getDispatchStatistics(): Observable<ApiResponse<any>> {
        const token = this.token();
        return this.http.get<ApiResponse<any>>(
            `${this.url}${this.endpoint}/statistics`,
            {
                headers: this.getHeaders(token),
            }
        );
    }
}
