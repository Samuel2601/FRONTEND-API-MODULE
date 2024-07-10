import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GLOBAL } from './GLOBAL';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
@Injectable({
    providedIn: 'root',
})
export class AdminService {
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
    identity(token: string) {
        const helper = new JwtHelperService();
        var decodedToken = helper.decodeToken(token);
        return decodedToken.sub;
    }
    
    roluser(token: any) {
        const helper = new JwtHelperService();
        var decodedToken = helper.decodeToken(token);
        return decodedToken.rol_user;
    }
    calcularTiempoRestante(token: string): number {
        const helper = new JwtHelperService();
        const decodedToken = helper.decodeToken(token);

        // Obtener la fecha de expiración del token en milisegundos
        const expiracion = decodedToken.exp * 1000;

        // Obtener la fecha actual en milisegundos
        const ahora = Date.now();

        // Calcular la diferencia de tiempo en milisegundos
        let diferencia = expiracion - ahora;

        // Calcular días, horas, minutos y segundos
        const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
        diferencia -= dias * (1000 * 60 * 60 * 24);
        const horas = Math.floor(diferencia / (1000 * 60 * 60));
        diferencia -= horas * (1000 * 60 * 60);
        const minutos = Math.floor(diferencia / (1000 * 60));
        diferencia -= minutos * (1000 * 60);
        const segundos = Math.floor(diferencia / 1000);
        if (expiracion <= ahora) {
            localStorage.clear();
            sessionStorage.clear();
            return 0;
        }
        //console.log(diferencia,expiracion,ahora,expiracion>ahora);
        // Devolver el objeto con el tiempo restante formateado
        //console.log({ dias, horas, minutos, segundos });
        return diferencia;
    }
    getCiudadano(id: string): Observable<any> {
        let headers = new HttpHeaders().set('Content-Type', 'application/json');
        return this._http.get(this.url + 'getciudadano/' + id, {
            headers: headers,
        });
    }
    verificarCorreo(id: string): Observable<any> {
        let headers = new HttpHeaders().set('Content-Type', 'application/json');
        return this._http.get(this.url + 'verificarcorreo/' + id, {
            headers: headers,
        });
    }
    isAuthenticate() {
        const token: any = sessionStorage.getItem('token');

        try {
            const helper = new JwtHelperService();
            var decodedToken = helper.decodeToken(token);
            //console.log(decodedToken);
            if (!token) {
                localStorage.clear();
                sessionStorage.clear();
                return false;
            }

            if (!decodedToken) {
                localStorage.clear();
                sessionStorage.clear();
                return false;
            }

            if (helper.isTokenExpired(token)) {
                localStorage.clear();
                sessionStorage.clear();
                return false;
            }
        } catch (error) {
            ////console.log(error);
            localStorage.clear();
            sessionStorage.clear();
            return false;
        }

        return true;
    }
}
