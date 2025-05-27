import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GLOBAL } from './GLOBAL';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
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
        //console.log(campos);
        const params = this.paramsf(campos, all);
        return this.http.get(this.url + 'obteneruserporcriterio', {
            headers: headers,
            params: params,
        });
    }
    diaEntero(): { start: string; end: string } {
        const now = new Date();

        // Establecer la fecha para la medianoche de hoy
        const end = new Date(now);
        end.setHours(0, 0, 0, 0);

        // Establecer la fecha para la medianoche del día anterior
        const start = new Date(now);
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);

        return {
            start: start.toISOString(),
            end: end.toISOString(),
        };
    }

    listarAsignacionRecolectores(
        token: any,
        campos: any = {},
        all: boolean = true
    ): Observable<any> {
        //console.log(campos);
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        //const { start, end } = this.diaEntero();
        const params = this.paramsf(campos, all);

        return this.http.get(this.url + 'recolector', {
            headers: headers,
            params: params,
        });
    }

    listarFichaSectorial(
        token?: any,
        campos: any = {},
        all: boolean = true
    ): Observable<any> {
        //console.log(campos);
        //console.log(campos);
        let headers;
        if (token) {
            headers = new HttpHeaders({
                'Content-Type': 'application/json',
                Authorization: token,
            });
        } else {
            headers = new HttpHeaders({
                'Content-Type': 'application/json',
            });
        }
        const params = this.paramsf(campos, all);
        return this.http.get(this.url + 'ficha_sectorial', {
            headers: headers,
            params: params,
        });
    }
    calcularFechaUnMesAdelanteUnMesAtras(): { start: string; end: string } {
        const end = new Date();
        end.setMonth(end.getMonth() + 1); // Un mes adelante
        const start = new Date();
        start.setMonth(start.getMonth() - 1); // Un mes atrás
        return {
            start: start.toISOString(),
            end: end.toISOString(),
        };
    }

    listarFichaSectorialMapa(): Observable<any> {
        const { start, end } = this.calcularFechaUnMesAdelanteUnMesAtras();

        let params = new HttpParams()
            .set('mostrar_en_mapa', 'true')
            .set('fecha_evento[start]', start)
            .set('fecha_evento[end]', end)
            .set('view', 'true')
            .set('populate', 'estado,actividad');
        /*const fullUrl = `${this.url}ficha_sectorial?${params.toString()}`;
        console.log('Full URL:', fullUrl);*/
        return this.http.get(this.url + 'ficha_sectorial', {
            params: params,
        });
    }
    listarFichaSectorialArticulos(): Observable<any> {
        const { start, end } = this.calcularFechaUnMesAdelanteUnMesAtras();

        let params = new HttpParams()
            //.set('mostrar_en_mapa', 'true')
            .set('es_articulo', 'true')
            //.set('fecha_evento[start]', start)
            //.set('fecha_evento[end]', end)
            .set('view', 'true')
            .set('populate', 'estado,actividad');
        /*const fullUrl = `${this.url}ficha_sectorial?${params.toString()}`;
        console.log('Full URL:', fullUrl);*/
        return this.http.get(this.url + 'ficha_sectorial', {
            params: params,
        });
    }

    listarFichaSectorialHome(): Observable<any> {
        let params = new HttpParams()
            .set('destacado', 'true')
            .set('view', 'true')
            .set('populate', 'estado,actividad')
            .set(
                'select',
                'titulo,title_marcador,descripcion,foto,fecha_evento,slug,estado'
            )
            .set('limit', '10');
        return this.http.get(this.url + 'ficha_sectorial', {
            params: params,
        });
    }
    /*
    //?estado.nombre[$ne]=Finalizado para cuando sean distinto a lo que buscas
        const fullUrl = `${this.url}ficha_sectorial?${params.toString()}`;
        console.log('Full URL:', fullUrl); */

    listarIncidentesDenuncias(
        token: any,
        campos: any = {},
        all: boolean = true
    ): Observable<any> {
        //console.log(campos);
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = this.paramsf(campos, all);
        // Construir la URL completa manualmente
        const fullUrl = `${this.url}incidentes_denuncia?${params.toString()}`;
        //console.log('Full URL:', fullUrl);
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
        //console.log(campos);
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
        //console.log(campos);
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
        //console.log(campos);
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
        //console.log(campos);
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
        //console.log(campos);
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
        //console.log(campos);
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
        token?: any,
        campos: any = {},
        all: boolean = true
    ): Observable<any> {
        //console.log(campos);
        let headers;
        if (token) {
            headers = new HttpHeaders({
                'Content-Type': 'application/json',
                Authorization: token,
            });
        } else {
            headers = new HttpHeaders({
                'Content-Type': 'application/json',
            });
        }

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
        //console.log(campos);
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
        //console.log(campos);
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

    listarRecolectorExterno(
        token: any,
        campos: any = {},
        all: boolean = true
    ): Observable<any> {
        //console.log(campos);
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = this.paramsf(campos, all);
        return this.http.get(this.url + 'externo', {
            headers: headers,
            params: params,
        });
    }
}
