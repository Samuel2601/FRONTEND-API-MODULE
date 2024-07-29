import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { GoogleMapsService } from 'src/app/demo/services/google.maps.service';
import { UbicacionService } from '../service/ubicacion.service';
import { Geolocation } from '@capacitor/geolocation';
import { HelperService } from 'src/app/demo/services/helper.service';

@Component({
    selector: 'app-agregar-ubicacion-recolectores',
    templateUrl: './agregar-ubicacion-recolectores.component.html',
    styleUrls: ['./agregar-ubicacion-recolectores.component.scss'],
})
export class AgregarUbicacionRecolectoresComponent implements OnInit {
    mapCustom: google.maps.Map;
    private currentLocationMarker: google.maps.Marker;
    public locationSubscription: Subscription;

    constructor(
        private ubicacionService: UbicacionService,
        private googlemaps: GoogleMapsService,
        private helper: HelperService
    ) {}

    ngOnInit(): void {
        this.initMap();

        this.locationSubscription = this.ubicacionService
            .getUbicaciones()
            .subscribe((locations) => {
                this.updateMap(locations);
            });
    }

    ngOnDestroy(): void {
        if (this.locationSubscription) {
            this.locationSubscription.unsubscribe();
        }
    }

    async initMap() {
        this.googlemaps.getLoader().then(async () => {
            this.helper.autocompleteService =
                new google.maps.places.AutocompleteService();
            this.helper.geocoderService = new google.maps.Geocoder();

            const haightAshbury = { lat: 0.977035, lng: -79.655415 };
            this.mapCustom = new google.maps.Map(
                document.getElementById('map2') as HTMLElement,
                {
                    zoom: 15,
                    center: haightAshbury,
                    mapTypeId: 'terrain',
                    fullscreenControl: false,
                    mapTypeControlOptions: {
                        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                        position: google.maps.ControlPosition.LEFT_BOTTOM,
                    },
                }
            );
            await this.getLocation();
        });
    }
    isMobil(): boolean {
        return this.helper.isMobil();
    }
    latitud: any;
    longitud: any;
    async getLocation() {
        if (this.isMobil()) {
            const permission = await Geolocation.requestPermissions();
            if (permission) {
                const coordinates = await Geolocation.getCurrentPosition();
                return coordinates;
            } else {
                throw new Error('No se puede ubicater');
            }
        } else {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        this.latitud = position.coords.latitude;
                        this.longitud = position.coords.longitude;
                        this.addMarker(
                            { lat: this.latitud, lng: this.longitud },
                            'Ubicación',
                            'Tu ubicación Actual'
                        );
                    },
                    (error) => {
                        console.error(
                            'Error getting location: ' + error.message
                        );
                    }
                );
            } else {
                console.error('Geolocation is not supported by this browser.');
            }
        }
        return null;
    }
    addMarker(
        position: google.maps.LatLng | google.maps.LatLngLiteral,
        tipo: 'Wifi' | 'Poligono' | 'Ubicación' | string,
        message?: string
    ) {
        const map = this.mapCustom;
        const marker = new google.maps.Marker({
            position,
            map,
            title: tipo,
        });
        // Abrir un nuevo popup con el nombre del barrio
        const infoWindow = new google.maps.InfoWindow({
            ariaLabel: tipo,
            content: message ? message : 'Marcador',
        });
        infoWindow.setPosition(position);
        infoWindow.open(this.mapCustom);
        // Añade un listener para el evento 'click' en el marcador
        marker.addListener('click', () => {
            //this.mapCustom.setZoom(18);
            infoWindow.open(this.mapCustom, marker);
        });
    }
    table: any[] = [];
    polyline = new google.maps.Polyline();
    async updateMap(
        locations: { lat: number; lng: number; timestamp: string }[]
    ) {
        // Dibuja los marcadores en el mapa
        locations.forEach((location) => {
            new google.maps.Marker({
                position: { lat: location.lat, lng: location.lng },
                map: this.mapCustom,
                title: `Lat: ${location.lat}, Lng: ${location.lng}, Time: ${location.timestamp}`,
            });
        });

        // Si la línea poligonal ya existe, actualiza su path
        if (this.polyline) {
            const path = this.polyline.getPath();
            locations.forEach((location) => {
                path.push(new google.maps.LatLng(location.lat, location.lng));
            });
        } else {
            // Crear una nueva línea poligonal si no existe
            const path = locations.map(
                (location) => new google.maps.LatLng(location.lat, location.lng)
            );
            this.polyline = new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: '#FF0000',
                strokeOpacity: 1.0,
                strokeWeight: 2,
            });
            this.polyline.setMap(this.mapCustom);
        }

        // Actualiza la tabla con las ubicaciones
        this.table = locations;
    }
    clearMap() {
        // Elimina la línea del mapa
        if (this.polyline) {
            this.polyline.setMap(null);
            this.polyline = null;
        }
    }

    async addManualLocation() {
        const currentLocation = await Geolocation.getCurrentPosition();

        if (currentLocation) {
            await this.ubicacionService.saveLocation({
                lat: currentLocation.coords.latitude,
                lng: currentLocation.coords.longitude,
                timestamp: new Date().toISOString(),
            });
        } else {
            alert('No se pudo obtener la ubicación actual');
        }
    }
}
