import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { GoogleMapsService } from 'src/app/demo/services/google.maps.service';
import { UbicacionService } from '../service/ubicacion.service';
import { Geolocation } from '@capacitor/geolocation';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ActivatedRoute } from '@angular/router';
import { FilterService } from 'src/app/demo/services/filter.service';
import { MessageService } from 'primeng/api';
import { AuthService } from 'src/app/demo/services/auth.service';

@Component({
    selector: 'app-agregar-ubicacion-recolectores',
    templateUrl: './agregar-ubicacion-recolectores.component.html',
    styleUrls: ['./agregar-ubicacion-recolectores.component.scss'],
    providers: [MessageService],
})
export class AgregarUbicacionRecolectoresComponent implements OnInit {
    mapCustom: google.maps.Map;
    public locationSubscription: Subscription;

    isReturnButtonDisabled = false;
    returnTimeLeft: number;
    returnInterval: any;
    returnDelay = 15 * 60 * 1000; // 10 minutes in milliseconds

    table: any[] = [];
    inicial: google.maps.Marker;
    final: google.maps.Marker;
    pathson: any[] = [];

    latitud: any;
    longitud: any;

    displayDialog: boolean = false;

    private markers: google.maps.Marker[] = [];
    private infoWindows: google.maps.InfoWindow[] = [];

