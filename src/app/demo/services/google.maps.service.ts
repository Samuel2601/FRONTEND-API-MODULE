import { Injectable } from '@angular/core';
import { Loader } from '@googlemaps/js-api-loader';

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private loader: Loader;
  private mapLoaded: Promise<typeof google>;

  constructor() {
    // Inicializa el cargador de Google Maps
    const loader = new Loader({
      apiKey: 'AIzaSyAnO4FEgIlMcRRB0NY5bn_h_EQzdyNUoPo',
      version: 'weekly',
      libraries: ['places', 'marker'], // Carga las bibliotecas necesarias
    });

    // Configura la promesa para cargar las bibliotecas
    this.mapLoaded = this.loadGoogleMaps(loader);
  }

  private async loadGoogleMaps(loader: Loader): Promise<typeof google> {
    // Carga las bibliotecas necesarias
    await loader.importLibrary('places');
    await loader.importLibrary('marker');
    // Devuelve el objeto global google
    return window.google;
  }

  getLoader(): Promise<typeof google> {
    return this.mapLoaded;
  }
}
