import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Nominado, Proyecto } from '../interface/proyecto.interfaces';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { CacheService } from 'src/app/demo/services/cache.service';

@Injectable({
    providedIn: 'root',
})
export class ProyectoService {
    public url: string;
    private cacheExpiry = 5 * 60 * 1000; // 5 minutos

    constructor(private http: HttpClient, private cacheService: CacheService) {
        this.url = GLOBAL.url;
    }

    getProyecto(id: string): Observable<Proyecto> {
        const cacheKey = `proyecto_${id}`;
        return this.cacheService.getOrFetch<Proyecto>(
            cacheKey,
            () => this.http.get<Proyecto>(`${this.url}proyecto?numero=${id}`),
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
}
