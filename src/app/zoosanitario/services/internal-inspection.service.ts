import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/demo/services/auth.service';
import { BaseService } from './base.service';
import {
    ApiResponse,
    InspectionCriteria,
    InternalInspection,
} from '../interfaces/slaughter.interface';
import { CacheService } from 'src/app/demo/services/cache.service';

@Injectable({
    providedIn: 'root',
})
export class InternalInspectionService extends BaseService<InternalInspection> {
    constructor(
        protected override http: HttpClient,
        protected override cacheService: CacheService,
        protected override auth: AuthService
    ) {
        super('process/internal-inspection');
    }

    createInspection(data: {
        slaughterProcessId: string;
        animalId: string;
        resultadoInspeccion:
            | 'APTO'
            | 'NO_APTO'
            | 'DECOMISO_PARCIAL'
            | 'DECOMISO_TOTAL';
        observaciones?: string;
        criteriosEvaluacion: InspectionCriteria[];
        clasificacionFinal?: string;
    }): Observable<ApiResponse<InternalInspection>> {
        return this.http.post<ApiResponse<InternalInspection>>(
            `${this.url}${this.endpoint}`,
            data,
            {
                headers: this.getHeaders(),
            }
        );
    }

    getInspectionsByProcess(
        processId: string
    ): Observable<ApiResponse<InternalInspection[]>> {
        return this.http.get<ApiResponse<InternalInspection[]>>(
            `${this.url}${this.endpoint}/by-process/${processId}`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    updateInspectionResult(
        inspectionId: string,
        data: {
            resultadoInspeccion:
                | 'APTO'
                | 'NO_APTO'
                | 'DECOMISO_PARCIAL'
                | 'DECOMISO_TOTAL';
            observaciones?: string;
            criteriosEvaluacion?: InspectionCriteria[];
            clasificacionFinal?: string;
        }
    ): Observable<ApiResponse<InternalInspection>> {
        return this.http.put<ApiResponse<InternalInspection>>(
            `${this.url}${this.endpoint}/${inspectionId}/result`,
            data,
            {
                headers: this.getHeaders(),
            }
        );
    }

    generateQualityReport(inspectionId: string): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(
            `${this.url}${this.endpoint}/${inspectionId}/quality-report`,
            {
                headers: this.getHeaders(),
            }
        );
    }
}
