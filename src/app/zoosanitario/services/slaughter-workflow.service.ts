import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/demo/services/auth.service';
import { ApiResponse } from '../interfaces/slaughter.interface';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';

@Injectable({
    providedIn: 'root',
})
export class SlaughterWorkflowService {
    constructor(private http: HttpClient, private auth: AuthService) {}

    private get url(): string {
        return GLOBAL.url_zoosanitario;
    }

    private getHeaders(): HttpHeaders {
        return new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: this.auth.token(),
        });
    }

    validateWorkflowTransition(data: {
        currentStage: string;
        targetStage: string;
        processId: string;
        conditions?: any;
    }): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(
            `${this.url}workflow/validate-transition`,
            data,
            {
                headers: this.getHeaders(),
            }
        );
    }

    executeWorkflowTransition(data: {
        processId: string;
        fromStage: string;
        toStage: string;
        metadata?: any;
    }): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(
            `${this.url}workflow/execute-transition`,
            data,
            {
                headers: this.getHeaders(),
            }
        );
    }

    getWorkflowStatus(processId: string): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(
            `${this.url}workflow/status/${processId}`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    getAvailableActions(processId: string): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(
            `${this.url}workflow/actions/${processId}`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    getWorkflowHistory(processId: string): Observable<ApiResponse<any[]>> {
        return this.http.get<ApiResponse<any[]>>(
            `${this.url}workflow/history/${processId}`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    getWorkflowStatistics(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(
            `${this.url}workflow/statistics`,
            {
                headers: this.getHeaders(),
            }
        );
    }
}
