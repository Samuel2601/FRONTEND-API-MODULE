import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Preferences } from '@capacitor/preferences';
/*import {
    BackgroundGeolocationPlugin,
    WatcherOptions,
    Location,
    CallbackError,
} from '@capacitor-community/background-geolocation';*/
import { registerPlugin } from '@capacitor/core';
import { BehaviorSubject } from 'rxjs';
import { Geolocation } from '@capacitor/geolocation';
import { Network } from '@capacitor/network';
import { AuthService } from 'src/app/demo/services/auth.service';
/*
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
    'BackgroundGeolocation'
);
*/
@Injectable({
    providedIn: 'root',
})
export class UbicacionService {
    private ubicaciones = new BehaviorSubject<
        { lat: number; lng: number; timestamp: string }[]
    >([]);
    private retornos = new BehaviorSubject<any[]>([]);

    private velocidadActual = new BehaviorSubject<number>(0);
    private DistanciaRecorrida = new BehaviorSubject<number>(0);

    public url: string;
    constructor(private _http: HttpClient, private auth: AuthService) {
        this.url = GLOBAL.url;
        //this.initializeNetworkListener();
        //this.loadInitialLocations();
        //this.iniciarWatcher();
    }
    private lastUpdateTimestamp: number | null = null;
    private readonly MIN_SPEED_KMH = 90 * 1000; // Velocidad mínima en km/h para considerar la ubicación como válida

    /*iniciarWatcher() {
        const options: WatcherOptions = {
            backgroundMessage: 'Cancela para prevenir drenar tu batería',
            backgroundTitle: 'Aviso de rastreo',
            requestPermissions: true,
            stale: true,
            distanceFilter: 40, // Ajusta este valor según tus necesidades
        };

        BackgroundGeolocation.addWatcher(
            options,
            async (location: Location, error: CallbackError) => {
                if (error) {
                    if (error.code === 'NOT_AUTHORIZED') {
                        if (
                            window.confirm(
                                'Esta aplicación necesita tu ubicación, ' +
                                    'pero no tiene permiso.\n\n' +
                                    '¿Abrir configuración ahora?'
                            )
                        ) {
                            BackgroundGeolocation.openSettings();
                        }
                    }
                    return console.error(error);
                }
                const velocidad = location.speed; // La velocidad está en metros por segundo (m/s)

                // Actualiza el BehaviorSubject con la nueva velocidad
                this.velocidadActual.next(velocidad || 0);

                const now = Date.now();
                const currentLocation = await Geolocation.getCurrentPosition();
                const nuevaUbicacion = {
                    _id: '1515',
                    lat: currentLocation.coords.latitude,
                    lng: currentLocation.coords.longitude,
                    timestamp: new Date().toISOString(),
                    speed: location.speed ? location.speed * 3.6 : 0,
                    destacado: false,
                };
                const nuevaUbicacion = {
                    lat: location.latitude,
                    lng: location.longitude,
                    timestamp: new Date().toISOString(),
                    speed: location.speed ? location.speed * 3.6 : 0, // Convertir m/s a km/h si `speed` está disponible
                    destacado: false,
                };*
                // Solo guarda y emite si la nueva ubicación es válida
                const valid = this.isValidLocation(nuevaUbicacion, now).resp;
                if (valid) {
                    await this.saveLocation(nuevaUbicacion, valid);
                    this.ubicaciones.next([
                        ...this.ubicaciones.getValue(),
                        nuevaUbicacion,
                    ]);
                    this.lastUpdateTimestamp = now;
                }
            }
        )
            .then((watcherId) => {
                console.log('Watcher ID:', watcherId);
            })
            .catch((err) => {
                console.error('Error al iniciar el watcher', err);
            });
    }*/

