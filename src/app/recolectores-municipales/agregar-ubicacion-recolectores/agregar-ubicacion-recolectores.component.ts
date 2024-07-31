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
    velocidad: number = 0;
    async ngOnInit(): Promise<void> {
        await this.initMap();
        //this.ubicacionService.iniciarWatcher();
        this.locationSubscription = this.ubicacionService
            .getUbicaciones()
            .subscribe((locations) => {
                this.updateMap(locations);
            });
        this.ubicacionService.getVelocidadActual().subscribe((velocidad) => {
            this.velocidad = velocidad * 3.6; // Convertir m/s a km/h
        });
        setInterval(() => {
            this.addManualLocation(false);
        }, 5000);

        /*this.datos.forEach((element, index) => {
            this.addMarker(
                { lat: element.lat, lng: element.lng },
                '',
                'Posición: ' + element.timestamp
            );
        });*/
        //this.updateMap(this.datos);
    }

    ngOnDestroy(): void {
        if (this.locationSubscription) {
            this.locationSubscription.unsubscribe();
        }
    }
    datos = [
        { lat: 0.9657655, lng: -79.6550148, timestamp: '7/30/24, 1:02 PM' },
        { lat: 0.9656814, lng: -79.6551387, timestamp: '7/30/24, 1:03 PM' },
        { lat: 0.9658164, lng: -79.6547029, timestamp: '7/30/24, 1:04 PM' },
        { lat: 0.9662421, lng: -79.6544553, timestamp: '7/30/24, 1:08 PM' },
        { lat: 0.9667238, lng: -79.6545723, timestamp: '7/30/24, 1:08 PM' },
        { lat: 0.9671889, lng: -79.6546772, timestamp: '7/30/24, 1:08 PM' },
        { lat: 0.9676337, lng: -79.6548404, timestamp: '7/30/24, 1:09 PM' },
        { lat: 0.968116, lng: -79.6549069, timestamp: '7/30/24, 1:09 PM' },
        { lat: 0.9685813, lng: -79.6550088, timestamp: '7/30/24, 1:09 PM' },
        { lat: 0.9690244, lng: -79.6551084, timestamp: '7/30/24, 1:09 PM' },
        { lat: 0.9695065, lng: -79.6552827, timestamp: '7/30/24, 1:09 PM' },
        { lat: 0.9699516, lng: -79.6553655, timestamp: '7/30/24, 1:10 PM' },
        { lat: 0.9701353, lng: -79.6549497, timestamp: '7/30/24, 1:10 PM' },
        { lat: 0.9702491, lng: -79.6545127, timestamp: '7/30/24, 1:10 PM' },
        { lat: 0.970369, lng: -79.6540486, timestamp: '7/30/24, 1:11 PM' },
        { lat: 0.9704433, lng: -79.6535755, timestamp: '7/30/24, 1:11 PM' },
        { lat: 0.9705558, lng: -79.6531107, timestamp: '7/30/24, 1:12 PM' },
        { lat: 0.9710168, lng: -79.6530569, timestamp: '7/30/24, 1:12 PM' },
        { lat: 0.9714914, lng: -79.6531824, timestamp: '7/30/24, 1:13 PM' },
        { lat: 0.9719769, lng: -79.6532784, timestamp: '7/30/24, 1:13 PM' },
        { lat: 0.9724389, lng: -79.6533848, timestamp: '7/30/24, 1:13 PM' },
        { lat: 0.9729243, lng: -79.6535011, timestamp: '7/30/24, 1:13 PM' },
        { lat: 0.9733678, lng: -79.6536393, timestamp: '7/30/24, 1:13 PM' },
        { lat: 0.9738032, lng: -79.6537938, timestamp: '7/30/24, 1:14 PM' },
        { lat: 0.9742861, lng: -79.6539687, timestamp: '7/30/24, 1:14 PM' },
        { lat: 0.9747995, lng: -79.6541088, timestamp: '7/30/24, 1:14 PM' },
        { lat: 0.975276, lng: -79.6541938, timestamp: '7/30/24, 1:14 PM' },
        { lat: 0.9757744, lng: -79.6542966, timestamp: '7/30/24, 1:14 PM' },
        { lat: 0.9762746, lng: -79.6544358, timestamp: '7/30/24, 1:14 PM' },
        { lat: 0.976744, lng: -79.6545407, timestamp: '7/30/24, 1:14 PM' },
        { lat: 0.976968, lng: -79.6549409, timestamp: '7/30/24, 1:15 PM' },
        { lat: 0.9769976, lng: -79.6553911, timestamp: '7/30/24, 1:16 PM' },
        { lat: 0.9766302, lng: -79.655677, timestamp: '7/30/24, 1:17 PM' },
        { lat: 0.9770762, lng: -79.6555332, timestamp: '7/30/24, 1:19 PM' },
        { lat: 0.9770968, lng: -79.6550571, timestamp: '7/30/24, 1:19 PM' },
        { lat: 0.9768853, lng: -79.6544926, timestamp: '7/30/24, 1:20 PM' },
        { lat: 0.9769662, lng: -79.6553117, timestamp: '7/30/24, 1:20 PM' },
        { lat: 0.9764872, lng: -79.6555229, timestamp: '7/30/24, 1:20 PM' },
        { lat: 0.9769044, lng: -79.6556998, timestamp: '7/30/24, 1:20 PM' },
        { lat: 0.9770357, lng: -79.655264, timestamp: '7/30/24, 1:32 PM' },
        { lat: 0.9774043, lng: -79.6555747, timestamp: '7/30/24, 1:33 PM' },
        { lat: 0.9769443, lng: -79.6553905, timestamp: '7/30/24, 1:46 PM' },
        { lat: 0.9764942, lng: -79.6553199, timestamp: '7/30/24, 1:50 PM' },
        { lat: 0.976054, lng: -79.6554236, timestamp: '7/30/24, 1:51 PM' },
        { lat: 0.9758303, lng: -79.6558173, timestamp: '7/30/24, 1:52 PM' },
        { lat: 0.975865, lng: -79.6553301, timestamp: '7/30/24, 1:53 PM' },
        { lat: 0.9755674, lng: -79.6549895, timestamp: '7/30/24, 1:54 PM' },
        { lat: 0.9750194, lng: -79.654835, timestamp: '7/30/24, 1:54 PM' },
        { lat: 0.9745433, lng: -79.6546496, timestamp: '7/30/24, 1:54 PM' },
        { lat: 0.9740408, lng: -79.6545743, timestamp: '7/30/24, 1:54 PM' },
        { lat: 0.9735554, lng: -79.6545037, timestamp: '7/30/24, 1:55 PM' },
        { lat: 0.9731167, lng: -79.6543455, timestamp: '7/30/24, 1:55 PM' },
        { lat: 0.9726613, lng: -79.6542209, timestamp: '7/30/24, 1:55 PM' },
        { lat: 0.9721611, lng: -79.6541068, timestamp: '7/30/24, 1:55 PM' },
        { lat: 0.971677, lng: -79.6539579, timestamp: '7/30/24, 1:55 PM' },
        { lat: 0.9712046, lng: -79.653855, timestamp: '7/30/24, 1:55 PM' },
        { lat: 0.9707102, lng: -79.6537388, timestamp: '7/30/24, 1:55 PM' },
        { lat: 0.9702403, lng: -79.6536607, timestamp: '7/30/24, 1:55 PM' },
        { lat: 0.969767, lng: -79.6536031, timestamp: '7/30/24, 1:55 PM' },
        { lat: 0.9692762, lng: -79.6535112, timestamp: '7/30/24, 1:56 PM' },
        { lat: 0.9688127, lng: -79.6534455, timestamp: '7/30/24, 1:56 PM' },
        { lat: 0.9683185, lng: -79.6533216, timestamp: '7/30/24, 1:56 PM' },
        { lat: 0.9678255, lng: -79.6532761, timestamp: '7/30/24, 1:56 PM' },
        { lat: 0.9673441, lng: -79.6531672, timestamp: '7/30/24, 1:56 PM' },
        { lat: 0.9668359, lng: -79.6530719, timestamp: '7/30/24, 1:56 PM' },
        { lat: 0.9663465, lng: -79.6530072, timestamp: '7/30/24, 1:56 PM' },
        { lat: 0.965862, lng: -79.6528747, timestamp: '7/30/24, 1:56 PM' },
    ];

    async initMap() {
        // Coordenadas del centro del mapa
        const haightAshbury = await this.getLocation(); //{ lat: 0.977035, lng: -79.655415 };

        this.googlemaps.getLoader().then(async () => {
            // Crea una nueva instancia de Google Map con las opciones configuradas
            this.mapCustom = new google.maps.Map(
                document.getElementById('map2') as HTMLElement,
                {
                    zoom: 15, // Nivel de zoom inicial
                    center: haightAshbury, // Coordenadas del centro del mapa
                    mapTypeId: 'terrain', // Tipo de mapa
                    fullscreenControl: false, // Desactiva el control de pantalla completa
                    mapTypeControlOptions: {
                        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR, // Estilo del control de tipo de mapa
                        position: google.maps.ControlPosition.LEFT_BOTTOM, // Posición del control de tipo de mapa
                    },
                    draggable: true, // Permite arrastrar el mapa
                    scrollwheel: false, // Desactiva el zoom con la rueda del ratón
                    disableDoubleClickZoom: true, // Desactiva el zoom con doble clic
                    gestureHandling: 'cooperative', // Control de gestos
                }
            );

            // Llama a la función para obtener la ubicación (si es necesaria)
           // await this.marquerLocation();
           //await this.addManualLocation();
        });
    }

    /* this.datos.forEach((element,index) => {
                this.addMarker({lat:element.lat,lng:element.lng},'','Posición: '+element.timestamp);
            });*/
    //await this.updateMap(this.datos);
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
                return {
                    lat: coordinates.coords.latitude,
                    lng: coordinates.coords.longitude,
                };
            } else {
                return { lat: 0.977035, lng: -79.655415 };
            }
        } else {
            return { lat: 0.977035, lng: -79.655415 };
        }
    }
    async marquerLocation() {
        if (this.isMobil()) {
            const permission = await Geolocation.requestPermissions();
            if (permission) {
                const coordinates = await Geolocation.getCurrentPosition();
                this.addMarker(
                    {
                        lat: coordinates.coords.latitude,
                        lng: coordinates.coords.longitude,
                    },
                    'Ubicación',
                    'Tu ubicación Actual'
                );
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
                throw new Error('No se puede ubicater');
            }
        }
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
    inicial: google.maps.Marker;
    final: google.maps.Marker;
    pathson: any[] = [];
    async updateMap(
        locations: { lat: number; lng: number; timestamp: string }[]
    ) {
        const colors = [
            '#2196f3',
            '#f57c00',
            '#3f51b5',
            '#009688',
            '#f57c00',
            '#9c27b0',
            '#ff4032',
            '#4caf50',
        ];
        if (this.pathson.length > 0) {
            this.pathson.forEach((element: any) => {
                element.setMap(null);
            });
        }
        this.pathson = [];
        const path = [];
        locations.forEach((element) => {
            path.push({ lat: element.lat, lng: element.lng });
        });
        const route = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: colors[path.length % colors.length],
            strokeOpacity: 1.0,
            strokeWeight: 6, // Ajusta este valor para hacer la línea más ancha
        });

        route.addListener('click', (event: any) => {
            const infoWindow = new google.maps.InfoWindow({
                content: 'Tu recorrido',
            });

            infoWindow.setPosition(event.latLng);
            infoWindow.open(this.mapCustom);
        });
        route.setMap(this.mapCustom);
        this.pathson.push(route);

        // Crea el marcador de inicio si no existe
        const auxinicial = locations[0];
        if (!this.inicial) {
            this.inicial = new google.maps.Marker({
                position: { lat: auxinicial.lat, lng: auxinicial.lng },
                map: this.mapCustom,
                title: `Lat: ${auxinicial.lat}, Lng: ${auxinicial.lng}, Time: ${auxinicial.timestamp}`,
            });

            // Crea la ventana de información para el marcador de inicio
            const initialInfoWindow = new google.maps.InfoWindow({
                content: `<div><strong>Inicio</strong><br>Lat: ${auxinicial.lat}, Lng: ${auxinicial.lng}<br>Time: ${auxinicial.timestamp}</div>`,
            });

            // Asocia la ventana de información con el marcador de inicio
            this.inicial.addListener('click', () => {
                initialInfoWindow.open(this.mapCustom, this.inicial);
            });
        } else {
            // Actualiza la posición del marcador de inicio si ya existe
            this.inicial.setPosition({
                lat: auxinicial.lat,
                lng: auxinicial.lng,
            });
        }
        // Mueve el marcador de fin si ya existe, de lo contrario lo crea
        if (locations.length > 3) {
            const auxfinal = locations[locations.length - 1];
            if (!this.final) {
                this.final = new google.maps.Marker({
                    position: { lat: auxfinal.lat, lng: auxfinal.lng },
                    map: this.mapCustom,
                    title: `Lat: ${auxfinal.lat}, Lng: ${auxfinal.lng}, Time: ${auxfinal.timestamp}`,
                });

                // Crea la ventana de información para el marcador de fin
                const finalInfoWindow = new google.maps.InfoWindow({
                    content: `<div><strong>Fin</strong><br>Lat: ${auxfinal.lat}, Lng: ${auxfinal.lng}<br>Time: ${auxfinal.timestamp}</div>`,
                });

                // Asocia la ventana de información con el marcador de fin
                this.final.addListener('click', () => {
                    finalInfoWindow.open(this.mapCustom, this.final);
                });
            } else {
                // Actualiza la posición del marcador de fin si ya existe
                this.final.setPosition({
                    lat: auxfinal.lat,
                    lng: auxfinal.lng,
                });
            }
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

    async addManualLocation(status_destacado:boolean) {
        const currentLocation = await Geolocation.getCurrentPosition();
        const aux = {
            lat: currentLocation.coords.latitude,
            lng: currentLocation.coords.longitude,
            timestamp: new Date().toISOString(),
            speed:0,
            destacado:status_destacado
        }
        const valid=this.ubicacionService.isValidLocation(aux);
        if(valid){
            if(status_destacado){
                const destacado = new google.maps.Marker({
                    position: { lat: aux.lat, lng: aux.lng },
                    map: this.mapCustom,
                    title: `DESTACADO, Time: ${new Date().toISOString()}`,
                });
                // Crea la ventana de información para el marcador de fin
                const finalInfoWindow = new google.maps.InfoWindow({
                    content: `<div><strong>Marcador destacado</strong><br>Lat: ${
                        aux.lat
                    }, Lng: ${aux.lng}<br>Time: ${new Date().toISOString()}</div>`,
                });
                // Asocia la ventana de información con el marcador de fin
                destacado.addListener('click', () => {
                    finalInfoWindow.open(this.mapCustom, destacado);
                });
            }       
    
            if (currentLocation) {
                await this.ubicacionService.saveLocation(aux,valid);
            } else {
                alert('No se pudo obtener la ubicación actual');
            }
        }
    }
}
