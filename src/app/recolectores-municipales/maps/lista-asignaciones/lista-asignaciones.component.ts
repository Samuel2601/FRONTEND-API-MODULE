import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GoogleMapsService } from 'src/app/demo/services/google.maps.service';
import { ListService } from 'src/app/demo/services/list.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { MessageService } from 'primeng/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { ImportsModule } from 'src/app/demo/services/import';

// Interfaces para tipado
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
    puntos_recoleccion: any[];
}

interface OpcionSeleccion {
    label: string;
    value: any;
}

@Component({
    selector: 'app-lista-asignaciones',
    templateUrl: './lista-asignaciones.component.html',
    styleUrls: ['./lista-asignaciones.component.scss'],
    providers: [MessageService],
})
export class ListaAsignacionesComponent implements OnInit {
    // Propiedades del mapa
    mapCustom: google.maps.Map;
    private markers: google.maps.marker.AdvancedMarkerElement[] = [];
    private infoWindows: google.maps.InfoWindow[] = [];
    markerCluster: MarkerClusterer;
    groupedInfoWindow: google.maps.InfoWindow;

    // Propiedades de la lista y filtros
    load_list: boolean = true;
    arr_asignacion: Asignacion[] = [];
    asignacionesFiltradas: Asignacion[] = [];

    // Opciones para filtros
    fechasUnicas: OpcionSeleccion[] = [];
    externosUnicos: OpcionSeleccion[] = [];
    devicesUnicos: OpcionSeleccion[] = [];

    // Selecciones actuales de filtros
    selectedFechas: OpcionSeleccion[] = [];
    selectedExternos: OpcionSeleccion[] = [];
    selectedDevices: OpcionSeleccion[] = [];

    // Permisos
    permisos_arr: any[] = [];
    check_create: boolean = false;

    constructor(
        private googlemaps: GoogleMapsService,
        private list: ListService,
        private auth: AuthService,
        private messageService: MessageService,
        private router: Router
    ) {
        // Suscripción a permisos
        this.auth.permissions$.subscribe((permissions) => {
            if (permissions.length > 0) {
                this.permisos_arr = permissions;
            }
            this.loadPermissions();
        });
    }

    async ngOnInit(): Promise<void> {
        await this.initMap();
        setTimeout(async () => {
            await this.listar_asignacion();
        }, 500);
    }

    /**
     * Carga y verifica los permisos del usuario
     */
    async loadPermissions() {
        this.check_create =
            (await this.boolPermiss('/recolector', 'post')) || false;
    }

    /**
     * Verifica si el usuario tiene un permiso específico
     */
    async boolPermiss(permission: any, method: any): Promise<boolean> {
        return this.permisos_arr.length > 0
            ? this.permisos_arr.some(
                  (e) => e.name === permission && e.method === method
              )
            : false;
    }

    /**
     * Obtiene la ubicación actual del usuario para centrar el mapa
     */
    private async getLocation(): Promise<google.maps.LatLngLiteral> {
        // Coordenadas por defecto (Quito, Ecuador)
        return { lat: -0.1807, lng: -78.4678 };
    }

    /**
     * Inicializa el mapa de Google Maps
     */
    async initMap() {
        const defaultLocation = await this.getLocation();

        this.googlemaps.getLoader().then(async () => {
            this.mapCustom = new google.maps.Map(
                document.getElementById(
                    'map-lista-asignaciones'
                ) as HTMLElement,
                {
                    mapId: '7756f5f6c6f997f1',
                    zoom: 12,
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
        });
    }

    /**
     * Obtiene la lista completa de asignaciones del servidor
     */
    async listar_asignacion() {
        this.load_list = true;
        const token = this.auth.token();

        this.list.listarAsignacionRecolectores(token, {}, true).subscribe({
            next: async (response) => {
                if (response.data) {
                    this.arr_asignacion = response.data;
                    this.asignacionesFiltradas = [...this.arr_asignacion];
                    await this.inicializarOpcionesFiltro();
                }
                this.load_list = false;
                await this.loadMarkers();
            },
            error: (error) => {
                console.error('Error al cargar asignaciones:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron cargar las asignaciones',
                });
                this.load_list = false;
            },
        });
    }

    /**
     * Inicializa las opciones disponibles para cada filtro
     */
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
    }

