import { Injectable } from '@angular/core';
import { catchError, Observable, of, throwError } from 'rxjs';
import { GLOBAL } from './GLOBAL';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import imageCompression from 'browser-image-compression';
@Injectable({
    providedIn: 'root',
})
export class UpdateService {
    public url;

    constructor(private http: HttpClient) {
        this.url = GLOBAL.url;
    }
    actualizarUsuario(
        token: any,
        id: string,
        data: FormData,
        file: File
    ): Observable<any> {
        // console.log(id, data);

        const headers = new HttpHeaders({
            Authorization: token,
        });
        const formData = new FormData();
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const value = data[key];
                if (key === 'role' && typeof value === 'object' && value._id) {
                    formData.append('role', value._id);
                } else {
                    formData.append(key, value);
                }
            }
        }

        // Agregar la foto seleccionada si existe
        if (file) {
            formData.append('photo', file);
        }

        // Iterar y mostrar valores de FormData
        /*     formData.forEach((value, key) => {
            console.log(`${key}: ${value}`);
        });
        */
        const params = new HttpParams().set('id', id);
        return this.http.put(this.url + 'actualizaruser', data, {
            headers: headers,
            params: params,
        });
    }

    actualizarActividadProyecto(
        token: any,
        id: string,
        data: any
    ): Observable<any> {
        const headers = new HttpHeaders({
            Authorization: token,
        });
        //const params = new HttpParams().set('id', id);
        return this.http.put(this.url + 'ficha_sectorial/' + id, data, {
            headers: headers,
        });
    }

    actualizarIncidenteDenuncia(
        token: any,
        id: string,
        data: any
    ): Observable<any> {
        const headers = new HttpHeaders({
            Authorization: token,
        });

        return new Observable((observer) => {
            const formData = new FormData();
            if (data.categoria)
                formData.append('categoria', data.categoria._id);
            if (data.subcategoria)
                formData.append('subcategoria', data.subcategoria._id);
            if (data.ciudadano)
                formData.append(
                    'ciudadano',
                    data.ciudadano._id ? data.ciudadano._id : data.ciudadano
                );
            if (data.descripcion)
                formData.append('descripcion', data.descripcion);
            if (data.estado) formData.append('estado', data.estado._id);
            if (data.respuesta) formData.append('respuesta', data.respuesta);
            if (data.encargado) formData.append('encargado', data.encargado);
            if (data.direccion_geo)
                formData.append(
                    'direccion_geo',
                    JSON.stringify(data.direccion_geo)
                );
            formData.append('view', data.view);
            if (data.view_id) formData.append('view_id', data.view_id);
            if (data.view_date) formData.append('view_date', data.view_date);

            if (
                Array.isArray(data.evidencia) &&
                data.evidencia.every(
                    (item) => item instanceof File || item instanceof Blob
                )
            ) {
                const compressedFilesPromises = data.evidencia.map(
                    (foto: any) => this.compressor(foto)
                );

                Promise.all(compressedFilesPromises)
                    .then((compressedFiles) => {
                        compressedFiles.forEach((compressedFile, index) => {
                            formData.append(
                                `evidencia${index}`,
                                compressedFile
                            );
                        });
                        console.log('Con imagenes');
                        formData.forEach((value, key) => {
                            console.log(`${key}: ${value}`);
                        });
                        this.http
                            .put(
                                this.url + 'incidentes_denuncia/' + id,
                                formData,
                                {
                                    headers: headers,
                                }
                            )
                            .subscribe(
                                (response) => {
                                    observer.next(response);
                                    observer.complete();
                                },
                                (error) => observer.error(error)
                            );
                    })
                    .catch((error) => observer.error(error));
            } else {
                console.log('Sin imagenes');
                formData.forEach((value, key) => {
                    console.log(`${key}: ${value}`);
                });
                this.http
                    .put(this.url + 'incidentes_denuncia/' + id, formData, {
                        headers: headers,
                    })
                    .subscribe(
                        (response) => {
                            observer.next(response);
                            observer.complete();
                        },
                        (error) => observer.error(error)
                    );
            }
        });
    }

    actualizarCategoria(token: any, id: string, data: any): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = new HttpParams().set('id', id);
        return this.http.put(this.url + 'categoria', data, {
            headers: headers,
            params: params,
        });
    }

    actualizarSubcategoria(token: any, id: string, data: any): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = new HttpParams().set('id', id);
        return this.http.put(this.url + 'subcategoria', data, {
            headers: headers,
            params: params,
        });
    }

    actualizarEncargadoCategoria(
        token: any,
        id: string,
        data: any
    ): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = new HttpParams().set('id', id);
        return this.http.put(this.url + 'encargado_categoria', data, {
            headers: headers,
            params: params,
        });
    }

    actualizarRolUsuario(token: any, id: string, data: any): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = new HttpParams().set('id', id);
        return this.http.put(this.url + 'actualizarrole', data, {
            headers: headers,
            params: params,
        });
    }

    actualizarEstadoIncidente(
        token: any,
        id: string,
        data: any
    ): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = new HttpParams().set('id', id);
        return this.http.put(this.url + 'estado_incidente', data, {
            headers: headers,
            params: params,
        });
    }

    actualizarEstadoActividadProyecto(
        token: any,
        id: string,
        data: any
    ): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = new HttpParams().set('id', id);
        return this.http.put(this.url + 'estado_actividad_proyecto', data, {
            headers: headers,
            params: params,
        });
    }

    actualizarTipoActividadProyecto(
        token: any,
        id: string,
        data: any
    ): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        //const params = new HttpParams().set('id', id);
        return this.http.put(this.url + 'actividad_proyecto/' + id, data, {
            headers: headers,
        });
    }

    actualizarDireccionGeo(token: any, id: string, data: any): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = new HttpParams().set('id', id);
        return this.http.put(this.url + 'direccion_geo', data, {
            headers: headers,
            params: params,
        });
    }
    actualizarPermisos(token: string, id: string, data: any): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });

        const params = new HttpParams().set('id', id);

        return this.http.put<any>(`${this.url}actualizarpermiso`, data, {
            headers: headers,
            params: params,
        });
    }
    updateRecolectorRuta(token: string, id: string): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });

        return this.http.put<any>(`${this.url}recolector_ruta/${id}`, null, {
            headers,
        });
    }

    async compressor(image: any): Promise<Blob> {
        //console.log('originalFile instanceof Blob', image instanceof Blob); // true
        //console.log(`originalFile size ${image.size / 1024 / 1024} MB`);

        const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
        };
        try {
            // Comprime la imagen
            const compressedFile = await imageCompression(image, options);
            //console.log('compressedFile instanceof Blob', compressedFile instanceof Blob); // true
            //console.log(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`); // smaller than maxSizeMB

            return compressedFile;
        } catch (error) {
            //console.log(error);
            throw error;
        }
    }
}
