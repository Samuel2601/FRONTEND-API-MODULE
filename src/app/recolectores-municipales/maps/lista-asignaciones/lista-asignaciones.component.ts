import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { GoogleMapsService } from 'src/app/demo/services/google.maps.service';
import { ListService } from 'src/app/demo/services/list.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { MessageService } from 'primeng/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { ImportsModule } from 'src/app/demo/services/import';

// Importar interfaces y utilidades centralizadas
import {
    IAsignacion,
    IPuntoRecoleccion,
    IExterno,
    IFuncionario,
    IOpcionFiltro,
    IMapConfig,
    CONFIGURACION_DEFECTO,
    MENSAJES,
} from '../../interfaces/recoleccion.interfaces';

import {
    formatearFecha,
    obtenerTiempoRelativo,
    RecoleccionLogger,
    medirRendimiento,
    sanitizarDatos,
} from '../../utils/recoleccion.utils';

/**
 * Información combinada de usuario (externo o funcionario)
 * Interface helper para simplificar el manejo de ambos tipos
 */
interface IInfoUsuario {
    id: string;
    nombre: string;
    apellido?: string;
    nombreCompleto: string;
    dni: string;
    tipo: 'externo' | 'funcionario';
    icono: string;
    colorClase: string;
}

/**
 * Estadísticas de una asignación para mostrar en la interfaz
 */
interface IEstadisticasAsignacion {
    totalPuntos: number;
    puntosRecoleccion: number;
    puntosRetorno: number;
    ultimaActividad: string;
    tiempoRelativo: string;
}

/**
 * Componente Lista de Asignaciones
 *
 * Maneja la visualización de todas las asignaciones de recolección con:
 * - Mapa interactivo con marcadores agrupados
 * - Filtros avanzados por fecha, usuario y dispositivo
 * - Soporte completo para externos y funcionarios
 * - Estadísticas en tiempo real
 * - Navegación a detalles de ruta
 */
@Component({
    standalone: false,
    selector: 'app-lista-asignaciones',
    templateUrl: './lista-asignaciones.component.html',
    styleUrls: ['./lista-asignaciones.component.scss'],
    providers: [MessageService],
})
export class ListaAsignacionesComponent implements OnInit, OnDestroy {
    // Propiedades del mapa con tipado fuerte
    mapCustom!: google.maps.Map;
    private markers: google.maps.marker.AdvancedMarkerElement[] = [];
    private infoWindows: google.maps.InfoWindow[] = [];
    markerCluster?: MarkerClusterer;
    groupedInfoWindow?: google.maps.InfoWindow;