    isValidLocation(nuevaUbicacion: {
        lat: number;
        lng: number;
        timestamp: string;
        speed?: number;
        accuracy?: number;
    }): { resp: boolean; message: string } {
        const respuesta = {
            resp: false,
            message: '',
        };

        // Obtener el valor de ubicaciones
        const ubicaciones = this.ubicaciones.getValue();

        // Filtrar los objetos que tienen retorno en true
        const filteredUbicaciones = ubicaciones.filter(
            (ubicacion: any) => ubicacion.retorno === false
        );

        const lastUbicacion =
            filteredUbicaciones[filteredUbicaciones.length - 1];

        // Verifica si es la primera ubicación
        if (!lastUbicacion) {
            respuesta.resp = true;
            respuesta.message = 'Primera ubicación registrada';
            return respuesta;
        }

        if (nuevaUbicacion.accuracy && nuevaUbicacion.accuracy > 100) {
            respuesta.message =
                'La precisión de la ubicación es muy baja. Intenta nuevamente.';
            return respuesta;
        }

        const distancia = this.calculateDistance(lastUbicacion, nuevaUbicacion);
        if (distancia <= 20) {
            respuesta.message =
                'No se ha detectado movimiento suficiente. Intenta moverte.';
            return respuesta;
        }

        const tiempo =
            (Date.now() - new Date(lastUbicacion.timestamp).getTime()) /
            1000 /
            3600;
        const maxPossibleDistance = this.MIN_SPEED_KMH * tiempo;
        if (distancia > maxPossibleDistance) {
            respuesta.message =
                'El movimiento es demasiado rápido para ser real. Verifica tu ubicación.';
            return respuesta;
        }

        respuesta.resp = true;
        respuesta.message = 'Ubicación válida';
        return respuesta;
    }

