import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GLOBAL } from './GLOBAL';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
@Injectable({
  providedIn: 'root'
})
export class DeleteService {
  public url;
	
	constructor(private http: HttpClient) {
		this.url = GLOBAL.url;
	}
  eliminarUsuario(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'eliminar_usuario/' + id, { headers: headers });
  }

  eliminarActividadProyecto(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'eliminar_actividad_proyecto/' + id, { headers: headers });
  }

  eliminarIncidenteDenuncia(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'eliminar_incidente_denuncia/' + id, { headers: headers });
  }

  eliminarEncargadoCategoria(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'eliminar_encargado_categoria/' + id, { headers: headers });
  }

  eliminarRolUsuario(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'eliminar_rol_usuario/' + id, { headers: headers });
  }

  eliminarEstadoIncidente(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'eliminar_estado_incidente/' + id, { headers: headers });
  }

  eliminarEstadoActividadProyecto(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'eliminar_estado_actividad_proyecto/' + id, { headers: headers });
  }

  eliminarTipoActividadProyecto(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'eliminar_tipo_actividad_proyecto/' + id, { headers: headers });
  }

  eliminarDireccionGeo(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'eliminar_direccion_geo/' + id, { headers: headers });
  }

  verificarCategoria(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'verificar_categoria/' + id, { headers: headers });
  }

  eliminarCategoria(token: any, id: string,data: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.put(this.url + 'eliminar_categoria/' + id, data, { headers: headers });
  }

  verificarSubCategoria(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'verificar_subcategoria/' + id, { headers: headers });
  }

  eliminarSubcategoria(token: any, id: string,data: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.put(this.url + 'eliminar_subcategoria/' + id, data , { headers: headers });
  }

  


}
