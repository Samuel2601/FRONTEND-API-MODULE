import {
    Component,
    OnInit,
    ViewChild,
    ElementRef,
    TemplateRef,
    ApplicationRef,
    OnDestroy,
    NgZone,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import * as turf from '@turf/turf';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { Subscription, debounceTime, takeUntil, Subject } from 'rxjs';
import { Plugins } from '@capacitor/core';
const { Geolocation } = Plugins;
import { App } from '@capacitor/app';
import {
    ConfirmationService,
    MenuItem,
    MessageService,
    SelectItem,
} from 'primeng/api';

import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HelperService } from 'src/app/demo/services/helper.service';
import { LayoutService } from 'src/app/layout/service/app.layout.service';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { AdminService } from 'src/app/demo/services/admin.service';
import { GoogleMapsService } from 'src/app/demo/services/google.maps.service';

// Import Angular and PrimeNG modules
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { CarouselModule } from 'primeng/carousel';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { StepperModule } from 'primeng/stepper';
import { EditorModule } from 'primeng/editor';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { FloatLabelModule } from 'primeng/floatlabel';
import { FileUploadModule } from 'primeng/fileupload';
import { GalleriaModule } from 'primeng/galleria';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { BadgeModule } from 'primeng/badge';
import { CalendarModule } from 'primeng/calendar';
import { RutasService } from 'src/app/demo/services/rutas';
import { ImportsModule } from 'src/app/demo/services/import';

interface ExtendedPolygonOptions extends google.maps.PolygonOptions {
    id?: string;
}

@Component({
    selector: 'app-mapa-trash',
    standalone: true,
    imports: [
        NgbModule,
        FormsModule,
        CommonModule,
        CardModule,
        ButtonModule,
        TooltipModule,
        CarouselModule,
        TagModule,
        DialogModule,
        TableModule,
        AutoCompleteModule,
        StepperModule,
        EditorModule,
        ReactiveFormsModule,
        InputTextareaModule,
        FloatLabelModule,
        FileUploadModule,
        GalleriaModule,
        ConfirmDialogModule,
        ToastModule,
        BadgeModule,
        CalendarModule,
        ImportsModule,
    ],
    templateUrl: './mapa-trash.component.html',
    styleUrl: './mapa-trash.component.scss',
    providers: [
        MessageService,
        DialogService,
        DynamicDialogRef,
        ConfirmationService,
    ],
})
export class MapaTrashComponent implements OnInit, OnDestroy {
    @ViewChild('formulariomap', { static: true }) formularioMapRef!: ElementRef;
    @ViewChild('infoWindowTemplate', { static: true })
    infoWindowTemplate!: TemplateRef<any>;

    // Map configuration
    mapCustom!: google.maps.Map;
    markers: google.maps.Marker[] = [];

    // Core variables
    url = GLOBAL.url;
    myControl = new FormControl();
    filter: any[] = [];
    latitud!: number;
    longitud!: number;
    lista_feature: any[] = [];

    // UI state variables
    showOptions = false;
    sidebarVisible = false;
    canpopup = false;
    load_fullscreen = false;
    visible = false;
    mostrarfiltro = true;
    visiblepath = false;
    pushmenu = false;

    // Map state variables
    editing = false;
    capaActiva = false;
    capaActivaWIFI = true;

    // Marker and polygon configuration
    color = 'red';
    iconUrl = this.createIconUrl();
    arr_polygon: google.maps.Polygon[] = [];
    temp_poligon?: google.maps.Polygon;

    // Service endpoints
    urlgeoserwifi =
        'https://geoapi.esmeraldas.gob.ec/geoserver/catastro/wms?service=WFS&version=1.1.0&request=GetFeature&srsname=EPSG%3A4326&typeName=catastro%3Apuntos-wifi&outputFormat=application%2Fjson';
    urlgeoserruta =
        'https://geoapi.esmeraldas.gob.ec/geoserver/catastro/wms?service=WFS&version=1.1.0&request=GetFeature&srsname=EPSG%3A4326&typeName=catastro%3ARUTA2-CARRO2&outputFormat=application%2Fjson';
    urlgeoserruta2 =
        'https://geoapi.esmeraldas.gob.ec/geoserver/catastro/wms?service=WFS&version=1.1.0&request=GetFeature&srsname=EPSG%3A4326&typeName=catastro%3ACAPAS-RUTAS&outputFormat=application%2Fjson';
    urlgeoser =
        'https://geoapi.esmeraldas.gob.ec/geoserver/catastro/wms?service=WFS&version=1.1.0&request=GetFeature&srsname=EPSG%3A4326&typeName=catastro%3Ageo_barrios&outputFormat=application%2Fjson';

    // Style variables
    fillColor = '';
    strokeColor = '';
    fillColor2 = '';
    strokeColor2 = '';
    backgroundColor = '';

    // Data storage
    check: any = {};
    opcionb: any;
    categorias: any[] = [];
    categoria!: string;
    subcategoria!: string;
    rutas: any[] = [];
    pathselect: any[] = [];
    pathson: any[] = [];
    selectpath: any;
    inforecolector: any[] = [];
    markersrecolectores: Map<string, any> = new Map();
    popupStates: boolean[] = [];
    features: { [id: string]: any } = {};

    // Search and info variables
    query!: string;
    predictions: google.maps.places.AutocompletePrediction[] = [];
    private openInfoWindow: google.maps.InfoWindow | null = null;
    infoWindowActual!: google.maps.InfoWindow;
    feature_img: any;
    url_imag = '';
    id_feature: any;

    // Async control
    private destroy$ = new Subject<void>();
    private subscription!: Subscription;
    private intervalId: any;

    constructor(
        private helperService: HelperService,
        private router: Router,
        private layoutService: LayoutService,
        private messageService: MessageService,
        private admin: AdminService,
        private appRef: ApplicationRef,
        private googlemaps: GoogleMapsService,
        private ngZone: NgZone,
        private rutasService: RutasService
    ) {}

