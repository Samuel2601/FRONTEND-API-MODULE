import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { BackgroundGeolocationPlugin, WatcherOptions, Location, CallbackError } from "@capacitor-community/background-geolocation";
import { registerPlugin } from '@capacitor/core';
import { BehaviorSubject } from 'rxjs';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");

@Injectable({
  providedIn: 'root'
})
export class UbicacionService {
  private featuredLocationsKey = 'featuredLocations';
  private ubicaciones = new BehaviorSubject<{ lat: number, lng: number, timestamp: string }[]>([]);

  constructor() {
    this.iniciarWatcher();
  }

  iniciarWatcher() {
    const options: WatcherOptions = {
      backgroundMessage: "Cancela para prevenir drenar tu batería",
      backgroundTitle: "Aviso de rastreo",
      requestPermissions: true,
      stale: true,
      distanceFilter: 10,
    };

    BackgroundGeolocation.addWatcher(options, async (location: Location, error: CallbackError) => {
      if (error) {
        if (error.code === "NOT_AUTHORIZED") {
          if (window.confirm(
            "Esta aplicación necesita tu ubicación, " +
            "pero no tiene permiso.\n\n" +
            "¿Abrir configuración ahora?"
          )) {
            BackgroundGeolocation.openSettings();
          }
        }
        return console.error(error);
      }

      const nuevaUbicacion = {
        lat: location.latitude,
        lng: location.longitude,
        timestamp: new Date(location.time).toISOString()
      };

      await this.saveLocation(nuevaUbicacion);
      this.ubicaciones.next([...this.ubicaciones.getValue(), nuevaUbicacion]);
    }).then(watcherId => {
      // Opcional: Guardar el watcherId si necesitas detener el watcher en algún momento
      console.log('Watcher ID:', watcherId);
    }).catch(err => {
      console.error('Error al iniciar el watcher', err);
    });
  }

  async saveLocation(location: { lat: number, lng: number, timestamp: string }) {
    const locations = await Preferences.get({ key: 'locations' });
    const parsedLocations = locations.value ? JSON.parse(locations.value) : [];
    parsedLocations.push(location);
    await Preferences.set({
      key: 'locations',
      value: JSON.stringify(parsedLocations)
    });
  }

  getUbicaciones() {
    return this.ubicaciones.asObservable();
  }
  async getFeaturedLocations(): Promise<{ lat: number, lng: number, timestamp: string }[]> {
    const locations = await Preferences.get({ key: this.featuredLocationsKey });
    return locations.value ? JSON.parse(locations.value) : [];
  }
  // Método para obtener la última ubicación registrada
  async getCurrentLocation(): Promise<{ lat: number, lng: number, timestamp: string } | null> {
    const locations = await Preferences.get({ key: this.featuredLocationsKey });
    const parsedLocations = locations.value ? JSON.parse(locations.value) : [];
    return parsedLocations.length > 0 ? parsedLocations[parsedLocations.length - 1] : null;
  }
}
