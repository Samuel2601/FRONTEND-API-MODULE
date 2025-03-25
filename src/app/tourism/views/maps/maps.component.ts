import {
    ChangeDetectorRef,
    Component,
    HostListener,
    OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GoogleMapsService } from 'src/app/demo/services/google.maps.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ImportsModule } from 'src/app/demo/services/import';
import { ListService } from 'src/app/demo/services/list.service';
import { ItemComponent } from '../item/item.component';
import { MenuItem } from 'primeng/api';
import { LoginComponent } from '../../login/login.component';
import { AuthService } from 'src/app/demo/services/auth.service';

@Component({
    selector: 'app-maps',
    standalone: true,
    imports: [ImportsModule, ItemComponent, LoginComponent],
    templateUrl: './maps.component.html',
    styleUrl: './maps.component.scss',
})
export class MapsComponent implements OnInit {
    isMobil(): any {
        return window.innerWidth <= 575; //Capacitor.isNativePlatform(); //
    }
    dockPosition: 'bottom' | 'right' = 'bottom'; // Default móvil
    @HostListener('window:resize', [])
    goTo(route: string) {
        console.log(`Navigating to ${route}`);
    }

    name: string = '';
    mostVisited: any[] = [];
    actividad: any[] = [];
    mapCustom: google.maps.Map;
    latitude: number;
    longitude: number;
    markers: google.maps.Marker[] = [];
    loginVisible: boolean = false;
    // Nuevas propiedades para geolocalización
    geoLocationLoading: boolean = false;
    geoLocationError: string = '';
    userMarker: google.maps.Marker | null = null;

    menuItems: any[] = [
        {
            label: 'Home',
            icon: 'assets/icon/home.png',
            _id: 'home',
            url: '/home',
            active: false,
            command: () => {
                this.router.navigate(['/mapa-turistico']);
            },
        },
        {
            label: 'Actividades',
            icon: 'assets/icon/list.png',
            _id: 'actividades',
            url: '/mapa-turistico/list',
            active: false,
            command: () => {
                this.router.navigate(['/mapa-turistico/list']);
            },
        },
        {
            label: 'Mapa',
            icon: 'assets/icon/location.png',
            _id: 'mapa',
            url: '/mapa-turistico/maps',
            active: true,
            command: () => {
                this.router.navigate(['/mapa-turistico/maps']);
            },
        },
        {
            label: 'Logout',
            icon: !this.auth.token()
                ? 'assets/icon/avatar.png'
                : 'assets/icon/logo.png',
            _id: 'logout',
            active: false,
            command: () => {
                if (!this.auth.token()) {
                    this.loginVisible = true; // Abre el modal de login
                } else {
                    this.router.navigate(['/home']);
                }
            },
        },
    ];

    selectedActivities: Set<string> = new Set();
    allFichas: any[] = []; // Todas las fichas sin filtrar
    actividadesCargadas: boolean = false;
    fichasCargadas: boolean = false;

    constructor(
        private router: Router,
        private googlemaps: GoogleMapsService,
        private helperService: HelperService,
        private listService: ListService,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef,
        private auth: AuthService
    ) {}

    async ngOnInit() {
        this.name = this.route.snapshot.queryParamMap.get('name') || '';
        console.log('Nombre recibido:', this.name);

        await this.initMap();

        // Cargamos las actividades y fichas en paralelo
        const loadPromises = [this.loadActivities(), this.getFichas()];

        await Promise.all(loadPromises);

        // Una vez que tengamos tanto las actividades como las fichas, aplicamos el filtro
        this.applyNameFilter();
    }

    /**
     * Aplica el filtro basado en el nombre recibido en la URL
     */
    applyNameFilter() {
        if (this.name && this.actividadesCargadas && this.fichasCargadas) {
            console.log('Aplicando filtro por nombre:', this.name);

            // Buscar en actividades primero
            const actividadesEncontradas = this.actividad.filter(
                (a) => a.label.toLowerCase() === this.name.toLowerCase()
            );

            if (actividadesEncontradas.length > 0) {
                console.log('Actividades encontradas:', actividadesEncontradas);
                this.selectedActivities = new Set(
                    actividadesEncontradas.map((a) => a._id)
                );
                // Aplicamos el filtro
                this.filterFichas();
            } else {
                console.warn(
                    `No se encontró la actividad con el nombre: ${this.name}`
                );

                // Si no encuentra en actividades, buscar en fichas por `title_marcador`
                const fichasEncontradas = this.allFichas.filter(
                    (ficha) =>
                        ficha.title_marcador.toLowerCase() ===
                        this.name.toLowerCase()
                );

                if (fichasEncontradas.length > 0) {
                    console.log(
                        'Fichas encontradas por title_marcador:',
                        fichasEncontradas
                    );
                    this.selectedActivities = new Set(
                        fichasEncontradas
                            .map((ficha) => ficha.actividadId)
                            .filter(Boolean)
                    );
                    this.mostVisited = fichasEncontradas; // Solo mostrar esas fichas
                } else {
                    console.warn(
                        `No se encontró ninguna ficha con title_marcador: ${this.name}`
                    );
                    this.selectedActivities.clear();
                    this.selectedActivities = new Set(
                        this.actividad.map((a) => a._id)
                    );
                    this.filterFichas();
                }
            }
        } else if (!this.name) {
            // Si no hay nombre, seleccionamos todas las actividades
            this.selectedActivities = new Set(this.actividad.map((a) => a._id));
            // Aplicamos el filtro
            this.filterFichas();
        }
        this.addMarkers();
    }

