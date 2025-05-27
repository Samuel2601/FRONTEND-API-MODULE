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
import { formatDate } from '@angular/common';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

interface Asignacion {
    _id: string;
    deviceId: string;
    externo: {
        _id: string;
        name: string;
        dni: string;
    };
    createdAt: string;
    dateOnly: string;
    view_date: string;
    view: boolean;
}

interface OpcionSeleccion {
    label: string;
    value: any;
}

// Definición de interfaces para mejor tipado
export interface MarkerItem {
    marker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement;
    item: any;
    infoWindow?: google.maps.InfoWindow;
}

export interface MarkerGroup {
    position: google.maps.LatLng;
    markers: MarkerItem[];
    infoWindow?: google.maps.InfoWindow;
}

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

    // Control del background tracking
    backgroundTrackingActive: boolean = false;
    backgroundTrackingStatus: string = 'Inactivo';

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
    ) {
        this.auth.permissions$.subscribe((permissions) => {
            if (permissions.length > 0) {
                this.permisos_arr = permissions;
            }
            this.loadPermissions(); // Llama a loadPermissions cuando hay cambios en los permisos
        });
    }

    //----------------------------------------Funciones Standar---------------------------------------
    ruta: any;
    id: any;
    async ngOnInit(): Promise<void> {
        await this.initMap();
        setTimeout(async () => {
            await this.fetchDevices();

            // Verificar el estado del background tracking al inicializar
            this.backgroundTrackingActive =
                this.ubicacionService.isBackgroundTrackingActive();
            this.updateBackgroundTrackingStatus();

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
            } else if (this.check_create) {
                await this.listar_asignacion();
            } else {
                await this.consultaAsig();
            }
        }, 500);
    }

    check_create: boolean = false;
    deleteRegister: boolean = false;

    async loadPermissions() {
        this.check_create =
            (await this.boolPermiss('/recolector', 'post')) || false;
        this.deleteRegister =
            (await this.boolPermiss('/recolector/:id', 'delete')) || false;
    }

    permisos_arr: any[] = [];
    async boolPermiss(permission: any, method: any) {
        const hasPermissionBOL =
            this.permisos_arr.length > 0
                ? this.permisos_arr.some(
                      (e) => e.name === permission && e.method === method
                  )
                : false;
        return hasPermissionBOL;
    }

    load_list: boolean = true;
    arr_asignacion = [];
    asignacionesFiltradas: Asignacion[] = [];

    // Opciones y selecciones para los filtros
    fechasUnicas: OpcionSeleccion[] = [];
    externosUnicos: OpcionSeleccion[] = [];
    devicesUnicos: OpcionSeleccion[] = [];

    selectedFechas: OpcionSeleccion[] = [];
    selectedExternos: OpcionSeleccion[] = [];
    selectedDevices: OpcionSeleccion[] = [];

    async listar_asignacion() {
        this.load_list = true;
        this.list
            .listarAsignacionRecolectores(this.token, {}, true)
            .subscribe(async (response) => {
                if (response.data) {
                    this.arr_asignacion = response.data;
                    this.asignacionesFiltradas = [...this.arr_asignacion];

                    // Inicializar las opciones de filtro
                    this.inicializarOpcionesFiltro();
                }
                console.log(this.arr_asignacion);
                this.load_list = false;

                await this.loadMarker();
            });
    }

    async inicializarOpcionesFiltro() {
        // Generar opciones únicas para fechas
        const fechasMap = new Map<string, string>();
        this.arr_asignacion.forEach((item) => {
            if (item.createdAt) {
                const fecha = this.formatearFecha(new Date(item.createdAt));
                fechasMap.set(fecha, fecha);
            }
        });
        this.fechasUnicas = Array.from(fechasMap.entries()).map(
            ([key, value]) => ({
                label: value,
                value: key,
            })
        );

        // Generar opciones únicas para externos
        const externosMap = new Map<string, string>();
        this.arr_asignacion.forEach((item) => {
            if (item.externo) {
                const externoInfo = `${item.externo.name} (${item.externo.dni})`;
                externosMap.set(item.externo._id, externoInfo);
            }
        });
        this.externosUnicos = Array.from(externosMap.entries()).map(
            ([key, value]) => ({
                label: value,
                value: key,
            })
        );

        // Generar opciones únicas para dispositivos
        const devicesMap = new Map<string, string>();
        this.arr_asignacion.forEach((item) => {
            if (item.deviceId) {
                devicesMap.set(item.deviceId, item.deviceId);
            }
        });
        this.devicesUnicos = Array.from(devicesMap.entries()).map(
            ([key, value]) => ({
                label: value,
                value: key,
            })
        );

        await this.loadMarker();
    }

    formatearFecha(date: Date): string {
        try {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() returns 0-based month
            const year = date.getFullYear();

            return `${day}/${month}/${year}`;
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    async aplicarFiltros() {
        // Comenzamos con todos los datos
        let resultados = [...this.arr_asignacion];

        // Filtrar por fechas seleccionadas
        if (this.selectedFechas.length > 0) {
            const fechasValores = this.selectedFechas.map((f) => f.value);
            resultados = resultados.filter((item) => {
                const fechaFormateada = this.formatearFecha(
                    new Date(item.createdAt)
                );
                return fechasValores.includes(fechaFormateada);
            });
        }

        // Filtrar por externos seleccionados
        if (this.selectedExternos.length > 0) {
            const externosIds = this.selectedExternos.map((e) => e.value);
            resultados = resultados.filter(
                (item) => item.externo && externosIds.includes(item.externo._id)
            );
        }

        // Filtrar por dispositivos seleccionados
        if (this.selectedDevices.length > 0) {
            const deviceIds = this.selectedDevices.map((d) => d.value);
            resultados = resultados.filter((item) =>
                deviceIds.includes(item.deviceId)
            );
        }

        // Actualizar la lista filtrada
        this.asignacionesFiltradas = resultados;
        console.log(this.asignacionesFiltradas);
        // Cargar el marker
        await this.loadMarker();
    }
    markerCluster: MarkerClusterer;
    async loadMarker() {
        setTimeout(async () => {
            if (this.mapCustom) {
                this.clearMarkers();
                console.log(this.asignacionesFiltradas);

                // Verificar si hay puntos para crear bounds
                let hasPuntos = false;
                this.asignacionesFiltradas.forEach((element: any) => {
                    if (
                        element.puntos_recoleccion &&
                        element.puntos_recoleccion.length > 0
                    ) {
                        hasPuntos = true;
                    }
                });

                // Solo crear bounds si hay puntos
                if (hasPuntos) {
                    const bounds = new google.maps.LatLngBounds();

                    // Inicializar agrupador de marcadores
                    if (!this.markerCluster) {
                        this.markerCluster = new MarkerClusterer({
                            map: this.mapCustom,
                        });
                    } else {
                        this.markerCluster.clearMarkers();
                    }

                    this.asignacionesFiltradas.forEach((element: any) => {
                        if (
                            !element.puntos_recoleccion ||
                            element.puntos_recoleccion.length === 0
                        ) {
                            return;
                        }
                        element.puntos_recoleccion.forEach((punto: any) => {
                            const marker = this.addMarker(
                                punto,
                                false,
                                element.deviceId,
                                element.externo.name
                            );

                            const position = { lat: punto.lat, lng: punto.lng };
                            bounds.extend(position);
                        });
                    });

                    // Ajustar el mapa a los límites
                    if (this.mapCustom) {
                        this.mapCustom.fitBounds(bounds);

                        // Opcional: Si solo hay un punto, ajustar el zoom
                        if (
                            bounds.getNorthEast().equals(bounds.getSouthWest())
                        ) {
                            const zoom = 15;
                            this.mapCustom.setZoom(zoom);
                        }
                    }
                } else {
                    console.log('No hay puntos para mostrar en el mapa');
                }
            }
        }, 1000);
    }

    limpiarFiltros() {
        this.selectedFechas = [];
        this.selectedExternos = [];
        this.selectedDevices = [];
        this.asignacionesFiltradas = [...this.arr_asignacion];
    }

    async ngOnDestroy(): Promise<void> {
        // Detener seguimiento manual si está activo
        if (this.drivingMode) {
            await this.stopWatchingPosition();
        }

        // NOTA IMPORTANTE: No detenemos automáticamente el background tracking
        // al destruir el componente porque queremos que siga funcionando
        // incluso cuando el usuario navega a otras pantallas o minimiza la app.
        // Solo se detiene cuando:
        // 1. El usuario lo desactiva manualmente
        // 2. Se cierra completamente la aplicación
        // 3. Se completa/cancela la asignación

        // Limpiar intervalos y timeouts
        if (this.returnInterval) {
            clearInterval(this.returnInterval);
        }
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }

    /**
     * Función para finalizar la asignación y detener el tracking
     * Llamar esta función cuando se complete el trabajo del día
     */
    async finalizarAsignacion() {
        try {
            // Confirmar con el usuario
            const confirmar = confirm(
                '¿Estás seguro de que quieres finalizar tu turno de trabajo?\n\n' +
                    'Esto detendrá el seguimiento automático de ubicación.'
            );

            if (confirmar) {
                // Detener background tracking
                if (this.backgroundTrackingActive) {
                    await this.ubicacionService.detenerBackgroundTracking();
                    this.backgroundTrackingActive = false;
                }

                // Detener seguimiento manual si está activo
                if (this.drivingMode) {
                    await this.stopWatchingPosition();
                    this.drivingMode = false;
                }

                // Sincronizar datos finales
                await this.ubicacionService.syncData();

                // Limpiar asignación local
                this.asignacion = null;

                this.updateBackgroundTrackingStatus();

                this.messageService.add({
                    severity: 'success',
                    summary: 'Turno Finalizado',
                    detail: 'Tu turno ha sido finalizado y todos los datos han sido enviados.',
                });
            }
        } catch (error) {
            console.error('Error al finalizar asignación:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Hubo un problema al finalizar el turno.',
            });
        }
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

            if (this.auth.roleUserToken() === undefined) {
                externo = this.auth.idUserToken();
            } else {
                funcionario = this.auth.idUserToken();
            }

            const params: any = { dateOnly };
            if (funcionario) params.funcionario = funcionario;
            if (externo) params.externo = externo;

            this.list
                .listarAsignacionRecolectores(this.token, params, false)
                .subscribe({
                    next: async (response) => {
                        if (response.data.length > 0) {
                            this.asignacion = response.data[0];

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

                            // IMPORTANTE: Iniciar background tracking cuando hay asignación activa
                            await this.iniciarBackgroundTrackingParaAsignacion();
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

    /**
     * Inicia el background tracking cuando hay una asignación activa
     * Esta función maneja la lógica inteligente de cuándo activar el seguimiento
     */
    async iniciarBackgroundTrackingParaAsignacion() {
        try {
            // Solo iniciar si hay asignación y no está ya activo
            if (this.asignacion && !this.backgroundTrackingActive) {
                console.log(
                    'Iniciando background tracking para asignación:',
                    this.asignacion._id
                );

                const success =
                    await this.ubicacionService.iniciarBackgroundTracking();

                if (success) {
                    this.backgroundTrackingActive = true;
                    this.updateBackgroundTrackingStatus();

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Seguimiento Activado',
                        detail: 'El seguimiento automático de ubicación está ahora activo.',
                    });
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error de Seguimiento',
                        detail: 'No se pudo activar el seguimiento automático de ubicación.',
                    });
                }
            }
        } catch (error) {
            console.error('Error al iniciar background tracking:', error);
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
    isMobil(): boolean {
        return this.helper.isMobil();
    }

    async getLocation() {
        try {
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
        } catch (error) {
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
                    fullscreenControl: true, // Control de pantalla completa
                    mapTypeControlOptions: {
                        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR, // Estilo del control de tipo de mapa
                        position: google.maps.ControlPosition.LEFT_BOTTOM, // Posición del control
                    },
                    draggable: true, // Permite arrastrar el mapa
                    gestureHandling: 'greedy', // Control de gestos
                    styles: [
                        {
                            featureType: 'poi',
                            stylers: [{ visibility: 'off' }],
                        },
                        {
                            featureType: 'transit.station',
                            stylers: [{ visibility: 'off' }],
                        },
                    ],
                }
            );
        });
    }

    // Para borrar los marcadores que has creado manualmente
    clearMarkers() {
        // Quitar cada marcador del mapa
        for (let marker of this.markers) {
            marker.map = null; // Esta es la forma de quitar un marcador del mapa
        }

        // Limpiar los arrays
        this.markers = [];
        this.infoWindows = [];
    }

    // Si necesitas restaurar el estilo original después
    restoreDefaultStyle() {
        // Restaurar al estilo original que tenías
        const originalStyle = [
            {
                featureType: 'poi',
                stylers: [{ visibility: 'off' }],
            },
            {
                featureType: 'transit.station',
                stylers: [{ visibility: 'off' }],
            },
        ];

        this.mapCustom.setOptions({ styles: originalStyle });
    }

    //----------------------------------------Marker handling---------------------------------------
    addMarker(
        location: any,
        center: boolean,
        name?: string,
        name_externo?: string
    ) {
        const iconElement = document.createElement('div');
        iconElement.style.width = '80px';
        iconElement.style.height = '80px';
        iconElement.style.backgroundImage = location.retorno
            ? 'url(https://i.postimg.cc/QdHqFQ69/Dise-o-sin-t-tulo-6.png)'
            : 'url(https://i.postimg.cc/43M4JgYH/Dise-o-sin-t-tulo-7.png)';
        iconElement.style.backgroundSize = 'cover';
        iconElement.style.backgroundPosition = 'center';
        iconElement.style.borderRadius = '50%';
        iconElement.style.position = 'absolute';
        iconElement.style.transform = 'translate(-50%, -50%)';

        const marcador = new google.maps.marker.AdvancedMarkerElement({
            position: { lat: location.lat, lng: location.lng },
            content: iconElement,
            map: this.mapCustom,
            title:
                (location.retorno
                    ? 'Retorno a Estación'
                    : `Punto de recolección`) +
                name +
                '-' +
                name_externo,
            gmpClickable: true,
            gmpDraggable: false,
        });

        marcador.addListener('click', () => {
            this.closeAllInfoWindows();
            this.showGroupedInfoWindow(
                location.lat,
                location.lng,
                location.retorno ? 'Retorno' : 'Ubicación',
                name,
                name_externo,
                this.formatDateFull(new Date(location.timestamp))
            );
        });

        this.markers.push(marcador);
        if (center) {
            this.mapCustom.setCenter({ lat: location.lat, lng: location.lng });
        }

        // Añadir el marcador al agrupador
        this.markerCluster.addMarker(marcador);

        return marcador;
    }

    groupedInfoWindow: google.maps.InfoWindow;
    // Reemplaza tu método showGroupedInfoWindow actual con este
    showGroupedInfoWindow(
        lat: number,
        lng: number,
        type: string,
        name?: string,
        name_externo?: string,
        time: string = ''
    ) {
        // Función para calcular la distancia entre dos puntos geográficos
        const calculateDistance = (
            pos1: google.maps.LatLngLiteral,
            pos2: google.maps.LatLngLiteral
        ): number => {
            // Usar la fórmula de Haversine para calcular la distancia en metros
            const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
            const R = 6371000; // Radio de la Tierra en metros
            const φ1 = toRadians(pos1.lat);
            const φ2 = toRadians(pos2.lat);
            const Δφ = toRadians(pos2.lat - pos1.lat);
            const Δλ = toRadians(pos2.lng - pos1.lng);

            const a =
                Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) *
                    Math.cos(φ2) *
                    Math.sin(Δλ / 2) *
                    Math.sin(Δλ / 2);

            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            return R * c; // Distancia en metros
        };

        const clickPosition = { lat: lat, lng: lng };

        // Filtrar marcadores cercanos usando nuestra función de distancia en lugar de geometry.spherical
        const nearbyMarkers = this.markers.filter((marker: any) => {
            let markerPosition;

            // Manejar diferentes tipos de marcadores (tradicionales y avanzados)
            if (marker instanceof google.maps.Marker) {
                const pos = marker.getPosition();
                markerPosition = { lat: pos.lat(), lng: pos.lng() };
            } else if (marker.position) {
                // Para AdvancedMarkerElement
                if (typeof marker.position.lat === 'function') {
                    // Si position es un LatLng
                    markerPosition = {
                        lat: marker.position.lat(),
                        lng: marker.position.lng(),
                    };
                } else {
                    // Si position ya es un objeto { lat, lng }
                    markerPosition = marker.position;
                }
            } else {
                return false; // Saltar si no podemos determinar la posición
            }

            const distance = calculateDistance(clickPosition, markerPosition);
            return distance < 50; // Distancia máxima en metros para agrupar
        });

        if (nearbyMarkers.length === 0) return;

        // Crear contenido agrupado con estilo mejorado
        const content = nearbyMarkers
            .map((marker: any, index: number) => {
                // Extraer coordenadas según el tipo de marcador
                let lat, lng, title;

                if (marker instanceof google.maps.Marker) {
                    const pos = marker.getPosition();
                    lat = pos.lat();
                    lng = pos.lng();
                    title = marker.getTitle();
                } else {
                    // Para AdvancedMarkerElement
                    if (typeof marker.position.lat === 'function') {
                        lat = marker.position.lat();
                        lng = marker.position.lng();
                    } else {
                        lat = marker.position.lat;
                        lng = marker.position.lng;
                    }
                    title = marker.title;
                }

                return `
            <div style="margin: 5px; padding: 10px; border-radius: 8px; background: #f8f9fa; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <strong style="color: #333; font-size: 14px;">${title} ${
                    index + 1
                }</strong><br>
                <div style="margin: 5px 0; font-size: 12px; color: #666;">
                    <strong>Latitud:</strong> ${lat.toFixed(6)}<br>
                    <strong>Longitud:</strong> ${lng.toFixed(6)}<br>
                    <strong>Tiempo:</strong> ${time}<br>
                </div>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}"
                    target="_blank"
                    style="display: inline-block; padding: 5px 10px; background-color: #4285F4; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">
                    Cómo llegar
                </a>
            </div>
        `;
            })
            .join(
                '<hr style="border: 0; height: 1px; background: #ddd; margin: 10px 0;">'
            );

        // Actualizar el InfoWindow compartido
        if (!this.groupedInfoWindow) {
            this.groupedInfoWindow = new google.maps.InfoWindow({
                maxWidth: 320,
            });
        }

        this.groupedInfoWindow.setContent(`
        <div style="font-family: Arial, sans-serif; max-width: 300px;">
            <div style="padding: 10px 5px 0; border-bottom: 1px solid #eee; margin-bottom: 10px;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">
                    ${nearbyMarkers.length} ${
            nearbyMarkers.length === 1 ? 'Ubicación' : 'Ubicaciones'
        }
                </h3>
            </div>

            ${content}

            <div style="text-align: right; margin-top: 10px; padding: 5px;">
                <button id="close-info-btn"
                    style="padding: 8px 15px; background-color: #d9534f; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
                    Cerrar
                </button>
            </div>
        </div>
    `);

        this.groupedInfoWindow.setPosition({ lat, lng });
        this.groupedInfoWindow.open(this.mapCustom);

        // Agregar evento al botón de cerrar después de que se abra el InfoWindow
        setTimeout(() => {
            const closeButton = document.getElementById('close-info-btn');
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    this.groupedInfoWindow.close();
                });
            }
        }, 100);
    }

    // Asegúrate de mantener el método de cierre de InfoWindows
    closeAllInfoWindows() {
        if (this.infoWindows && this.infoWindows.length) {
            this.infoWindows.forEach((infoWindow: any) => infoWindow.close());
        }
        if (this.groupedInfoWindow) {
            this.groupedInfoWindow.close();
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
    /**
     * Función mejorada del toggle del driving mode que integra background tracking
     */
    async toggleDrivingMode() {
        if (this.drivingMode) {
            // Detener el seguimiento manual
            await this.stopWatchingPosition();

            // Si hay asignación, mantener background tracking activo
            if (this.asignacion && !this.backgroundTrackingActive) {
                await this.iniciarBackgroundTrackingParaAsignacion();
            }
        } else {
            // Iniciar seguimiento manual más preciso
            await this.startWatchingPosition();
        }

        this.drivingMode = !this.drivingMode;
        this.updateBackgroundTrackingStatus();
    }

    /**
     * Control manual del background tracking
     * Útil para permitir al usuario activar/desactivar según necesite
     */
    async toggleBackgroundTracking() {
        try {
            if (this.backgroundTrackingActive) {
                const success =
                    await this.ubicacionService.detenerBackgroundTracking();
                if (success) {
                    this.backgroundTrackingActive = false;
                    this.messageService.add({
                        severity: 'info',
                        summary: 'Seguimiento Pausado',
                        detail: 'El seguimiento automático ha sido pausado.',
                    });
                }
            } else {
                if (!this.asignacion) {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Sin Asignación',
                        detail: 'Necesitas una asignación activa para usar el seguimiento automático.',
                    });
                    return;
                }

                const success =
                    await this.ubicacionService.iniciarBackgroundTracking();
                if (success) {
                    this.backgroundTrackingActive = true;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Seguimiento Activado',
                        detail: 'El seguimiento automático está ahora activo.',
                    });
                }
            }

            this.updateBackgroundTrackingStatus();
        } catch (error) {
            console.error(
                'Error al cambiar estado de background tracking:',
                error
            );
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo cambiar el estado del seguimiento automático.',
            });
        }
    }

    /**
     * Actualiza el texto del estado del background tracking para mostrar al usuario
     */
    private updateBackgroundTrackingStatus() {
        if (this.backgroundTrackingActive) {
            if (this.drivingMode) {
                this.backgroundTrackingStatus = 'Activo + Modo Conducción';
            } else {
                this.backgroundTrackingStatus = 'Activo en Segundo Plano';
            }
        } else {
            if (this.drivingMode) {
                this.backgroundTrackingStatus = 'Solo Modo Conducción';
            } else {
                this.backgroundTrackingStatus = 'Inactivo';
            }
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