    /**
     * Formatea una fecha al formato DD/MM/YYYY
     */
    formatearFecha(date: Date): string {
        try {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    /**
     * Aplica los filtros seleccionados a la lista de asignaciones
     */
    async aplicarFiltros() {
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

        this.asignacionesFiltradas = resultados;
        await this.loadMarkers();
    }

    /**
     * Limpia todos los filtros aplicados
     */
    limpiarFiltros() {
        this.selectedFechas = [];
        this.selectedExternos = [];
        this.selectedDevices = [];
        this.asignacionesFiltradas = [...this.arr_asignacion];
        this.loadMarkers();
    }

    /**
     * Carga los marcadores en el mapa basados en las asignaciones filtradas
     */
    async loadMarkers() {
        setTimeout(async () => {
            if (!this.mapCustom) return;

            this.clearMarkers();

            // Verificar si hay puntos para mostrar
            let hasPuntos = false;
            this.asignacionesFiltradas.forEach((element: any) => {
                if (
                    element.puntos_recoleccion &&
                    element.puntos_recoleccion.length > 0
                ) {
                    hasPuntos = true;
                }
            });

            if (!hasPuntos) {
                console.log('No hay puntos para mostrar en el mapa');
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
                        element.deviceId,
                        element.externo.name
                    );
                    const position = { lat: punto.lat, lng: punto.lng };
                    bounds.extend(position);
                });
            });

            // Ajustar el mapa a los límites de los marcadores
            this.mapCustom.fitBounds(bounds);

            // Si solo hay un punto, ajustar el zoom
            if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
                this.mapCustom.setZoom(15);
            }
        }, 1000);
    }

    /**
     * Agrega un marcador al mapa
     */
    addMarker(
        location: any,
        deviceName?: string,
        externoName?: string
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
            title: `${
                location.retorno ? 'Retorno' : 'Punto de recolección'
            } - ${deviceName} - ${externoName}`,
            gmpClickable: true,
        });

        // Agregar listener para mostrar información al hacer clic
        marcador.addListener('click', () => {
            this.showInfoWindow(location, deviceName, externoName, marcador);
        });

        this.markers.push(marcador);

        // Añadir al agrupador si existe
        if (this.markerCluster) {
            this.markerCluster.addMarker(marcador);
        }

        return marcador;
    }

    /**
     * Muestra una ventana de información para un marcador
     */
    showInfoWindow(
        location: any,
        deviceName?: string,
        externoName?: string,
        marker?: any
    ) {
        this.closeAllInfoWindows();

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
                    <strong>Dispositivo:</strong> ${deviceName || 'N/A'}<br>
                    <strong>Externo:</strong> ${externoName || 'N/A'}<br>
                    <strong>Fecha:</strong> ${this.formatDateFull(
                        new Date(location.timestamp)
                    )}<br>
                    <strong>Coordenadas:</strong> ${location.lat.toFixed(
                        6
                    )}, ${location.lng.toFixed(6)}
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
     * Cierra todas las ventanas de información abiertas
     */
    closeAllInfoWindows() {
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
    clearMarkers() {
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
     * Formatea una fecha al formato completo DD/MM/YYYY HH:mm
     */
    formatDateFull(date: Date): string {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    /**
     * Navega al detalle de una ruta específica
     */
    verDetalleRuta(asignacionId: string) {
        this.router.navigate(['/recolectores/detalle-ruta', asignacionId]);
    }

    /**
     * Refresca la lista de asignaciones
     */
    refreshList() {
        this.listar_asignacion();
    }

    ngOnDestroy(): void {
        this.clearMarkers();
    }
}