    constructor(
        private ubicacionService: UbicacionService,
        private googlemaps: GoogleMapsService,
        private helper: HelperService,
        private route: ActivatedRoute,
        private messageService: MessageService,
        private filter: FilterService,
        private auth: AuthService
    ) {}
    velocidad: number = 0;
    distancia: number = 0;
    //----------------------------------------Funciones Standar---------------------------------------
    ruta: any;
    async ngOnInit(): Promise<void> {
        await this.initMap();
        this.route.paramMap.subscribe(async (params) => {
            const id = params.get('id');
            if (id) {
                await this.getRuta(id);
            } else {
                await this.seguimientoLocations();
            }
        });
    }
    ngOnDestroy(): void {
        if (this.locationSubscription) {
            this.locationSubscription.unsubscribe();
        }
    }
    isMobil(): boolean {
        return this.helper.isMobil();
    }
    //------------------------------------------ObtenerRuta------------------------
    async getRuta(id: any) {
        const token = this.auth.token();
        this.filter.obtenerRutaRecolector(token, id).subscribe(
            async (response) => {
                console.log(response);
                if (response.data) {
                    this.ruta = response.data;
                    await this.DrawRuta(this.ruta.ruta);
                    this.ruta.puntos_recoleccion.forEach((element: any) => {
                        this.addMarker(element, false);
                    });
                }
            },
            (error) => {
                console.error(error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'ERROR',
                    detail: error,
                });
            }
        );
    }

    //------------------------Captura de Location guardado en Almacenamiento del dispositivo---------------------
    async seguimientoLocations() {
        this.locationSubscription = this.ubicacionService
            .getUbicaciones()
            .subscribe((locations) => {
                this.table = locations;
                this.table.forEach((element) => {
                    this.addMarker(element, false);
                });
                const last_retorno = this.table.filter(
                    (element) => element.retorno === true
                );
                if (last_retorno.length > 0) {
                    // Ordenar por timestamp en orden descendente
                    last_retorno.sort(
                        (a, b) =>
                            new Date(b.timestamp).getTime() -
                            new Date(a.timestamp).getTime()
                    );
                    const lastReturnDate = new Date(
                        last_retorno[0].timestamp
                    ).getTime();
                    this.checkReturnButtonStatus(lastReturnDate);
                }
            });
    }
    async checkReturnButtonStatus(time: any) {
        if (time) {
            const lastReturnDate = new Date(time).getTime();
            const now = new Date().getTime();
            const timeElapsed = now - lastReturnDate;
            console.log(
                'tiempo desde el ultimo retorno: ',
                now,
                lastReturnDate,
                this.formatTime(timeElapsed),
                this.formatTime(this.returnDelay)
            );
            if (timeElapsed < this.returnDelay) {
                this.isReturnButtonDisabled = true;
                this.returnTimeLeft = this.returnDelay - timeElapsed;
                this.startReturnTimer();
            } else {
                this.isReturnButtonDisabled = false;
            }
        }
    }
    startReturnTimer() {
        this.returnInterval = setInterval(() => {
            if (this.returnTimeLeft > 0) {
                this.returnTimeLeft -= 1000;
            } else {
                clearInterval(this.returnInterval);
                this.isReturnButtonDisabled = false;
            }
        }, 1000);
    }

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

    //----------------------------------------------------------MAPA--------------------------------------

    async initMap() {
        // Coordenadas del centro del mapa
        const haightAshbury = await this.getLocation();
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
        });
    }

    addMarker(location: any, center: boolean) {
        const marcador = new google.maps.Marker({
            position: { lat: location.lat, lng: location.lng },
            map: this.mapCustom,
            title: `Marcado, Time: ${new Date().toISOString()}`,
        });

        const infoWindow = new google.maps.InfoWindow({
            headerContent: location.retorno
                ? `Retorno a Estación`
                : `Punto de recolección`,
            headerDisabled: this.isMobil(),
            content: `<div style="margin: 5px;"><strong> Lat:</strong> ${
                location.lat
            }, <strong> Lng:</strong> ${
                location.lng
            }<br><strong>Fecha:</strong> ${new Date().getDay()}/${new Date().getMonth()}/${new Date().getFullYear()}   ${new Date().getHours()}:${new Date().getMinutes()}</div>`,
        });

        marcador.addListener('click', () => {
            this.closeAllInfoWindows();
            infoWindow.open(this.mapCustom, marcador);
        });

        this.markers.push(marcador);
        this.infoWindows.push(infoWindow);
        if (center) {
            this.mapCustom.setCenter({ lat: location.lat, lng: location.lng });
        }
    }

    async DrawRuta(
        locations: { latitude: number; longitude: number; fixTime: string }[]
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
            path.push({ lat: element.latitude, lng: element.longitude });
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
                position: {
                    lat: auxinicial.latitude,
                    lng: auxinicial.longitude,
                },
                map: this.mapCustom,
                title: `Lat: ${auxinicial.latitude}, Lng: ${auxinicial.longitude}, Time: ${auxinicial.fixTime}`,
            });

            // Crea la ventana de información para el marcador de inicio
            const initialInfoWindow = new google.maps.InfoWindow({
                content: `<div><strong>Inicio</strong><br>Lat: ${
                    auxinicial.latitude
                }, Lng: ${auxinicial.longitude}<br>Time: ${new Date(
                    auxinicial.fixTime
                ).getDay()}/${new Date(auxinicial.fixTime).getMonth()}/${new Date(
                    auxinicial.fixTime
                ).getFullYear()}   ${new Date(
                    auxinicial.fixTime
                ).getHours()}:${new Date(auxinicial.fixTime).getMinutes()}</div>`,
            });

            // Asocia la ventana de información con el marcador de inicio
            this.inicial.addListener('click', () => {
                initialInfoWindow.open(this.mapCustom, this.inicial);
            });
        } else {
            // Actualiza la posición del marcador de inicio si ya existe
            this.inicial.setPosition({
                lat: auxinicial.latitude,
                lng: auxinicial.longitude,
            });
        }
        // Mueve el marcador de fin si ya existe, de lo contrario lo crea
        if (locations.length > 3) {
            const auxfinal = locations[locations.length - 1];
            if (!this.final) {
                this.final = new google.maps.Marker({
                    position: {
                        lat: auxfinal.latitude,
                        lng: auxfinal.longitude,
                    },
                    map: this.mapCustom,
                    title: `Lat: ${auxfinal.latitude}, Lng: ${auxfinal.longitude}, Time: ${auxfinal.fixTime}`,
                });

                // Crea la ventana de información para el marcador de fin
                const finalInfoWindow = new google.maps.InfoWindow({
                    content: `<div><strong>Fin</strong><br>Lat: ${
                        auxfinal.latitude
                    }, Lng: ${auxfinal.longitude}<br>Time: ${new Date(
                        auxfinal.fixTime
                    ).getDay()}/${new Date(
                        auxfinal.fixTime
                    ).getMonth()}/${new Date(
                        auxfinal.fixTime
                    ).getFullYear()}   ${new Date(
                        auxfinal.fixTime
                    ).getHours()}:${new Date(
                        auxfinal.fixTime
                    ).getMinutes()}</div>`,
                });

                // Asocia la ventana de información con el marcador de fin
                this.final.addListener('click', () => {
                    finalInfoWindow.open(this.mapCustom, this.final);
                });
            } else {
                // Actualiza la posición del marcador de fin si ya existe
                this.final.setPosition({
                    lat: auxfinal.latitude,
                    lng: auxfinal.longitude,
                });
            }
        }
    }

    //------------------------------------ACCIONES DEL USUARIO---------------------------------------
    async addManualLocation(status_destacado: boolean, retorno: boolean) {
        const currentLocation = await Geolocation.getCurrentPosition();
        if (currentLocation) {
            const aux = {
                lat: currentLocation.coords.latitude,
                lng: currentLocation.coords.longitude,
                timestamp: new Date().toISOString(),
                speed: 0,
                destacado: status_destacado,
                retorno: retorno,
            };
            const valid = this.ubicacionService.isValidLocation(aux);
            if (valid || retorno) {
                if (status_destacado) {
                    this.addMarker(aux, false);
                }
                await this.ubicacionService.saveLocation(aux, true);
                if (retorno) {
                    this.displayDialog = false;
                    this.returnTimeLeft = this.returnDelay;
                    this.isReturnButtonDisabled = true;
                    this.startReturnTimer();
                }
            }
        } else {
            alert('No se pudo obtener la ubicación actual');
        }
    }

    confirmReturnToStation() {
        this.displayDialog = true;
    }

    closeAllInfoWindows() {
        this.infoWindows.forEach((infoWindow) => infoWindow.close());
    }

    getMarker(locationIndex: number) {
        this.closeAllInfoWindows();
        const marker = this.markers[locationIndex];
        const infoWindow = this.infoWindows[locationIndex];
        if (marker && infoWindow) {
            this.mapCustom.setCenter(marker.getPosition());
            infoWindow.open(this.mapCustom, marker);
        }
    }

    //-----------------------------------------------------------------FORMATEADORES DE VALORES -----------------------------------------
    formatTime(returnTimeLeft: number): string {
        const seconds = returnTimeLeft / 1000;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
    }
}