    ngOnInit(): void {
        this.setupLayoutSubscription();
        this.initMapAndData();
        this.setupBackButtonListener();
    }

    private setupLayoutSubscription(): void {
        this.subscription = this.layoutService.configUpdate$
            .pipe(debounceTime(25), takeUntil(this.destroy$))
            .subscribe(() => {
                this.updateThemeColors();
                this.actualizarpoligono();
            });
    }

    private updateThemeColors(): void {
        const documentStyle = getComputedStyle(document.documentElement);
        this.fillColor = documentStyle.getPropertyValue('--primary-color');
        this.strokeColor = documentStyle.getPropertyValue('--gray-900');
        this.backgroundColor = documentStyle.getPropertyValue('--surface-0');
        this.fillColor2 = documentStyle.getPropertyValue('--blue-500');
        this.strokeColor2 = documentStyle.getPropertyValue('--blue-900');
    }

    private setupBackButtonListener(): void {
        App.addListener('backButton', () => {
            this.ngZone.run(() => {
                if (this.sidebarVisible) {
                    this.sidebarVisible = false;
                    return;
                }
                if (this.mostrarficha) {
                    this.mostrarficha = false;
                    return;
                }
                if (this.mostrarincidente) {
                    this.mostrarincidente = false;
                    return;
                }
            });
        });
    }

    // Error tracking properties
    private errorCount = 0;
    private maxRetries = 3;
    private isServiceAvailable = true;
    // Datos principales
    content: any;
    routes: any[] = [];
    filteredRoutes: any[] = [];
    ordinances: any[] = [];
    generalInfo: any[] = [];

    // Búsqueda
    searchQuery: string = '';
    searchResults: any[] = [];

    // Filtros
    selectedZone: string = '';
    selectedDay: string = '';
    selectedServiceType: string = '';

    // Opciones para los selectButtons
    zoneOptions: SelectItem[] = [];
    dayOptions: SelectItem[] = [
        { label: 'Todos', value: '' },
        { label: 'Lun', value: 'Monday' },
        { label: 'Mar', value: 'Tuesday' },
        { label: 'Mié', value: 'Wednesday' },
        { label: 'Jue', value: 'Thursday' },
        { label: 'Vie', value: 'Friday' },
        { label: 'Sáb', value: 'Saturday' },
    ];
    serviceTypeOptions: SelectItem[] = [
        { label: 'Todos', value: '' },
        { label: 'Diurno', value: 'Day' },
        { label: 'Nocturno', value: 'Night' },
    ];
    viewMode: string = 'list';

