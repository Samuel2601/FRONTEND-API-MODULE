import { Component, OnInit, Optional } from '@angular/core';
import { Subscription, filter } from 'rxjs';
import { GoogleMapsService } from 'src/app/demo/services/google.maps.service';
import { UbicacionService } from '../service/ubicacion.service';
import {
    CallbackID,
    ClearWatchOptions,
    Geolocation,
} from '@capacitor/geolocation';
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

    ubicaciones$ = this.ubicacionService.getUbicaciones().ubicaciones;
    retornos$ = this.ubicacionService.getUbicaciones().retorno;

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
    ngOnDestroy(): void {}
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
            let externo: any = null;
            let funcionario: any = null;

            // Condicionalmente asignamos 'externo' o 'funcionario'
            if (this.auth.roleUserToken() === undefined) {
                externo = this.auth.idUserToken();
            } else {
                funcionario = this.auth.idUserToken();
            }

            // Construimos el objeto de parámetros dinámicamente
            const params: any = { dateOnly };

            if (funcionario) {
                params.funcionario = funcionario;
            }

            if (externo) {
                params.externo = externo;
            }
            this.list
                .listarAsignacionRecolectores(this.token, params, false)
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
                        } else {
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
        // Puedes suscribirte a los observables si necesitas hacer algo cuando cambian
        this.ubicaciones$.subscribe((ubicaciones) => {
            this.table = ubicaciones;
            console.log(this.table);
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

        this.retornos$.subscribe((retornos) => {
            this.capcidad_retorno_arr = retornos;
            console.log(this.capcidad_retorno_arr);
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
                return locationTimestamp <= retornoTimestampActual;
            });

            // Si hay puntos en el segmento, dibujar la línea
            if (segmentLocations.length > 0) {
                segmentLocations.forEach((point) => {
                    segment.push({
                        id: point.id,
                        lat: point.latitude,
                        lng: point.longitude,
                        fixTime: point.fixTime,
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
                    fixTime: point.fixTime,
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
        const path = segment.map((segment: any) => ({
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
    capcidad_retorno_arr: any[] = [];
    capcidad_retorno:
        | { label: 'Lleno'; value: 'Lleno' }
        | { label: 'Medio'; value: 'Medio' }
        | { label: 'Vacío'; value: 'Vacío' } = {
        label: 'Vacío',
        value: 'Vacío',
    };
    capacidadOpciones = [
        { label: 'Lleno', value: 'Lleno' },
        { label: 'Medio', value: 'Medio' },
        { label: 'Vacío', value: 'Vacío' },
    ];
    async updateCapacidad() {
        console.log(this.capcidad_retorno);
        if (this.capcidad_retorno) {
            await this.ubicacionService.saveRetorno(this.capcidad_retorno);
            this.capcidad_retorno = {
                label: 'Vacío',
                value: 'Vacío',
            };
        }
    }
    //------------------------------------ACCIONES DEL USUARIO---------------------------------------
    async addManualLocation(status_destacado: boolean, retorno: boolean) {
        if (retorno) {
            await this.updateCapacidad();
        }
        const maxTimeDiff = 5 * 60 * 1000; // Diferencia máxima de 5 minutos en milisegundos
        const now = Date.now();

        let currentLocation = this.lastPosition;

        // Si no hay una posición reciente, solicita una nueva ubicación
        if (!currentLocation || now - currentLocation.timestamp > maxTimeDiff) {
            currentLocation = await Geolocation.getCurrentPosition();
            if (currentLocation) {
                currentLocation = {
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                    speed: currentLocation.coords.speed,
                    accuracy: currentLocation.coords.accuracy,
                    timestamp: Date.now(), // Actualiza el timestamp
                };
                this.lastPosition = currentLocation; // Actualiza lastPosition con la nueva ubicación
            }
        }
        console.log(currentLocation);
        if (currentLocation) {
            const aux = {
                _id: this.asignacion._id,
                lat: currentLocation.latitude,
                lng: currentLocation.longitude,
                timestamp: new Date().toISOString(),
                speed: currentLocation.speed,
                accuracy: currentLocation.accuracy,
                destacado: status_destacado,
                retorno: retorno,
            };
            const valid = this.ubicacionService.isValidLocation(aux);
            if (valid.resp || retorno) {
                if (status_destacado) {
                    this.addMarker(aux, false);
                    this.getMarker(this.markers.length - 1);
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

    //------------------------------------------------------SEGUIMIENTO DEL MAPA --------------------------------------
    currentMarker: any; // Marcador que sigue la ubicación del usuario
    watchId: string; // ID del watcher para controlarlo
    drivingMode: boolean = false; // Estado del modo de conducción
    MAX_ACCURACY = 50; // Máxima precisión permitida (en metros)

    // Alternar el modo de conducción
    async toggleDrivingMode() {
        if (this.drivingMode) {
            await this.stopWatchingPosition(); // Detener la observación
        } else {
            await this.startWatchingPosition(); // Iniciar la observación
        }
        this.drivingMode = !this.drivingMode; // Cambiar el estado

        // Cambiar dinámicamente la precisión y el filtro de distancia
        if (this.drivingMode) {
            this.MAX_ACCURACY = 100; // Aumenta el límite de precisión cuando conduces
        } else {
            this.MAX_ACCURACY = 50; // Precisión más estricta cuando no conduces
        }
    }

    // Inicia el seguimiento de la ubicación del usuario
    lastPosition = null;
    async startWatchingPosition() {
        try {
            const permissions = await Geolocation.checkPermissions();
            if (permissions.location === 'denied') {
                await this.requestLocationPermissions(); // Solicitar permisos
            }

            // Ajustar parámetros según el modo de conducción
            const options = {
                enableHighAccuracy: this.drivingMode, // Activar mayor precisión si conduces
                timeout: this.drivingMode ? 5000 : 10000, // Menor tiempo de espera si conduces
                maximumAge: 0, // No usar posiciones en caché
                distanceFilter: this.drivingMode ? 2 : 10, // Distancia mínima más baja al conducir
            };

            if (this.watchId) {
                // Detener la vigilancia previa si ya existe
                await this.stopWatchingPosition();
            }

            this.watchId = await Geolocation.watchPosition(
                options,
                (position, err) => {
                    if (err) {
                        console.error('Error obteniendo la posición', err);
                        return;
                    }

                    if (position) {
                        const { latitude, longitude, heading } =
                            position.coords;

                        if (!this.lastPosition) {
                            this.updateMapLocation(position.coords);
                            //this.lastPosition = position.coords; // Guardar posición actual
                            return;
                        }

                        // Calcular la distancia entre la nueva posición y la última conocida
                        const distance =
                            this.ubicacionService.calculateDistance(
                                {
                                    lat: this.lastPosition.latitude,
                                    lng: this.lastPosition.longitude,
                                },
                                { lat: latitude, lng: longitude }
                            );

                        // Actualizar la ubicación si la distancia es significativa
                        if (
                            Math.abs(distance) >= 5 ||
                            Math.abs(heading - this.lastPosition.heading) >= 15
                        ) {
                            this.updateMapLocation(position.coords);
                            //this.lastPosition = position.coords;
                        }
                    }
                }
            );
        } catch (error) {
            console.error('Error iniciando la vigilancia de posición', error);
        }
    }

    // Solicitar permisos de ubicación
    async requestLocationPermissions() {
        // Establecer un timeout de 15 segundos para la solicitud de permisos
        const permissionsTimeout = setTimeout(() => {
            this.messageService.add({
                severity: 'warn',
                summary: 'Ubicación',
                detail: 'Solicitud de permisos de geolocalización tomó demasiado tiempo',
            });
            return;
        }, 15000); // Tiempo límite de 15 segundos

        try {
            const requestPermissions = await Geolocation.requestPermissions();
            if (requestPermissions.location !== 'denied') {
                clearTimeout(permissionsTimeout); // Limpiar el timeout si se obtiene el permiso
            } else {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Ubicación',
                    detail: 'Permisos de geolocalización denegados',
                });
                return;
            }
        } catch (error) {
            clearTimeout(permissionsTimeout); // Limpiar timeout en caso de error
            console.error(
                'Error al solicitar permisos de geolocalización',
                error
            );
            this.messageService.add({
                severity: 'error',
                summary: 'Ubicación',
                detail: 'Error al solicitar permisos de geolocalización',
            });
            return;
        }
    }

    // Detiene el seguimiento de la ubicación del usuario
    async stopWatchingPosition() {
        if (this.watchId) {
            const clear: ClearWatchOptions = {
                id: this.watchId,
            };

            try {
                // Detener el seguimiento de la ubicación
                await Geolocation.clearWatch(clear);
                this.watchId = null; // Limpiar watchId después de detener el seguimiento

                // Eliminar el marcador del mapa si existe
                if (this.currentMarker) {
                    this.currentMarker.setMap(null); // Quita el marcador del mapa
                    this.currentMarker = null; // Reinicia la referencia del marcador
                }

                // Reinicia la última posición
                this.lastPosition = null;
            } catch (error) {
                console.error(
                    'Error al detener el seguimiento de la ubicación:',
                    error
                );
            }
        } else {
            // Si no hay watch activo, igualmente reiniciar referencias
            this.currentMarker = null;
            this.lastPosition = null;
        }
    }

    // Actualiza el mapa con la nueva ubicación del usuario
    updateMapLocation(coords: any) {
        const { latitude, longitude, speed, heading, accuracy } = coords;
        const timestamp = Date.now(); // Guarda el timestamp actual

        const newPosition: google.maps.LatLngLiteral = {
            lat: latitude,
            lng: longitude,
        };

        // Filtrar posiciones con precisión menor a 10 metros
        const dynamicAccuracy = this.drivingMode ? 100 : this.MAX_ACCURACY;
        if (accuracy > dynamicAccuracy) {
            console.warn('Precisión insuficiente:', accuracy);
            return;
        }

        this.lastPosition = {
            latitude,
            longitude,
            speed,
            accuracy,
            timestamp,
        };

        // Round the heading to the nearest 15°
        const nearestAngle = this.getNearestAngle(heading);

        // Get the correct truck sprite based on the nearest angle
        const sprite = this.getTruckSpriteForAngle(nearestAngle);

        // Centrar el mapa en la nueva ubicación
        this.mapCustom.setCenter(newPosition);

        // Si ya existe un marcador, actualiza su posición
        if (this.currentMarker) {
            // Smooth transition for marker's position
            this.animateMarkerTransition(this.currentMarker, newPosition);

            // Cambiar el sprite del marcador si cambia el ángulo (heading)
            this.currentMarker.setIcon({
                url: sprite,
                scaledSize: new google.maps.Size(50, 50), // Tamaño ajustado del sprite
                //rotation: nearestAngle, // Optional: if rotation is needed
            });
        } else {
            // Si no existe, crea un nuevo marcador
            this.currentMarker = new google.maps.Marker({
                position: newPosition,
                map: this.mapCustom,
                title: 'Tu ubicación',
                icon: {
                    url: sprite,
                    scaledSize: new google.maps.Size(50, 50), // Ajustar tamaño del ícono
                },
            });
        }
    }

    // Function to round the heading to the nearest multiple of 15°
    getNearestAngle(heading: number) {
        heading = ((heading % 360) + 360) % 360; // Normaliza el ángulo entre 0 y 360
        return Math.round(heading / 15) * 15;
    }
    imageTruck: string = undefined;
    // Function to get the corresponding truck sprite for the direction
    getTruckSpriteForAngle(angle: number) {
        // Map angles to positions in the sprite sheet
        const spriteMap = {
            0: 'tile000.png', // Replace with your sprite path
            15: 'tile001.png',
            30: 'tile002.png',
            45: 'tile003.png',
            60: 'tile004.png',
            75: 'tile005.png',
            90: 'tile006.png',
            105: 'tile007.png',
            120: 'tile008.png',
            135: 'tile009.png',
            150: 'tile010.png',
            165: 'tile011.png',
            180: 'tile012.png',
            195: 'tile013.png',
            210: 'tile014.png',
            225: 'tile015.png',
            240: 'tile016.png',
            255: 'tile017.png',
            270: 'tile018.png',
            285: 'tile019.png',
            300: 'tile020.png',
            315: 'tile021.png',
            330: 'tile022.png',
            345: 'tile023.png',
        };
        this.imageTruck = 'assets/icon-truc-set-24/' + spriteMap[angle];
        return this.imageTruck;
    }

    // Función para animar la transición del marcador
    animateMarkerTransition(
        marker: google.maps.Marker,
        newPosition: google.maps.LatLngLiteral
    ) {
        const animationDuration = 1000; // Duración en milisegundos (1 segundo)
        const intervalTime = 10; // Tiempo entre cada paso de la animación (ms)
        const steps = animationDuration / intervalTime;
        let stepCount = 0;

        const startPos = marker.getPosition();
        let deltaLat = (newPosition.lat - startPos.lat()) / steps;
        let deltaLng = (newPosition.lng - startPos.lng()) / steps;

        if (Math.abs(deltaLat) > 0.01 || Math.abs(deltaLng) > 0.01) {
            // Evitar transiciones abruptas, ajustar los valores si es necesario
            deltaLat = deltaLat / 2;
            deltaLng = deltaLng / 2;
        }

        const moveMarker = () => {
            stepCount++;
            const newLat = startPos.lat() + deltaLat * stepCount;
            const newLng = startPos.lng() + deltaLng * stepCount;
            marker.setPosition({ lat: newLat, lng: newLng });

            if (stepCount < steps) {
                setTimeout(moveMarker, intervalTime);
            }
        };

        moveMarker(); // Inicia la animación
    }
}
