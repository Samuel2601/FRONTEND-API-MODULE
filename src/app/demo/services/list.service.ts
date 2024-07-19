import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GLOBAL } from './GLOBAL';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
@Injectable({
    providedIn: 'root',
})
export class ListService {
    public url;

    constructor(private http: HttpClient) {
        this.url = GLOBAL.url;
    }

    listarUsuarios(
        token: any,
        campos: any = {},
        all: boolean = true
    ): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = this.paramsf(campos, all);
        return this.http.get(this.url + 'obteneruserporcriterio', {
            headers: headers,
            params: params,
        });
    }

    listarFichaSectorial(
        token: any,
        campos: any = {},
        all: boolean = true
    ): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = this.paramsf(campos, all);
        return this.http.get(this.url + 'ficha_sectorial', {
            headers: headers,
            params: params,
        });
    }
    listarFichaSectorialMapa(
    ): Observable<any> {
        let params = new HttpParams()
        .set('mostrar_en_mapa', 'true')
        .set('view', 'true')
        .set('populate', 'estado,actividad');
        return this.http.get(this.url + 'ficha_sectorial', {
            params: params,
        });
    }

    listarIncidentesDenuncias(
        token: any,
        campos: any = {},
        all: boolean = true
    ): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = this.paramsf(campos, all);
        // Construir la URL completa manualmente
        const fullUrl = `${this.url}incidentes_denuncia?${params.toString()}`;
        console.log('Full URL:', fullUrl);
        return this.http.get(this.url + 'incidentes_denuncia', {
            headers: headers,
            params: params,
        });
    }
    listarCategorias(
        token: any,
        campos: any = {},
        all: boolean = true
    ): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = this.paramsf(campos, all);
        return this.http.get(this.url + 'categoria', {
            headers: headers,
            params: params,
        });
    }

    listarSubcategorias(
        token: any,
        campos: any = {},
        all: boolean = true
    ): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = this.paramsf(campos, all);
        return this.http.get(this.url + 'subcategoria', {
            headers: headers,
            params: params,
        });
    }

    listarEncargadosCategorias(
        token: any,
        campos: any = {},
        all: boolean = true
    ): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = this.paramsf(campos, all);
        return this.http.get(this.url + 'encargado_categoria', {
            headers: headers,
            params: params,
        });
    }

    listarRolesUsuarios(
        token: any,
        campos: any = {},
        all: boolean = true
    ): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = this.paramsf(campos, all);
        return this.http.get(this.url + 'obtenerrolesporcriterio', {
            headers: headers,
            params: params,
        });
    }

    listarEstadosIncidentes(
        token: any,
        campos: any = {},
        all: boolean = true
    ): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = this.paramsf(campos, all);
        return this.http.get(this.url + 'estado_incidente', {
            headers: headers,
            params: params,
        });
    }

    listarEstadosActividadesProyecto(
        token: any,
        campos: any = {},
        all: boolean = true
    ): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = this.paramsf(campos, all);
        return this.http.get(this.url + 'estado_actividad_proyecto', {
            headers: headers,
            params: params,
        });
    }

    listarTiposActividadesProyecto(
        token: any,
        campos: any = {},
        all: boolean = true
    ): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = this.paramsf(campos, all);
        return this.http.get(this.url + 'actividad_proyecto', {
            headers: headers,
            params: params,
        });
    }

    listarDireccionesGeo(
        token: any,
        campos: any = {},
        all: boolean = true
    ): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = this.paramsf(campos, all);
        return this.http.get(this.url + 'direccion_geo', {
            headers: headers,
            params: params,
        });
    }
    ListarPermisos(
        token: any,
        campos: any = {},
        all: boolean = true
    ): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = this.paramsf(campos, all);
        return this.http.get(this.url + 'obtenerpermisosporcriterio', {
            headers: headers,
            params: params,
        });
    }

    paramsf(campos: any = {}, all: boolean = true) {
        // Construir los parámetros de la URL
        let params = new HttpParams();
        if (all) {
            params = params.append('populate', 'all');
        }
        // Añadir campos de filtrado a los parámetros
        Object.keys(campos).forEach((campo) => {
            params = params.append(campo, campos[campo]);
        });
        return params;
    }
}
