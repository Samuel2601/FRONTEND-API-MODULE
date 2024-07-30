import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import {
    BackgroundGeolocationPlugin,
    WatcherOptions,
    Location,
    CallbackError,
} from '@capacitor-community/background-geolocation';
import { registerPlugin } from '@capacitor/core';
import { BehaviorSubject } from 'rxjs';

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

    constructor() {
        this.iniciarWatcher();
    }
    private lastUpdateTimestamp: number | null = null;
    private minUpdateInterval = 60000; // 60 segundos en milisegundos

    iniciarWatcher() {
        const options: WatcherOptions = {
            backgroundMessage: 'Cancela para prevenir drenar tu batería',
            backgroundTitle: 'Aviso de rastreo',
            requestPermissions: true,
            stale: true,
            distanceFilter: 1, // Ajusta este valor según tus necesidades
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
                const nuevaUbicacion = {
                    lat: location.latitude,
                    lng: location.longitude,
                    timestamp: new Date(location.time).toISOString(),
                };

                if (
                    this.lastUpdateTimestamp === null ||
                    now - this.lastUpdateTimestamp >= this.minUpdateInterval
                ) {
                    const lastUbicacion = this.ubicaciones
                        .getValue()
                        .slice(-1)[0];
                    if (
                        !lastUbicacion ||
                        this.calculateDistance(lastUbicacion, nuevaUbicacion) >
                            options.distanceFilter
                    ) {
                        await this.saveLocation(nuevaUbicacion);
                        this.ubicaciones.next([
                            ...this.ubicaciones.getValue(),
                            nuevaUbicacion,
                        ]);
                        this.lastUpdateTimestamp = now;
                    }
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
        console.log(R * c);
        return R * c; // en metros
    }

    async saveLocation(location: {
        lat: number;
        lng: number;
        timestamp: string;
    }) {
        const locations = await Preferences.get({ key: 'locations' });
        const parsedLocations = locations.value
            ? JSON.parse(locations.value)
            : [];
        parsedLocations.push(location);
        await Preferences.set({
            key: 'locations',
            value: JSON.stringify(parsedLocations),
        });
    }

    getUbicaciones() {
        return this.ubicaciones.asObservable();
    }
    getVelocidadActual() {
      return this.velocidadActual.asObservable();
    }
}
