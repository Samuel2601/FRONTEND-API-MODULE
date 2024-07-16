import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GLOBAL } from './GLOBAL';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
@Injectable({
  providedIn: 'root'
})
export class FilterService {
  public url;
	
	constructor(private http: HttpClient) {
		this.url = GLOBAL.url;
	}
  private getHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token
    });
  }

  obtenerUsuario(token: any, id: string): Observable<any> {
    const headers = this.getHeaders(token);
    const params = new HttpParams().set('id', id);
    return this.http.get(this.url + 'obteneruser', { headers, params });
  }

  obtenerActividadProyecto(token: any, id: string): Observable<any> {
    const headers = this.getHeaders(token);
    const params = new HttpParams().set('id', id);
    return this.http.get(this.url + 'ficha_sectorial', { headers, params });
  }

  obtenerIncidenteDenuncia(token: any, id: string): Observable<any> {
    const headers = this.getHeaders(token);
    const params = new HttpParams().set('id', id);
    return this.http.get(this.url + 'incidentes_denuncia', { headers, params });
  }

  obtenerCategoria(token: any, id: string): Observable<any> {
    const headers = this.getHeaders(token);
    const params = new HttpParams().set('id', id);
    return this.http.get(this.url + 'categoria', { headers, params });
  }

  obtenerSubcategoria(token: any, id: string): Observable<any> {
    const headers = this.getHeaders(token);
    const params = new HttpParams().set('id', id);
    return this.http.get(this.url + 'subcategoria', { headers, params });
  }

  obtenerEncargadoCategoria(token: any, id: string): Observable<any> {
    const headers = this.getHeaders(token);
    const params = new HttpParams().set('id', id);
    return this.http.get(this.url + 'encargado_categoria', { headers, params });
  }

  async obtenerRolUsuario(token: string, rolUser: string): Promise<any> {
    const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    });
    const params = new HttpParams().set('id', rolUser);

    try {
        const response: any = await this.http
            .get(`${GLOBAL.url}obtenerRole`, { headers, params })
            .toPromise();
        return response.data;
    } catch (error) {
        console.error('Error al obtener el rol del usuario:', error);
        throw error;
    }
  }

  obtenerEstadoIncidente(token: any, id: string): Observable<any> {
    const headers = this.getHeaders(token);
    const params = new HttpParams().set('id', id);
    return this.http.get(this.url + 'actividad_proyecto', { headers, params });
  }

  obtenerEstadoActividadProyecto(token: any, id: string): Observable<any> {
    const headers = this.getHeaders(token);
    const params = new HttpParams().set('id', id);
    return this.http.get(this.url + 'estado_actividad_proyecto', { headers, params });
  }

  obtenerTipoActividadProyecto(token: any, id: string): Observable<any> {
    const headers = this.getHeaders(token);
    const params = new HttpParams().set('id', id);
    return this.http.get(this.url + 'actividad_proyecto', { headers, params });
  }

  obtenerDireccionGeo(token: any, id: string): Observable<any> {
    const headers = this.getHeaders(token);
    const params = new HttpParams().set('id', id);
    return this.http.get(this.url + 'direccion_geo', { headers, params });
  }

  tienePermiso(token: any, componente: string, rolUsuario: string): Observable<any> {
    const headers = this.getHeaders(token);
    const params = new HttpParams().set('componente', componente).set('rol_usuario', rolUsuario);
    return this.http.post<any>(this.url + 'verificar_permiso', null, { headers, params });
  }

  listpermisos(token: any, rolUsuario: string): Observable<any> {
    const headers = this.getHeaders(token);
    const params = new HttpParams().set('rol_usuario', rolUsuario);
    return this.http.get<any>(this.url + 'obtener_permisosrol', { headers, params });
  }
}
