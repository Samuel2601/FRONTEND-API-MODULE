import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GLOBAL } from './GLOBAL';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
    return this.http.delete(this.url + 'eliminaruser/' + id, { headers: headers });
  }

  eliminarfichaSectorial(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'ficha_sectorial/' + id, { headers: headers });
  }

  eliminarIncidenteDenuncia(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'incidentes_denuncia/' + id, { headers: headers });
  }

  eliminarEncargadoCategoria(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'encargado_categoria/' + id, { headers: headers });
  }

  eliminarRolUsuario(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'eliminarrole/' + id, { headers: headers });
  }

  eliminarEstadoIncidente(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'estado_incidente/' + id, { headers: headers });
  }

  eliminarEstadoActividadProyecto(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'estado_actividad_proyecto/' + id, { headers: headers });
  }

  eliminarTipoActividadProyecto(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'actividad_proyecto/' + id, { headers: headers });
  }

  eliminarDireccionGeo(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'direccion_geo/' + id, { headers: headers });
  }

  verificarCategoria(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'subcategoria?categoria=' + id, { headers: headers });
  }

  eliminarCategoria(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'categoria/' + id, { headers: headers });
  }

  verificarSubCategoria(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'incidentes_denuncia?subcategoria=' + id, { headers: headers });
  }

  eliminarSubcategoria(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.delete(this.url + 'subcategoria/' + id, { headers: headers });
  }

  


}
