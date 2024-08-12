import { Component, OnInit, Optional } from '@angular/core';
import { Subscription } from 'rxjs';
import { GoogleMapsService } from 'src/app/demo/services/google.maps.service';
import { UbicacionService } from '../service/ubicacion.service';
import { Geolocation } from '@capacitor/geolocation';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ActivatedRoute } from '@angular/router';
import { FilterService } from 'src/app/demo/services/filter.service';
import { MessageService } from 'primeng/api';
import { AuthService } from 'src/app/demo/services/auth.service';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ListService } from 'src/app/demo/services/list.service';

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
    velocidad: number = 0;
    distancia: number = 0;
    constructor(
        private ubicacionService: UbicacionService,
        private googlemaps: GoogleMapsService,
        private helper: HelperService,
        private route: ActivatedRoute,
        private messageService: MessageService,
        private filter: FilterService,
        private auth: AuthService,
        private list: ListService,
        @Optional() public config?: DynamicDialogConfig
    ) {}

    //----------------------------------------Funciones Standar---------------------------------------
    ruta: any;
    id: any;
    async ngOnInit(): Promise<void> {
        await this.initMap();

        if (this.config?.data?.id) {
            this.id = this.config.data.id;
        }

        if (!this.id) {
            this.route.paramMap.subscribe(async (params) => {
                this.id = params.get('id') ?? params.get('id');
            });
        }

        if (this.id) {
            await this.getRuta();
        } else {
            this.consultaAsig();
        }
    }
    ngOnDestroy(): void {
        if (this.locationSubscription) {
            this.locationSubscription.unsubscribe();
        }
    }
    isMobil(): boolean {
        return this.helper.isMobil();
    }

    //------------------------------------------CONSULTA DE ASIGNACION-------------------------------
    asignacionID: any;
    consultaAsig() {
        this.asignacionID = this.ubicacionService.getAsignacion();
        if (!this.asignacionID) {
            const date = new Date();
            const dateOnly = `${date.getFullYear()}-${
                date.getMonth() + 1
            }-${date.getDate()}`;
            const funcionario = this.auth.idUserToken();
            this.list
                .listarAsignacionRecolectores(
                    this.token,
                    { dateOnly, funcionario },
                    false
                )
                .subscribe({
                    next: async (response) => {
                        if (response.data.length > 0) {
                            this.asignacionID = response.data[0]._id;
                            this.ubicacionService.saveAsignacion(
                                this.asignacionID
                            );
                            await this.seguimientoLocations();
                        }
                    },
                    error: (error) => {
                        console.error('Error al listar asignaciones:', error);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'ERROR',
                            detail: error.message,
                        });
                    },
                });
        }
    }
    //------------------------------------------ObtenerRuta------------------------
    token = this.auth.token();
    /*const startOfDay = new Date(this.ruta.createdAt);
        startOfDay.setHours(0, 0, 0, 0);
    
        const endOfDay = new Date(this.ruta.createdAt);
        endOfDay.setHours(23, 59, 59, 999);
    
        const startOfDayISO = startOfDay.toISOString();
        const endOfDayISO = endOfDay.toISOString();
    
        (await this.ubicacionService.fetchRouteData(this.ruta.deviceId, startOfDayISO, endOfDayISO)).subscribe(response => {
            console.log(response);
        });*/
    async updateRuta() {
        this.messageService.add({
            severity: 'info',
            summary: 'Consula a api',
            detail: 'Esto puede tardar un rato',
        });
        (
            await this.filter.ActualizarRutaRecolector(this.token, this.id)
        ).subscribe(
            (response) => {
                console.log(response);
            },
            (error) => {
                console.error(error);
            }
        );
    }
    async getRuta() {
        this.filter.obtenerRutaRecolector(this.token, this.id).subscribe(
            async (response) => {
                if (response.data) {
                    this.ruta = response.data;
                    if (this.ruta.ruta.length > 0) {
                        await this.DrawRuta(this.ruta.ruta);
                    }

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
                    detail: error.message,
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
        locations: {
            latitude: number;
            longitude: number;
            fixTime: string;
            id: string;
        }[]
    ) {
        this.locations = locations;
        const colors = [
            '#2196f3',            
            '#4caf50',
            '#fbc02d',
            '#00bcd4',
            '#e91e63',
            '#3f51b5',
            '#009688',
            '#f57c00',
            '#607d8b',
            '#9c27b0',
            '#ff4032',            
        ];

        // Limpiar rutas previas del mapa
        if (this.pathson.length > 0) {
            this.pathson.forEach((element: any) => {
                element.setMap(null);
            });
        }
        this.pathson = [];

        // Divide la ruta en segmentos y dibuja cada uno con un color diferente
        let segment = [];
        let currentColorIndex = 0;

        for (let i = 0; i < locations.length - 1; i++) {
            const currentPoint = locations[i];
            const nextPoint = locations[i + 1];

            segment.push({
                id: currentPoint.id,
                lat: currentPoint.latitude,
                lng: currentPoint.longitude,
            });

            // Chequea si el siguiente punto es el mismo que el actual o si es el final del array
            if (
                currentPoint.latitude === nextPoint.latitude &&
                currentPoint.longitude === nextPoint.longitude
            ) {
                // Termina el segmento actual y dibuja la línea
                this.drawSegment(segment, colors[currentColorIndex]);
                currentColorIndex = (currentColorIndex + 1) % colors.length;
                segment = [];
            }
        }

        // Dibuja el último segmento si hay puntos restantes
        if (segment.length > 0) {
            this.drawSegment(segment, colors[currentColorIndex]);
        }

        // Marca de inicio
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

            const initialInfoWindow = new google.maps.InfoWindow({
                headerContent: 'INICIO',
                content: `<div>Lat: ${auxinicial.latitude}, Lng: ${
                    auxinicial.longitude
                }<br>Time: ${new Date(
                    auxinicial.fixTime
                ).toLocaleString()}</div>`,
            });

            this.inicial.addListener('click', () => {
                initialInfoWindow.open(this.mapCustom, this.inicial);
            });
        } else {
            this.inicial.setPosition({
                lat: auxinicial.latitude,
                lng: auxinicial.longitude,
            });
        }

        // Marca de fin
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

                const finalInfoWindow = new google.maps.InfoWindow({
                    headerContent: 'FIN',
                    content: `<div>Lat: ${auxfinal.latitude}, Lng: ${
                        auxfinal.longitude
                    }<br>Time: ${new Date(
                        auxfinal.fixTime
                    ).toLocaleString()}</div>`,
                });

                this.final.addListener('click', () => {
                    finalInfoWindow.open(this.mapCustom, this.final);
                });
            } else {
                this.final.setPosition({
                    lat: auxfinal.latitude,
                    lng: auxfinal.longitude,
                });
            }
        }

        //this.playRoute(locations);
    }

    // Función auxiliar para dibujar un segmento
    segmentos: any[] = [];
    drawSegment(segment: any, color: any) {
        this.segmentos.push(segment);
        const path = segment.map((segment) => ({
            lat: segment.lat,
            lng: segment.lng,
        }));
        const route = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: 0.6, // Opacidad por defecto para las líneas
            strokeWeight: 6,
        });

        // Resalta la línea al pasar el mouse por encima
        route.addListener('mouseover', () => {
            route.setOptions({ strokeOpacity: 1.0, strokeWeight: 8 });
            this.pathson.forEach((otherRoute) => {
                if (otherRoute !== route) {
                    otherRoute.setOptions({
                        strokeOpacity: 0.6,
                        strokeWeight: 6,
                    });
                }
            });
        });

        // Restaura las líneas cuando el mouse sale de la línea
        route.addListener('mouseout', () => {
            route.setOptions({ strokeOpacity: 0.6, strokeWeight: 6 });
            this.pathson.forEach((otherRoute) => {
                if (otherRoute !== route) {
                    otherRoute.setOptions({
                        strokeOpacity: 0.6,
                        strokeWeight: 6,
                    });
                }
            });
        });

        // Resalta la línea al hacer clic
        route.addListener('click', (event: any) => {
            route.setOptions({ strokeOpacity: 1.0, strokeWeight: 10 });
            const infoWindow = new google.maps.InfoWindow({
                content: 'Tu recorrido',
            });

            infoWindow.setPosition(event.latLng);
            infoWindow.open(this.mapCustom);

            this.pathson.forEach((otherRoute) => {
                if (otherRoute !== route) {
                    otherRoute.setOptions({
                        strokeOpacity: 0.6,
                        strokeWeight: 6,
                    });
                }
            });
        });

        route.setMap(this.mapCustom);
        this.pathson.push(route);
    }
    vehicleMarker: google.maps.Marker;
    isPlaying: boolean = false;
    speedMultiplier: number = 1;
    isPaused: boolean = false;
    locations: any;
    currentIndex: number = 0;
    timeoutId: any;
    shouldCenter: boolean = true;
    toggleRoutePlayback() {
        if (this.isPlaying) {
            this.playRoute(this.locations);
        } else {
            if (this.vehicleMarker) {
                clearTimeout(this.timeoutId); // Detén el recorrido si se desmarca
                this.vehicleMarker.setMap(null);
            }
        }
    }

    setSpeed(speed: number) {
        this.speedMultiplier = speed;
        /*if (this.isPlaying && !this.isPaused) {
            this.playRoute(
                this.locations,
                this.currentIndex
            ); // Reanuda el recorrido con la nueva velocidad
        }*/
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (!this.isPaused) {
            this.playRoute(this.locations, this.currentIndex); // Reanudar desde la posición actual
        } else {
            clearTimeout(this.timeoutId); // Pausar la animación
        }
    }

    async playRoute(locations: any, startIndex = 0) {
        // Si ya hay un marcador en movimiento, detenerlo
        if (this.vehicleMarker && startIndex === 0) {
            this.vehicleMarker.setMap(null);
        }

        // Crear un nuevo marcador para representar el vehículo si es la primera vez
        if (!this.vehicleMarker || startIndex === 0) {
            this.vehicleMarker = new google.maps.Marker({
                position: {
                    lat: locations[0].latitude,
                    lng: locations[0].longitude,
                },
                map: this.mapCustom,
                icon: {
                    url: 'https://i.postimg.cc/gJLP7FtQ/png-transparent-green-and-environmentally-friendly-garbage-truck-green-green-car-rubbish-truck-thumb.png',
                    scaledSize: new google.maps.Size(50, 50),
                },
                title: 'Vehículo en movimiento',
            });

            if (this.shouldCenter) {
                // Centrar el mapa en la ubicación inicial del vehículo
                this.mapCustom.setCenter({
                    lat: locations[0].latitude,
                    lng: locations[0].longitude,
                });
            }
        }

        // Inicializar variables para la animación
        this.currentIndex = startIndex;
        const totalLocations = locations.length;

        // Función que mueve el marcador y centra el mapa
        const moveVehicle = () => {
            // Buscar la siguiente ubicación diferente
            let nextIndex = this.currentIndex + 1;
            while (
                nextIndex < totalLocations &&
                locations[nextIndex].latitude ===
                    locations[this.currentIndex].latitude &&
                locations[nextIndex].longitude ===
                    locations[this.currentIndex].longitude
            ) {
                nextIndex++;
            }

            if (nextIndex < totalLocations && !this.isPaused) {
                this.currentIndex = nextIndex;
                const nextLocation = locations[this.currentIndex];
                this.vehicleMarker.setPosition({
                    lat: nextLocation.latitude,
                    lng: nextLocation.longitude,
                });

                if (this.shouldCenter) {
                    // Centrar el mapa en la ubicación actual del vehículo si la opción está habilitada
                    this.mapCustom.setCenter({
                        lat: nextLocation.latitude,
                        lng: nextLocation.longitude,
                    });
                }

                // Activar eventos en el segmento correspondiente
                this.segmentos.forEach((segment: any[],indexsegment) => {
                    const bolpath = segment.find(
                        (path) => path.id == nextLocation.id
                    );
                    if (bolpath) {
                        this.pathson.forEach((route, index) => {
                            if (indexsegment==index) {
                                route.setOptions({
                                    strokeOpacity: 1.0,
                                    strokeWeight: 10,
                                });
                                this.pathson.forEach((otherRoute) => {
                                    if (otherRoute !== route) {
                                        otherRoute.setOptions({
                                            strokeOpacity: 0.2,
                                            strokeWeight: 3,
                                        });
                                    }
                                });
                            } else {
                                // Restaurar la línea si el marcador ya no está en ella
                                route.setOptions({
                                    strokeOpacity: 0.2,
                                    strokeWeight: 3,
                                });
                            }
                        });
                    }
                });

                // Calcular el tiempo de espera entre movimientos basado en la velocidad seleccionada
                const delay = 1000 / this.speedMultiplier;
                this.timeoutId = setTimeout(moveVehicle, delay); // Mueve el vehículo a la siguiente ubicación
            } else if (this.currentIndex >= totalLocations - 1) {
                console.log('Ruta completada');
                this.messageService.add({
                    severity: 'info',
                    summary: 'Recorrido',
                    detail: 'Ruta Concluida',
                });
            }
        };

        // Comenzar a mover el vehículo
        moveVehicle();
    }

    //------------------------------------ACCIONES DEL USUARIO---------------------------------------
    async addManualLocation(status_destacado: boolean, retorno: boolean) {
        const currentLocation = await Geolocation.getCurrentPosition();
        if (currentLocation) {
            const aux = {
                _id:this.id,
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
