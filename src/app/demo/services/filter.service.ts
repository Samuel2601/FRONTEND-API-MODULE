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
    return this.http.get(this.url + 'usuario/' + id, { headers: headers });
  }

  obtenerActividadProyecto(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'ficha_sectorial/' + id, { headers: headers });
  }

  obtenerIncidenteDenuncia(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'incidentes_denuncia/' + id, { headers: headers });
  }

  obtenerCategoria(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'categoria/' + id, { headers: headers });
  }

  obtenerSubcategoria(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'subcategoria/' + id, { headers: headers });
  }

  obtenerEncargadoCategoria(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'encargado_categoria/' + id, { headers: headers });
  }

  async obtenerRolUsuario(token: string, rolUser: string): Promise<any> {
    const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    });

    try {
        const response: any = await this.http
            .get(`${GLOBAL.url}obtenerRole?id=${rolUser}`, { headers })
            .toPromise();
        return response.data;
    } catch (error) {
        console.error('Error al obtener el rol del usuario:', error);
        throw error;
    }
}

  obtenerEstadoIncidente(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'actividad_proyecto/' + id, { headers: headers });
  }

  obtenerEstadoActividadProyecto(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'estado_actividad_proyecto/' + id, { headers: headers });
  }

  obtenerTipoActividadProyecto(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'actividad_proyecto/' + id, { headers: headers });
  }

  obtenerDireccionGeo(token: any, id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'direccion_geo/' + id, { headers: headers });
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
