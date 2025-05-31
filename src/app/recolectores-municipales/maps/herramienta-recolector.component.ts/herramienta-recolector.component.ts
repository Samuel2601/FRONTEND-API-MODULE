import { Component, OnInit, OnDestroy } from '@angular/core';
import { GoogleMapsService } from 'src/app/demo/services/google.maps.service';
import {
    CallbackID,
    ClearWatchOptions,
    Geolocation,
} from '@capacitor/geolocation';
import { HelperService } from 'src/app/demo/services/helper.service';
import { MessageService } from 'primeng/api';
import { AuthService } from 'src/app/demo/services/auth.service';
import { ListService } from 'src/app/demo/services/list.service';
import { UbicacionService } from '../../service/ubicacion.service';

// Importar interfaces y utilidades
import {
    IAsignacion,
    IPuntoRecoleccion,
    IDispositivoGPS,
    IOpcionFiltro,
    IValidacionUbicacion,
    CapacidadVehiculo,
    CONFIGURACION_DEFECTO,
    MENSAJES,
    CODIGOS_ERROR,
} from '../../interfaces/recoleccion.interfaces';

import {
    calcularDistancia,
    formatearFecha,
    obtenerTiempoRelativo,
    RecoleccionLogger,
    medirRendimiento,
    sanitizarDatos,
} from '../../utils/recoleccion.utils';

/**
 * Componente especializado para las herramientas de campo de los recolectores
 * Maneja el seguimiento GPS, puntos de recolección, y funcionalidades en tiempo real
 *
 * Ahora con tipado fuerte y utilidades centralizadas para mayor robustez
 */
@Component({
    standalone: false,
    selector: 'app-herramienta-recolector',
    templateUrl: './herramienta-recolector.component.html',
    styleUrls: ['./herramienta-recolector.component.scss'],
    providers: [MessageService],
})
export class HerramientaRecolectorComponent implements OnInit, OnDestroy {
    // Propiedades del mapa y visualización con tipado fuerte
    mapCustom!: google.maps.Map;
    private markers: google.maps.marker.AdvancedMarkerElement[] = [];
    private infoWindows: google.maps.InfoWindow[] = [];
    groupedInfoWindow?: google.maps.InfoWindow;

    // Estados de seguimiento con tipado específico
    backgroundTrackingActive: boolean = false;
    backgroundTrackingStatus: string = 'Inactivo';
    drivingMode: boolean = false;

    // Control de seguimiento manual con tipado mejorado
    currentMarker?: google.maps.Marker;
    watchId?: string;
    lastPosition: {
        latitude: number;
        longitude: number;
        speed: number;
        accuracy: number;
        timestamp: number;
    } | null = null;

    // Usar configuración centralizada
    private readonly MAX_ACCURACY =
        CONFIGURACION_DEFECTO.SEGUIMIENTO.PRECISION_MAXIMA;

    // Control del botón de retorno con configuración centralizada
    isReturnButtonDisabled = false;
    returnTimeLeft: number = 0;
    returnInterval?: number;
    readonly returnDelay = CONFIGURACION_DEFECTO.RETORNO.TIEMPO_ESPERA;

    // Datos de asignación y ubicaciones con tipado fuerte
    asignacion: IAsignacion | null = null;
    devices: IDispositivoGPS[] = [];
    table: IPuntoRecoleccion[] = [];

    // Observables con tipado específico
    ubicaciones$ = this.ubicacionService.getUbicaciones().ubicaciones;
    retornos$ = this.ubicacionService.getUbicaciones().retorno;

    // Control de diálogos con tipado específico
    displayDialog: boolean = false;
    capcidad_retorno: { label: string; value: CapacidadVehiculo } = {
        label: 'Vacío',
        value: 'Vacío',
    };

    // Usar configuración centralizada para opciones
    readonly capacidadOpciones: IOpcionFiltro[] =
        CONFIGURACION_DEFECTO.RETORNO.CAPACIDADES.map((cap) => ({
            label: cap.label,
            value: cap.value,
            icon: this.getCapacityIcon(cap.value),
        }));

    capcidad_retorno_arr: { label: string; value: CapacidadVehiculo }[] = [];

