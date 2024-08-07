import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GLOBAL } from './GLOBAL';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
@Injectable({
    providedIn: 'root',
})
export class FilterService {
    public url;

    constructor(private http: HttpClient) {
        this.url = GLOBAL.url;
    }
    private getHeaders(token: string): HttpHeaders {
        return new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
    }

    obtenerUsuario(token: any, id: string): Observable<any> {
        const headers = this.getHeaders(token);
        let params = new HttpParams();
        params = params.append('id', id);
        return this.http.get(this.url + 'obteneruser', { headers, params });
    }

    obtenerActividadProyecto(token: any, id: string): Observable<any> {
        const headers = this.getHeaders(token);
        let params = new HttpParams();
        params = params.append('populate', 'all');
        return this.http.get(this.url + 'ficha_sectorial/' + id, {
            headers,
            params,
        });
    }
    obtenerFichaPublica(id: string): Observable<any> {
        let params = new HttpParams();
        params = params.append('populate', 'estado,actividad');
        return this.http.get(this.url + 'ficha_sectorial/' + id, {
            params,
        });
    }

    actualizarFichaCompartido(id_ficha: string) {
        return this.http.put(`${this.url}actualizar_ficha_compartido/${id_ficha}`, {});
    }

    actualizarFichaMeGusta(token:any,id_ficha: string, id_user: string) {
        const headers = this.getHeaders(token);
        return this.http.put(`${this.url}actualizar_ficha_megusta/${id_ficha}`, {
            headers,
            id_user: id_user,
        });
    }

    obtenerIncidenteDenuncia(token: any, id: string): Observable<any> {
        const headers = this.getHeaders(token);
        let params = new HttpParams();
        params = params.append('populate', 'all');
        return this.http.get(this.url + 'incidentes_denuncia/' + id, {
            headers,
            params,
        });
    }

    obtenerCategoria(token: any, id: string): Observable<any> {
        const headers = this.getHeaders(token);
        let params = new HttpParams();
        params = params.append('populate', 'all');
        return this.http.get(this.url + 'categoria/' + id, { headers, params });
    }

    obtenerSubcategoria(token: any, id: string): Observable<any> {
        const headers = this.getHeaders(token);
        let params = new HttpParams();
        params = params.append('populate', 'all');
        return this.http.get(this.url + 'subcategoria/' + id, {
            headers,
            params,
        });
    }

    obtenerEncargadoCategoria(token: any, id: string): Observable<any> {
        const headers = this.getHeaders(token);
        let params = new HttpParams();
        params = params.append('populate', 'all');
        return this.http.get(this.url + 'encargado_categoria/' + id, {
            headers,
            params,
        });
    }

    async obtenerRolUsuario(token: string, rolUser: string): Promise<any> {
        const headers = this.getHeaders(token);
        const params = new HttpParams().set('id', rolUser);
        const response = await this.http
            .get<any>(this.url + 'obtenerrole', { headers, params })
            .toPromise();
        if (response && response.data) {
            return response.data;
        } else {
            throw new Error('La respuesta no contiene la propiedad data');
        }
    }

    obtenerEstadoIncidente(token: any, id: string): Observable<any> {
        const headers = this.getHeaders(token);
        let params = new HttpParams();
        params = params.append('populate', 'all');
        return this.http.get(this.url + 'actividad_proyecto/' + id, {
            headers,
        });
    }

    obtenerEstadoActividadProyecto(token: any, id: string): Observable<any> {
        const headers = this.getHeaders(token);
        let params = new HttpParams();
        params = params.append('populate', 'all');
        return this.http.get(this.url + 'estado_actividad_proyecto/' + id, {
            headers,
            params,
        });
    }

    obtenerTipoActividadProyecto(token: any, id: string): Observable<any> {
        const headers = this.getHeaders(token);
        let params = new HttpParams();
        params = params.append('populate', 'all');
        return this.http.get(this.url + 'actividad_proyecto/' + id, {
            headers,
            params,
        });
    }

    obtenerDireccionGeo(token: any, id: string): Observable<any> {
        const headers = this.getHeaders(token);
        let params = new HttpParams();
        params = params.append('populate', 'all');
        return this.http.get(this.url + 'direccion_geo/' + id, {
            headers,
            params,
        });
    }

    async ActualizarRutaRecolector(token: any, id: string): Promise<Observable<any>> {
        const headers = this.getHeaders(token);
        let params = new HttpParams();
        params = params.append('populate', 'all');
        return this.http.get(this.url + 'recolector_ruta/' + id, {
            headers,
            params,
        });
    }

    obtenerRutaRecolector(token: any, id: string): Observable<any> {
        const headers = this.getHeaders(token);
        let params = new HttpParams();
        params = params.append('populate', 'all');
        return this.http.get(this.url + 'recolector/' + id, {
            headers,
            params,
        });
    }

}
