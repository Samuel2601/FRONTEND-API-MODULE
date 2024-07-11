import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GLOBAL } from './GLOBAL';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
@Injectable({
  providedIn: 'root'
})
export class FilterService {
  public url;
	
	constructor(private http: HttpClient) {
		this.url = GLOBAL.url;
	}
  obtenerUsuario(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'obtener_usuario/' + id, { headers: headers });
  }

  obtenerActividadProyecto(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'obtener_actividad_proyecto/' + id, { headers: headers });
  }

  obtenerIncidenteDenuncia(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'obtener_incidente_denuncia/' + id, { headers: headers });
  }

  obtenerCategoria(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'obtener_categoria/' + id, { headers: headers });
  }

  obtenerSubcategoria(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'obtener_subcategoria/' + id, { headers: headers });
  }

  obtenerEncargadoCategoria(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'obtener_encargado_categoria/' + id, { headers: headers });
  }

  obtenerRolUsuario(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'obtener_rol_usuario/' + id, { headers: headers });
  }

  obtenerEstadoIncidente(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'obtener_estado_incidente/' + id, { headers: headers });
  }

  obtenerEstadoActividadProyecto(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'obtener_estado_actividad_proyecto/' + id, { headers: headers });
  }

  obtenerTipoActividadProyecto(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'obtener_tipo_actividad_proyecto/' + id, { headers: headers });
  }

  obtenerDireccionGeo(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'obtener_direccion_geo/' + id, { headers: headers });
  }
  tienePermiso(token: any, componente: string, rolUsuario: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token
    });
    const  data={ componente: componente, rol_usuario: rolUsuario } 
    // Aquí puedes ajustar la URL según la estructura de tu API
    return this.http.post<any>(this.url + 'verificar_permiso',data, { headers: headers});
  }
  listpermisos(token: any, rolUsuario: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token
    });
    // Aquí puedes ajustar la URL según la estructura de tu API
    return this.http.get<any>(this.url + 'obtener_permisosrol/'+rolUsuario, { headers: headers});
  }
}