    private async initMapAndData(): Promise<void> {
        try {
            this.helperService.llamarspinner('init mapa basurero');

            // Load theme colors initially
            this.updateThemeColors();

            // Load geojson data
            await this.getWFSgeojson(this.urlgeoser);

            // Initialize map
            this.recargarmapa();

            // Reset error counts on successful initialization
            this.errorCount = 0;
            this.isServiceAvailable = true;

            // Load truck/collector data initially
            await this.cargarRecolectores();

            this.content = await this.rutasService.content().toPromise();
            console.log(this.content);
            if (this.content) {
                this.routes = this.content.routes || [];
                this.ordinances = this.content.ordinances || [];
                this.generalInfo = this.content.generalInfo || [];
                this.filteredRoutes = [...this.routes];
                this.setupFilters();
            }
            // Set up interval for refreshing truck positions with error handling
            this.intervalId = setInterval(() => {
                // Only continue making API calls if we haven't exceeded retry limit
                if (this.isServiceAvailable) {
                    this.cargarRecolectores();
                }
            }, 10000); // 10 seconds interval to reduce server load

            // Load routes
            await this.loadRoutes();
        } catch (error) {
            console.error('Error initializing map and data:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo inicializar el mapa correctamente',
            });
        } finally {
            setTimeout(() => {
                this.helperService.cerrarspinner('init mapa basurero');
            }, 1500);
        }
    }

    setupFilters() {
        // Configurar opciones de zona basadas en los datos
        const uniqueZones = [
            ...new Set(this.routes.map((route) => route.zone)),
        ];
        this.zoneOptions = [
            { label: 'Todas', value: '' },
            ...uniqueZones.map((zone) => ({
                label: this.getZoneLabel(zone),
                value: zone,
            })),
        ];
    }

    // Método para buscar sectores
    searchSectors(event: any) {
        const query = event.query.toLowerCase();

        // Recopilar todos los sectores de todas las rutas
        let sectors: any[] = [];
        this.routes.forEach((route) => {
            route.schedules.forEach((schedule: any) => {
                if (
                    schedule.sector &&
                    schedule.sector.toLowerCase().includes(query)
                ) {
                    sectors.push({
                        name: schedule.sector,
                        routeId: route._id,
                        routeName: route.name,
                    });
                }
            });
        });

        // Eliminar duplicados basados en el nombre del sector
        this.searchResults = sectors.filter(
            (sector, index, self) =>
                index === self.findIndex((s) => s.name === sector.name)
        );
    }

    // Filtrar por resultado de búsqueda
    filterBySearchResult(result: any) {
        if (result && result.routeId) {
            // Filtrar para mostrar solo la ruta seleccionada
            this.filteredRoutes = this.routes.filter(
                (route) => route._id === result.routeId
            );
        }
    }

    // Aplicar filtros de zona, día y tipo de servicio
    filterRoutes() {
        this.filteredRoutes = this.routes.filter((route) => {
            // Filtro de zona
            const zoneMatch =
                !this.selectedZone || route.zone === this.selectedZone;

            // Filtro de día
            const dayMatch =
                !this.selectedDay || route.days.includes(this.selectedDay);

            // Filtro de tipo de servicio
            const serviceTypeMatch =
                !this.selectedServiceType ||
                route.serviceType === this.selectedServiceType;

            return zoneMatch && dayMatch && serviceTypeMatch;
        });
    }

    // Limpiar todos los filtros
    clearFilters() {
        this.selectedZone = '';
        this.selectedDay = '';
        this.selectedServiceType = '';
        this.searchQuery = '';
        this.filteredRoutes = [...this.routes];
    }

    // Helpers para mostrar información
    getZoneLabel(zone: string): string {
        switch (zone) {
            case 'Center':
                return 'Centro';
            case 'Night':
                return 'Nocturno';
            case 'South':
                return 'Sur';
            case 'RiverBank':
                return 'Ribera';
            default:
                return zone;
        }
    }

    getZoneSeverity(
        zone: string
    ): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
        switch (zone) {
            case 'Center':
                return 'info';
            case 'Night':
                return 'warning';
            case 'South':
                return 'success';
            case 'RiverBank':
                return 'info'; // Cambiado de 'primary' a 'info'
            default:
                return 'secondary';
        }
    }

    getSpanishDay(day: string): string {
        const days: { [key: string]: string } = {
            Monday: 'Lunes',
            Tuesday: 'Martes',
            Wednesday: 'Miércoles',
            Thursday: 'Jueves',
            Friday: 'Viernes',
            Saturday: 'Sábado',
            Sunday: 'Domingo',
        };
        return days[day] || day;
    }
    selectedRoute: any;
    detailsVisible: boolean = false;
    // Mostrar detalles de una ruta
    showRouteDetails(route: any) {
        this.selectedRoute = route;
        this.detailsVisible = true;
    }

    private async loadRoutes(): Promise<void> {
        try {
            const routeData = await this.getWFSgeojson(this.urlgeoserruta2);

            setTimeout(() => {
                if (this.mapCustom && routeData?.features) {
                    this.rutas = routeData.features;
                    // Don't load routes automatically - wait for user to request them
                }
                this.seleccionarTodasRutas();
            }, 1000);
        } catch (error) {
            console.error('Error loading routes:', error);
        }
    }

    // Search methods
    search(event: any): void {
        this.helperService
            .searchStreets(event.query)
            .then((predictions) => {
                this.predictions = predictions;
            })
            .catch((error) => {
                console.error('Error searching streets:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: '404',
                    detail: 'Sin coincidencias',
                });
            });
    }

    imprimir(prediction: any): void {
        if (!prediction || !prediction.description) return;

        this.helperService
            .getLatLngFromAddress(prediction.description)
            .then((location) => {
                this.latitud = location.lat();
                this.longitud = location.lng();
                this.poligonoposition(false);
            })
            .catch((error) => {
                console.error('Error getting location:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo obtener la ubicación',
                });
            });
    }

    // Map initialization
    initmap(): void {
        this.googlemaps
            .getLoader()
            .then(() => {
                this.initializeGoogleServices();
                this.createMap();
            })
            .catch((error) => {
                console.error('Error loading Google Maps:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo cargar Google Maps',
                });
            });
    }

    private initializeGoogleServices(): void {
        this.helperService.autocompleteService =
            new google.maps.places.AutocompleteService();
        this.helperService.geocoderService = new google.maps.Geocoder();
    }

    // Inicializar mapa con controles de ubicación integrados
    private createMap(): void {
        try {
            const defaultCenter = { lat: 0.977035, lng: -79.655415 };

            this.mapCustom = new google.maps.Map(
                document.getElementById('map2') as HTMLElement,
                {
                    zoom: 15,
                    center: defaultCenter,
                    mapTypeId: 'terrain',
                    fullscreenControl: true,
                    mapTypeControlOptions: {
                        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                        position: google.maps.ControlPosition.LEFT_BOTTOM,
                    },
                    gestureHandling: 'greedy',
                    // Desactivar POIs para un mapa más limpio
                    styles: [
                        {
                            featureType: 'poi',
                            elementType: 'labels',
                            stylers: [{ visibility: 'off' }],
                        },
                    ],
                }
            );

            // Agregar control de ubicación nativo de Google Maps
            this.addLocationControl();
            this.addRouteButton();
            // Inicializar control de pantalla completa personalizado
            //this.initFullscreenControl();

            // Utilizar un controlador de clics con debounce para evitar múltiples clics rápidos
            this.mapCustom.addListener('click', (event: any) => {
                this.onClickHandlerMap(event);
            });

            // Obtener la ubicación del usuario solo si el mapa se cargó correctamente
            this.getUserLocation();
        } catch (error) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No pudimos cargar el mapa',
            });
        }
    }

    // Añade este método a tu componente

    private addRouteButton(): void {
        // Crear un elemento div contenedor
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'map-button-container';
        buttonContainer.style.margin = '10px';

        // Crear un botón simple
        const routeButton = document.createElement('button');
        routeButton.className = 'p-button p-button-outlined';
        routeButton.innerHTML = `<i class="${this.buttonrutas.icon}"></i> ${this.buttonrutas.label}`;

        // Estilos básicos para que se parezca a un botón de PrimeNG
        routeButton.style.backgroundColor = 'white';
        routeButton.style.border = '1px solid #ced4da';
        routeButton.style.borderRadius = '4px';
        routeButton.style.padding = '0.5rem 1rem';
        routeButton.style.cursor = 'pointer';
        routeButton.style.display = 'flex';
        routeButton.style.alignItems = 'center';
        routeButton.style.justifyContent = 'center';
        routeButton.style.gap = '0.5rem';
        routeButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';

        // Añadir el evento que ejecuta la función command
        routeButton.addEventListener('click', () => {
            this.buttonrutas.command();
        });

        // Añadir el botón al contenedor
        buttonContainer.appendChild(routeButton);

        // Añadir el contenedor al mapa en la posición deseada
        this.mapCustom.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(
            buttonContainer
        );
    }

    // Agregar control de ubicación nativo de Google Maps
    private addLocationControl(): void {
        const geoButton = document.createElement('button');
        geoButton.className = 'custom-geo-button';
        geoButton.innerHTML =
            '<i class="bi bi-crosshair" style="font-size: 22px; line-height: 42px; color:#4caf50;"></i>';
        geoButton.title = 'Mi ubicación';

        // Establecer estilos para el botón
        geoButton.style.backgroundColor = 'white';
        geoButton.style.border = 'none';
        geoButton.style.borderRadius = '50%'; // Botón completamente redondo
        geoButton.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)'; // Sombra más suave y amplia
        geoButton.style.cursor = 'pointer';
        geoButton.style.margin = '10px';
        geoButton.style.padding = '0';
        geoButton.style.width = '42px';
        geoButton.style.height = '42px';
        geoButton.style.textAlign = 'center';
        geoButton.style.lineHeight = '42px';
        geoButton.style.transition = 'all 0.2s ease'; // Transición suave para efectos

        // Efecto hover
        geoButton.addEventListener('mouseover', () => {
            geoButton.style.backgroundColor = '#f9f9f9';
            geoButton.style.boxShadow = '0 3px 8px rgba(0,0,0,0.4)';
            geoButton.style.transform = 'translateY(-1px)';
        });

        // Volver al estado normal al quitar el hover
        geoButton.addEventListener('mouseout', () => {
            geoButton.style.backgroundColor = 'white';
            geoButton.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
            geoButton.style.transform = 'translateY(0)';
        });

        // Efecto al hacer clic
        geoButton.addEventListener('mousedown', () => {
            geoButton.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
            geoButton.style.transform = 'translateY(1px)';
        });

        geoButton.addEventListener('mouseup', () => {
            geoButton.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
            geoButton.style.transform = 'translateY(0)';
        });

        // Agregar evento click para la funcionalidad
        geoButton.addEventListener('click', () => {
            this.getUserLocation();
        });

        // Agregar el botón al mapa (posición esquina superior derecha)
        this.mapCustom.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(
            geoButton
        );
    }

    geoLocationLoading: boolean = false;
    geoLocationError: string = '';
    userMarker: google.maps.Marker | null = null;
    userAccuracyCircle: google.maps.Circle | null = null; // Agregar referencia al círculo

    /**
     * Obtiene la ubicación actual del usuario con protección contra múltiples llamadas
     */
    getUserLocation() {
        // Evitar múltiples llamadas simultáneas
        if (this.geoLocationLoading) {
            console.log('Ya hay una solicitud de ubicación en progreso');
            return;
        }

        this.geoLocationLoading = true;
        this.geoLocationError = '';

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };

                    // Mostrar la ubicación en el mapa
                    this.showUserLocation(pos);
                    this.geoLocationLoading = false;
                },
                (error) => {
                    this.geoLocationLoading = false;
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            this.geoLocationError =
                                'Usuario rechazó la solicitud de geolocalización.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            this.geoLocationError =
                                'Información de ubicación no disponible.';
                            break;
                        case error.TIMEOUT:
                            this.geoLocationError =
                                'Tiempo de espera agotado para obtener la ubicación.';
                            break;
                        default:
                            this.geoLocationError =
                                'Error desconocido al obtener ubicación.';
                            break;
                    }
                    console.error(
                        'Error de geolocalización:',
                        this.geoLocationError
                    );
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );
        } else {
            this.geoLocationLoading = false;
            this.geoLocationError =
                'Geolocalización no soportada en este navegador.';
            console.error(this.geoLocationError);
        }
    }

    /**
     * Muestra la ubicación del usuario en el mapa
     */
    showUserLocation(position: { lat: number; lng: number }) {
        // Remover marcador anterior si existe
        if (this.userMarker) {
            this.userMarker.setMap(null);
        }

        // Remover círculo anterior si existe
        if (this.userAccuracyCircle) {
            this.userAccuracyCircle.setMap(null);
        }

        // Crear marcador de usuario
        this.userMarker = new google.maps.Marker({
            position: position,
            map: this.mapCustom,
            title: 'Tu ubicación',
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
                scale: 8,
            },
            zIndex: 1000, // Para que esté por encima de otros marcadores
        });

        // Crear círculo de precisión alrededor del marcador
        this.userAccuracyCircle = new google.maps.Circle({
            map: this.mapCustom,
            center: position,
            radius: 50, // Radio en metros
            fillColor: '#4285F4',
            fillOpacity: 0.2,
            strokeColor: '#4285F4',
            strokeOpacity: 0.5,
            strokeWeight: 1,
        });

        // Centrar el mapa en la posición del usuario con una animación suave
        this.mapCustom.panTo(position);

        // Ajustar el zoom solo si está muy alejado o muy cercano
        const currentZoom = this.mapCustom.getZoom();
        if (currentZoom < 14 || currentZoom > 18) {
            this.mapCustom.setZoom(16);
        }
    }

    // Crear el elemento HTML para el control de ubicación
    private createLocationControl(): HTMLDivElement {
        const controlUI = document.createElement('div');
        controlUI.className = 'custom-map-control location-control';
        controlUI.title = 'Obtener mi ubicación';
        controlUI.innerHTML = `
        <button class="control-button">
            <i class="pi pi-map-marker" style="font-size: 1.2rem;"></i>
        </button>
    `;

        // Agregar evento de clic
        controlUI.addEventListener('click', () => {
            this.getLocation();
        });

        return controlUI;
    }

    private createIconUrl(): string {
        return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="${this.color}" width="14" height="14">
            <path d="M0 0h24v24H0z" fill="none"/>
            <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/>
            </svg>`;
    }

    // Map controls and UI
    addtemplateBG(): void {
        setTimeout(() => {
            const customControlDiv = document.createElement('div');
            const speedDial = this.createLocationButton();

            customControlDiv.appendChild(speedDial);

            // Only add the control if it's not already present
            if (!this.isFormularioBG()) {
                this.mapCustom.controls[
                    google.maps.ControlPosition.RIGHT_BOTTOM
                ].push(customControlDiv);
            }
        }, 1000);
    }

    private createLocationButton(): HTMLButtonElement {
        const speedDial = document.createElement('button');
        speedDial.className = 'p-button p-button-icon-only';
        speedDial.innerHTML =
            '<span class="bi bi-crosshair" style="font-size: 24px;"></span>';
        speedDial.title = 'Ubicación';
        speedDial.style.position = 'absolute';
        speedDial.style.bottom = '10px';
        speedDial.style.right = '10px';
        speedDial.style.width = '3rem';
        speedDial.style.height = '3rem';
        speedDial.style.borderRadius = '50%';
        speedDial.style.color = '#f90017';
        speedDial.style.background = 'var(--surface-0)';

        speedDial.addEventListener('click', () => {
            this.getLocation();
        });

        return speedDial;
    }

    isFormularioBG(): boolean {
        const mapControls =
            this.mapCustom.controls[
                google.maps.ControlPosition.RIGHT_BOTTOM
            ].getArray();
        for (let i = 0; i < mapControls.length; i++) {
            const control = mapControls[i] as HTMLElement;
            if (control.querySelector('.bi-crosshair')) {
                return true;
            }
        }
        return false;
    }

    addtemplateFR(): void {
        if (!this.formularioMapRef) return;

        setTimeout(() => {
            const formularioMap = this.formularioMapRef.nativeElement;

            if (this.load_fullscreen) {
                if (!this.isFormularioMapAdded()) {
                    const customControlDiv = document.createElement('div');
                    customControlDiv.appendChild(formularioMap);
                    this.mapCustom.controls[
                        google.maps.ControlPosition.BOTTOM_CENTER
                    ].push(customControlDiv);
                }
            } else if (this.isFormularioMapAdded()) {
                // Remove from map if fullscreen is disabled
                const formularioMapDiv = formularioMap.parentElement;
                formularioMapDiv.removeChild(formularioMap);
            }
        }, 1000);
    }

    isFormularioMapAdded(): boolean {
        const mapControls =
            this.mapCustom.controls[
                google.maps.ControlPosition.BOTTOM_CENTER
            ].getArray();
        for (let i = 0; i < mapControls.length; i++) {
            const control = mapControls[i] as HTMLElement;
            if (control.contains(this.formularioMapRef.nativeElement)) {
                return true;
            }
        }
        return false;
    }

    initFullscreenControl(): void {
        const elementToSendFullscreen = this.mapCustom.getDiv()
            .firstChild as HTMLElement;
        const fullscreenControl = document.querySelector(
            '.fullscreen-control'
        ) as HTMLElement;

        if (!fullscreenControl) return;

        this.mapCustom.controls[google.maps.ControlPosition.RIGHT_TOP].push(
            fullscreenControl
        );

        fullscreenControl.onclick = () => {
            if (this.isFullscreen(elementToSendFullscreen)) {
                this.mapCustom.setOptions({ mapTypeControl: true });
                this.load_fullscreen = false;
                this.exitFullscreen();
            } else {
                this.load_fullscreen = true;
                this.mapCustom.setOptions({ mapTypeControl: false });
                this.requestFullscreen(elementToSendFullscreen);
            }
            this.addtemplateFR();
        };

        document.onfullscreenchange = () => {
            if (this.isFullscreen(elementToSendFullscreen)) {
                fullscreenControl.classList.add('is-fullscreen');
            } else {
                fullscreenControl.classList.remove('is-fullscreen');
            }
        };
    }

    isFullscreen(element: any): boolean {
        return (
            (document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).mozFullScreenElement ||
                (document as any).msFullscreenElement) === element
        );
    }

    requestFullscreen(element: any): void {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullScreen) {
            element.webkitRequestFullScreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullScreen) {
            element.msRequestFullScreen();
        }
    }

    exitFullscreen(): void {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
            (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
            (document as any).msExitFullscreen();
        }
    }

    // Data fetching
    async getWFSgeojson(url: string): Promise<any> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            this.guardarfeature(data);
            return data;
        } catch (error) {
            console.error('Error fetching GeoJSON:', error);
            return null;
        }
    }

    guardarfeature(data: any): void {
        if (data?.features?.length) {
            this.lista_feature.push(...data.features);
            this.filter = this.lista_feature;
        }
    }

    // Map interaction handlers
    onClickHandlerMap = (e: any): void => {
        if (!this.mapCustom) return;

        this.opcionb = false;
        this.latitud = e.latLng.lat();
        this.longitud = e.latLng.lng();
        this.myControl.setValue(`${this.latitud};${this.longitud}`);

        this.poligonoposition();
    };

    // Marker management
    addMarker(
        position: google.maps.LatLng | google.maps.LatLngLiteral,
        tipo: 'Wifi' | 'Poligono' | 'Ubicación' | string,
        message?: string,
        feature?: any
    ): void {
        if (feature) this.opcionb = feature;

        // Clear existing markers
        this.deleteMarkers('');

        // Create new marker
        const marker = new google.maps.Marker({
            position,
            map: this.mapCustom,
            title: tipo,
        });

        // Close any open info windows
        if (this.openInfoWindow) {
            this.openInfoWindow.close();
        }

        // Create and open new info window
        const infoWindow = new google.maps.InfoWindow({
            ariaLabel: tipo,
            headerContent: message || 'Marcador',
            //content: message || 'Marcador',
        });

        infoWindow.setPosition(position);
        infoWindow.open(this.mapCustom);

        this.openInfoWindow = infoWindow;
        this.markers.push(marker);
        this.popupStates.push(false);

        // Add click listener to marker
        marker.addListener('click', () => {
            infoWindow.open(this.mapCustom, marker);
        });

        // Zoom to location
        this.mapCustom.setZoom(18);
        this.mapCustom.panTo(position);
    }

    setMapOnAll(map: google.maps.Map | null): void {
        for (const marker of this.markers) {
            marker.setMap(map);
        }
    }

    hideMarkers(): void {
        this.setMapOnAll(null);
    }

    showMarkers(): void {
        this.setMapOnAll(this.mapCustom);
    }

    deleteMarkers(tipo: string): void {
        this.hideMarkers();
        this.markers = this.markers.filter(
            (marker) => marker.getTitle() !== tipo
        );
    }

    // Polygon management
    actualizarpoligono(): void {
        this.arr_polygon.forEach((polygon: google.maps.Polygon) => {
            polygon.setOptions({
                fillColor: this.fillColor,
                strokeColor: this.strokeColor,
            });
            polygon.setMap(null);
            polygon.setMap(this.mapCustom);
        });
    }

    mostrarpoligono(): void {
        if (this.capaActiva) {
            this.arr_polygon.forEach((polygon: google.maps.Polygon) => {
                polygon.setMap(null);
            });
            this.capaActiva = false;
        } else {
            this.arr_polygon.forEach((polygon: google.maps.Polygon) => {
                polygon.setMap(this.mapCustom);
            });
            this.capaActiva = true;
            this.centrarMap();
        }
    }

    centrarMap(): void {
        if (!this.mapCustom || this.arr_polygon.length === 0) return;

        const bounds = new google.maps.LatLngBounds();

        // Calculate bounds that include all polygons
        this.arr_polygon.forEach((polygon: google.maps.Polygon) => {
            polygon
                .getPath()
                .getArray()
                .forEach((latLng) => {
                    bounds.extend(latLng);
                });
        });

        // Set center to Esmeraldas and appropriate zoom level
        this.mapCustom.setCenter({ lat: 0.935233, lng: -79.681929 });
        this.mapCustom.setZoom(this.calculateZoomLevel(bounds));
    }

    calculateZoomLevel(bounds: google.maps.LatLngBounds): number {
        const GLOBE_WIDTH = 256; // Width of a tile at zoom level 0
        const angle = bounds.toSpan().lng();
        const mapDiv = this.mapCustom.getDiv();
        const width = mapDiv.offsetWidth;

        return Math.floor(
            Math.log((width * 360) / angle / GLOBE_WIDTH) / Math.LN2
        );
    }

    borrarpoligonos(): void {
        this.arr_polygon.forEach((polygon: google.maps.Polygon) => {
            polygon.setMap(null);
        });
        this.arr_polygon = [];
    }

    reloadmap(): void {
        this.capaActiva = true;
        this.arr_polygon = [];

        this.lista_feature.forEach((feature: any) => {
            this.poligonoview(false, feature);
        });

        this.centrarMap();
    }

    poligonoview(ver: boolean, featurecall: any, search?: boolean): void {
        if (search) {
            this.latitud = undefined;
            this.longitud = undefined;
            this.deleteMarkers('');
        }

        if (typeof featurecall !== 'string') {
            const feature = featurecall;

            if (ver) {
                if (this.capaActiva) {
                    this.arr_polygon.forEach((polygon: google.maps.Polygon) => {
                        polygon.setMap(null);
                    });
                    this.capaActiva = false;
                }
                this.opcionb = feature;
            }

            const geometry = feature.geometry;
            const properties = feature.properties;

            if (geometry && properties) {
                const coordinates = geometry.coordinates;

                if (coordinates) {
                    let paths: google.maps.LatLng[][] = [];

                    coordinates.forEach((polygon: any) => {
                        let path: google.maps.LatLng[] = [];
                        polygon.forEach((ring: any) => {
                            ring.forEach((coord: number[]) => {
                                path.push(
                                    new google.maps.LatLng(coord[1], coord[0])
                                );
                            });
                        });
                        paths.push(path);
                    });

                    const polygonId = feature.id;
                    const polygon = new google.maps.Polygon({
                        paths: paths,
                        strokeColor: !ver
                            ? this.strokeColor
                            : this.strokeColor2,
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: !ver ? this.fillColor : this.fillColor2,
                        fillOpacity: 0.35,
                        map: this.mapCustom,
                        id: polygonId,
                    } as ExtendedPolygonOptions);

                    if (ver) {
                        if (this.temp_poligon) {
                            this.temp_poligon.setMap(null);
                        }
                        this.temp_poligon = polygon;
                        this.temp_poligon.setMap(this.mapCustom);
                    } else if (
                        !this.arr_polygon.some(
                            (item) => item.get('id') === polygonId
                        )
                    ) {
                        this.arr_polygon.push(polygon);
                    }

                    // Add click event to polygon
                    this.levantarpopup(polygon, feature);

                    // Zoom to polygon if requested
                    if (ver) {
                        const bounds = new google.maps.LatLngBounds();
                        paths.forEach((path) => {
                            path.forEach((latlng) => {
                                bounds.extend(latlng);
                            });
                        });
                        this.mapCustom.fitBounds(bounds);
                    }
                }
            }
        }
    }
    mostrarficha = false;
    mostrarincidente = false;
    poligonoposition(nomostrar?: boolean): void {
        let foundPolygon = false;

        if (!this.latitud || !this.longitud) return;

        // Create a Turf.js point from user's clicked location
        const puntoUsuario = turf.point([this.longitud, this.latitud]);

        // Check if point is inside any polygon
        for (const feature of this.lista_feature) {
            if (feature.geometry?.coordinates?.[0]?.[0]?.length > 4) {
                try {
                    const poligono = turf.polygon(
                        feature.geometry.coordinates[0]
                    );

                    if (turf.booleanContains(poligono, puntoUsuario)) {
                        this.opcionb = feature;
                        this.poligonoview(true, feature);
                        foundPolygon = true;
                        break;
                    }
                } catch (error) {
                    console.error('Error processing polygon:', error);
                }
            }
        }

        if (!foundPolygon) {
            this.messageService.add({
                severity: 'info',
                summary: 'Info',
                detail: 'Tu ubicación no se encuentra dentro de uno de los barrios',
            });
        }

        // Add marker if not hidden
        this.addMarker(
            { lat: this.latitud, lng: this.longitud },
            foundPolygon ? 'Poligono' : 'Ubicación',
            foundPolygon ? this.opcionb.properties.nombre : undefined
        );
    }

    levantarpopup(polygon: any, feature: any): void {
        if (this.infoWindowActual && !this.capaActiva) {
            this.infoWindowActual.close();
            this.infoWindowActual = null;
            this.url_imag = null;
        }

        this.features[polygon.id] = null;

        polygon.addListener('click', (event: any) => {
            if (this.features[polygon.id] === feature && !this.capaActiva) {
                this.latitud = event.latLng.lat();
                this.longitud = event.latLng.lng();
                this.addMarker(
                    { lat: this.latitud, lng: this.longitud },
                    'Poligono',
                    feature.properties.nombre,
                    feature
                );
            } else {
                // Close any open info window
                if (this.openInfoWindow) {
                    this.openInfoWindow.close();
                }

                // Close existing info window
                if (this.infoWindowActual) {
                    this.infoWindowActual.close();
                    this.features[polygon.id] = null;
                    this.infoWindowActual = null;
                }

                // Create new info window
                this.features[polygon.id] = feature;
                this.id_feature = polygon.id;
                this.url_imag = `${this.url}obtener_imagen/direccion_geo/${
                    this.features[this.id_feature].id
                }`;

                const content = this.createInfoWindowContent(feature);
                this.infoWindowActual = new google.maps.InfoWindow({
                    //content: content,
                    headerContent: content || 'Marcador',
                    ariaLabel: 'info',
                });

                // Add close listener
                google.maps.event.addListener(
                    this.infoWindowActual,
                    'closeclick',
                    () => {
                        this.infoWindowActual = null;
                    }
                );

                // Open the info window
                this.infoWindowActual.setPosition(event.latLng);
                this.infoWindowActual.open(this.mapCustom);
            }
        });
    }
    seleccionarTodasRutas(): void {
        this.rutas.forEach((item) => {
            this.pathselect.push(item);
        });
        this.renderRoutes();
    }
    ocultarTodasRutas(): void {
        this.pathselect = [];
        this.renderRoutes();
    }

    createInfoWindowContent(feature: any): HTMLElement {
        const view = this.infoWindowTemplate.createEmbeddedView({ feature });
        const div = document.createElement('div');
        div.appendChild(view.rootNodes[0]);
        this.appRef.attachView(view);
        return div;
    }

    // Route management
    readonly buttonrutas = {
        icon: 'pi bi-path',
        label: 'Ver Rutas',
        styleClass: 'itemcustom',
        command: () => {
            this.toggleRouteVisibility();
        },
    };

    private async toggleRouteVisibility(): Promise<void> {
        if (this.rutas.length === 0) {
            await this.loadRoutesData();
        } else {
            this.visiblepath = true;
        }
    }

    private async loadRoutesData(): Promise<void> {
        try {
            const routeData = await this.getWFSgeojson(this.urlgeoserruta2);

            if (routeData?.features) {
                this.rutas = routeData.features;
                // Don't automatically show routes - wait for dialog selection
                this.visiblepath = true;
            } else {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron cargar las rutas',
                });
            }
        } catch (error) {
            console.error('Error loading routes:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al cargar las rutas',
            });
        }
    }

    pathpush(item: any): void {
        if (!item) return;

        const index = this.pathselect.findIndex(
            (route) => route.properties.nombre === item.properties.nombre
        );

        if (index === -1) {
            this.pathselect.push(item);
        } else {
            this.pathselect.splice(index, 1);
        }

        this.renderRoutes();
    }

    renderRoutes(): void {
        // Clear existing route lines
        this.clearRouteLines();

        // Define colors for routes
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

        // Create route lines for each selected route
        this.pathselect.forEach((route, index) => {
            this.createRouteLine(route, colors[index % colors.length]);
        });
    }

    private clearRouteLines(): void {
        if (this.pathson.length > 0) {
            this.pathson.forEach((polyline) => {
                polyline.setMap(null);
            });
            this.pathson = [];
        }
    }

    private createRouteLine(route: any, color: string): void {
        // Extract path coordinates
        const path: google.maps.LatLngLiteral[] = [];

        if (route.geometry.coordinates) {
            route.geometry.coordinates.forEach((paths: any) => {
                for (const coord of paths) {
                    path.push({ lat: coord[1], lng: coord[0] });
                }
            });
        }

        // Create polyline
        const polyline = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: 1.0,
            strokeWeight: 5,
        });

        // Add click listener to show route name
        polyline.addListener('click', (event: any) => {
            const infoWindow = new google.maps.InfoWindow({
                //content: route.properties.nombre,
                headerContent: route.properties.nombre,
            });

            infoWindow.setPosition(event.latLng);
            infoWindow.open(this.mapCustom);
        });

        // Add to map and store reference
        polyline.setMap(this.mapCustom);
        this.pathson.push(polyline);
    }

    // Truck/collector management
    async cargarRecolectores(): Promise<void> {
        try {
            // Don't attempt if service is already marked as unavailable
            if (!this.isServiceAvailable) return;

            const response = await this.admin.obtenerGPS().toPromise();

            if (!response || !this.mapCustom) return;

            // Reset error count on successful API call
            this.errorCount = 0;

            const promises = response.map(async (feature: any) => {
                // Find or fetch device info
                let device = this.inforecolector.find(
                    (element) => element.deviceId === feature.deviceId
                );

                if (!device) {
                    try {
                        const deviceInfo = await this.admin
                            .obtenerNameGPS(feature.deviceId)
                            .toPromise();
                        if (deviceInfo && deviceInfo[0]) {
                            device = {
                                deviceId: feature.deviceId,
                                ...deviceInfo[0],
                            };
                            this.inforecolector.push(device);
                        }
                    } catch (error) {
                        console.error('Error fetching device info:', error);
                        return;
                    }
                }

                if (!device) return;

                // Create or update marker
                const position = new google.maps.LatLng(
                    feature.latitude,
                    feature.longitude
                );

                if (this.markersrecolectores.has(feature.deviceId)) {
                    // Update existing marker
                    const marker = this.markersrecolectores.get(
                        feature.deviceId
                    );
                    marker.setPosition(position);
                    marker.setIcon({
                        url: feature.attributes.motion
                            ? './assets/menu/camionON.png'
                            : './assets/menu/camionOFF.png',
                        scaledSize: new google.maps.Size(40, 40),
                        anchor: new google.maps.Point(13, 41),
                    });
                } else {
                    // Create new marker
                    const marker = new google.maps.Marker({
                        position: position,
                        map: this.mapCustom,
                        icon: {
                            url: feature.attributes.motion
                                ? './assets/menu/camionON.png'
                                : './assets/menu/camionOFF.png',
                            scaledSize: new google.maps.Size(40, 40),
                            anchor: new google.maps.Point(13, 41),
                        },
                    });

                    // Add info window
                    const infoWindow = new google.maps.InfoWindow({
                        headerContent: device.name,
                        content: `<div style="font-family: Arial, sans-serif; font-size: 14px; width:200px">
                                <b style="text-align: center">${device.name}</b>
                              </div>`,
                    });

                    marker.addListener('click', () => {
                        this.mapCustom.setCenter(position);
                        infoWindow.open(this.mapCustom, marker);
                    });

                    this.markersrecolectores.set(feature.deviceId, marker);
                }
            });

            await Promise.all(promises);
        } catch (error) {
            console.error('Error loading truck data:', error);

            // Increment error count
            this.errorCount++;

            // Check if we've exceeded the retry limit
            if (this.errorCount >= this.maxRetries) {
                this.isServiceAvailable = false;
                this.ngZone.run(() => {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Servicio no disponible',
                        detail: 'No se pudo conectar con el servicio de rastreo después de varios intentos',
                        life: 5000,
                    });
                });

                // Optionally clear the interval if we've exceeded retries
                if (this.intervalId) {
                    clearInterval(this.intervalId);
                    this.intervalId = null;
                }
            }
        }
    }

    // Method to reset and retry the service in case it was previously unavailable
    resetGPSService(): void {
        // Only attempt to reset if service was previously marked unavailable
        if (!this.isServiceAvailable) {
            this.isServiceAvailable = true;
            this.errorCount = 0;

            // Attempt to load data
            this.cargarRecolectores();

            // Restart interval if it was cleared
            if (!this.intervalId) {
                this.intervalId = setInterval(() => {
                    if (this.isServiceAvailable) {
                        this.cargarRecolectores();
                    }
                }, 10000);
            }

            this.messageService.add({
                severity: 'info',
                summary: 'Reconectando',
                detail: 'Intentando reconectar con el servicio de rastreo',
                life: 3000,
            });
        }
    }

    clearMarkers(): void {
        this.markersrecolectores.forEach((marker) => {
            marker.setMap(null);
        });
        this.markersrecolectores.clear();
    }

    // Utility methods
    responsiveimage(): string {
        const width = window.innerWidth - 120;
        return `${width}px`;
    }

    isMobil(): boolean {
        return this.helperService.isMobil();
    }

    async getLocation(): Promise<void> {
        try {
            if (this.isMobil()) {
                //await this.getMobileLocation();
            } else {
                //await this.getBrowserLocation();
            }
        } catch (error) {
            console.error('Error getting location:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo obtener tu ubicación',
            });
        }
    }

    private async getMobileLocation(): Promise<void> {
        try {
            const permission = await Geolocation['requestPermissions']();

            if (permission.location !== 'denied') {
                const coordinates = await Geolocation['getCurrentPosition']();
                this.updateUserLocation(
                    coordinates.coords.latitude,
                    coordinates.coords.longitude
                );
            } else {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Permiso Denegado',
                    detail: 'No se pudo obtener el permiso de ubicación.',
                });
            }
        } catch (error) {
            throw error;
        }
    }

    private getBrowserLocation(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.messageService.add({
                severity: 'info',
                summary: 'Info',
                detail: 'Tu ubicación puede ser no exacta',
            });

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        this.updateUserLocation(
                            position.coords.latitude,
                            position.coords.longitude
                        );
                        resolve();
                    },
                    (error) => {
                        reject(error);
                    }
                );
            } else {
                reject(
                    new Error('Geolocation is not supported by this browser.')
                );
            }
        });
    }

    private updateUserLocation(lat: number, lng: number): void {
        this.latitud = lat;
        this.longitud = lng;

        this.addMarker({ lat, lng }, 'Ubicación', 'Tu ubicación actual');

        this.poligonoposition();
    }

    recargarmapa(): void {
        setTimeout(() => {
            this.initmap();
            //this.addtemplateBG();
            this.addtemplateFR();

            if (this.latitud && this.longitud) {
                setTimeout(() => {
                    this.addMarker(
                        { lat: this.latitud, lng: this.longitud },
                        'Ubicación',
                        'Tu ubicación elegida'
                    );
                    this.poligonoposition();
                }, 1000);
            } else {
                this.getLocation();
            }
        }, 500);
    }

    ngOnDestroy(): void {
        // Clear map listeners
        if (this.mapCustom) {
            google.maps.event.clearInstanceListeners(this.mapCustom);
            this.mapCustom = null;
        }

        // Clear markers
        this.clearMarkers();
        this.deleteMarkers('');

        // Clear polygons
        this.borrarpoligonos();

        // Clear route lines
        this.clearRouteLines();

        // Clear interval
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        // Complete observables
        this.destroy$.next();
        this.destroy$.complete();

        // Unsubscribe from layout changes
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}
