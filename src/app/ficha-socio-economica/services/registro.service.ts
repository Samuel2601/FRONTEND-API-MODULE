import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';

@Injectable({
    providedIn: 'root',
})
export class RegistroService {
    public url;
    constructor(private http: HttpClient) {
        this.url = GLOBAL.url;
    }
    public getRegistro(token: any, id: string) {
        let headers = new HttpHeaders({
            Authorization: token,
        });
        return this.http.get(this.url + 'registro/' + id, {
            headers: headers,
        });
    }
    public getRegistros(
        token: any,
        select: string = '',
        populate: string = ''
    ): Observable<any> {
        let headers = new HttpHeaders({
            Authorization: token,
        });
        // Configuramos los parámetros de la URL
        let params = new HttpParams();
        if (select) {
            params = params.set('select', select);
        }
        if (populate) {
            params = params.set('populate', populate);
        }

        return this.http.get<any>(this.url + 'registro', {
            headers: headers,
            params,
        });
    }
    sendRegistration(data: any): any {
        return this.http.post(this.url + 'registro', data);
    }
    updateRegistro(data: any, id: string): any {
        return this.http.put(this.url + 'registro/' + id, data);
    }

    informacionRegistro(): any {
        return this.http.get(this.url + 'api/registros/informacionRegistro');
    }

    informacionPersonal(): any {
        return this.http.get(this.url + 'api/registros/informacionPersonal');
    }

    informacionUbicacion(): any {
        return this.http.get(this.url + 'api/registros/informacionUbicacion');
    }

    informacionsalud(): any {
        return this.http.get(this.url + 'api/registros/salud');
    }
}