    goBack() {
        this.router.navigate(['/mapa-turistico']);
    }

    /**
     * Carga todas las actividades
     */
    async loadActivities() {
        return new Promise<void>((resolve) => {
            this.listService
                .listarTiposActividadesProyecto(null, { is_tourism: true })
                .subscribe((response: any) => {
                    if (response.data) {
                        this.actividad = response.data.map((item: any) => ({
                            label: item.nombre,
                            icon: item.icono,
                            _id: item._id,
                        }));
                        //console.log('Actividades disponibles:', this.actividad);
                        this.actividadesCargadas = true;
                        this.applyNameFilter();
                    }
                    resolve();
                });
        });
    }

    /**
     * Obtiene todas las fichas sin filtrar al inicio
     */
    async getFichas() {
        return new Promise<void>((resolve) => {
            this.listService
                .listarFichaSectorial(null, {
                    //'actividad.is_tourism': true,
                    view: true,
                })
                .subscribe((response: any) => {
                    if (response.data) {
                        this.allFichas = response.data
                            .map((item: any) => {
                                if (item.actividad.is_tourism) {
                                    return {
                                        title_marcador: item.title_marcador,
                                        image: item.icono_marcador,
                                        _id: item._id,
                                        foto: item.foto,
                                        direccion: item.direccion_geo.nombre,
                                        me_gusta: item.me_gusta || [],
                                        comentarios: item.comentarios || [],
                                        lat: item.direccion_geo.latitud,
                                        lng: item.direccion_geo.longitud,
                                        actividadId:
                                            item.actividad?._id || null, // ID de la actividad
                                        actividadNombre:
                                            item.actividad?.nombre || null, // Nombre de la actividad
                                    };
                                } else {
                                    return null; // Para evitar `undefined` en el array
                                }
                            })
                            .filter(Boolean); // Elimina valores `null` o `undefined`
                        //console.log('Fichas cargadas:', this.allFichas);
                        this.fichasCargadas = true;
                        this.applyNameFilter();
                    }
                    resolve();
                });
        });
    }

    /**
     * Maneja la selección de actividades como checkboxes
     */
    toggleActivity(activity: any) {
        if (this.selectedActivities.has(activity._id)) {
            this.selectedActivities.delete(activity._id);
        } else {
            this.selectedActivities.add(activity._id);
        }
        this.filterFichas(); // Aplica filtro sin volver a hacer la petición
    }

    /**
     * Filtra las fichas basándose en las actividades seleccionadas
     */
    filterFichas() {
        if (this.selectedActivities.size === 0) {
            this.mostVisited = [...this.allFichas]; // Mostrar todas si nada está seleccionado
        } else {
            this.mostVisited = this.allFichas.filter(
                (ficha) =>
                    ficha.actividadId &&
                    this.selectedActivities.has(ficha.actividadId)
            );
        }
        //console.log('Fichas filtradas:', this.mostVisited);
        this.addMarkers();
    }

