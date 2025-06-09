import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/demo/services/auth.service';
import { BaseService } from './base.service';
import {
    ApiResponse,
    ExternalInspection,
    InspectionCriteria,
} from '../interfaces/slaughter.interface';
import { CacheService } from 'src/app/demo/services/cache.service';

@Injectable({
    providedIn: 'root',
})
export class ExternalInspectionService extends BaseService<ExternalInspection> {
    constructor(
        protected override http: HttpClient,
        protected override cacheService: CacheService,
        protected override auth: AuthService
    ) {
        super('process/external-inspection');
    }

    createInspection(data: {
        receptionId: string;
        animalId: string;
        resultadoInspeccion: 'APTO' | 'NO_APTO' | 'CONDICIONAL';
        observaciones?: string;
        criteriosEvaluacion: InspectionCriteria[];
    }): Observable<ApiResponse<ExternalInspection>> {
        return this.http.post<ApiResponse<ExternalInspection>>(
            `${this.url}${this.endpoint}`,
            data,
            {
                headers: this.getHeaders(),
            }
        );
    }

    getInspectionsByReception(
        receptionId: string
    ): Observable<ApiResponse<ExternalInspection[]>> {
        return this.http.get<ApiResponse<ExternalInspection[]>>(
            `${this.url}${this.endpoint}/by-reception/${receptionId}`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    updateInspectionResult(
        inspectionId: string,
        data: {
            resultadoInspeccion: 'APTO' | 'NO_APTO' | 'CONDICIONAL';
            observaciones?: string;
            criteriosEvaluacion?: InspectionCriteria[];
        }
    ): Observable<ApiResponse<ExternalInspection>> {
        return this.http.put<ApiResponse<ExternalInspection>>(
            `${this.url}${this.endpoint}/${inspectionId}/result`,
            data,
            {
                headers: this.getHeaders(),
            }
        );
    }

    generateInspectionReport(
        inspectionId: string
    ): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(
            `${this.url}${this.endpoint}/${inspectionId}/report`,
            {
                headers: this.getHeaders(),
            }
        );
    }
}