    calculateDistance(
        loc1: { lat: number; lng: number },
        loc2: { lat: number; lng: number }
    ) {
        const R = 6371e3; // metros
        const φ1 = (loc1.lat * Math.PI) / 180;
        const φ2 = (loc2.lat * Math.PI) / 180;
        const Δφ = ((loc2.lat - loc1.lat) * Math.PI) / 180;
        const Δλ = ((loc2.lng - loc1.lng) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // en metros
    }
    private hasNotifiedUser: boolean = false;
    private lastStatus: boolean = false; // Estado anterior de la red

    async initializeNetworkListener() {
        const status = await Network.getStatus();
        //console.log('Initial Network Status:', JSON.stringify(status));
        this.lastStatus = status.connected;

        Network.addListener('networkStatusChange', async (status) => {
            //console.log('Network status changed:', JSON.stringify(status));

            // Verifica si el estado de la red ha cambiado de desconectado a conectado
            if (!this.lastStatus && status.connected) {
                // Si estaba desconectado y ahora está conectado, intenta sincronizar
                await this.syncData();
                this.hasNotifiedUser = false; // Resetear la notificación
            } else if (!status.connected && !this.hasNotifiedUser) {
                // Si está desconectado y aún no se ha notificado al usuario
                alert(
                    'Estás desconectado. La próxima vez que te conectes, enviaremos tu información.'
                );
                this.hasNotifiedUser = true; // Marca como notificado
            }

            // Actualiza el estado de la red
            this.lastStatus = status.connected;
        });
    }

    async syncData() {
        try {
            const locations = await Preferences.get({ key: 'locations' });
            const asign = await Preferences.get({ key: 'asign' });
            const capacidad_retorno = await Preferences.get({
                key: 'capacidad_retorno',
            });
            //console.log('locations:', JSON.stringify(locations));
            //console.log('asign:', JSON.stringify(asign));

            if (locations.value && asign.value) {
                const parsedLocations = JSON.parse(locations.value);
                const parsedAsign = JSON.parse(asign.value);
                const parseCapcidad = JSON.parse(capacidad_retorno.value);
                const token = this.auth.token();

                // Verificamos que el datatoken sea de tipo string
                if (!token || typeof token !== 'string') {
                    console.error('Token inválido o no encontrado.');
                    return;
                }
                const result = await this.updateRutaRecolector(
                    token,
                    parsedAsign._id,
                    {
                        puntos_recoleccion: parsedLocations,
                        //capacidad_retorno: paserCapcidad,
                    }
                ).toPromise();
                //console.log('ANTES DE ENVIAR RETORNOS', result);

                // Cortar los nuevos registros que no están en los registros viejos
                const nuevosSolo = parseCapcidad.slice(
                    result.data.capacidad_retorno.length
                );

                // Concatenar los registros antiguos con los nuevos
                const capacidadCombinada = [
                    ...result.data.capacidad_retorno,
                    ...nuevosSolo,
                ];
                const result2 = await this.updateRutaRecolector(
                    token,
                    parsedAsign._id,
                    {
                        //puntos_recoleccion: parsedLocations,
                        capacidad_retorno: capacidadCombinada,
                    }
                ).toPromise();
                //console.log('DESPUES DE ENVIAR RETORNOS', result2);

                // Si deseas, puedes notificar al usuario sobre la sincronización exitosa
                alert('Tu información ha sido enviada exitosamente.');
            }
        } catch (error) {
            console.error('Error al sincronizar datos:', JSON.stringify(error));
        }
    }

    mergeCapacidades(viejos, nuevos) {
        // Recorremos los nuevos registros
        nuevos.forEach((nuevoRegistro) => {
            // Verificamos si existe un registro con el mismo label en los registros viejos
            const registroExistente = viejos.find(
                (viejoRegistro) => viejoRegistro.label === nuevoRegistro.label
            );

            if (registroExistente) {
                // Si existe, actualizamos los valores del registro viejo con el nuevo
                registroExistente.value = nuevoRegistro.value;
                registroExistente.verificacion = nuevoRegistro.verificacion;
            } else {
                // Si no existe, añadimos el nuevo registro a la lista de viejos
                viejos.push(nuevoRegistro);
            }
        });

        return viejos;
    }

    private getHeaders(token: string): HttpHeaders {
        return new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
    }

    updateRutaRecolector(
        token: string,
        id: string,
        data: any
    ): Observable<any> {
        const headers = this.getHeaders(token);
        return this._http
            .put(`${this.url}recolector/${id}`, data, { headers })
            .pipe(
                map((response) => response),
                catchError((error) => {
                    console.error('Error en updateRutaRecolector:', error);
                    return throwError(error);
                })
            );
    }

    async loadInitialLocations() {
        try {
            // Obtener las ubicaciones guardadas
            const locations = await Preferences.get({ key: 'locations' });
            const capacidad_retorno = await Preferences.get({
                key: 'capacidad_retorno',
            });
            // Obtener el ID de asignación
            const asignID = await this.getAsignacion();

            // Verificar si se encontró alguna ubicación
            if (locations.value) {
                const parsedLocations = JSON.parse(locations.value);
                const paserCapcidad = JSON.parse(capacidad_retorno.value);

                // Verificar si alguna ubicación contiene el ID de asignación
                const containsAsignID = parsedLocations.some(
                    (location: any) => location._id === asignID._id
                );
                if (containsAsignID) {
                    //console.log(                     'Se ha encontrado una ubicación con el ID de asignación:',                        asignID._id                    );
                    this.ubicaciones.next(parsedLocations);
                    this.retornos.next(paserCapcidad);
                } else {
                    // Si no contiene el ID de asignación, borrar todas las ubicaciones
                    //console.log(                        'No se ha encontrado ninguna ubicación con el ID de asignación. Borrando ubicaciones.'                    );
                    await Preferences.remove({ key: 'locations' });
                    await Preferences.remove({ key: 'capacidad_retorno' });
                    this.ubicaciones.next([]);
                    this.retornos.next([]);
                }
            } else {
                // Si no hay ubicaciones, establecer la lista como vacía
                console.log('No se encontraron ubicaciones guardadas.');
                this.ubicaciones.next([]);
                this.retornos.next([]);
            }
        } catch (error) {
            console.error('Error loading locations:', error);
            this.ubicaciones.next([]); // Asegurar que la lista esté vacía en caso de error
            this.retornos.next([]);
        }
    }

    async saveLocation(
        location: {
            _id: string;
            lat: number;
            lng: number;
            timestamp: string;
            speed: number;
            destacado: boolean;
        },
        valid?: boolean
    ) {
        valid = valid ? valid : this.isValidLocation(location).resp;
        if (valid) {
            const locations = await Preferences.get({ key: 'locations' });
            const parsedLocations = locations.value
                ? JSON.parse(locations.value)
                : [];
            parsedLocations.push(location);
            await Preferences.set({
                key: 'locations',
                value: JSON.stringify(parsedLocations),
            });

            this.ubicaciones.next([...this.ubicaciones.getValue(), location]);
        }
    }
    async saveRetorno(
        retorno:
            | { label: 'Lleno'; value: 'Lleno' }
            | { label: 'Medio'; value: 'Medio' }
            | { label: 'Vacío'; value: 'Vacío' }
    ) {
        const capacidad_retorno = await Preferences.get({
            key: 'capacidad_retorno',
        });
        const parsedRetornos = capacidad_retorno.value
            ? JSON.parse(capacidad_retorno.value)
            : [];
        parsedRetornos.push(retorno);
        await Preferences.set({
            key: 'capacidad_retorno',
            value: JSON.stringify(parsedRetornos),
        });
        console.log(this.retornos.getValue());
        if (this.retornos.getValue()) {
            this.retornos.next([...this.retornos.getValue(), retorno]);
        } else {
            this.retornos.next([retorno]);
        }
    }
    async saveAsignacion(asign: any): Promise<boolean> {
        try {
            await Preferences.set({
                key: 'asign',
                value: JSON.stringify(asign),
            });
            return true;
        } catch (error) {
            console.error('Error al guardar la asignación:', error);
            return false;
        }
    }
    getAsignacion = async () => {
        const { value } = await Preferences.get({ key: 'asign' });
        return JSON.parse(value);
    };

    getUbicaciones(): {
        ubicaciones: Observable<any[]>;
        retorno: Observable<any[]>;
    } {
        return {
            ubicaciones: this.ubicaciones.asObservable(),
            retorno: this.retornos.asObservable(),
        };
    }

    getVelocidadActual() {
        return this.velocidadActual.asObservable();
    }
    getDistanciaRecorrida() {
        return this.DistanciaRecorrida.asObservable();
    }

    private storageKey = 'deviceGPSData'; // Clave para almacenar en sessionStorage

    obtenerDeviceGPS(): Observable<any> {
        // Intentar obtener datos del sessionStorage
        const cachedData = sessionStorage.getItem(this.storageKey);

        if (cachedData) {
            // Retornar un Observable con los datos en caché
            return of(JSON.parse(cachedData));
        }

        // Si no hay caché, realizar la solicitud HTTP
        let headers = new HttpHeaders()
            .set('Content-Type', 'application/json')
            .set('Authorization', 'Basic ' + btoa('CIUDADANIA:123456789'));

        return this._http
            .get('https://inteligenciavehicular.com/api/devices', {
                headers: headers,
            })
            .pipe(
                tap((data) => {
                    // Almacenar la respuesta en sessionStorage
                    sessionStorage.setItem(
                        this.storageKey,
                        JSON.stringify(data)
                    );
                })
            );
    }

    // Método para invalidar la caché si es necesario
    invalidateCache(): void {
        sessionStorage.removeItem(this.storageKey); // Limpiar la caché
    }

    async fetchRouteData(deviceId: string, from: string, to: string) {
        const url = `https://inteligenciavehicular.com/api/reports/route?deviceId=${deviceId}&type=allEvents&from=${from}&to=${to}`;
        //console.log('LLAMADO: ', url);
        let headers = new HttpHeaders()
            .set('Content-Type', 'application/json')
            .set('Authorization', 'Basic ' + btoa('CIUDADANIA:123456789'));

        try {
            return this._http.get(url, { headers });
        } catch (error) {
            console.error('Error fetching route data:', error);
            throw error;
        }
    }
}
