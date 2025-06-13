import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, Observable, of, shareReplay, tap } from 'rxjs';
import { CacheService } from 'src/app/demo/services/cache.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { MessageService } from 'primeng/api';

@Injectable({
    providedIn: 'root',
})
export abstract class BaseService<T> {
    protected readonly url = GLOBAL.url_zoosanitario;
    protected readonly cacheExpiry = 0; //5 * 60 * 1000; // 5 minutos
    protected http = inject(HttpClient);
    protected cacheService = inject(CacheService);
    protected auth = inject(AuthService);
    protected messageService = inject(MessageService);

    constructor(protected endpoint: string) {}

    protected getHeaders(): HttpHeaders {
        return new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: this.auth.token(),
        });
    }

    protected getFormDataHeaders(): HttpHeaders {
        return new HttpHeaders({
            Authorization: this.auth.token(),
        });
    }

    getAll(params?: Record<string, any>): Observable<T[]> {
        const cacheKey = `${this.endpoint}_all_${JSON.stringify(params)}`;
        const cachedData = this.cacheService.get<T[]>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        let httpParams = new HttpParams();
        if (params) {
            Object.keys(params).forEach((key) => {
                if (params[key] !== null && params[key] !== undefined) {
                    httpParams = httpParams.set(key, params[key]);
                }
            });
        }

        return this.http
            .get<T[]>(`${this.url}${this.endpoint}`, {
                headers: this.getHeaders(),
                params: httpParams,
            })
            .pipe(
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                shareReplay(1),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener los datos',
                    });
                    throw error.error;
                })
            );
    }

    getById(id: string): Observable<T> {
        const cacheKey = `${this.endpoint}_${id}`;
        const cachedData = this.cacheService.get<T>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        return this.http
            .get<T>(`${this.url}${this.endpoint}/${id}`, {
                headers: this.getHeaders(),
            })
            .pipe(
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                shareReplay(1),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener el registro',
                    });
                    throw error.error;
                })
            );
    }

    create(data: T): Observable<T> {
        return this.http
            .post<T>(`${this.url}${this.endpoint}`, data, {
                headers: this.getHeaders(),
            })
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Registro creado correctamente',
                    });
                }),
                catchError((error) => {
                    console.error('Error al crear el registro:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al crear el registro',
                    });
                    throw error.error;
                })
            );
    }

    update(id: string, data: Partial<T>): Observable<T> {
        return this.http
            .put<T>(`${this.url}${this.endpoint}/${id}`, data, {
                headers: this.getHeaders(),
            })
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Registro actualizado correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al actualizar el registro',
                    });
                    throw error.error;
                })
            );
    }

    delete(id: string): Observable<void> {
        return this.http
            .delete<void>(`${this.url}${this.endpoint}/${id}`, {
                headers: this.getHeaders(),
            })
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Registro eliminado correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al eliminar el registro',
                    });
                    throw error.error;
                })
            );
    }
}
