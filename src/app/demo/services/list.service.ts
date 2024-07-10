import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GLOBAL } from './GLOBAL';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
@Injectable({
  providedIn: 'root'
})
export class ListService {
  public url;
	
	constructor(private http: HttpClient) {
		this.url = GLOBAL.url+'list/';
	}
  
  listarUsuarios(token: any, campo?: string, valor?: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    let params = new HttpParams()
        .set('campo', campo||'')
        .set('valor', valor||'');
    return this.http.get(this.url + 'listar_usuarios',  { headers: headers, params: params });
  }

  listarFichaSectorial(token: any, campo?: string, valor?: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    let params = new HttpParams()
        .set('campo', campo||'')
        .set('valor', valor||'');
    return this.http.get(this.url + 'listar_ficha_sectorial',  { headers: headers, params: params });
  }

  listarIncidentesDenuncias(token: any, campo?: string, valor?: any,all?:boolean): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    let params = new HttpParams()
        .set('campo', campo||'')
        .set('valor', valor||'')
    // Solo agregar el parámetro 'all' si es verdadero
    if (all) {
      params = params.set('all', all);
    }else{
      params = params.set('all', true);
    }
    return this.http.get(this.url + 'listar_incidentes_denuncias',  { headers: headers, params: params });
  }
  listarCategorias(token: any, campo?: string, valor?: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    let params = new HttpParams()
        .set('campo', campo||'')
        .set('valor', valor||'');
    return this.http.get(this.url + 'listar_categorias',  { headers: headers, params: params });
  }
  

  listarSubcategorias(token: any, campo?: string, valor?: any): Observable<any> {
    let headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: token,
    });
    let params = new HttpParams()
        .set('campo', campo||'')
        .set('valor', valor||'');
    return this.http.get(this.url + 'listar_subcategorias', { headers: headers, params: params });
}

  listarEncargadosCategorias(token: any, campo?: string, valor?: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    let params = new HttpParams()
        .set('campo', campo||'')
        .set('valor', valor||'');
    return this.http.get(this.url + 'listar_encargados_categorias', { headers: headers, params: params });
  }

  listarRolesUsuarios(token: any, campo?: string, valor?: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    let params = new HttpParams()
        .set('campo', campo||'')
        .set('valor', valor||'');
    return this.http.get(this.url + 'listar_roles_usuarios',  { headers: headers, params: params });
  }

  listarEstadosIncidentes(token: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'listar_estados_incidentes', { headers: headers });
  }

  listarEstadosActividadesProyecto(token: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'listar_estados_actividades_proyecto', { headers: headers });
  }

  listarTiposActividadesProyecto(token: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'listar_tipos_actividades_proyecto', { headers: headers });
  }

  listarDireccionesGeo(token: any, campo?: string, valor?: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    let params = new HttpParams()
        .set('campo', campo||'')
        .set('valor', valor||'');
    return this.http.get(this.url + 'listar_direcciones_geo',  { headers: headers, params: params });
  }
  ListarPermisos(token: any): Observable<any> {
		let headers = new HttpHeaders({
			'Content-Type': 'application/json',
			Authorization: token,
		});
		return this.http.get(this.url + 'listar_permisos', { headers: headers });
	}
}