    // Estados de carga
    loadingAsignacion: boolean = false;
    syncingData: boolean = false;

    // Token de autenticación
    private readonly token: string;

    constructor(
        private ubicacionService: UbicacionService,
        private googlemaps: GoogleMapsService,
        private helper: HelperService,
        private messageService: MessageService,
        private auth: AuthService,
        private list: ListService
    ) {
        this.token = this.auth.token();
        RecoleccionLogger.info('HerramientaRecolectorComponent inicializado');
    }

    async ngOnInit(): Promise<void> {
        await medirRendimiento('Inicialización del componente', async () => {
            await this.initMap();

            setTimeout(async () => {
                await this.fetchDevices();

                // Verificar estado del background tracking
                this.backgroundTrackingActive =
                    this.ubicacionService.isBackgroundTrackingActive();
                this.updateBackgroundTrackingStatus();

                // Intentar obtener asignación existente o consultar nueva
                await this.consultaAsig();

                // Configurar listeners de ubicaciones
                this.setupLocationListeners();
            }, 500);
        });
    }

    async ngOnDestroy(): Promise<void> {
        RecoleccionLogger.info('Destruyendo componente HerramientaRecolector');

        // Detener seguimiento manual si está activo
        if (this.drivingMode) {
            await this.stopWatchingPosition();
        }

        // IMPORTANTE: No detenemos el background tracking automáticamente
        // ya que debe continuar funcionando incluso si el usuario navega a otras pantallas

        // Limpiar intervalos y timeouts
        if (this.returnInterval) {
            clearInterval(this.returnInterval);
        }

        this.clearMarkers();
    }

