import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GLOBAL } from './GLOBAL';
import { HttpClient, HttpHeaders } from '@angular/common/http';
@Injectable({
    providedIn: 'root',
})
export class AdminService {
    public url: string;

    constructor(private _http: HttpClient) {
        this.url = GLOBAL.url;
    }
    obtenerGPS(): Observable<any> {
        let headers = new HttpHeaders()
            .set('Content-Type', 'application/json')
            .set('Authorization', 'Basic ' + btoa('CIUDADANIA:123456789'));
        return this._http.get(
            'https://inteligenciavehicular.com/api/positions/',
            { headers: headers }
        );
    }
    //devicesId
    obtenerNameGPS(id: any): Observable<any> {
        let headers = new HttpHeaders()
            .set('Content-Type', 'application/json')
            .set('Authorization', 'Basic ' + btoa('CIUDADANIA:123456789'));
        return this._http.get(
            'https://inteligenciavehicular.com/api/devices?id=' + id,
            { headers: headers }
        );
    }
    login(data: any): Observable<any> {
        let headers = new HttpHeaders().set('Content-Type', 'application/json');
        return this._http.post(this.url + 'login', JSON.stringify(data), {
            headers: headers,
        });
    }
    recoverPassword(data: any): Observable<any> {
        let headers = new HttpHeaders().set('Content-Type', 'application/json');
        return this._http.post(this.url + 'recover-password', data, {
            headers: headers,
        });
    }
    newpassword(data: any, token: any): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        return this._http.post(this.url + 'newpassword', data, {
            headers: headers,
        });
    }
    listar_registro(token: any, desde: any, hasta: any): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });

        // Usamos comillas inversas para interpolar las variables en la URL
        return this._http.get(`${this.url}listar_registro/${desde}/${hasta}`, {
            headers: headers,
        });
    }
    verificar_token(token: any): Observable<any> {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        return this._http.get(this.url + 'verificar_token', {
            headers: headers,
        });
    }

    getCiudadano(id: string): Observable<any> {
        let headers = new HttpHeaders().set('Content-Type', 'application/json');
        const url = `https://geoapi.esmeraldas.gob.ec/new/dinardap/consultar?identificacion=${id}&codigoPaquete=3789`;
        return this._http.get(url, { headers: headers });
    }

    getCiudadanoInfo(dni: string): Observable<any> {
        let headers = new HttpHeaders().set('Content-Type', 'application/json');
        const url =
            this.url + `dinardap/consultar_nombres?identificacion=${dni}`; // Ahora usa el nuevo endpoint
        return this._http.get(url, {
            headers: headers,
        });
    }

    getCiudadanoFechaExpedicion(
        dni: string,
        fechaExp: string
    ): Observable<any> {
        let headers = new HttpHeaders().set('Content-Type', 'application/json');
        const url =
            this.url +
            `dinardap/consultar_date_exp?identificacion=${dni}&fechaExpedicion=${fechaExp}`;
        return this._http.get(url, {
            headers: headers,
        });
    }

    verificarCorreo(id: string): Observable<any> {
        let headers = new HttpHeaders().set('Content-Type', 'application/json');
        return this._http.get(this.url + 'verificarcorreo/' + id, {
            headers: headers,
        });
    }
}
