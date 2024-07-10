import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GLOBAL } from './GLOBAL';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
@Injectable({
    providedIn: 'root',
})
export class AuthService {
    public url;

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

    // Método para redirigir al usuario a la autenticación de Google
    loginWithGoogle() {
        window.location.href = `${this.url}/auth/google`;
    }

    // Método para manejar la respuesta de Google y obtener el token
    // Método para manejar la respuesta de Google y obtener el token
    handleGoogleCallback(code: string): Observable<any> {
        const params = new HttpParams().set('code', code);
        return this._http.get(`${this.url}/auth/google/callback`, { params });
    }

    login(data: any): Observable<any> {
        let headers = new HttpHeaders().set('Content-Type', 'application/json');
        return this._http.post(this.url + 'login', data, {
            headers: headers,
        });
    }
    validcode(data: any): Observable<any> {
        let headers = new HttpHeaders().set('Content-Type', 'application/json');
        return this._http.post(this.url + 'validcode', data, {
            headers: headers,
        });
    }
}
