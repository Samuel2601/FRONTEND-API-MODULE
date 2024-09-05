import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GLOBAL } from './GLOBAL';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import imageCompression from 'browser-image-compression';

@Injectable({
  providedIn: 'root'
})
export class CreateService {
	public url;
	
	constructor(private http: HttpClient) {
		this.url = GLOBAL.url;
	}
  registrarUsuario(data: any): Observable<any> {
   let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.url + 'register', data, { headers: headers });
  }
  /*
  registrarUsuario(token: any, data: any, formulario: FormGroup): Observable<any> {
    let headers = new HttpHeaders({
      Authorization: token,
    });
    const formData = new FormData();
    formData.append('nombre', data);

    const foto = formulario.get('foto')?.value;
    if (foto instanceof File) {
      // Llama a la función compressor para comprimir la imagen
      return new Observable((observer) => {
        this.compressor(foto).then(compressedFile => {
          formData.append('foto', compressedFile);

          // Envía la imagen comprimida al servidor
          this.http.post(this.url + 'registrar_usuario', formData, { headers: headers })
            .subscribe(
              (response) => {
                observer.next(response);
                observer.complete();
              },
              (error) => observer.error(error)
            );
        }, error => observer.error(error));
      });
    } else {
      // Enviar sin foto si no se proporciona una imagen
      return this.http.post(this.url + 'registrar_usuario', formData, { headers: headers });
    }
  }*/

  isObject(obj) {
      return obj && typeof obj === 'object' && !Array.isArray(obj);
  }
  registrarActividadProyecto(token: any, data: any, fotos: File[]): Observable<any> {
    let headers = new HttpHeaders({
      Authorization: token,
    });
    const formData = new FormData();
    formData.append('descripcion', data.descripcion);
    formData.append('encargado', data.encargado);
    
    formData.append('direccion_geo',this.isObject(data.direccion_geo)?JSON.stringify(data.direccion_geo):data.direccion_geo);
    formData.append('estado', data.estado._id);
    formData.append('actividad', data.actividad._id);
    formData.append('fecha_evento', data.fecha_evento);
    formData.append('observacion', data.observacion);

    formData.append('es_articulo', data.es_articulo);
    formData.append('mostrar_en_mapa', data.mostrar_en_mapa);
    formData.append('icono_marcador', data.icono_marcador);
    formData.append('title_marcador', data.title_marcador);
    formData.append('destacado', data.destacado);
    
    // Iterar sobre los valores de FormData y mostrarlos en la consola
    /*formData.forEach((value, key) => {
      console.log(`${key}: ${value}`);
    });*/
    // Llama a la función compressor para comprimir cada imagen
    return new Observable((observer) => {
      const compressedFilesPromises = fotos.map((foto) => this.compressor(foto));
      Promise.all(compressedFilesPromises)
        .then((compressedFiles) => {
          compressedFiles.forEach((compressedFile, index) => {
            formData.append('foto' + index, compressedFile);
          });

          // Envía las imágenes comprimidas al servidor
          this.http.post(this.url + 'ficha_sectorial', formData, { headers: headers })
            .subscribe(
              (response) => {
                observer.next(response);
                observer.complete();
              },
              (error) => observer.error(error)
            );
        })
        .catch((error) => observer.error(error));
    });
  }

  registrarIncidenteDenuncia(token: any, data: any, fotos: File[]): Observable<any> {
    let headers = new HttpHeaders({
      Authorization: token,
    });    
    const formData = new FormData();
    formData.append('categoria', data.categoria._id);
    formData.append('subcategoria', data.subcategoria._id);
    formData.append('estado', data.estado);
    formData.append('ciudadano', data.ciudadano);
    formData.append('descripcion', data.descripcion);
    formData.append('direccion_geo',JSON.stringify(data.direccion_geo));
    
    // Llama a la función compressor para comprimir cada imagen
    return new Observable((observer) => {
      const compressedFilesPromises = fotos.map((foto) => this.compressor(foto));
      Promise.all(compressedFilesPromises)
        .then((compressedFiles) => {
          compressedFiles.forEach((compressedFile, index) => {
            formData.append(`foto${index}`, compressedFile); // Asegúrate de que el nombre del campo coincida
          });
    
          // Envía las imágenes comprimidas al servidor
          this.http.post(this.url + 'incidentes_denuncia', formData, { headers: headers })
            .subscribe(
              (response) => {
                observer.next(response);
                observer.complete();
              },
              (error) => observer.error(error)
            );
        })
        .catch((error) => observer.error(error));
    });
  }
  


  registrarCategoria(token: any, data: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.post(this.url + 'categoria', data, { headers: headers });
  }

  registrarSubcategoria(token: any, data: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.post(this.url + 'subcategoria', data, { headers: headers });
  }

  registrarEncargadoCategoria(token: any, data: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.post(this.url + 'encargado_categoria', data, { headers: headers });
  }

  registrarRolUsuario(token: any, data: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    //console.log(data);
    return this.http.post(this.url + 'registrarrolesmasivo', data, { headers: headers });
  }

  registrarEstadoIncidente(token: any, data: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.post(this.url + 'estado_incidente', data, { headers: headers });
  }

  registrarEstadoActividadProyecto(token: any, data: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.post(this.url + 'estado_actividad_proyecto', data, { headers: headers });
  }

  registrarTipoActividadProyecto(token: any, data: any): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.post(this.url + 'actividad_proyecto', data, { headers: headers });
  }
  registrarPermiso(token: any, data: any[]): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.post(this.url + 'registrarpermisosmasivo', data, { headers: headers });
  }

  registrarDireccionGeo(token: any, data: any, foto: File): Observable<any> {
    let headers = new HttpHeaders({
      Authorization: token,
    });
    const formData = new FormData();
    formData.append('nombre', data);
  
    // Llama a la función compressor para comprimir la imagen
    return new Observable((observer) => {
      this.compressor(foto).then(compressedFile => {
        formData.append('foto', compressedFile);
  
        // Envía la imagen comprimida al servidor
        this.http.post(this.url + 'direccion_geo', formData, { headers: headers })
          .subscribe(
            (response) => {
              observer.next(response);
              observer.complete();
            },
            (error) => observer.error(error)
          );
      }, error => observer.error(error));
    });
  }
  
  async compressor(image: any): Promise<Blob> {
    //console.log('originalFile instanceof Blob', image instanceof Blob); // true
    //console.log(`originalFile size ${image.size / 1024 / 1024} MB`);
  
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    }
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

  registrarAsignacionReolectores(token: any, data: any[]): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token,
    });
    return this.http.post(this.url + 'recolector', data, { headers: headers });
  }
  
}
