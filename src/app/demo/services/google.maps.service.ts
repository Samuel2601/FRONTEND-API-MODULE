import { Injectable } from '@angular/core';
import { Loader } from '@googlemaps/js-api-loader';

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private loader: Loader;
  private mapLoaded: Promise<typeof google>;

  constructor() {
    this.loader = new Loader({
      apiKey: 'AIzaSyAnO4FEgIlMcRRB0NY5bn_h_EQzdyNUoPo',
      version: 'weekly',
      libraries: ['places']
    });

    this.mapLoaded = this.loader.load();
  }

  getLoader(): Promise<typeof google> {
    return this.mapLoaded;
  }
}
