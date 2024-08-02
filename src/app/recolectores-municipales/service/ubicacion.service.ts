import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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

    public url:string;
    constructor(private _http: HttpClient) {
        this.url = GLOBAL.url;
        this.loadInitialLocations();
        //this.iniciarWatcher();
    }
    private lastUpdateTimestamp: number | null = null;
    private readonly MAX_DISTANCE_KM = 0.001; // Distancia máxima permitida entre puntos consecutivos en kilómetros
    private readonly MIN_SPEED_KMH = 120; // Velocidad mínima en km/h para considerar la ubicación como válida

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
                const valid = this.isValidLocation(nuevaUbicacion, now);
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
        now?: number
    ): boolean {
        now = now ? now : Date.now();
        const lastUbicacion = this.ubicaciones.getValue().slice(-1)[0];

        // Verifica si es la primera ubicación o si la distancia y la velocidad son razonables
        if (!lastUbicacion) return true;

        const distancia = this.calculateDistance(lastUbicacion, nuevaUbicacion);
        this.DistanciaRecorrida.next(this.DistanciaRecorrida.value + distancia);
        console.log('La distancia al último punto: ', distancia);
        const tiempo = (now - this.lastUpdateTimestamp!) / 1000 / 3600; // Convertir tiempo a horas

        // Verifica que la distancia no sea demasiado grande en relación con la velocidad
        const maxPossibleDistance = this.MIN_SPEED_KMH * tiempo;

        return (
            distancia > 0 &&
            distancia <= maxPossibleDistance &&
            distancia <= this.MAX_DISTANCE_KM * 1000
        ); // Distancia en metros
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

    async loadInitialLocations() {
        try {
          const locations = await Preferences.get({ key: 'locations' });
          console.log("Se ah encontrado: ",locations);
          const parsedLocations = locations.value ? JSON.parse(locations.value) : [];
          this.ubicaciones.next(parsedLocations);
        } catch (error) {
          console.error('Error loading locations:', error);
        }
      }

    async saveLocation(
        location: {
            lat: number;
            lng: number;
            timestamp: string;
            speed: number;
            destacado: boolean;
        },
        valid?: boolean
    ) {
        valid = valid ? valid : this.isValidLocation(location);
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
        return this._http.get(
            'https://inteligenciavehicular.com/api/devices',
            { headers: headers }
        );
    }
}
