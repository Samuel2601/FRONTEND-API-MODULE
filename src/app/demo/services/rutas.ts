import { Injectable } from '@angular/core';
import { catchError, Observable, of, throwError } from 'rxjs';
import { GLOBAL } from './GLOBAL';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import imageCompression from 'browser-image-compression';
@Injectable({
    providedIn: 'root',
})
export class RutasService {
    public url;

    constructor(private http: HttpClient) {
        this.url = GLOBAL.url;
    }

    content(): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
        });
        return this.http.get(this.url + 'content', {
            headers: headers,
        });
    }
}
