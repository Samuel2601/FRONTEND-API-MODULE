import { Component, OnInit, OnDestroy, Input, Optional } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GoogleMapsService } from 'src/app/demo/services/google.maps.service';
import { FilterService } from 'src/app/demo/services/filter.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { MessageService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';

// ✨ IMPORTACIÓN AGREGADA: DynamicDialogConfig para recibir datos del dialog
import { DynamicDialogConfig } from 'primeng/dynamicdialog';

// Importar interfaces y utilidades
import {
    IAsignacion,
    IPuntoRecoleccion,
    IDatosGPS,
    IEstadisticasAsignacion,
    IMapConfig,
    CONFIGURACION_DEFECTO,
    MENSAJES,
} from '../../interfaces/recoleccion.interfaces';

import {
    calcularDistancia,
    calcularVelocidad,
    calcularEstadisticasAsignacion,
    formatearFecha,
    formatearDuracion,
    obtenerTiempoRelativo,
    transformarDatosGPS,
    RecoleccionLogger,
    medirRendimiento,
} from '../../utils/recoleccion.utils';

/**
 * Componente especializado para mostrar el detalle de una ruta específica
 * Incluye visualización GPS, reproducción de ruta y análisis de puntos
 *
 * Ahora con tipado fuerte, cálculos centralizados y mejor análisis de datos
 * ✨ ARREGLADO: Ahora maneja correctamente los datos cuando se usa como dialog
 */
@Component({
    standalone: false,
    selector: 'app-detalle-ruta',
    templateUrl: './detalle-ruta.component.html',
    styleUrls: ['./detalle-ruta.component.scss'],
    providers: [MessageService],
})
export class DetalleRutaComponent implements OnInit, OnDestroy {
    // Entrada opcional para usar el componente embebido
    @Input() rutaId?: string;

    // Propiedades del mapa y visualización con tipado fuerte
    mapCustom!: google.maps.Map;
    ruta: IAsignacion | null = null;
    table: IPuntoRecoleccion[] = [];

    // Estadísticas calculadas de la ruta
    estadisticas: IEstadisticasAsignacion | null = null;

    // Marcadores y elementos gráficos del mapa con tipado específico
    private markers: google.maps.marker.AdvancedMarkerElement[] = [];
    private infoWindows: google.maps.InfoWindow[] = [];
    inicial?: google.maps.marker.AdvancedMarkerElement;
    final?: google.maps.marker.AdvancedMarkerElement;
    pathson: google.maps.Polyline[] = [];
    segmentos: IPuntoRecoleccion[][] = [];
    vehicleMarker?: google.maps.marker.AdvancedMarkerElement;

    // Control de reproducción de ruta con tipado específico
    isPlaying: boolean = false;
    speedMultiplier: number = 1;
    isPaused: boolean = false;
    locations: IDatosGPS[] = [];
    currentIndex: number = 0;
    timeoutId?: number;
    shouldCenter: boolean = true;

    // Opciones de velocidad de reproducción
    readonly speedOptions = [1, 2, 5, 10, 20];

    // Estados de carga
    loadingRuta: boolean = false;
    loadingUpdate: boolean = false;

    // ID de la ruta actual
    private id?: string;
    private readonly token: string;

