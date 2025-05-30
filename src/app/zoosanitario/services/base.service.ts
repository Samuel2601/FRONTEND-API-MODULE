import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { CacheService } from 'src/app/demo/services/cache.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';

@Injectable({
    providedIn: 'root',
})
export abstract class BaseService<T> {
    protected url: string;
    private cacheExpiry = 5 * 60 * 1000; // 5 minutos

    constructor(
        protected http: HttpClient,
        protected cacheService: CacheService,
        protected auth: AuthService,
        protected endpoint: string
    ) {
        this.url = GLOBAL.url;
    }

    getHeaders(token: string): HttpHeaders {
        return new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
    }

    getFormDataHeaders(token: string): HttpHeaders {
        return new HttpHeaders({
            Authorization: token,
        });
    }

    token() {
        return this.auth.token();
    }

    getAll(params?: any): Observable<T[]> {
        const token = this.token();
        let httpParams = new HttpParams();

        if (params) {
            Object.keys(params).forEach((key) => {
                if (params[key] !== null && params[key] !== undefined) {
                    httpParams = httpParams.set(key, params[key]);
                }
            });
        }

        return this.http.get<T[]>(`${this.url}${this.endpoint}`, {
            headers: this.getHeaders(token),
            params: httpParams,
        });
    }

    getById(id: string): Observable<T> {
        const token = this.token();
        return this.http.get<T>(`${this.url}${this.endpoint}/${id}`, {
            headers: this.getHeaders(token),
        });
    }

    create(data: T): Observable<T> {
        const token = this.token();
        return this.http.post<T>(`${this.url}${this.endpoint}`, data, {
            headers: this.getHeaders(token),
        });
    }

    update(id: string, data: T): Observable<T> {
        const token = this.token();
        return this.http.put<T>(`${this.url}${this.endpoint}/${id}`, data, {
            headers: this.getHeaders(token),
        });
    }

    delete(id: string): Observable<any> {
        const token = this.token();
        return this.http.delete(`${this.url}${this.endpoint}/${id}`, {
            headers: this.getHeaders(token),
        });
    }
}