    /**
     * Inicializa el mapa de Google Maps
     */
    async initMap() {
        await this.googlemaps.getLoader();
        this.helperService.autocompleteService =
            new google.maps.places.AutocompleteService();
        this.helperService.geocoderService = new google.maps.Geocoder();

        const defaultLocation = {
            lat: 0.9723572373860649,
            lng: -79.65359974255226,
        };

        this.mapCustom = new google.maps.Map(
            document.getElementById('map') as HTMLElement,
            {
                zoom: 15,
                center: defaultLocation,
                mapTypeId: 'terrain',
                fullscreenControl: false,
                mapTypeControl: false,
                gestureHandling: 'greedy',
                disableDefaultUI: true, // Deshabilita TODOS los controles de UI por defecto
                streetViewControl: true,
                // Posicionar el control de Street View en la parte superior derecha
                streetViewControlOptions: {
                    position: this.isMobil()
                        ? google.maps.ControlPosition.RIGHT_CENTER
                        : google.maps.ControlPosition.TOP_RIGHT,
                },
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }],
                    },
                ],
            }
        );

        this.mapCustom.addListener(
            'click',
            (event: google.maps.MapMouseEvent) => {
                this.onClickHandlerMap(event);
            }
        );

        // Crear botón de geolocalización personalizado
        this.createGeoLocationButton();
    }

    /**
     * Crea un botón de geolocalización personalizado y lo añade al mapa
     */
    createGeoLocationButton() {
        const geoButton = document.createElement('button');
        geoButton.className = 'custom-geo-button';
        geoButton.innerHTML =
            '<i class="pi pi-map-marker" style="font-size: 24px; line-height: 40px; color:#4caf50;"></i>';
        geoButton.title = 'Mi ubicación';

        // Establecer estilos para el botón
        geoButton.style.backgroundColor = 'white';
        geoButton.style.border = 'none';
        geoButton.style.borderRadius = '2px';
        geoButton.style.boxShadow = '0 1px 4px rgba(0,0,0,0.5)';
        geoButton.style.cursor = 'pointer';
        geoButton.style.margin = '10px';
        geoButton.style.padding = '0';
        geoButton.style.width = '40px';
        geoButton.style.height = '40px';
        geoButton.style.textAlign = 'center';
        geoButton.style.lineHeight = '40px';

        // Agregar evento click
        geoButton.addEventListener('click', () => {
            this.getUserLocation();
        });

        // Agregar el botón al mapa (posición esquina superior derecha)
        this.mapCustom.controls[google.maps.ControlPosition.RIGHT_CENTER].push(
            geoButton
        );
    }

    /**
     * Obtiene la ubicación actual del usuario
     */
    getUserLocation() {
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
        const circle = new google.maps.Circle({
            map: this.mapCustom,
            center: position,
            radius: 50, // Radio en metros
            fillColor: '#4285F4',
            fillOpacity: 0.2,
            strokeColor: '#4285F4',
            strokeOpacity: 0.5,
            strokeWeight: 1,
        });

        // Centrar el mapa en la posición del usuario
        this.mapCustom.setCenter(position);
        this.mapCustom.setZoom(16);
    }

    displayFichaDialog: boolean = false;
    selectedFichaId: any = {};

    /**
     * Abre el diálogo de ficha con mejoras para móviles
     */
    abrirFichaDialog(fichaId: any) {
        // Primero, asegurarse de que tenemos información válida
        if (!fichaId || !fichaId._id) {
            console.error('ID de ficha inválido:', fichaId);
            return;
        }

        // Guardar la ficha seleccionada
        this.selectedFichaId = fichaId;

        // En móviles, asegúrate de que el scroll esté en la parte superior
        if (this.isMobil()) {
            // Pequeño retraso para asegurar que el DOM esté listo
            setTimeout(() => {
                const dialogContent =
                    document.querySelector('.p-dialog-content');
                if (dialogContent) {
                    dialogContent.scrollTop = 0;
                }
            }, 50);
        }

        // Mostrar el diálogo
        this.displayFichaDialog = true;

        // Forzar la detección de cambios
        this.cdr.detectChanges();

        console.log('Abriendo dialog de ficha:', fichaId._id);
    }

    addMarkers() {
        this.clearMarkers();

        this.mostVisited.forEach((place) => {
            const marker = new google.maps.Marker({
                position: { lat: place.lat, lng: place.lng },
                map: this.mapCustom,
                title: place.title_marcador,
                icon: {
                    url: place.image,
                    scaledSize: new google.maps.Size(40, 40),
                },
            });

            marker.addListener('click', () => {
                this.abrirFichaDialog(place);
            });

            this.markers.push(marker);
        });
        setTimeout(() => {
            if (this.mostVisited.length == 1) {
                this.abrirFichaDialog(this.mostVisited[0]);
            }
        }, 1000);

        if (this.markers.length > 0) {
            this.fitBoundsToMarkers();
        }
    }

    /**
     * Ajusta el mapa para mostrar todos los marcadores
     */
    fitBoundsToMarkers() {
        if (this.markers.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        this.markers.forEach((marker) => {
            bounds.extend(marker.getPosition());
        });

        this.mapCustom.fitBounds(bounds);

        // Si solo hay un marcador, ajusta el zoom
        if (this.markers.length === 1) {
            this.mapCustom.setZoom(15);
        }
    }

    /**
     * Elimina los marcadores previos del mapa
     */
    clearMarkers() {
        this.markers.forEach((marker) => marker.setMap(null));
        this.markers = [];
    }

    /**
     * Maneja clics en el mapa
     */
    onClickHandlerMap(event: google.maps.MapMouseEvent) {
        if (event.latLng) {
            this.latitude = event.latLng.lat();
            this.longitude = event.latLng.lng();
            console.log(
                'Ubicación seleccionada:',
                this.latitude,
                this.longitude
            );
        }
    }

    /**
     * Devuelve los estilos del diálogo dependiendo de la plataforma
     */
    getDialogStyle() {
        if (this.isMobil()) {
            return {
                width: '100vw',
                maxHeight: '90vh',
                margin: 0,
                borderRadius: '16px 16px 0 0',
                position: 'fixed',
                bottom: 0,
            };
        } else {
            return {
                width: '75vw',
                maxWidth: '1000px',
                maxHeight: '80vh',
                borderRadius: '12px',
            };
        }
    }

    /**
     * Devuelve los estilos de contenido según la plataforma
     */
    getContentStyle() {
        if (this.isMobil()) {
            return {
                'overflow-y': 'auto',
                'max-height': 'calc(90vh - 56px)',
                padding: '0',
                'overscroll-behavior': 'contain', // Previene scroll del body
            };
        } else {
            return {
                'overflow-y': 'auto',
                'max-height': 'calc(80vh - 64px)',
                padding: '0',
            };
        }
    }
}
