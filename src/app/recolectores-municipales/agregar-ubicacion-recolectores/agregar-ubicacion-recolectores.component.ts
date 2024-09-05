import { Component, OnInit, Optional } from '@angular/core';
import { Subscription, filter } from 'rxjs';
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
    inicial: google.maps.marker.AdvancedMarkerElement;
    final: google.maps.marker.AdvancedMarkerElement;
    pathson: any[] = [];

    latitud: any;
    longitud: any;

    displayDialog: boolean = false;

    private markers: google.maps.marker.AdvancedMarkerElement[] = [];
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
        setTimeout(async () => {
            await this.fetchDevices();
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
                await this.consultaAsig();
            }
        }, 500);
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
    devices: any[] = [];
    async fetchDevices() {
        this.ubicacionService.obtenerDeviceGPS().subscribe((response) => {
            this.devices = response.filter((e) => e.status == 'online');
        });
    }
    getDeviceGPS(id: string) {
        let nameDevice = '';
        if (this.devices.length > 0) {
            let aux = this.devices.find(
                (element) => element.id === parseInt(id)
            );
            nameDevice = aux ? aux.name : 'No encontrado';
        }
        return nameDevice;
    }
    asignacion: any | null = null;

    async consultaAsig() {
        try {
            const asignacionaux = await this.ubicacionService.getAsignacion();
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
                            this.asignacion = response.data[0];

                            // Compara solo los _id
                            if (
                                !asignacionaux ||
                                this.asignacion._id !== asignacionaux._id
                            ) {
                                await this.ubicacionService.saveAsignacion(
                                    this.asignacion
                                );
                            }

                            await this.ubicacionService.loadInitialLocations();
                            await this.seguimientoLocations();
                            await this.ubicacionService.initializeNetworkListener();
                        }else{
                            this.messageService.add({
                                severity: 'warn',
                                summary: 'Asignación',
                                detail: 'Parece que no tiene ninguna asignación todavía.',
                            });
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
        } catch (error) {
            console.error('Error en consultaAsig:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'ERROR',
                detail: 'Hubo un problema al realizar la consulta de asignación.',
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
                    //console.log(response);
                    this.ruta = response.data;
                    this.table = this.ruta.puntos_recoleccion;
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
                    mapId: '7756f5f6c6f997f1',
                    zoom: 15, // Nivel de zoom inicial
                    center: haightAshbury, // Coordenadas del centro del mapa
                    mapTypeId: 'terrain', // Tipo de mapa
                    fullscreenControl: true, // Desactiva el control de pantalla completa
                    mapTypeControlOptions: {
                        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR, // Estilo del control de tipo de mapa
                        position: google.maps.ControlPosition.LEFT_BOTTOM, // Posición del control de tipo de mapa
                    },
                    draggable: true, // Permite arrastrar el mapa
                    //scrollwheel: false, // Desactiva el zoom con la rueda del ratón
                    //disableDoubleClickZoom: true, // Desactiva el zoom con doble clic
                    gestureHandling: 'greedy', //'cooperative', // Control de gestos
                }
            );
        });
    }

    addMarker(location: any, center: boolean) {
        // Crear un elemento DOM para el ícono
        const iconElement = document.createElement('div');
        iconElement.style.width = '80px';
        iconElement.style.height = '80px';
        iconElement.style.backgroundImage = location.retorno
            ? 'url(https://i.postimg.cc/wM5tfphk/flag.png)'
            : 'url(https://i.postimg.cc/qRSvZQBk/trash-verde.png)';
        iconElement.style.backgroundSize = 'cover';
        iconElement.style.backgroundPosition = 'center';
        iconElement.style.borderRadius = '50%'; // Opcional: para hacerlo circular

        const marcador = new google.maps.marker.AdvancedMarkerElement({
            position: { lat: location.lat, lng: location.lng },
            content: iconElement,
            map: this.mapCustom,
            title: `Marcado, Time: ${new Date(
                location.timestamp
            ).toISOString()}`,
        });

        const infoWindow = new google.maps.InfoWindow({
            headerContent: location.retorno
                ? `Retorno a Estación`
                : `Punto de recolección`,
            content: `<div style="margin: 5px;">
                <strong>Lat:</strong> ${location.lat}, 
                <strong>Lng:</strong> ${location.lng}<br>
                <strong>Fecha:</strong> ${this.formatDateFull(
                    new Date(location.timestamp)
                )}
              </div>`,
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
    formatDateFull(date: Date): string {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() returns 0-based month
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}`;
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

        // Verificar si hay un punto de recolección con retorno=true en este punto
        const puntoRetorno = this.ruta.puntos_recoleccion.filter(
            (element: any) => element.retorno == true
        );

        // Iterar sobre los puntos de retorno y dividir los segmentos basados en timestamp
        for (let i = 0; i < puntoRetorno.length; i++) {
            const retornoActual = puntoRetorno[i];
            const retornoSiguiente = puntoRetorno[i + 1];

            const retornoTimestampActual = new Date(
                retornoActual.timestamp
            ).getTime();
            const retornoTimestampSiguiente = retornoSiguiente
                ? new Date(retornoSiguiente.timestamp).getTime()
                : Infinity;

            // Crear un segmento basado en el rango de timestamps
            const segmentLocations = locations.filter((location) => {
                const locationTimestamp = new Date(location.fixTime).getTime();
                return (
                    locationTimestamp <= retornoTimestampActual
                );
            });

            // Si hay puntos en el segmento, dibujar la línea
            if (segmentLocations.length > 0) {
                segmentLocations.forEach((point) => {
                    segment.push({
                        id: point.id,
                        lat: point.latitude,
                        lng: point.longitude,
                        fixTime: point.fixTime
                    });
                });

                this.drawSegment(segment, colors[currentColorIndex]);
                currentColorIndex = (currentColorIndex + 1) % colors.length;
                segment = []; // Reiniciar el segmento después de dibujar
            }
        }

        // Dibuja los puntos que están después del último punto de retorno
        const lastRetornoTimestamp =
            puntoRetorno.length > 0
                ? new Date(
                      puntoRetorno[puntoRetorno.length - 1].timestamp
                  ).getTime()
                : -Infinity;
        const remainingLocations = locations.filter((location) => {
            const locationTimestamp = new Date(location.fixTime).getTime();
            return locationTimestamp >= lastRetornoTimestamp;
        });

        if (remainingLocations.length > 0) {
            remainingLocations.forEach((point) => {
                segment.push({
                    id: point.id,
                    lat: point.latitude,
                    lng: point.longitude,
                    fixTime: point.fixTime
                });
            });

            this.drawSegment(segment, colors[currentColorIndex]);
        }

        // Marca de inicio
        const auxinicial = locations[0];
        if (!this.inicial) {
            this.inicial = new google.maps.marker.AdvancedMarkerElement({
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
            this.inicial.position = {
                lat: auxinicial.latitude,
                lng: auxinicial.longitude,
            };
        }
        this.mapCustom.setCenter({
            lat: auxinicial.latitude,
            lng: auxinicial.longitude,
        });

        // Marca de fin
        if (locations.length > 3) {
            const auxfinal = locations[locations.length - 1];
            if (!this.final) {
                this.final = new google.maps.marker.AdvancedMarkerElement({
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
                this.final.position = {
                    lat: auxfinal.latitude,
                    lng: auxfinal.longitude,
                };
            }
        }

        //this.playRoute(locations);
    }

    // Función auxiliar para dibujar un segmento
    segmentos: any[] = [];
    drawSegment(segment: any, color: any) {
        this.segmentos.push(segment);
        //console.log('Segmentos: ', this.segmentos);
        const path = segment.map((segment:any) => ({
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
    vehicleMarker: google.maps.marker.AdvancedMarkerElement;
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
                this.vehicleMarker.map = null;
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

    async playRoute(locations: any[], startIndex = 0) {
        if (locations.length > 0) {
            // Si ya hay un marcador en movimiento, detenerlo
            if (this.vehicleMarker && startIndex === 0) {
                this.vehicleMarker.map = null;
            }
            // Crear un elemento DOM para el ícono
            const iconElement = document.createElement('div');
            iconElement.style.width = '50px';
            iconElement.style.height = '50px';
            iconElement.style.backgroundImage =
                'url(https://i.postimg.cc/gJLP7FtQ/png-transparent-green-and-environmentally-friendly-garbage-truck-green-green-car-rubbish-truck-thumb.png)';
            iconElement.style.backgroundSize = 'cover';
            iconElement.style.backgroundPosition = 'center';
            iconElement.style.borderRadius = '50%'; // Opcional: para hacerlo circular

            // Crear un nuevo marcador para representar el vehículo si es la primera vez
            if (!this.vehicleMarker || startIndex === 0) {
                this.vehicleMarker =
                    new google.maps.marker.AdvancedMarkerElement({
                        position: {
                            lat: locations[0].latitude,
                            lng: locations[0].longitude,
                        },
                        map: this.mapCustom,
                        content: iconElement,
                        /*icon: {
                    url: 'https://i.postimg.cc/gJLP7FtQ/png-transparent-green-and-environmentally-friendly-garbage-truck-green-green-car-rubbish-truck-thumb.png',
                    scaledSize: new google.maps.Size(50, 50),
                },*/
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
                    this.vehicleMarker.position = {
                        lat: nextLocation.latitude,
                        lng: nextLocation.longitude,
                    };

                    if (this.shouldCenter) {
                        // Centrar el mapa en la ubicación actual del vehículo si la opción está habilitada
                        this.mapCustom.setCenter({
                            lat: nextLocation.latitude,
                            lng: nextLocation.longitude,
                        });
                    }

                    // Activar eventos en el segmento correspondiente
                    this.segmentos.forEach((segment: any[], indexsegment) => {
                        const bolpath = segment.find(
                            (path) => path.id == nextLocation.id
                        );
                        if (bolpath) {
                            this.pathson.forEach((route, index) => {
                                if (indexsegment == index) {
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
    }

    //------------------------------------ACCIONES DEL USUARIO---------------------------------------
    async addManualLocation(status_destacado: boolean, retorno: boolean) {
        const currentLocation = await Geolocation.getCurrentPosition();
        if (currentLocation) {
            const aux = {
                _id: this.asignacion._id,
                lat: currentLocation.coords.latitude,
                lng: currentLocation.coords.longitude,
                timestamp: new Date().toISOString(),
                speed: 0,
                destacado: status_destacado,
                retorno: retorno,
            };
            const valid = this.ubicacionService.isValidLocation(aux);
            if (valid.resp || retorno) {
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
            } else {
                this.messageService.add({
                    severity: 'info',
                    summary: 'Recorrido',
                    detail: valid.message,
                });
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
        this.closeAllInfoWindows(); // Cierra todas las ventanas de información abiertas

        const marker = this.markers[locationIndex];
        const infoWindow = this.infoWindows[locationIndex];

        if (marker && infoWindow) {
            // Asigna un zIndex alto al marcador activo
            // Puedes definir un valor base o incrementarlo dinámicamente
            const highestZIndex = Math.max(
                ...this.markers.map((m) => m.zIndex || 0),
                0
            );
            const newZIndex = highestZIndex + 1;
            marker.zIndex = newZIndex;

            // Centra el mapa en el marcador activo
            this.mapCustom.setCenter(marker.position);

            // Abre la ventana de información del marcador activo
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

    async envioupdate() {
        await this.ubicacionService.syncData();
    }
}
