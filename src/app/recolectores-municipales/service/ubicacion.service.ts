import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Preferences } from '@capacitor/preferences';
import {
    BackgroundGeolocationPlugin,
    WatcherOptions,
    Location,
    CallbackError,
} from '@capacitor-community/background-geolocation';
import { registerPlugin } from '@capacitor/core';
import { BehaviorSubject } from 'rxjs';
import { Geolocation } from '@capacitor/geolocation';
import { Network } from '@capacitor/network';
import { AuthService } from 'src/app/demo/services/auth.service';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
    'BackgroundGeolocation'
);

@Injectable({
    providedIn: 'root',
})
export class UbicacionService {
    private ubicaciones = new BehaviorSubject<
        { lat: number; lng: number; timestamp: string }[]
    >([]);
    private velocidadActual = new BehaviorSubject<number>(0);
    private DistanciaRecorrida = new BehaviorSubject<number>(0);

    public url: string;
    constructor(private _http: HttpClient, private auth: AuthService) {
        this.url = GLOBAL.url;
        this.initializeNetworkListener();
        //this.loadInitialLocations();
        //this.iniciarWatcher();
    }
    private lastUpdateTimestamp: number | null = null;
    private readonly MAX_DISTANCE_KM = 0.001; // Distancia máxima permitida entre puntos consecutivos en kilómetros
    private readonly MIN_SPEED_KMH = 90 * 1000; // Velocidad mínima en km/h para considerar la ubicación como válida

    iniciarWatcher() {
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
                /*const nuevaUbicacion = {
                    lat: location.latitude,
                    lng: location.longitude,
                    timestamp: new Date().toISOString(),
                    speed: location.speed ? location.speed * 3.6 : 0, // Convertir m/s a km/h si `speed` está disponible
                    destacado: false,
                };*/
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
    }
    isValidLocation(
        nuevaUbicacion: {
            lat: number;
            lng: number;
            timestamp: string;
            speed?: number;
        },
        now1?: number
    ): { resp: boolean; message: string } {
        const respuesta = {
            resp: false,
            message: '',
        };

        const now = now1 ? now1 : Date.now();
        const lastUbicacion = this.ubicaciones.getValue().slice(-1)[0];

        // Verifica si es la primera ubicación
        if (!lastUbicacion) {
            this.lastUpdateTimestamp = now;
            respuesta.resp = true;
            respuesta.message = 'Primera ubicación registrada';
            return respuesta;
        }

        const distancia = this.calculateDistance(lastUbicacion, nuevaUbicacion);
        this.DistanciaRecorrida.next(this.DistanciaRecorrida.value + distancia);

        const tiempo =
            (now - new Date(lastUbicacion.timestamp).getTime()) / 1000 / 3600; // Convertir tiempo a horas

        // Verifica que la distancia no sea demasiado grande en relación con la velocidad
        const maxPossibleDistance = this.MIN_SPEED_KMH * tiempo;

        if (distancia <= 20) {
            respuesta.message =
                'Parece que no se ha detectado movimiento. Intenta moverte un poco y vuelve a intentarlo.';
            return respuesta;
        }

        if (distancia > maxPossibleDistance) {
            respuesta.message =
                'El movimiento parece ser un poco rápido. Asegúrate de que la ubicación es correcta y vuelve a intentarlo.';
            return respuesta;
        }
        /*
        if (distancia > this.MAX_DISTANCE_KM * 1000) {
            respuesta.message = 'La ubicación parece estar más lejos de lo esperado. Verifica tu posición e inténtalo nuevamente.';
            return respuesta;
        }
        */

        // Si todas las condiciones se cumplen, la ubicación es válida
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

    private async initializeNetworkListener() {
        const status = await Network.getStatus();
        console.log('Initial Network Status:', JSON.stringify(status));

        Network.addListener('networkStatusChange', async (status) => {
            console.log('Network status changed:', JSON.stringify(status));

            if (!status.connected && !this.hasNotifiedUser) {
                // Mostrar el mensaje al usuario la primera vez que se desconecta
                alert(
                    'Estás desconectado. La próxima vez que te conectes, enviaremos tu información.'
                );
                this.hasNotifiedUser = true;
            } else if (status.connected && this.hasNotifiedUser) {
                // Si se vuelve a conectar y ya se notificó la desconexión, intenta sincronizar
                await this.syncData();
            }
        });
    }

    async syncData() {
        try {
            const locations = await Preferences.get({ key: 'locations' });
            const asign = await Preferences.get({ key: 'asign' });

            console.log('locations:', JSON.stringify(locations));
            console.log('asign:', JSON.stringify(asign));

            if (locations.value && asign.value) {
                const parsedLocations = JSON.parse(locations.value);
                const parsedAsign = JSON.parse(asign.value);

                const result = await this.updateRutaRecolector(
                    this.auth.token(),
                    parsedAsign._id,
                    { puntos_recoleccion: parsedLocations }
                ).toPromise();

                console.log(JSON.stringify(result));
                // No eliminamos las preferencias locales
                console.log(
                    'Sincronización exitosa. La información se ha enviado.'
                );

                // Si deseas, puedes notificar al usuario sobre la sincronización exitosa
                alert('Tu información ha sido enviada exitosamente.');
            }
        } catch (error) {
            console.error('Error al sincronizar datos:', JSON.stringify(error));
        }
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
            // Obtener el ID de asignación
            const asignID = await this.getAsignacion();

            // Verificar si se encontró alguna ubicación
            if (locations.value) {
                const parsedLocations = JSON.parse(locations.value);

                // Verificar si alguna ubicación contiene el ID de asignación
                const containsAsignID = parsedLocations.some(
                    (location: any) => location._id === asignID._id
                );
                if (containsAsignID) {
                    console.log(
                        'Se ha encontrado una ubicación con el ID de asignación:',
                        asignID._id
                    );
                    this.ubicaciones.next(parsedLocations);
                } else {
                    // Si no contiene el ID de asignación, borrar todas las ubicaciones
                    console.log(
                        'No se ha encontrado ninguna ubicación con el ID de asignación. Borrando ubicaciones.'
                    );
                    await Preferences.remove({ key: 'locations' });
                    this.ubicaciones.next([]);
                }
            } else {
                // Si no hay ubicaciones, establecer la lista como vacía
                console.log('No se encontraron ubicaciones guardadas.');
                this.ubicaciones.next([]);
            }
        } catch (error) {
            console.error('Error loading locations:', error);
            this.ubicaciones.next([]); // Asegurar que la lista esté vacía en caso de error
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

    getUbicaciones() {
        return this.ubicaciones.asObservable();
    }

    getVelocidadActual() {
        return this.velocidadActual.asObservable();
    }
    getDistanciaRecorrida() {
        return this.DistanciaRecorrida.asObservable();
    }

    obtenerDeviceGPS(): Observable<any> {
        let headers = new HttpHeaders()
            .set('Content-Type', 'application/json')
            .set('Authorization', 'Basic ' + btoa('CIUDADANIA:123456789'));
        return this._http.get('https://inteligenciavehicular.com/api/devices', {
            headers: headers,
        });
    }

    async fetchRouteData(deviceId: string, from: string, to: string) {
        const url = `https://inteligenciavehicular.com/api/reports/route?deviceId=${deviceId}&type=allEvents&from=${from}&to=${to}`;
        console.log('LLAMADO: ', url);
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
