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
		this.url = GLOBAL.url;
	}
  
  listarUsuarios(token: any, campo?: string, valor?: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    
    return this.http.get(this.url + 'obtenerUserPorCriterio',  { headers: headers,  });
  }

  listarFichaSectorial(token: any, campos: any = {}, all: boolean = true): Observable<any> {
    let headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: token,
    });

    // Construir los parámetros de la URL
    let params = new HttpParams();
    if (all) {
        params = params.append('populate', 'all');
    }
    // Añadir campos de filtrado a los parámetros
    Object.keys(campos).forEach((campo) => {
        params = params.append(campo, campos[campo]);
    });

    return this.http.get(this.url + 'ficha_sectorial', { headers: headers, params: params });
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
    return this.http.get(this.url + 'incidentes_denuncia',  { headers: headers,  });
  }
  listarCategorias(token: any, campo?: string, valor?: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'categoria',  { headers: headers });
  }
  

  listarSubcategorias(token: any, campo?: string, valor?: any): Observable<any> {
    let headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: token,
    });
    
    return this.http.get(this.url + 'subcategoria', { headers: headers});
}

  listarEncargadosCategorias(token: any, campo?: string, valor?: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    
    return this.http.get(this.url + 'encargado_categoria', { headers: headers,  });
  }

  listarRolesUsuarios(token: any, campo?: string, valor?: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    
    return this.http.get(this.url + 'obtenerrole',  { headers: headers,  });
  }

  listarEstadosIncidentes(token: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'estado_incidente', { headers: headers });
  }

  listarEstadosActividadesProyecto(token: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'estado_actividad_proyecto', { headers: headers });
  }

  listarTiposActividadesProyecto(token: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.get(this.url + 'actividad_proyecto', { headers: headers });
  }

  listarDireccionesGeo(token: any, campo?: string, valor?: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    
    return this.http.get(this.url + 'direccion_geo',  { headers: headers,  });
  }
  ListarPermisos(token: any): Observable<any> {
		let headers = new HttpHeaders({
			'Content-Type': 'application/json',
			Authorization: token,
		});
		return this.http.get(this.url + 'obtenerpermisosporcriterio', { headers: headers });
	}
}