    // Configuración del mapa usando constantes centralizadas
    private readonly mapConfig: IMapConfig = {
        center: CONFIGURACION_DEFECTO.MAPA.CENTER,
        zoom: 12,
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

    // Propiedades de la lista y filtros con tipado fuerte
    load_list: boolean = true;
    arr_asignacion: IAsignacion[] = [];
    asignacionesFiltradas: IAsignacion[] = [];

    // Opciones para filtros con interface específica
    fechasUnicas: IOpcionFiltro[] = [];
    usuariosUnicos: IOpcionFiltro[] = []; // Renombrado de externosUnicos para ser más claro
    devicesUnicos: IOpcionFiltro[] = [];

    // Selecciones actuales de filtros
    selectedFechas: IOpcionFiltro[] = [];
    selectedUsuarios: IOpcionFiltro[] = []; // Renombrado de selectedExternos
    selectedDevices: IOpcionFiltro[] = [];

    // Permisos con tipado específico
    permisos_arr: any[] = [];
    check_create: boolean = false;

    // Token de autenticación
    private readonly token: string;

    // Estadísticas generales
    estadisticasGenerales = {
        totalAsignaciones: 0,
        asignacionesConPuntos: 0,
        totalPuntosRecoleccion: 0,
        usuariosUnicos: 0,
    };

    constructor(
        private googlemaps: GoogleMapsService,
        private list: ListService,
        private auth: AuthService,
        private messageService: MessageService,
        private router: Router
    ) {
        this.token = this.auth.token();

        // Suscripción a permisos con mejor manejo
        this.auth.permissions$.subscribe((permissions) => {
            if (permissions.length > 0) {
                this.permisos_arr = permissions;
                this.loadPermissions();
            }
        });

        RecoleccionLogger.info('ListaAsignacionesComponent inicializado');
    }

    async ngOnInit(): Promise<void> {
        await medirRendimiento(
            'Inicialización lista asignaciones',
            async () => {
                await this.initMap();
                setTimeout(async () => {
                    await this.listar_asignacion();
                }, 500);
            }
        );
    }

    ngOnDestroy(): void {
        RecoleccionLogger.info('Destruyendo componente ListaAsignaciones');
        this.clearMarkers();
    }

    /**
     * Carga y verifica los permisos del usuario
     */
    async loadPermissions(): Promise<void> {
        try {
            this.check_create =
                (await this.boolPermiss('/recolector', 'post')) || false;
            RecoleccionLogger.debug('Permisos cargados', {
                canCreate: this.check_create,
                totalPermisos: this.permisos_arr.length,
            });
        } catch (error) {
            RecoleccionLogger.error('Error cargando permisos', error);
        }
    }

    /**
     * Verifica si el usuario tiene un permiso específico
     */
    async boolPermiss(permission: string, method: string): Promise<boolean> {
        return this.permisos_arr.length > 0
            ? this.permisos_arr.some(
                  (e) => e.name === permission && e.method === method
              )
            : false;
    }

    /**
     * Inicializa el mapa de Google Maps usando configuración centralizada
     */
    async initMap(): Promise<void> {
        this.googlemaps.getLoader().then(async () => {
            this.mapCustom = new google.maps.Map(
                document.getElementById(
                    'map-lista-asignaciones'
                ) as HTMLElement,
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

            RecoleccionLogger.info('Mapa de lista inicializado');
        });
    }

    /**
     * Obtiene la lista completa de asignaciones del servidor con mejor manejo de errores
     */
    async listar_asignacion(): Promise<void> {
        this.load_list = true;

        try {
            const response = await this.list
                .listarAsignacionRecolectores(this.token, {}, false)
                .toPromise();

            if (response.data) {
                // Sanitizar datos de entrada y aplicar tipado fuerte
                this.arr_asignacion = sanitizarDatos(
                    response.data
                ) as IAsignacion[];
                this.asignacionesFiltradas = [...this.arr_asignacion];

                // Calcular estadísticas generales
                this.calcularEstadisticasGenerales();

                // Inicializar opciones de filtro
                await this.inicializarOpcionesFiltro();

                RecoleccionLogger.info('Asignaciones cargadas', {
                    total: this.arr_asignacion.length,
                    conPuntos: this.estadisticasGenerales.asignacionesConPuntos,
                });
            }
        } catch (error) {
            RecoleccionLogger.error('Error al cargar asignaciones', error);
            this.mostrarMensaje(
                'error',
                'Error',
                'No se pudieron cargar las asignaciones'
            );
        } finally {
            this.load_list = false;
            await this.loadMarkers();
        }
    }

    /**
     * Calcula estadísticas generales de las asignaciones
     */
    private calcularEstadisticasGenerales(): void {
        this.estadisticasGenerales = {
            totalAsignaciones: this.arr_asignacion.length,
            asignacionesConPuntos: this.arr_asignacion.filter(
                (a) => a.puntos_recoleccion && a.puntos_recoleccion.length > 0
            ).length,
            totalPuntosRecoleccion: this.arr_asignacion.reduce(
                (total, a) => total + (a.puntos_recoleccion?.length || 0),
                0
            ),
            usuariosUnicos: new Set(
                this.arr_asignacion
                    .map((a) => a.externo?._id || a.funcionario?._id)
                    .filter(Boolean)
            ).size,
        };
    }

    /**
     * Inicializa las opciones disponibles para cada filtro con mejor lógica
     */
    async inicializarOpcionesFiltro(): Promise<void> {
        // Generar opciones únicas para fechas usando utilidades centralizadas
        const fechasMap = new Map<string, string>();
        this.arr_asignacion.forEach((item) => {
            if (item.createdAt) {
                const fecha = formatearFecha(item.createdAt, false);
                fechasMap.set(fecha, fecha);
            }
        });
        this.fechasUnicas = Array.from(fechasMap.entries()).map(
            ([key, value]) => ({
                label: value,
                value: key,
                icon: 'pi pi-calendar',
            })
        );

        // Generar opciones únicas para usuarios (externos Y funcionarios)
        const usuariosMap = new Map<string, IInfoUsuario>();
        this.arr_asignacion.forEach((item) => {
            const infoUsuario = this.obtenerInfoUsuario(item);
            if (infoUsuario) {
                usuariosMap.set(infoUsuario.id, infoUsuario);
            }
        });

        this.usuariosUnicos = Array.from(usuariosMap.values()).map(
            (usuario) => ({
                label: `${usuario.nombreCompleto} (${usuario.dni}) - ${usuario.tipo}`,
                value: usuario.id,
                icon: usuario.icono,
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
                icon: 'pi pi-mobile',
            })
        );

        RecoleccionLogger.debug('Opciones de filtro inicializadas', {
            fechas: this.fechasUnicas.length,
            usuarios: this.usuariosUnicos.length,
            devices: this.devicesUnicos.length,
        });
    }

    /**
     * Extrae información unificada del usuario (externo o funcionario)
     * Este método helper resuelve el problema principal que mencionaste
     */
    obtenerInfoUsuario(asignacion: IAsignacion): IInfoUsuario | null {
        if (asignacion.externo) {
            return {
                id: asignacion.externo._id,
                nombre: asignacion.externo.name,
                nombreCompleto: asignacion.externo.name,
                dni: asignacion.externo.dni,
                tipo: 'externo',
                icono: 'pi pi-user',
                colorClase: 'text-blue-600',
            };
        }

        if (asignacion.funcionario) {
            const nombreCompleto = `${asignacion.funcionario.name} ${
                asignacion.funcionario.last_name || ''
            }`.trim();
            return {
                id: asignacion.funcionario._id,
                nombre: asignacion.funcionario.name,
                apellido: asignacion.funcionario.last_name,
                nombreCompleto,
                dni: asignacion.funcionario.dni,
                tipo: 'funcionario',
                icono: 'pi pi-id-card',
                colorClase: 'text-green-600',
            };
        }

        return null;
    }

    /**
     * Calcula estadísticas específicas de una asignación para mostrar en la tabla
     */
    calcularEstadisticasAsignacion(
        asignacion: IAsignacion
    ): IEstadisticasAsignacion {
        const puntos = asignacion.puntos_recoleccion || [];
        const puntosRetorno = puntos.filter((p) => p.retorno).length;
        const puntosRecoleccion = puntos.length - puntosRetorno;

        // Encontrar la última actividad
        let ultimaActividad = asignacion.createdAt;
        if (puntos.length > 0) {
            const ultimoPunto = puntos.reduce((ultimo, actual) =>
                new Date(actual.timestamp) > new Date(ultimo.timestamp)
                    ? actual
                    : ultimo
            );
            ultimaActividad = ultimoPunto.timestamp;
        }

        return {
            totalPuntos: puntos.length,
            puntosRecoleccion,
            puntosRetorno,
            ultimaActividad,
            tiempoRelativo: obtenerTiempoRelativo(ultimaActividad),
        };
    }

    /**
     * Aplica los filtros seleccionados a la lista de asignaciones con lógica mejorada
     */
    async aplicarFiltros(): Promise<void> {
        let resultados = [...this.arr_asignacion];

        // Filtrar por fechas seleccionadas
        if (this.selectedFechas.length > 0) {
            const fechasValores = this.selectedFechas.map((f) => f.value);
            resultados = resultados.filter((item) => {
                const fechaFormateada = formatearFecha(item.createdAt, false);
                return fechasValores.includes(fechaFormateada);
            });
        }

        // Filtrar por usuarios seleccionados (externos O funcionarios)
        if (this.selectedUsuarios.length > 0) {
            const usuariosIds = this.selectedUsuarios.map((u) => u.value);
            resultados = resultados.filter((item) => {
                const infoUsuario = this.obtenerInfoUsuario(item);
                return infoUsuario && usuariosIds.includes(infoUsuario.id);
            });
        }

        // Filtrar por dispositivos seleccionados
        if (this.selectedDevices.length > 0) {
            const deviceIds = this.selectedDevices.map((d) => d.value);
            resultados = resultados.filter((item) =>
                deviceIds.includes(item.deviceId)
            );
        }

        this.asignacionesFiltradas = resultados;

        RecoleccionLogger.debug('Filtros aplicados', {
            original: this.arr_asignacion.length,
            filtrado: this.asignacionesFiltradas.length,
            filtros: {
                fechas: this.selectedFechas.length,
                usuarios: this.selectedUsuarios.length,
                devices: this.selectedDevices.length,
            },
        });

        await this.loadMarkers();
    }

    /**
     * Limpia todos los filtros aplicados
     */
    limpiarFiltros(): void {
        this.selectedFechas = [];
        this.selectedUsuarios = [];
        this.selectedDevices = [];
        this.asignacionesFiltradas = [...this.arr_asignacion];

        RecoleccionLogger.info('Filtros limpiados');
        this.loadMarkers();
    }

    /**
     * Carga los marcadores en el mapa basados en las asignaciones filtradas con mejor performance
     */
    async loadMarkers(): Promise<void> {
        return await medirRendimiento('Carga de marcadores', async () => {
            setTimeout(async () => {
                if (!this.mapCustom) return;

                this.clearMarkers();

                // Verificar si hay puntos para mostrar
                const asignacionesConPuntos = this.asignacionesFiltradas.filter(
                    (a) =>
                        a.puntos_recoleccion && a.puntos_recoleccion.length > 0
                );

                if (asignacionesConPuntos.length === 0) {
                    RecoleccionLogger.info(
                        'No hay puntos para mostrar en el mapa'
                    );
                    return;
                }

                const bounds = new google.maps.LatLngBounds();

                // Inicializar agrupador de marcadores
                if (!this.markerCluster) {
                    this.markerCluster = new MarkerClusterer({
                        map: this.mapCustom,
                    });
                } else {
                    this.markerCluster.clearMarkers();
                }

                // Agregar marcadores para cada punto de recolección
                let totalMarcadores = 0;
                asignacionesConPuntos.forEach((asignacion) => {
                    const infoUsuario = this.obtenerInfoUsuario(asignacion);

                    asignacion.puntos_recoleccion?.forEach(
                        (punto: IPuntoRecoleccion) => {
                            const marker = this.addMarker(
                                punto,
                                asignacion.deviceId,
                                infoUsuario
                            );
                            const position = { lat: punto.lat, lng: punto.lng };
                            bounds.extend(position);
                            totalMarcadores++;
                        }
                    );
                });

                // Ajustar el mapa a los límites de los marcadores
                if (totalMarcadores > 0) {
                    this.mapCustom.fitBounds(bounds);

                    // Si solo hay un punto, ajustar el zoom
                    if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
                        this.mapCustom.setZoom(15);
                    }
                }

                RecoleccionLogger.info('Marcadores cargados', {
                    total: totalMarcadores,
                    asignaciones: asignacionesConPuntos.length,
                });
            }, 100);
        });
    }

    /**
     * Agrega un marcador al mapa con información mejorada del usuario
     */
    addMarker(
        location: IPuntoRecoleccion,
        deviceName?: string,
        infoUsuario?: IInfoUsuario | null
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

        const title = `${
            location.retorno ? 'Retorno' : 'Punto de recolección'
        } - ${deviceName} - ${
            infoUsuario?.nombreCompleto || 'Usuario no disponible'
        }`;

        const marcador = new google.maps.marker.AdvancedMarkerElement({
            position: { lat: location.lat, lng: location.lng },
            content: iconElement,
            map: this.mapCustom,
            title,
            gmpClickable: true,
        });

        // Agregar listener para mostrar información al hacer clic
        marcador.addListener('click', () => {
            this.showInfoWindow(location, deviceName, infoUsuario, marcador);
        });

        this.markers.push(marcador);

        // Añadir al agrupador si existe
        if (this.markerCluster) {
            this.markerCluster.addMarker(marcador);
        }

        return marcador;
    }

    /**
     * Muestra una ventana de información para un marcador con datos completos del usuario
     */
    showInfoWindow(
        location: IPuntoRecoleccion,
        deviceName?: string,
        infoUsuario?: IInfoUsuario | null,
        marker?: google.maps.marker.AdvancedMarkerElement
    ): void {
        this.closeAllInfoWindows();

        const fechaFormateada = formatearFecha(location.timestamp);
        const tiempoRelativo = obtenerTiempoRelativo(location.timestamp);

        const content = `
            <div style="font-family: Arial, sans-serif; max-width: 280px;">
                <h4 style="margin: 0 0 12px 0; color: #333; display: flex; align-items: center; gap: 8px;">
                    <i class="${
                        location.retorno ? 'pi pi-home' : 'pi pi-map-marker'
                    }" 
                       style="color: ${
                           location.retorno ? '#ff9800' : '#4caf50'
                       };"></i>
                    ${
                        location.retorno
                            ? 'Retorno a Estación'
                            : 'Punto de Recolección'
                    }
                </h4>
                
                <div style="margin: 8px 0; font-size: 13px; color: #666; line-height: 1.4;">
                    <div style="margin: 4px 0; display: flex; align-items: center; gap: 6px;">
                        <i class="pi pi-mobile" style="color: #2196f3; width: 12px;"></i>
                        <strong>Dispositivo:</strong> ${deviceName || 'N/A'}
                    </div>
                    
                    <div style="margin: 4px 0; display: flex; align-items: center; gap: 6px;">
                        <i class="${
                            infoUsuario?.icono || 'pi pi-user'
                        }" style="color: ${
            infoUsuario?.tipo === 'funcionario' ? '#4caf50' : '#2196f3'
        }; width: 12px;"></i>
                        <strong>${
                            infoUsuario?.tipo === 'funcionario'
                                ? 'Funcionario'
                                : 'Externo'
                        }:</strong> 
                        ${infoUsuario?.nombreCompleto || 'No disponible'}
                    </div>
                    
                    ${
                        infoUsuario?.dni
                            ? `
                        <div style="margin: 4px 0; display: flex; align-items: center; gap: 6px;">
                            <i class="pi pi-id-card" style="color: #ff9800; width: 12px;"></i>
                            <strong>DNI:</strong> ${infoUsuario.dni}
                        </div>
                    `
                            : ''
                    }
                    
                    <div style="margin: 4px 0; display: flex; align-items: center; gap: 6px;">
                        <i class="pi pi-calendar" style="color: #9c27b0; width: 12px;"></i>
                        <strong>Fecha:</strong> ${fechaFormateada}
                    </div>
                    
                    <div style="margin: 4px 0; display: flex; align-items: center; gap: 6px;">
                        <i class="pi pi-clock" style="color: #607d8b; width: 12px;"></i>
                        <strong>Hace:</strong> ${tiempoRelativo}
                    </div>
                    
                    <div style="margin: 4px 0; display: flex; align-items: center; gap: 6px;">
                        <i class="pi pi-map" style="color: #795548; width: 12px;"></i>
                        <strong>Coordenadas:</strong> ${location.lat.toFixed(
                            6
                        )}, ${location.lng.toFixed(6)}
                    </div>
                    
                    ${
                        location.accuracy
                            ? `
                        <div style="margin: 4px 0; display: flex; align-items: center; gap: 6px;">
                            <i class="pi pi-target" style="color: #00bcd4; width: 12px;"></i>
                            <strong>Precisión:</strong> ±${location.accuracy.toFixed(
                                0
                            )}m
                        </div>
                    `
                            : ''
                    }
                </div>
                
                <div style="margin-top: 12px; text-align: center;">
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${
                        location.lat
                    },${location.lng}"
                       target="_blank"
                       style="display: inline-block; padding: 8px 16px; background-color: #4285F4; color: white; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 500;">
                        <i class="pi pi-external-link" style="margin-right: 4px;"></i>
                        Cómo llegar
                    </a>
                </div>
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
     * Cierra todas las ventanas de información abiertas
     */
    closeAllInfoWindows(): void {
        if (this.infoWindows && this.infoWindows.length) {
            this.infoWindows.forEach((infoWindow: google.maps.InfoWindow) =>
                infoWindow.close()
            );
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

        if (this.markerCluster) {
            this.markerCluster.clearMarkers();
        }
    }

    /**
     * Navega al detalle de una ruta específica
     */
    verDetalleRuta(asignacionId: string): void {
        this.router.navigate(['/recolectores/detalle-ruta', asignacionId]);
        RecoleccionLogger.info('Navegando a detalle de ruta', { asignacionId });
    }

    /**
     * Refresca la lista de asignaciones
     */
    refreshList(): void {
        RecoleccionLogger.info('Refrescando lista de asignaciones');
        this.listar_asignacion();
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

    // Getters para usar en el template

    /**
     * Expone la función formatearFecha para usar en el template
     */
    formatearFecha = formatearFecha;

    /**
     * Expone la función obtenerTiempoRelativo para usar en el template
     */
    obtenerTiempoRelativo = obtenerTiempoRelativo;

    /**
     * Obtiene el texto de resumen de filtros aplicados para mostrar al usuario
     */
    get resumenFiltros(): string {
        const filtros = [];
        if (this.selectedFechas.length > 0)
            filtros.push(`${this.selectedFechas.length} fecha(s)`);
        if (this.selectedUsuarios.length > 0)
            filtros.push(`${this.selectedUsuarios.length} usuario(s)`);
        if (this.selectedDevices.length > 0)
            filtros.push(`${this.selectedDevices.length} dispositivo(s)`);

        return filtros.length > 0
            ? `Filtros activos: ${filtros.join(', ')}`
            : 'Sin filtros activos';
    }

    /**
     * Verifica si hay filtros activos
     */
    get hayFiltrosActivos(): boolean {
        return (
            this.selectedFechas.length > 0 ||
            this.selectedUsuarios.length > 0 ||
            this.selectedDevices.length > 0
        );
    }
}

