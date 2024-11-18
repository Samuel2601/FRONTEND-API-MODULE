import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';

@Injectable({
    providedIn: 'root',
})
export class RegistroService {
    public url;
    constructor(private http: HttpClient) {
        this.url = GLOBAL.url;
    }
    public getRegistro(id: string) {
        return this.http.get(this.url + 'registro/' + id);
    }
    public getRegistros() {
        return this.http.get(this.url + 'registros');
    }
    sendRegistration(data: any): any {
        return this.http.post(this.url + 'registro', data);
    }
    updateRegistro(data: any, id: string): any {
        return this.http.put(this.url + 'registro/' + id, data);
    }
}
