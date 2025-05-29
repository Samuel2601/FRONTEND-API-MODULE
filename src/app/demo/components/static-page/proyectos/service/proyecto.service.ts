import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Nominado, Proyecto } from '../interface/proyecto.interfaces';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { CacheService } from 'src/app/demo/services/cache.service';
import { AuthService } from 'src/app/demo/services/auth.service';

@Injectable({
    providedIn: 'root',
})
export class ProyectoService {
    public url: string;
    private cacheExpiry = 5 * 60 * 1000; // 5 minutos

    constructor(
        private http: HttpClient,
        private cacheService: CacheService,
        private auth: AuthService
    ) {
        this.url = GLOBAL.url;
    }

    getProyecto(id: string, isId: boolean = false): Observable<Proyecto> {
        const cacheKey = `proyecto_${id}`;
        return this.cacheService.getOrFetch<Proyecto>(
            cacheKey,
            () =>
                this.http.get<Proyecto>(
                    isId
                        ? `${this.url}proyecto/${id}`
                        : `${this.url}proyecto?numero=${id}`
                ),
            this.cacheExpiry
        );
    }

    getProyectos(): Observable<Proyecto[]> {
        const cacheKey = `proyecto_all`;
        return this.cacheService.getOrFetch<Proyecto[]>(
            cacheKey,
            () => this.http.get<Proyecto[]>(`${this.url}proyecto`),
            this.cacheExpiry
        );
    }

    getNominados(proyectoId?: string): Observable<Nominado | Nominado[]> {
        const cacheKey = `nominados_${proyectoId || 'all'}`;
        return this.cacheService.getOrFetch(
            cacheKey,
            () => {
                if (proyectoId) {
                    return this.http.get<Nominado[]>(
                        `${this.url}nominado?proyecto=${proyectoId}`
                    );
                }
                return this.http.get<Nominado[]>(`${this.url}nominado`);
            },
            this.cacheExpiry
        );
    }

    getNominado(id: string): Observable<Nominado> {
        const cacheKey = `nominado_${id}`;
        return this.cacheService.getOrFetch(
            cacheKey,
            () => this.http.get<Nominado>(`${this.url}nominado/${id}`),
            this.cacheExpiry
        );
    }

    paramsf(campos: any = {}, all: boolean = true) {
        let params = new HttpParams();
        if (all) {
            params = params.append('populate', 'all');
        }
        Object.keys(campos).forEach((campo) => {
            params = params.append(campo, campos[campo]);
        });
        return params;
    }

    // proyecto.service.ts - Métodos updateProyecto y createProyecto modificados

    updateProyecto(id: string, data: any): Observable<any> {
        const headers = this.getFormDataHeaders(this.token());
        return this.http.put(`${this.url}proyecto/${id}`, data, {
            headers: headers,
        });
    }

    createProyecto(data: any): Observable<any> {
        const headers = this.getFormDataHeaders(this.token());
        return this.http.post(`${this.url}proyecto`, data, {
            headers: headers,
        });
    }

    updateNominado(id: string, data: any): Observable<any> {
        const headers = this.getFormDataHeaders(this.token());
        return this.http.put(`${this.url}nominado/${id}`, data, {
            headers: headers,
        });
    }

    createNominado(data: any): Observable<any> {
        const headers = this.getFormDataHeaders(this.token());
        return this.http.post(`${this.url}nominado`, data, {
            headers: headers,
        });
    }

    // Nuevo método para headers de FormData
    getFormDataHeaders(token: string): HttpHeaders {
        return new HttpHeaders({
            // NO incluir Content-Type para FormData - el browser lo establece automáticamente
            Authorization: token,
        });
    }

    // Mantener el método original para otros endpoints que usen JSON
    getHeaders(token: string): HttpHeaders {
        return new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
    }

    token() {
        return this.auth.token();
    }
}