    // Configuración del mapa usando constantes centralizadas
    private readonly mapConfig: IMapConfig = {
        center: CONFIGURACION_DEFECTO.MAPA.CENTER,
        zoom: CONFIGURACION_DEFECTO.MAPA.ZOOM,
        mapTypeId: 'terrain',
        styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            {
                featureType: 'transit.station',
                stylers: [{ visibility: 'off' }],
            },
        ],
        controls: {
            fullscreen: true,
            mapType: true,
            streetView: false,
            zoom: true,
        },
    };

    // Paleta de colores para segmentos de ruta
    private readonly segmentColors = [
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

    constructor(
        private googlemaps: GoogleMapsService,
        private filter: FilterService,
        private auth: AuthService,
        private messageService: MessageService,
        private route: ActivatedRoute,
        // ✨ CORRECCIÓN: Usar @Optional() para inyección condicional
        @Optional() private dialogConfig: DynamicDialogConfig | null
    ) {
        this.token = this.auth.token();
        RecoleccionLogger.info('DetalleRutaComponent inicializado');
    }

    async ngOnInit(): Promise<void> {
        await medirRendimiento('Inicialización detalle ruta', async () => {
            await this.initMap();

            setTimeout(async () => {
                // ✨ LÓGICA MEJORADA: Determinar el ID de la ruta desde múltiples fuentes
                this.determinarIdRuta();

                if (this.id) {
                    await this.getRuta();
                } else {
                    this.mostrarMensaje(
                        'warn',
                        'Ruta no especificada',
                        'No se ha proporcionado un ID de ruta válido'
                    );
                }
            }, 500);
        });
    }

    /**
     * ✨ MÉTODO MEJORADO: Maneja correctamente el caso cuando dialogConfig es null
     */
    private determinarIdRuta(): void {
        // 1. Prioridad máxima: datos del dialog (cuando se abre como modal)
        // Ahora verificamos si dialogConfig existe antes de usarlo
        if (this.dialogConfig?.data?.id) {
            this.id = this.dialogConfig.data.id;
            RecoleccionLogger.info('ID obtenido desde dialog config', {
                id: this.id,
            });
            return;
        }

        // 2. Segunda prioridad: propiedad Input (cuando se usa como componente hijo)
        if (this.rutaId) {
            this.id = this.rutaId;
            RecoleccionLogger.info('ID obtenido desde Input property', {
                id: this.id,
            });
            return;
        }

        // 3. Tercera prioridad: parámetros de ruta (navegación directa)
        this.route.paramMap.subscribe((params) => {
            const routeId = params.get('id');
            if (routeId) {
                this.id = routeId;
                RecoleccionLogger.info('ID obtenido desde route params', {
                    id: this.id,
                });
            }
        });
    }

    ngOnDestroy(): void {
        RecoleccionLogger.info('Destruyendo componente DetalleRuta');

        // Limpiar timeouts y markers al destruir el componente
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        this.clearAllMapElements();
    }

    /**
     * Inicializa el mapa de Google Maps usando configuración centralizada
     */
    async initMap(): Promise<void> {
        this.googlemaps.getLoader().then(async () => {
            this.mapCustom = new google.maps.Map(
                document.getElementById('map-detalle-ruta') as HTMLElement,
                {
                    mapId: '7756f5f6c6f997f1',
                    zoom: this.mapConfig.zoom,
                    center: this.mapConfig.center,
                    mapTypeId: this.mapConfig.mapTypeId,
                    fullscreenControl: this.mapConfig.controls?.fullscreen,
                    mapTypeControlOptions: {
                        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                        position: google.maps.ControlPosition.LEFT_BOTTOM,
                    },
                    draggable: true,
                    gestureHandling: 'greedy',
                    styles: this.mapConfig.styles,
                }
            );

            RecoleccionLogger.info('Mapa de detalle inicializado');
        });
    }

    /**
     * Actualiza los datos de la ruta desde el servidor externo con mejor manejo de errores
     */
    async updateRuta(): Promise<void> {
        if (!this.id) return;

        this.loadingUpdate = true;
        this.mostrarMensaje(
            'info',
            MENSAJES.INFO.SINCRONIZANDO,
            'Consultando datos GPS más recientes...'
        );

        try {
            const response = await (
                await this.filter.ActualizarRutaRecolector(this.token, this.id)
            ).toPromise();

            RecoleccionLogger.info('Ruta actualizada', {
                rutaId: this.id,
                response,
            });

            this.mostrarMensaje(
                'success',
                'Ruta actualizada',
                'Los datos GPS han sido actualizados correctamente'
            );

            // Recargar la ruta después de actualizar
            setTimeout(() => {
                this.getRuta();
            }, 1000);
        } catch (error) {
            RecoleccionLogger.error('Error actualizando ruta', error);
            this.mostrarMensaje(
                'error',
                'Error de actualización',
                'No se pudo actualizar la ruta GPS'
            );
        } finally {
            this.loadingUpdate = false;
        }
    }

    /**
     * Obtiene los datos completos de la ruta desde el servidor con mejor análisis
     */
    async getRuta(): Promise<void> {
        if (!this.id) return;

        this.loadingRuta = true;

        try {
            const response = await this.filter
                .obtenerRutaRecolector(this.token, this.id)
                .toPromise();

            if (response.data) {
                this.ruta = response.data as IAsignacion;
                this.table = this.ruta.puntos_recoleccion || [];

                // Calcular estadísticas de la ruta usando utilidades centralizadas
                this.estadisticas = calcularEstadisticasAsignacion(this.ruta);

                RecoleccionLogger.info(
                    'Estadísticas de ruta calculadas',
                    this.estadisticas
                );

                // Dibujar la ruta GPS si existe
                if (this.ruta.ruta && this.ruta.ruta.length > 0) {
                    // Transformar datos GPS usando utilidad centralizada
                    const datosGPSTransformados = transformarDatosGPS(
                        this.ruta.ruta
                    );
                    await this.DrawRuta(datosGPSTransformados);
                }

                // Agregar marcadores de puntos de recolección
                this.ruta.puntos_recoleccion?.forEach(
                    (elemento: IPuntoRecoleccion) => {
                        this.addMarker(elemento, false);
                    }
                );

                this.mostrarMensaje(
                    'success',
                    'Ruta cargada',
                    `Ruta con ${this.table.length} puntos de recolección`
                );
            } else {
                this.mostrarMensaje(
                    'warn',
                    'Sin datos',
                    'No se encontraron datos para esta ruta'
                );
            }
        } catch (error) {
            RecoleccionLogger.error('Error obteniendo ruta', error);
            this.mostrarMensaje(
                'error',
                'Error de carga',
                'No se pudo cargar la información de la ruta'
            );
        } finally {
            this.loadingRuta = false;
        }
    }

    /**
     * Dibuja la ruta GPS completa en el mapa con análisis mejorado de segmentos
     */
    async DrawRuta(locations: IDatosGPS[]): Promise<void> {
        this.locations = locations;

        // Limpiar rutas previas
        this.clearPaths();

        // Dividir la ruta en segmentos basados en puntos de retorno usando análisis avanzado
        const puntosRetorno =
            this.ruta?.puntos_recoleccion?.filter(
                (elemento: IPuntoRecoleccion) => elemento.retorno
            ) || [];

        let currentColorIndex = 0;

        // Procesar cada segmento entre puntos de retorno con mejor lógica
        for (let i = 0; i <= puntosRetorno.length; i++) {
            const segmento = this.extraerSegmento(locations, puntosRetorno, i);

            if (segmento.length > 0) {
                this.drawSegment(
                    segmento,
                    this.segmentColors[currentColorIndex]
                );
                currentColorIndex =
                    (currentColorIndex + 1) % this.segmentColors.length;
            }
        }

        // Agregar marcadores de inicio y fin
        this.addStartEndMarkers(locations);
    }

    /**
     * Extrae un segmento específico de la ruta basado en puntos de retorno
     */
    private extraerSegmento(
        locations: IDatosGPS[],
        puntosRetorno: IPuntoRecoleccion[],
        segmentIndex: number
    ): IDatosGPS[] {
        if (puntosRetorno.length === 0) {
            return locations; // Si no hay retornos, toda la ruta es un segmento
        }

        const retornoActual = puntosRetorno[segmentIndex - 1];
        const retornoSiguiente = puntosRetorno[segmentIndex];

        const timestampInicio =
            segmentIndex === 0
                ? 0
                : new Date(retornoActual.timestamp).getTime();
        const timestampFin = retornoSiguiente
            ? new Date(retornoSiguiente.timestamp).getTime()
            : Infinity;

        return locations.filter((location) => {
            const locationTimestamp = new Date(location.fixTime).getTime();
            return (
                locationTimestamp >= timestampInicio &&
                locationTimestamp <= timestampFin
            );
        });
    }

    /**
     * Dibuja un segmento individual de la ruta con interactividad mejorada
     */
    drawSegment(segment: IDatosGPS[], color: string): void {
        const segmentPoints: IPuntoRecoleccion[] = segment.map((point) => ({
            lat: point.latitude,
            lng: point.longitude,
            id: point.id,
            fixTime: point.fixTime,
            timestamp: point.fixTime,
            destacado: false,
            retorno: false,
            // Puedes agregar otras propiedades opcionales aquí si es necesario
        }));

        this.segmentos.push(segmentPoints);

        const path = segmentPoints.map((point) => ({
            lat: point.lat,
            lng: point.lng,
        }));

        const route = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: 0.6,
            strokeWeight: 6,
        });

        // Efectos de interacción con el mouse mejorados
        route.addListener('mouseover', () => {
            route.setOptions({ strokeOpacity: 1.0, strokeWeight: 8 });
            this.dimOtherPaths(route);
        });

        route.addListener('mouseout', () => {
            this.restoreAllPaths();
        });

        route.addListener('click', (event: any) => {
            this.showRouteInfo(event, segmentPoints, color);
        });

        route.setMap(this.mapCustom);
        this.pathson.push(route);
    }

    /**
     * Agrega marcadores de inicio y fin de la ruta con información mejorada
     */
    addStartEndMarkers(locations: IDatosGPS[]): void {
        if (locations.length === 0) return;

        // Marcador de inicio
        const start = locations[0];
        if (this.inicial) {
            this.inicial.map = null;
        }

        this.inicial = new google.maps.marker.AdvancedMarkerElement({
            position: { lat: start.latitude, lng: start.longitude },
            map: this.mapCustom,
            title: `Inicio: ${formatearFecha(start.fixTime)}`,
        });

        const startInfoWindow = new google.maps.InfoWindow({
            headerContent: 'INICIO DE RUTA',
            content: this.crearContenidoInfoWindow(start, 'inicio'),
        });

        this.inicial.addListener('click', () => {
            startInfoWindow.open(this.mapCustom, this.inicial);
        });

        // Marcador de fin (si hay más de un punto)
        if (locations.length > 1) {
            const end = locations[locations.length - 1];
            if (this.final) {
                this.final.map = null;
            }

            this.final = new google.maps.marker.AdvancedMarkerElement({
                position: { lat: end.latitude, lng: end.longitude },
                map: this.mapCustom,
                title: `Fin: ${formatearFecha(end.fixTime)}`,
            });

            const endInfoWindow = new google.maps.InfoWindow({
                headerContent: 'FIN DE RUTA',
                content: this.crearContenidoInfoWindow(end, 'fin'),
            });

            this.final.addListener('click', () => {
                endInfoWindow.open(this.mapCustom, this.final);
            });
        }

        // Centrar el mapa en el punto de inicio
        this.mapCustom.setCenter({ lat: start.latitude, lng: start.longitude });

        RecoleccionLogger.debug('Marcadores de inicio y fin agregados', {
            inicio: { lat: start.latitude, lng: start.longitude },
            fin:
                locations.length > 1
                    ? {
                          lat: locations[locations.length - 1].latitude,
                          lng: locations[locations.length - 1].longitude,
                      }
                    : null,
        });
    }

    /**
     * Crea contenido HTML para ventanas de información usando utilidades de formato
     */
    private crearContenidoInfoWindow(
        point: IDatosGPS,
        tipo: 'inicio' | 'fin'
    ): string {
        const fechaFormateada = formatearFecha(point.fixTime);
        const tiempoRelativo = obtenerTiempoRelativo(point.fixTime);

        return `
            <div style="font-family: Arial, sans-serif; max-width: 200px;">
                <div style="margin: 5px 0; font-size: 12px; color: #666;">
                    <strong>Coordenadas:</strong> ${point.latitude.toFixed(
                        6
                    )}, ${point.longitude.toFixed(6)}<br>
                    <strong>Fecha:</strong> ${fechaFormateada}<br>
                    <strong>Tiempo:</strong> ${tiempoRelativo}<br>
                    ${
                        point.speed
                            ? `<strong>Velocidad:</strong> ${point.speed.toFixed(
                                  1
                              )} km/h<br>`
                            : ''
                    }
                    ${
                        point.altitude
                            ? `<strong>Altitud:</strong> ${point.altitude.toFixed(
                                  0
                              )}m<br>`
                            : ''
                    }
                </div>
            </div>
        `;
    }

    /**
     * Agrega un marcador de punto de recolección con información mejorada
     */
    addMarker(
        location: IPuntoRecoleccion,
        center: boolean = false
    ): google.maps.marker.AdvancedMarkerElement {
        const iconElement = document.createElement('div');
        iconElement.style.width = '50px';
        iconElement.style.height = '50px';
        iconElement.style.backgroundImage = location.retorno
            ? 'url(https://i.postimg.cc/QdHqFQ69/Dise-o-sin-t-tulo-6.png)'
            : 'url(https://i.postimg.cc/43M4JgYH/Dise-o-sin-t-tulos-7.png)';
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

        // Información detallada al hacer clic usando utilidades de formato
        const infoWindow = new google.maps.InfoWindow({
            content: this.crearContenidoMarker(location),
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

        return marcador;
    }

    /**
     * Crea contenido HTML para marcadores de puntos de recolección
     */
    private crearContenidoMarker(location: IPuntoRecoleccion): string {
        const fechaFormateada = formatearFecha(location.timestamp);
        const tiempoRelativo = obtenerTiempoRelativo(location.timestamp);

        return `
            <div style="font-family: Arial, sans-serif; max-width: 200px;">
                <h4>${
                    location.retorno
                        ? 'Retorno a Estación'
                        : 'Punto de Recolección'
                }</h4>
                <p><strong>Fecha:</strong> ${fechaFormateada}</p>
                <p><strong>Tiempo:</strong> ${tiempoRelativo}</p>
                <p><strong>Coordenadas:</strong><br>${location.lat.toFixed(
                    6
                )}, ${location.lng.toFixed(6)}</p>
                ${
                    location.speed
                        ? `<p><strong>Velocidad:</strong> ${location.speed} km/h</p>`
                        : ''
                }
                ${
                    location.accuracy
                        ? `<p><strong>Precisión:</strong> ±${location.accuracy.toFixed(
                              0
                          )}m</p>`
                        : ''
                }
            </div>
        `;
    }

    /**
     * Control de reproducción de ruta - activa/desactiva la animación
     */
    toggleRoutePlayback(): void {
        if (this.isPlaying) {
            this.playRoute(this.locations);
        } else {
            this.stopRoutePlayback();
        }
    }

    /**
     * Reproduce la ruta animando un vehículo a lo largo del recorrido
     */
    async playRoute(locations: IDatosGPS[], startIndex = 0): Promise<void> {
        if (!locations || locations.length === 0) return;

        // Crear o actualizar el marcador del vehículo
        if (!this.vehicleMarker || startIndex === 0) {
            this.createVehicleMarker(locations[0]);
        }

        this.currentIndex = startIndex;
        this.moveVehicle();
    }

    /**
     * Crea el marcador del vehículo para la animación
     */
    createVehicleMarker(startLocation: IDatosGPS): void {
        if (this.vehicleMarker) {
            this.vehicleMarker.map = null;
        }

        const iconElement = document.createElement('div');
        iconElement.style.width = '40px';
        iconElement.style.height = '40px';
        iconElement.style.backgroundImage =
            'url(https://i.postimg.cc/gJLP7FtQ/png-transparent-green-and-environmentally-friendly-garbage-truck-green-green-car-rubbish-truck-thumb.png)';
        iconElement.style.backgroundSize = 'cover';
        iconElement.style.backgroundPosition = 'center';
        iconElement.style.borderRadius = '50%';

        this.vehicleMarker = new google.maps.marker.AdvancedMarkerElement({
            position: {
                lat: startLocation.latitude,
                lng: startLocation.longitude,
            },
            map: this.mapCustom,
            content: iconElement,
            title: 'Vehículo en movimiento',
        });

        if (this.shouldCenter) {
            this.mapCustom.setCenter({
                lat: startLocation.latitude,
                lng: startLocation.longitude,
            });
        }
    }

    /**
     * Mueve el marcador del vehículo a lo largo de la ruta
     */
    moveVehicle(): void {
        const nextIndex = this.currentIndex + 1;

        if (nextIndex < this.locations.length && !this.isPaused) {
            this.currentIndex = nextIndex;
            const nextLocation = this.locations[this.currentIndex];

            if (this.vehicleMarker) {
                this.vehicleMarker.position = {
                    lat: nextLocation.latitude,
                    lng: nextLocation.longitude,
                };

                if (this.shouldCenter) {
                    this.mapCustom.setCenter({
                        lat: nextLocation.latitude,
                        lng: nextLocation.longitude,
                    });
                }

                // Resaltar el segmento actual
                this.highlightCurrentSegment(nextLocation);
            }

            // Continuar la animación con la velocidad seleccionada
            const delay = 1000 / this.speedMultiplier;
            this.timeoutId = setTimeout(() => this.moveVehicle(), delay) as any;
        } else if (this.currentIndex >= this.locations.length - 1) {
            this.onRouteComplete();
        }
    }

    /**
     * Resalta el segmento de ruta por donde pasa actualmente el vehículo
     */
    highlightCurrentSegment(currentLocation: IDatosGPS): void {
        this.segmentos.forEach((segment: any[], index) => {
            const isInSegment = segment.find(
                (path) => path.id === currentLocation.id
            );

            if (isInSegment && this.pathson[index]) {
                // Resaltar el segmento actual
                this.pathson[index].setOptions({
                    strokeOpacity: 1.0,
                    strokeWeight: 10,
                });

                // Desvanecer otros segmentos
                this.pathson.forEach((route, routeIndex) => {
                    if (routeIndex !== index) {
                        route.setOptions({
                            strokeOpacity: 0.3,
                            strokeWeight: 4,
                        });
                    }
                });
            }
        });
    }

    /**
     * Acciones cuando se completa la reproducción de la ruta
     */
    onRouteComplete(): void {
        RecoleccionLogger.info('Reproducción de ruta completada');
        this.mostrarMensaje(
            'success',
            'Ruta completada',
            'La reproducción de la ruta ha finalizado'
        );
        this.restoreAllPaths();
    }

    /**
     * Detiene la reproducción de ruta
     */
    stopRoutePlayback(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        if (this.vehicleMarker) {
            this.vehicleMarker.map = null;
            this.vehicleMarker = undefined;
        }
        this.restoreAllPaths();
    }

    /**
     * Establece la velocidad de reproducción
     */
    setSpeed(speed: number): void {
        this.speedMultiplier = speed;
        RecoleccionLogger.debug('Velocidad de reproducción cambiada', {
            speed,
        });
    }

    /**
     * Pausa o reanuda la reproducción
     */
    togglePause(): void {
        this.isPaused = !this.isPaused;
        if (!this.isPaused) {
            this.playRoute(this.locations, this.currentIndex);
        } else {
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
        }
        RecoleccionLogger.debug(
            `Reproducción ${this.isPaused ? 'pausada' : 'reanudada'}`
        );
    }

    /**
     * Navega a un marcador específico en la tabla
     */
    getMarker(locationIndex: number): void {
        if (locationIndex >= 0 && locationIndex < this.markers.length) {
            const marker = this.markers[locationIndex];
            const infoWindow = this.infoWindows[locationIndex];

            this.closeAllInfoWindows();
            this.mapCustom.setCenter(marker.position);

            if (infoWindow) {
                infoWindow.open(this.mapCustom, marker);
            }
        }
    }

    // Métodos de utilidad para manejo del mapa

    /**
     * Atenúa otras rutas excepto la especificada
     */
    dimOtherPaths(activeRoute: google.maps.Polyline): void {
        this.pathson.forEach((route) => {
            if (route !== activeRoute) {
                route.setOptions({ strokeOpacity: 0.3, strokeWeight: 4 });
            }
        });
    }

    /**
     * Restaura la apariencia normal de todas las rutas
     */
    restoreAllPaths(): void {
        this.pathson.forEach((route) => {
            route.setOptions({ strokeOpacity: 0.6, strokeWeight: 6 });
        });
    }

    /**
     * Muestra información sobre un segmento de ruta con análisis mejorado
     */
    showRouteInfo(event: any, segment: any[], color: string): void {
        if (segment.length === 0) return;

        // Calcular estadísticas del segmento usando utilidades centralizadas
        const distanciaSegmento = this.calcularDistanciaSegmento(segment);
        const duracionSegmento = this.calcularDuracionSegmento(segment);
        const velocidadPromedio =
            duracionSegmento > 0
                ? distanciaSegmento /
                  1000 /
                  (duracionSegmento / (1000 * 60 * 60))
                : 0;

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="font-family: Arial, sans-serif; max-width: 250px;">
                    <h4 style="color: ${color};">Segmento de Ruta</h4>
                    <p><strong>Puntos GPS:</strong> ${segment.length}</p>
                    <p><strong>Distancia:</strong> ${(
                        distanciaSegmento / 1000
                    ).toFixed(2)} km</p>
                    <p><strong>Duración:</strong> ${formatearDuracion(
                        duracionSegmento
                    )}</p>
                    <p><strong>Velocidad promedio:</strong> ${velocidadPromedio.toFixed(
                        1
                    )} km/h</p>
                    <p><strong>Inicio:</strong> ${formatearFecha(
                        segment[0].fixTime,
                        false
                    )}</p>
                    <p><strong>Fin:</strong> ${formatearFecha(
                        segment[segment.length - 1].fixTime,
                        false
                    )}</p>
                </div>
            `,
        });

        infoWindow.setPosition(event.latLng);
        infoWindow.open(this.mapCustom);
    }

    /**
     * Calcula la distancia total de un segmento usando utilidades centralizadas
     */
    private calcularDistanciaSegmento(segment: any[]): number {
        let distanciaTotal = 0;
        for (let i = 1; i < segment.length; i++) {
            distanciaTotal += calcularDistancia(segment[i - 1], segment[i]);
        }
        return distanciaTotal;
    }

    /**
     * Calcula la duración de un segmento
     */
    private calcularDuracionSegmento(segment: any[]): number {
        if (segment.length < 2) return 0;

        const inicio = new Date(segment[0].fixTime).getTime();
        const fin = new Date(segment[segment.length - 1].fixTime).getTime();

        return fin - inicio;
    }

    /**
     * Cierra todas las ventanas de información
     */
    closeAllInfoWindows(): void {
        this.infoWindows.forEach((infoWindow) => infoWindow.close());
    }

    /**
     * Limpia todos los elementos del mapa
     */
    clearAllMapElements(): void {
        this.clearMarkers();
        this.clearPaths();
        this.stopRoutePlayback();
    }

    /**
     * Limpia todos los marcadores
     */
    clearMarkers(): void {
        this.markers.forEach((marker) => (marker.map = null));
        this.markers = [];
        this.infoWindows = [];

        if (this.inicial) {
            this.inicial.map = null;
        }
        if (this.final) {
            this.final.map = null;
        }
    }

    /**
     * Limpia todas las rutas dibujadas
     */
    clearPaths(): void {
        this.pathson.forEach((path) => path.setMap(null));
        this.pathson = [];
        this.segmentos = [];
    }

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

    // Getters para usar en el template con datos calculados

    /**
     * Obtiene el texto formateado de las estadísticas para mostrar en el template
     */
    get estadisticasTexto(): string {
        if (!this.estadisticas) return '';

        return `
            Distancia total: ${(
                this.estadisticas.distanciaRecorrida / 1000
            ).toFixed(2)} km | 
            Tiempo total: ${formatearDuracion(this.estadisticas.tiempoTotal)} | 
            Velocidad promedio: ${this.estadisticas.velocidadPromedio.toFixed(
                1
            )} km/h
        `;
    }

    /**
     * Obtiene información resumida de la ruta para el encabezado
     */
    get resumenRuta(): string {
        if (!this.ruta) return '';

        const fechaCreacion = formatearFecha(this.ruta.createdAt, false);
        const tiempoRelativo = obtenerTiempoRelativo(this.ruta.createdAt);

        return `Creada el ${fechaCreacion} (${tiempoRelativo})`;
    }

    // Métodos helper para el template actualizado

    /**
     * Expone la función formatearDuracion para usar en el template
     */
    formatearDuracion = formatearDuracion;

    /**
     * Expone la función obtenerTiempoRelativo para usar en el template
     */
    obtenerTiempoRelativo = obtenerTiempoRelativo;

    /**
     * Obtiene el ícono CSS apropiado basado en la precisión GPS
     */
    getPrecisionIcon(accuracy?: number): string {
        if (!accuracy) return 'pi pi-question-circle text-gray-400';

        if (accuracy < 5) return 'pi pi-check-circle text-green-500';
        if (accuracy < 15) return 'pi pi-info-circle text-blue-500';
        if (accuracy < 50) return 'pi pi-exclamation-triangle text-orange-500';
        return 'pi pi-times-circle text-red-500';
    }

    /**
     * Obtiene la clase CSS apropiada basada en la precisión GPS
     */
    getPrecisionClass(accuracy?: number): string {
        if (!accuracy) return 'text-gray-500';

        if (accuracy < 5) return 'text-green-600 font-medium';
        if (accuracy < 15) return 'text-blue-600';
        if (accuracy < 50) return 'text-orange-600';
        return 'text-red-600 font-medium';
    }

    /**
     * Filtra los puntos GPS por nivel de precisión
     */
    filtrarPorPrecision(event: any): void {
        const valor = event.value;
        if (!valor) {
            // Mostrar todos los puntos
            return;
        }

        // Implementar filtrado basado en precisión
        // Este método se puede expandir según las necesidades específicas
        RecoleccionLogger.info('Filtro de precisión aplicado', {
            filtro: valor,
        });
    }
}