    /**
     * Inicializa el mapa centrado en la ubicación actual o una posición por defecto
     * Usa configuración centralizada para coordenadas por defecto
     */
    async initMap(): Promise<void> {
        const defaultLocation = await this.getLocation();

        this.googlemaps.getLoader().then(async () => {
            this.mapCustom = new google.maps.Map(
                document.getElementById(
                    'map-herramienta-recolector'
                ) as HTMLElement,
                {
                    mapId: '7756f5f6c6f997f1',
                    zoom: CONFIGURACION_DEFECTO.MAPA.ZOOM,
                    center: defaultLocation,
                    mapTypeId: 'terrain',
                    fullscreenControl: true,
                    mapTypeControlOptions: {
                        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                        position: google.maps.ControlPosition.LEFT_BOTTOM,
                    },
                    draggable: true,
                    gestureHandling: 'greedy',
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

            RecoleccionLogger.info('Mapa inicializado', {
                center: defaultLocation,
            });
        });
    }

    /**
     * Obtiene la ubicación actual del dispositivo usando configuración centralizada
     */
    async getLocation(): Promise<google.maps.LatLngLiteral> {
        try {
            if (this.isMobil()) {
                const permission = await Geolocation.requestPermissions();
                if (permission.location !== 'denied') {
                    const coordinates = await Geolocation.getCurrentPosition();
                    const location = {
                        lat: coordinates.coords.latitude,
                        lng: coordinates.coords.longitude,
                    };
                    RecoleccionLogger.debug(
                        'Ubicación actual obtenida',
                        location
                    );
                    return location;
                }
            }
        } catch (error) {
            RecoleccionLogger.error('Error obteniendo ubicación', error);
        }

        // Usar coordenadas por defecto centralizadas
        RecoleccionLogger.info('Usando ubicación por defecto');
        return CONFIGURACION_DEFECTO.MAPA.CENTER;
    }

    /**
     * Determina si la aplicación se está ejecutando en un dispositivo móvil
     */
    isMobil(): boolean {
        return this.helper.isMobil();
    }

    /**
     * Obtiene la lista de dispositivos GPS disponibles con mejor manejo de errores
     */
    async fetchDevices(): Promise<void> {
        try {
            this.ubicacionService.obtenerDeviceGPS().subscribe({
                next: (response: IDispositivoGPS[]) => {
                    this.devices = response.filter(
                        (e) => e.status === 'online'
                    );
                    RecoleccionLogger.info('Dispositivos GPS obtenidos', {
                        total: response.length,
                        online: this.devices.length,
                    });
                },
                error: (error) => {
                    RecoleccionLogger.error(
                        'Error obteniendo dispositivos',
                        error
                    );
                    this.mostrarMensaje(
                        'error',
                        MENSAJES.ERROR.ERROR_SEGUIMIENTO,
                        'No se pudieron cargar los dispositivos GPS'
                    );
                },
            });
        } catch (error) {
            RecoleccionLogger.error('Error en fetchDevices', error);
        }
    }

    /**
     * Obtiene el nombre de un dispositivo GPS por su ID con tipado fuerte
     */
    getDeviceGPS(id: string): string {
        if (this.devices.length > 0) {
            const device = this.devices.find(
                (element) => element.id === parseInt(id)
            );
            return device ? device.name : 'No encontrado';
        }
        return 'Sin dispositivos';
    }

    /**
     * Consulta y obtiene la asignación activa del usuario con mejor manejo de errores
     */
    async consultaAsig(): Promise<void> {
        this.loadingAsignacion = true;

        try {
            const asignacionLocalizada =
                await this.ubicacionService.getAsignacion();
            const date = new Date();
            const dateOnly = `${date.getFullYear()}-${
                date.getMonth() + 1
            }-${date.getDate()}`;

            // Determinar si es externo o funcionario con tipado específico
            let externo: string | null = null;
            let funcionario: string | null = null;

            if (this.auth.roleUserToken() === undefined) {
                externo = this.auth.idUserToken();
            } else {
                funcionario = this.auth.idUserToken();
            }

            const params: {
                dateOnly: string;
                funcionario?: string;
                externo?: string;
            } = { dateOnly };
            if (funcionario) params.funcionario = funcionario;
            if (externo) params.externo = externo;

            this.list
                .listarAsignacionRecolectores(this.token, params, false)
                .subscribe({
                    next: async (response) => {
                        if (response.data.length > 0) {
                            // Sanitizar datos de entrada
                            this.asignacion = sanitizarDatos(
                                response.data[0] as IAsignacion
                            );

                            // Guardar asignación si es nueva o diferente
                            if (
                                !asignacionLocalizada ||
                                this.asignacion._id !== asignacionLocalizada._id
                            ) {
                                await this.ubicacionService.saveAsignacion(
                                    this.asignacion
                                );
                            }

                            // Inicializar servicios de ubicación
                            await this.ubicacionService.loadInitialLocations();
                            await this.ubicacionService.initializeNetworkListener();

                            // Iniciar background tracking automáticamente
                            await this.iniciarBackgroundTrackingParaAsignacion();

                            this.mostrarMensaje(
                                'success',
                                MENSAJES.EXITO.ASIGNACION_ENCONTRADA,
                                `Dispositivo: ${this.getDeviceGPS(
                                    this.asignacion.deviceId
                                )}`
                            );

                            RecoleccionLogger.info('Asignación cargada', {
                                id: this.asignacion._id,
                                deviceId: this.asignacion.deviceId,
                            });
                        } else {
                            this.mostrarMensaje(
                                'warn',
                                MENSAJES.ERROR.SIN_ASIGNACION,
                                'No tienes ninguna asignación activa para hoy.'
                            );
                        }
                    },
                    error: (error) => {
                        RecoleccionLogger.error(
                            'Error consultando asignación',
                            error
                        );
                        this.mostrarMensaje(
                            'error',
                            'Error de consulta',
                            'No se pudo consultar tu asignación.'
                        );
                    },
                    complete: () => {
                        this.loadingAsignacion = false;
                    },
                });
        } catch (error) {
            RecoleccionLogger.error('Error en consultaAsig', error);
            this.loadingAsignacion = false;
        }
    }

    /**
     * Inicia automáticamente el background tracking cuando hay una asignación activa
     */
    async iniciarBackgroundTrackingParaAsignacion(): Promise<void> {
        try {
            if (this.asignacion && !this.backgroundTrackingActive) {
                RecoleccionLogger.info(
                    'Iniciando background tracking para asignación',
                    {
                        asignacionId: this.asignacion._id,
                    }
                );

                const success =
                    await this.ubicacionService.iniciarBackgroundTracking();

                if (success) {
                    this.backgroundTrackingActive = true;
                    this.updateBackgroundTrackingStatus();

                    this.mostrarMensaje(
                        'success',
                        MENSAJES.EXITO.SEGUIMIENTO_ACTIVADO,
                        'El seguimiento automático está ahora activo.'
                    );
                } else {
                    this.mostrarMensaje(
                        'error',
                        MENSAJES.ERROR.ERROR_SEGUIMIENTO,
                        'No se pudo activar el seguimiento automático.'
                    );
                }
            }
        } catch (error) {
            RecoleccionLogger.error(
                'Error iniciando background tracking',
                error
            );
        }
    }

    /**
     * Controla manualmente el background tracking (activar/desactivar)
     */
    async toggleBackgroundTracking(): Promise<void> {
        try {
            if (this.backgroundTrackingActive) {
                const success =
                    await this.ubicacionService.detenerBackgroundTracking();
                if (success) {
                    this.backgroundTrackingActive = false;
                    this.mostrarMensaje(
                        'info',
                        'Seguimiento Pausado',
                        'El seguimiento automático ha sido pausado.'
                    );
                }
            } else {
                if (!this.asignacion) {
                    this.mostrarMensaje(
                        'warn',
                        MENSAJES.ERROR.SIN_ASIGNACION,
                        'Necesitas una asignación activa para usar el seguimiento automático.'
                    );
                    return;
                }

                const success =
                    await this.ubicacionService.iniciarBackgroundTracking();
                if (success) {
                    this.backgroundTrackingActive = true;
                    this.mostrarMensaje(
                        'success',
                        MENSAJES.EXITO.SEGUIMIENTO_ACTIVADO,
                        'El seguimiento automático está ahora activo.'
                    );
                }
            }

            this.updateBackgroundTrackingStatus();
        } catch (error) {
            RecoleccionLogger.error(
                'Error cambiando estado background tracking',
                error
            );
            this.mostrarMensaje(
                'error',
                'Error',
                'No se pudo cambiar el estado del seguimiento automático.'
            );
        }
    }

    /**
     * Alterna el modo de conducción (seguimiento de alta precisión)
     */
    async toggleDrivingMode(): Promise<void> {
        if (this.drivingMode) {
            // Detener seguimiento manual
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

        RecoleccionLogger.info(
            `Modo conducción ${this.drivingMode ? 'activado' : 'desactivado'}`
        );
    }

    /**
     * Actualiza el texto de estado del seguimiento para mostrar al usuario
     */
    private updateBackgroundTrackingStatus(): void {
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

    /**
     * Inicia el seguimiento de posición en tiempo real para modo conducción
     */
    async startWatchingPosition(): Promise<void> {
        try {
            const permissions = await Geolocation.checkPermissions();
            if (permissions.location === 'denied') {
                await this.requestLocationPermissions();
            }

            const options = {
                enableHighAccuracy: true,
                timeout: CONFIGURACION_DEFECTO.SEGUIMIENTO.TIMEOUT_PERMISOS / 3, // 5 segundos
                maximumAge: 0,
                distanceFilter: 2, // Mínimo 2 metros de movimiento
            };

            if (this.watchId) {
                await this.stopWatchingPosition();
            }

            this.watchId = await Geolocation.watchPosition(
                options,
                (position, err) => {
                    if (err) {
                        RecoleccionLogger.error(
                            'Error en seguimiento de posición',
                            err
                        );
                        return;
                    }

                    if (position) {
                        this.handlePositionUpdate(
                            position.coords as GeolocationCoordinates
                        );
                    }
                }
            );

            RecoleccionLogger.info('Seguimiento de posición iniciado');
        } catch (error) {
            RecoleccionLogger.error(
                'Error iniciando seguimiento de posición',
                error
            );
        }
    }

    /**
     * Detiene el seguimiento de posición en tiempo real
     */
    async stopWatchingPosition(): Promise<void> {
        if (this.watchId) {
            try {
                const clear: ClearWatchOptions = { id: this.watchId };
                await Geolocation.clearWatch(clear);
                this.watchId = undefined;

                if (this.currentMarker) {
                    this.currentMarker.setMap(null);
                    this.currentMarker = undefined;
                }

                this.lastPosition = null;
                RecoleccionLogger.info('Seguimiento de posición detenido');
            } catch (error) {
                RecoleccionLogger.error(
                    'Error deteniendo seguimiento de posición',
                    error
                );
            }
        }
    }

    /**
     * Maneja las actualizaciones de posición del modo conducción con mejor validación
     */
    private handlePositionUpdate(coords: GeolocationCoordinates): void {
        const { latitude, longitude, speed, heading, accuracy } = coords;

        // Filtrar posiciones con baja precisión usando configuración centralizada
        if (accuracy > this.MAX_ACCURACY) {
            RecoleccionLogger.warn('Precisión insuficiente', {
                accuracy,
                maxAccuracy: this.MAX_ACCURACY,
            });
            return;
        }

        const newPosition: google.maps.LatLngLiteral = {
            lat: latitude,
            lng: longitude,
        };

        // Actualizar posición guardada con tipado específico
        this.lastPosition = {
            latitude,
            longitude,
            speed: speed || 0,
            accuracy,
            timestamp: Date.now(),
        };

        // Centrar mapa en nueva ubicación
        this.mapCustom.setCenter(newPosition);

        // Actualizar o crear marcador de ubicación actual
        this.updateCurrentLocationMarker(newPosition, heading);
    }

    /**
     * Actualiza el marcador de ubicación actual en el mapa
     */
    private updateCurrentLocationMarker(
        position: google.maps.LatLngLiteral,
        heading?: number
    ): void {
        if (this.currentMarker) {
            // Animación suave del marcador existente
            const currentPos = this.currentMarker.getPosition();
            if (currentPos) {
                this.animateMarkerTransition(this.currentMarker, position);
            }
        } else {
            // Crear nuevo marcador
            this.currentMarker = new google.maps.Marker({
                position: position,
                map: this.mapCustom,
                title: 'Tu ubicación actual',
                icon: {
                    url: this.getTruckSpriteForAngle(heading || 0),
                    scaledSize: new google.maps.Size(40, 40),
                },
            });
        }

        // Actualizar ícono basado en dirección si hay heading
        if (heading !== undefined) {
            const sprite = this.getTruckSpriteForAngle(
                this.getNearestAngle(heading)
            );
            this.currentMarker.setIcon({
                url: sprite,
                scaledSize: new google.maps.Size(40, 40),
            });
        }
    }

    /**
     * Solicita permisos de ubicación con timeout usando configuración centralizada
     */
    async requestLocationPermissions(): Promise<void> {
        const permissionsTimeout = setTimeout(() => {
            this.mostrarMensaje(
                'warn',
                'Permisos de ubicación',
                'La solicitud de permisos está tomando demasiado tiempo'
            );
        }, CONFIGURACION_DEFECTO.SEGUIMIENTO.TIMEOUT_PERMISOS);

        try {
            const requestPermissions = await Geolocation.requestPermissions();
            clearTimeout(permissionsTimeout);

            if (requestPermissions.location === 'denied') {
                this.mostrarMensaje(
                    'error',
                    MENSAJES.ERROR.ERROR_PERMISOS,
                    'Los permisos de ubicación son necesarios para el funcionamiento correcto'
                );
            }
        } catch (error) {
            clearTimeout(permissionsTimeout);
            RecoleccionLogger.error('Error solicitando permisos', error);
        }
    }

    /**
     * Configura los listeners para observar cambios en ubicaciones guardadas
     */
    private setupLocationListeners(): void {
        // Listener para ubicaciones normales con tipado fuerte
        this.ubicaciones$.subscribe((ubicaciones: IPuntoRecoleccion[]) => {
            this.table = ubicaciones;

            // Limpiar marcadores existentes y agregar nuevos
            this.clearMarkers();
            this.table.forEach((elemento) => {
                this.addMarker(elemento, false);
            });

            // Verificar estado del botón de retorno
            const retornos = this.table.filter(
                (elemento) => elemento.retorno === true
            );
            if (retornos.length > 0) {
                retornos.sort(
                    (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime()
                );
                const lastReturnDate = new Date(
                    retornos[0].timestamp
                ).getTime();
                this.checkReturnButtonStatus(lastReturnDate);
            }
        });

        // Listener para datos de capacidad de retorno con tipado específico
        this.retornos$.subscribe(
            (retornos: { label: string; value: CapacidadVehiculo }[]) => {
                this.capcidad_retorno_arr = retornos;
            }
        );
    }

    /**
     * Agrega un punto de recolección manualmente con validación mejorada
     */
    async addManualLocation(
        destacado: boolean,
        retorno: boolean
    ): Promise<void> {
        if (!this.asignacion) {
            this.mostrarMensaje(
                'warn',
                MENSAJES.ERROR.SIN_ASIGNACION,
                'Necesitas una asignación activa para agregar puntos.'
            );
            return;
        }

        // Actualizar capacidad si es retorno
        if (retorno) {
            await this.updateCapacidad();
        }

        try {
            // Usar la última posición conocida o obtener una nueva
            let currentLocation = this.lastPosition;
            const maxTimeDiff = 5 * 60 * 1000; // 5 minutos
            const now = Date.now();

            if (
                !currentLocation ||
                now - currentLocation.timestamp > maxTimeDiff
            ) {
                const position = await Geolocation.getCurrentPosition();
                currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    speed: position.coords.speed || 0,
                    accuracy: position.coords.accuracy,
                    timestamp: now,
                };
                this.lastPosition = currentLocation;
            }

            // Crear objeto de ubicación con tipado fuerte
            const nuevaUbicacion: IPuntoRecoleccion = {
                _id: this.asignacion._id,
                lat: currentLocation.latitude,
                lng: currentLocation.longitude,
                timestamp: new Date().toISOString(),
                speed: currentLocation.speed,
                accuracy: currentLocation.accuracy,
                destacado: destacado,
                retorno: retorno,
            };

            // Usar validación centralizada
            const validacion: IValidacionUbicacion =
                this.ubicacionService.isValidLocation(nuevaUbicacion);

            if (validacion.resp || retorno) {
                // Agregar marcador si es destacado
                if (destacado) {
                    this.addMarker(nuevaUbicacion, true);
                }

                // Guardar ubicación
                await this.ubicacionService.saveLocation(nuevaUbicacion, true);

                // Manejar lógica de retorno
                if (retorno) {
                    this.displayDialog = false;
                    this.returnTimeLeft = this.returnDelay;
                    this.isReturnButtonDisabled = true;
                    this.startReturnTimer();
                }

                const mensaje = retorno
                    ? MENSAJES.EXITO.RETORNO_REGISTRADO
                    : MENSAJES.EXITO.PUNTO_AGREGADO;
                const detalle = retorno
                    ? 'Retorno a estación registrado correctamente'
                    : 'Punto de recolección agregado';

                this.mostrarMensaje('success', mensaje, detalle);
            } else {
                this.mostrarMensaje(
                    'info',
                    MENSAJES.ERROR.UBICACION_INVALIDA,
                    validacion.message
                );
            }
        } catch (error) {
            RecoleccionLogger.error('Error agregando ubicación manual', error);
            this.mostrarMensaje(
                'error',
                'Error',
                MENSAJES.ERROR.ERROR_UBICACION
            );
        }
    }

    /**
     * Confirma y muestra el diálogo para retorno a estación
     */
    confirmReturnToStation(): void {
        this.displayDialog = true;
    }

    /**
     * Actualiza la capacidad del vehículo para el retorno
     */
    async updateCapacidad(): Promise<void> {
        if (this.capcidad_retorno) {
            await this.ubicacionService.saveRetorno(this.capcidad_retorno);
            this.capcidad_retorno = { label: 'Vacío', value: 'Vacío' };
        }
    }

    /**
     * Verifica el estado del botón de retorno basado en el último retorno
     */
    async checkReturnButtonStatus(lastReturnTime: number): Promise<void> {
        const now = new Date().getTime();
        const timeElapsed = now - lastReturnTime;

        if (timeElapsed < this.returnDelay) {
            this.isReturnButtonDisabled = true;
            this.returnTimeLeft = this.returnDelay - timeElapsed;
            this.startReturnTimer();
        } else {
            this.isReturnButtonDisabled = false;
        }
    }

    /**
     * Inicia el temporizador para habilitar el botón de retorno
     */
    startReturnTimer(): void {
        this.returnInterval = setInterval(() => {
            if (this.returnTimeLeft > 0) {
                this.returnTimeLeft -= 1000;
            } else {
                clearInterval(this.returnInterval);
                this.isReturnButtonDisabled = false;
            }
        }, 1000) as any;
    }

    /**
     * Formatea el tiempo restante usando utilidad centralizada
     */
    formatTime(timeInMs: number): string {
        const seconds = timeInMs / 1000;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
    }

    /**
     * Sincroniza todos los datos locales con el servidor
     */
    async enviarInformacion(): Promise<void> {
        this.syncingData = true;

        try {
            await this.ubicacionService.syncData();
            this.mostrarMensaje(
                'success',
                MENSAJES.EXITO.DATOS_SINCRONIZADOS,
                'Tu información ha sido sincronizada correctamente.'
            );
        } catch (error) {
            RecoleccionLogger.error('Error enviando información', error);
            this.mostrarMensaje(
                'error',
                'Error de sincronización',
                'No se pudo enviar la información. Se intentará automáticamente cuando haya conexión.'
            );
        } finally {
            this.syncingData = false;
        }
    }

    /**
     * Finaliza la asignación y detiene todo el seguimiento
     */
    async finalizarAsignacion(): Promise<void> {
        const confirmar = confirm(
            '¿Estás seguro de que quieres finalizar tu turno de trabajo?\n\n' +
                'Esto detendrá el seguimiento automático de ubicación y enviará todos tus datos.'
        );

        if (!confirmar) return;

        try {
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

            this.mostrarMensaje(
                'success',
                MENSAJES.EXITO.TURNO_FINALIZADO,
                'Tu turno ha sido finalizado y todos los datos han sido enviados.'
            );

            RecoleccionLogger.info('Turno finalizado correctamente');
        } catch (error) {
            RecoleccionLogger.error('Error al finalizar asignación', error);
            this.mostrarMensaje(
                'error',
                'Error',
                'Hubo un problema al finalizar el turno.'
            );
        }
    }

    // Métodos de utilidad para el mapa

    /**
     * Agrega un marcador al mapa con tipado fuerte
     */
    addMarker(
        location: IPuntoRecoleccion,
        center: boolean = false
    ): google.maps.marker.AdvancedMarkerElement {
        const iconElement = document.createElement('div');
        iconElement.style.width = '60px';
        iconElement.style.height = '60px';
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
            title: location.retorno
                ? 'Retorno a Estación'
                : 'Punto de Recolección',
            gmpClickable: true,
        });

        marcador.addListener('click', () => {
            this.showMarkerInfo(location, marcador);
        });

        this.markers.push(marcador);

        if (center) {
            this.mapCustom.setCenter({ lat: location.lat, lng: location.lng });
        }

        return marcador;
    }

    /**
     * Muestra información detallada de un marcador usando utilidades de formato
     */
    showMarkerInfo(
        location: IPuntoRecoleccion,
        marker: google.maps.marker.AdvancedMarkerElement
    ): void {
        this.closeAllInfoWindows();

        const fechaFormateada = formatearFecha(location.timestamp);
        const tiempoRelativo = obtenerTiempoRelativo(location.timestamp);

        const content = `
            <div style="font-family: Arial, sans-serif; max-width: 250px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">
                    ${
                        location.retorno
                            ? 'Retorno a Estación'
                            : 'Punto de Recolección'
                    }
                </h4>
                <div style="margin: 5px 0; font-size: 12px; color: #666;">
                    <strong>Fecha:</strong> ${fechaFormateada}<br>
                    <strong>Tiempo:</strong> ${tiempoRelativo}<br>
                    <strong>Coordenadas:</strong> ${location.lat.toFixed(
                        6
                    )}, ${location.lng.toFixed(6)}<br>
                    ${
                        location.speed
                            ? `<strong>Velocidad:</strong> ${location.speed.toFixed(
                                  1
                              )} km/h<br>`
                            : ''
                    }
                    ${
                        location.accuracy
                            ? `<strong>Precisión:</strong> ±${location.accuracy.toFixed(
                                  0
                              )}m<br>`
                            : ''
                    }
                </div>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${
                    location.lat
                },${location.lng}"
                   target="_blank"
                   style="display: inline-block; padding: 5px 10px; background-color: #4285F4; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">
                    Cómo llegar
                </a>
            </div>
        `;

        if (!this.groupedInfoWindow) {
            this.groupedInfoWindow = new google.maps.InfoWindow();
        }

        this.groupedInfoWindow.setContent(content);
        this.groupedInfoWindow.setPosition({
            lat: location.lat,
            lng: location.lng,
        });
        this.groupedInfoWindow.open(this.mapCustom);
    }

    /**
     * Cierra todas las ventanas de información
     */
    closeAllInfoWindows(): void {
        if (this.infoWindows && this.infoWindows.length) {
            this.infoWindows.forEach((infoWindow: any) => infoWindow.close());
        }
        if (this.groupedInfoWindow) {
            this.groupedInfoWindow.close();
        }
    }

    /**
     * Limpia todos los marcadores del mapa
     */
    clearMarkers(): void {
        for (let marker of this.markers) {
            marker.map = null;
        }
        this.markers = [];
        this.infoWindows = [];
    }

    /**
     * Navega a un marcador específico en la tabla
     */
    getMarker(locationIndex: number): void {
        if (locationIndex >= 0 && locationIndex < this.markers.length) {
            const marker = this.markers[locationIndex];
            this.closeAllInfoWindows();
            this.mapCustom.setCenter(marker.position);

            // Mostrar información del marcador
            const location = this.table[locationIndex];
            if (location) {
                this.showMarkerInfo(location, marker);
            }
        }
    }

    // Métodos para sprites de vehículo (manteniendo la funcionalidad original)

    /**
     * Redondea el ángulo de dirección al múltiplo de 15° más cercano
     */
    getNearestAngle(heading: number): number {
        heading = ((heading % 360) + 360) % 360;
        return Math.round(heading / 15) * 15;
    }

    /**
     * Obtiene el sprite del camión correspondiente al ángulo de dirección
     */
    getTruckSpriteForAngle(angle: number): string {
        const spriteMap: { [key: number]: string } = {
            0: 'tile000.png',
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

        return `assets/icon-truc-set-24/${spriteMap[angle] || spriteMap[0]}`;
    }

    /**
     * Anima la transición suave de un marcador
     */
    animateMarkerTransition(
        marker: google.maps.Marker,
        newPosition: google.maps.LatLngLiteral
    ): void {
        const animationDuration = 1000;
        const intervalTime = 10;
        const steps = animationDuration / intervalTime;
        let stepCount = 0;

        const startPos = marker.getPosition();
        if (!startPos) return;

        const deltaLat = (newPosition.lat - startPos.lat()) / steps;
        const deltaLng = (newPosition.lng - startPos.lng()) / steps;

        const moveMarker = () => {
            stepCount++;
            const newLat = startPos.lat() + deltaLat * stepCount;
            const newLng = startPos.lng() + deltaLng * stepCount;
            marker.setPosition({ lat: newLat, lng: newLng });

            if (stepCount < steps) {
                setTimeout(moveMarker, intervalTime);
            }
        };

        moveMarker();
    }

    // Métodos helper privados

    /**
     * Método centralizado para mostrar mensajes al usuario
     */
    private mostrarMensaje(
        severity: 'success' | 'info' | 'warn' | 'error',
        summary: string,
        detail: string
    ): void {
        this.messageService.add({
            severity,
            summary,
            detail,
            life: CONFIGURACION_DEFECTO.INTERFAZ.TIEMPO_TOAST,
        });
    }

    /**
     * Obtiene el ícono correspondiente a la capacidad del vehículo
     */
    private getCapacityIcon(capacity: CapacidadVehiculo): string {
        const iconMap: Record<CapacidadVehiculo, string> = {
            Vacío: 'pi pi-circle',
            Medio: 'pi pi-circle-half',
            Lleno: 'pi pi-circle-fill',
        };
        return iconMap[capacity];
    }
}

