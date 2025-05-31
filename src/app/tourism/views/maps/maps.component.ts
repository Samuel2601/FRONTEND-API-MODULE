import {
    ChangeDetectorRef,
    Component,
    HostListener,
    OnInit,
    OnDestroy,
    NgZone,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GoogleMapsService } from 'src/app/demo/services/google.maps.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ImportsModule } from 'src/app/demo/services/import';
import { ItemComponent } from '../item/item.component';
import { LoginComponent } from '../../login/login.component';
import { AuthService } from 'src/app/demo/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { TourismService } from '../../service/tourism.service';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

@Component({
    selector: 'app-maps',
    standalone: true,
    imports: [ImportsModule, ItemComponent],
    templateUrl: './maps.component.html',
    styleUrl: './maps.component.scss',
})
export class MapsComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    private resizeSubject$ = new Subject<void>();

    dockPosition: 'bottom' | 'right' = 'bottom'; // Default mobile
    name: string = '';
    mostVisited: any[] = [];
    actividad: any[] = [];
    mapCustom: google.maps.Map;
    latitude: number;
    longitude: number;
    markers: google.maps.Marker[] = [];
    markerClusterer: any = null; // MarkerClusterer instance
    activeInfoWindow: google.maps.InfoWindow | null = null;
    loginVisible: boolean = false;

    // Geolocation properties
    geoLocationLoading: boolean = false;
    geoLocationError: string = '';
    userMarker: google.maps.Marker | null = null;
    userAccuracyCircle: google.maps.Circle | null = null;

    selectedActivities: Set<string> = new Set();
    allFichas: any[] = []; // All unfiltered fichas

    // Loading states tracker
    private mapInitialized = false;
    private dataLoaded = {
        activities: false,
        fichas: false,
    };

    // Selected ficha info
    displayFichaDialog: boolean = false;
    selectedFichaId: any = {};

    isStreetViewActive: boolean = false;

    constructor(
        private router: Router,
        private googlemaps: GoogleMapsService,
        private helperService: HelperService,
        private tourismService: TourismService,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef,
        private auth: AuthService,
        private ngZone: NgZone
    ) {}

    ngOnInit() {
        this.name = this.route.snapshot.queryParamMap.get('name') || '';
        console.log('Name received:', this.name);

        // Setup window resize debounce
        this.setupResizeListener();

        // Set initial dock position based on screen size
        this.dockPosition = this.isMobil() ? 'bottom' : 'right';

        // Initialize processes in parallel
        this.initMap().then(() => {
            this.mapInitialized = true;
            this.checkAllReady();
        });

        this.loadData();
    }

    ngOnDestroy() {
        // Close any open InfoWindow
        if (this.activeInfoWindow) {
            this.activeInfoWindow.close();
        }

        // Clear clusterer if exists
        if (this.markerClusterer) {
            this.markerClusterer.clearMarkers();
        }

        // Clear all markers
        this.clearMarkers();

        // Complete all observables
        this.destroy$.next();
        this.destroy$.complete();
        this.resizeSubject$.complete();
    }

    /**
     * Setup debounced resize listener to improve performance
     */
    private setupResizeListener() {
        this.resizeSubject$
            .pipe(
                debounceTime(250), // Debounce resize events
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                this.dockPosition = this.isMobil() ? 'bottom' : 'right';

                // Reinitialize marker clusterer if map has already been initialized
                if (this.mapInitialized && this.markers.length > 0) {
                    this.initializeMarkerClusterer();
                }

                this.cdr.detectChanges();
            });
    }

    /**
     * Load all necessary data in parallel
     */
    private loadData() {
        // Load activities
        this.tourismService
            .getActivities()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (activities) => {
                    this.actividad = activities;
                    this.dataLoaded.activities = true;
                    console.log('Activities loaded:', this.actividad.length);
                    this.checkAllReady();
                },
                error: (err) => {
                    console.error('Error loading activities:', err);
                    this.dataLoaded.activities = true;
                    this.checkAllReady();
                },
            });

        // Load all fichas with improved error handling
        this.tourismService
            .getAllFichas()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (fichas) => {
                    // Validate and filter out invalid data
                    this.allFichas = fichas.filter(
                        (ficha) =>
                            ficha &&
                            typeof ficha.lat === 'number' &&
                            typeof ficha.lng === 'number' &&
                            ficha.title_marcador
                    );

                    this.dataLoaded.fichas = true;
                    console.log('Fichas loaded:', this.allFichas.length);
                    this.checkAllReady();
                },
                error: (err) => {
                    console.error('Error loading fichas:', err);
                    this.dataLoaded.fichas = true;
                    this.checkAllReady();
                },
            });
    }

    /**
     * Check if everything is ready to apply filters and display map
     */
    private checkAllReady() {
        if (
            this.mapInitialized &&
            this.dataLoaded.activities &&
            this.dataLoaded.fichas
        ) {
            this.applyNameFilter();
        }
    }

    /**
     * Apply filter based on name received in URL
     */
    applyNameFilter() {
        if (this.name) {
            console.log('Applying filter by name:', this.name);
            const normalizedName = this.name.toLowerCase().trim();

            // First search in activities
            const matchingActivities = this.actividad.filter(
                (a) => a.label.toLowerCase().trim() === normalizedName
            );

            if (matchingActivities.length > 0) {
                console.log('Matching activities found:', matchingActivities);
                this.selectedActivities = new Set(
                    matchingActivities.map((a) => a._id)
                );
                this.filterFichas();
            } else {
                // If not found in activities, search in fichas by `title_marcador`
                const matchingFichas = this.allFichas.filter(
                    (ficha) =>
                        ficha.title_marcador.toLowerCase().trim() ===
                        normalizedName
                );

                if (matchingFichas.length > 0) {
                    console.log(
                        'Matching fichas found by title_marcador:',
                        matchingFichas
                    );
                    this.selectedActivities = new Set(
                        matchingFichas
                            .map((ficha) => ficha.actividadId)
                            .filter(Boolean)
                    );
                    this.mostVisited = matchingFichas; // Only show these fichas
                    this.addMarkers();
                } else {
                    // Try partial matching
                    const partialMatchFichas = this.allFichas.filter((ficha) =>
                        ficha.title_marcador
                            .toLowerCase()
                            .includes(normalizedName)
                    );

                    if (partialMatchFichas.length > 0) {
                        console.log(
                            'Partial matches found:',
                            partialMatchFichas.length
                        );
                        this.mostVisited = partialMatchFichas;
                        this.addMarkers();
                    } else {
                        console.warn(`No matches found for: ${this.name}`);
                        this.selectedActivities = new Set(
                            this.actividad.map((a) => a._id)
                        );
                        this.filterFichas();
                    }
                }
            }
        } else {
            // If no name, select all activities
            this.selectedActivities = new Set(this.actividad.map((a) => a._id));
            this.filterFichas();
        }
    }

    /**
     * Initialize Google Maps with improved performance
     */
    async initMap() {
        try {
            await this.googlemaps.getLoader();

            // Initialize required services
            this.helperService.autocompleteService =
                new google.maps.places.AutocompleteService();
            this.helperService.geocoderService = new google.maps.Geocoder();

            const defaultLocation = {
                lat: 0.9723572373860649,
                lng: -79.65359974255226,
            };

            // Create map with optimized settings
            this.mapCustom = new google.maps.Map(
                document.getElementById('map') as HTMLElement,
                {
                    mapId: '7756f5f6c6f997f1',
                    zoom: 15,
                    center: defaultLocation,
                    mapTypeId: 'terrain',
                    fullscreenControl: true,
                    fullscreenControlOptions: {
                        position: this.isMobil()
                            ? google.maps.ControlPosition.BOTTOM_LEFT
                            : google.maps.ControlPosition.TOP_RIGHT,
                    },
                    mapTypeControl: false,
                    gestureHandling: 'greedy',
                    disableDefaultUI: true,
                    streetViewControl: true,
                    streetViewControlOptions: {
                        position: this.isMobil()
                            ? google.maps.ControlPosition.RIGHT_BOTTOM
                            : google.maps.ControlPosition.LEFT_BOTTOM,
                    },
                    styles: [
                        {
                            featureType: 'poi',
                            elementType: 'labels',
                            stylers: [{ visibility: 'off' }],
                        },
                    ],
                    // Performance optimization
                    //optimized: true,
                    maxZoom: 18,
                    minZoom: 5,
                }
            );

            // Use passive listener for better performance on mobile
            const mapElement = document.getElementById('map') as HTMLElement;
            mapElement.addEventListener('touchstart', () => {}, {
                passive: true,
            });

            // Create custom geolocation button
            this.createGeoLocationButton();

            // Map click handler
            this.mapCustom.addListener(
                'click',
                (event: google.maps.MapMouseEvent) => {
                    // Close active InfoWindow on map click
                    if (this.activeInfoWindow) {
                        this.activeInfoWindow.close();
                    }
                    this.onClickHandlerMap(event);
                }
            );

            // Detectar cuando el usuario entra o sale de StreetView
            this.mapCustom
                .getStreetView()
                .addListener('visible_changed', () => {
                    this.ngZone.run(() => {
                        this.isStreetViewActive = this.mapCustom
                            .getStreetView()
                            .getVisible();
                        console.log(
                            'Street View activo:',
                            this.isStreetViewActive
                        );
                        this.cdr.detectChanges();
                    });
                });
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }

    /**
     * Create a custom geolocation button and add it to the map
     */
    createGeoLocationButton() {
        const geoButton = document.createElement('button');
        geoButton.className = 'custom-geo-button';
        geoButton.innerHTML =
            '<i class="bi bi-crosshair" style="font-size: 24px; line-height: 40px; color:#4caf50;"></i>';
        geoButton.title = 'Mi ubicación';

        // Set button styles
        geoButton.style.backgroundColor = 'white';
        geoButton.style.border = 'none';
        geoButton.style.borderRadius = '50%';
        geoButton.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        geoButton.style.cursor = 'pointer';
        geoButton.style.margin = '10px';
        geoButton.style.padding = '0';
        geoButton.style.width = '42px';
        geoButton.style.height = '42px';
        geoButton.style.textAlign = 'center';
        geoButton.style.lineHeight = '42px';
        geoButton.style.transition = 'all 0.2s ease';

        // Hover effect
        geoButton.addEventListener('mouseover', () => {
            geoButton.style.backgroundColor = '#f9f9f9';
            geoButton.style.boxShadow = '0 3px 8px rgba(0,0,0,0.4)';
            geoButton.style.transform = 'translateY(-1px)';
        });

        // Return to normal state when hover is removed
        geoButton.addEventListener('mouseout', () => {
            geoButton.style.backgroundColor = 'white';
            geoButton.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
            geoButton.style.transform = 'translateY(0)';
        });

        // Click effect
        geoButton.addEventListener('mousedown', () => {
            geoButton.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
            geoButton.style.transform = 'translateY(1px)';
        });

        geoButton.addEventListener('mouseup', () => {
            geoButton.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
            geoButton.style.transform = 'translateY(0)';
        });

        // Add click event for functionality
        geoButton.addEventListener('click', () => {
            this.getUserLocation();
        });

        // Add button to map (top right position)
        const position = this.isMobil()
            ? google.maps.ControlPosition.RIGHT_BOTTOM
            : google.maps.ControlPosition.LEFT_BOTTOM;

        this.mapCustom.controls[position].push(geoButton);
    }

    /**
     * Get user's current location with protection against multiple calls
     */
    getUserLocation() {
        // Prevent multiple simultaneous calls
        if (this.geoLocationLoading) {
            console.log('Location request already in progress');
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

                    // Show location on map
                    this.showUserLocation(pos);
                    this.geoLocationLoading = false;
                },
                (error) => {
                    this.geoLocationLoading = false;
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            this.geoLocationError =
                                'User denied geolocation request.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            this.geoLocationError =
                                'Location information unavailable.';
                            break;
                        case error.TIMEOUT:
                            this.geoLocationError =
                                'Location request timed out.';
                            break;
                        default:
                            this.geoLocationError =
                                'Unknown error getting location.';
                            break;
                    }
                    console.error('Geolocation error:', this.geoLocationError);
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
                'Geolocation not supported in this browser.';
            console.error(this.geoLocationError);
        }
    }

    /**
     * Show user's location on the map
     */
    showUserLocation(position: { lat: number; lng: number }) {
        // Remove previous marker if exists
        if (this.userMarker) {
            this.userMarker.setMap(null);
        }

        // Remove previous circle if exists
        if (this.userAccuracyCircle) {
            this.userAccuracyCircle.setMap(null);
        }

        // Create user marker
        this.userMarker = new google.maps.Marker({
            position: position,
            map: this.mapCustom,
            title: 'Your location',
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
                scale: 8,
            },
            zIndex: 1000, // To be above other markers
            optimized: true, // Better performance
        });

        // Create accuracy circle around marker
        this.userAccuracyCircle = new google.maps.Circle({
            map: this.mapCustom,
            center: position,
            radius: 50, // Radius in meters
            fillColor: '#4285F4',
            fillOpacity: 0.2,
            strokeColor: '#4285F4',
            strokeOpacity: 0.5,
            strokeWeight: 1,
        });

        // Center map on user position with smooth animation
        this.mapCustom.panTo(position);

        // Adjust zoom only if it's very far or very close
        const currentZoom = this.mapCustom.getZoom();
        if (currentZoom < 14 || currentZoom > 18) {
            this.mapCustom.setZoom(16);
        }
    }

    /**
     * Initialize marker clusterer for better performance with many markers
     */
    private initializeMarkerClusterer() {
        // Clear previous clusterer if exists
        if (this.markerClusterer) {
            this.markerClusterer.clearMarkers();
        }

        // Skip if no markers
        if (this.markers.length === 0) return;

        // Need to load MarkerClusterer library
        // Note: This assumes MarkerClusterer is available in your project
        // You may need to add it to your dependencies
        this.markerClusterer = new MarkerClusterer({
            map: this.mapCustom,
            markers: this.markers,
        });
    }

    /**
     * Create and show InfoWindow for a location
     */
    private createInfoWindow(
        place: any,
        marker: google.maps.Marker
    ): google.maps.InfoWindow {
        console.log('Creando infowindow:', place);
        // Close existing InfoWindow first
        if (this.activeInfoWindow) {
            this.activeInfoWindow.close();
        }

        // Create InfoWindow with styled header and content background-color: #f8f9fa;
        const contentString = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <div style="padding: 8px 12px; font-weight: 600; font-size: 16px; color: #333; border-bottom: 1px solid #dee2e6;">
                    ${place.title_marcador || 'Sin título'}
                </div>
                <div style="padding: 12px;">
                    <div style="display: flex; gap: 8px;">
                        <button id="ver-mas-${
                            place._id
                        }" style="background-color: #689F38; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-weight: 600; display: flex; align-items: center;">
                            <span style="margin-right: 4px;">Ver más</span>
                            <span style="font-size: 14px;">»</span>
                        </button>
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${
                            place.lat
                        },${
            place.lng
        }" target="_blank" style="background-color: #f8f9fa; color: #0275d8; text-decoration: none; border: 1px solid #ddd; border-radius: 4px; padding: 6px 12px; font-weight: 500;">
                            Cómo llegar
                        </a>
                    </div>
                </div>
            </div>
        `;

        // Create InfoWindow without using headerContent
        const infoWindow = new google.maps.InfoWindow({
            content: contentString,
            headerDisabled: true,
            maxWidth: 300,
            ariaLabel: place.title_marcador,
        });

        // Set as active InfoWindow
        this.activeInfoWindow = infoWindow;

        // Open InfoWindow
        infoWindow.open({
            anchor: marker,
            map: this.mapCustom,
        });

        // Add event listener for "Ver más" button
        google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
            document
                .getElementById(`ver-mas-${place._id}`)
                ?.addEventListener('click', () => {
                    this.ngZone.run(() => {
                        this.abrirFichaDialog(place);
                        infoWindow.close();
                    });
                });
        });

        return infoWindow;
    }

    /**
     * Open ficha dialog with improvements for mobile devices
     */
    abrirFichaDialog(fichaId: any) {
        // First, ensure we have valid information
        if (!fichaId || !fichaId._id) {
            console.error('Invalid ficha ID:', fichaId);
            return;
        }

        // Save selected ficha
        this.selectedFichaId = fichaId;

        // For mobile devices, ensure scroll is at the top
        if (this.isMobil()) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                const dialogContent =
                    document.querySelector('.p-dialog-content');
                if (dialogContent) {
                    dialogContent.scrollTop = 0;
                }
            }, 50);
        }

        // Show dialog
        this.displayFichaDialog = true;

        // Force change detection
        this.cdr.detectChanges();

        console.log('Opening ficha dialog:', fichaId._id);
    }

    /**
     * Filter fichas based on selected activities
     */
    filterFichas() {
        if (this.selectedActivities.size === 0) {
            this.mostVisited = [...this.allFichas]; // Show all if nothing selected
        } else {
            this.mostVisited = this.allFichas.filter(
                (ficha) =>
                    ficha.actividadId &&
                    this.selectedActivities.has(ficha.actividadId)
            );
        }
        this.addMarkers();
    }

    /**
     * Toggle activity selection
     */
    toggleActivity(activity: any) {
        if (this.selectedActivities.has(activity._id)) {
            this.selectedActivities.delete(activity._id);
        } else {
            this.selectedActivities.add(activity._id);
        }
        this.filterFichas(); // Apply filter without making another request
    }

    /**
     * Add markers to the map with clustering support
     */
    addMarkers() {
        // Clear existing markers and InfoWindows
        this.clearMarkers();
        if (this.activeInfoWindow) {
            this.activeInfoWindow.close();
            this.activeInfoWindow = null;
        }

        // Cache icon objects to improve performance
        const iconCache = new Map<string, google.maps.Icon>();

        // Batch marker creation for better performance
        const markerBatch = this.mostVisited
            .map((place) => {
                // Skip invalid places
                if (!place || !place.lat || !place.lng) return null;

                // Use cached icon or create new one
                let icon: google.maps.Icon;
                if (place.image) {
                    if (iconCache.has(place.image)) {
                        icon = iconCache.get(place.image);
                    } else {
                        icon = {
                            url: place.image,
                            scaledSize: new google.maps.Size(40, 40),
                        };
                        iconCache.set(place.image, icon);
                    }
                }

                // Create marker with optimized properties
                const marker = new google.maps.Marker({
                    position: { lat: place.lat, lng: place.lng },
                    map: this.mapCustom,
                    title: place.title_marcador,
                    icon: icon,
                    //optimized: true, // Better performance
                    visible: true,
                    clickable: true,
                    zIndex: undefined, // Auto-manage z-index
                });

                // Add click listener to show InfoWindow and potentially open dialog
                marker.addListener('click', () => {
                    this.createInfoWindow(place, marker);
                });

                return marker;
            })
            .filter(Boolean) as google.maps.Marker[]; // Remove nulls

        // Store valid markers
        this.markers = markerBatch;

        // Initialize marker clusterer
        this.initializeMarkerClusterer();

        // Handle special case for single marker
        if (this.markers.length === 1) {
            // Center on the single marker with appropriate zoom
            this.mapCustom.setCenter(this.markers[0].getPosition());
            this.mapCustom.setZoom(15);

            // If name filter was applied, show InfoWindow automatically
            if (this.name) {
                const place = this.mostVisited[0];
                this.createInfoWindow(place, this.markers[0]);

                // Auto-open detail dialog after small delay
                setTimeout(() => {
                    this.abrirFichaDialog(place);
                }, 800);
            }
        } else if (this.markers.length > 1) {
            // Fit bounds to show all markers
            this.fitBoundsToMarkers();
        }
    }

    /**
     * Adjust map to show all markers
     */
    fitBoundsToMarkers() {
        if (this.markers.length === 0) return;

        // Create bounds object for all markers
        const bounds = new google.maps.LatLngBounds();
        this.markers.forEach((marker) => {
            if (marker && marker.getPosition()) {
                bounds.extend(marker.getPosition());
            }
        });

        // Apply some padding
        const padding = this.isMobil() ? 50 : 80;

        // Apply bounds with padding and animation
        this.mapCustom.fitBounds(bounds, padding);

        // Set min/max zoom limits
        google.maps.event.addListenerOnce(
            this.mapCustom,
            'bounds_changed',
            () => {
                if (this.mapCustom.getZoom() > 16) {
                    this.mapCustom.setZoom(16);
                }
            }
        );
    }

    /**
     * Remove previous markers from map
     */
    clearMarkers() {
        // First, clear clusterer if exists
        if (this.markerClusterer) {
            this.markerClusterer.clearMarkers();
        }

        // Then remove all markers from map
        this.markers.forEach((marker) => {
            if (marker) {
                // Remove event listeners
                google.maps.event.clearInstanceListeners(marker);
                // Remove from map
                marker.setMap(null);
            }
        });

        // Clear array
        this.markers = [];
    }

    /**
     * Handle clicks on the map
     */
    onClickHandlerMap(event: google.maps.MapMouseEvent) {
        if (event.latLng) {
            this.latitude = event.latLng.lat();
            this.longitude = event.latLng.lng();
            console.log('Selected location:', this.latitude, this.longitude);
        }
    }

    /**
     * Return dialog styles depending on platform
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
     * Return content styles based on platform
     */
    getContentStyle() {
        if (this.isMobil()) {
            return {
                'overflow-y': 'auto',
                'max-height': 'calc(90vh - 56px)',
                padding: '0',
                'overscroll-behavior': 'contain', // Prevent body scroll
            };
        } else {
            return {
                'overflow-y': 'auto',
                'max-height': 'calc(80vh - 64px)',
                padding: '0',
            };
        }
    }

    /**
     * Check if device is mobile with better caching
     */
    private _isMobileCache: boolean | null = null;
    private _lastWindowWidth: number = 0;

    isMobil(): boolean {
        const currentWidth = window.innerWidth;

        // Return cached result if width hasn't changed
        if (
            this._lastWindowWidth === currentWidth &&
            this._isMobileCache !== null
        ) {
            return this._isMobileCache;
        }

        // Calculate and cache result
        this._lastWindowWidth = currentWidth;
        this._isMobileCache = window.innerWidth <= 575;

        return this._isMobileCache;
    }

    /**
     * Go back to main view
     */
    goBack(): void {
        this.router.navigate(['/mapa-turistico']);
    }

    /**
     * Navigate to a route
     */
    goTo(route: string): void {
        console.log(`Navigating to ${route}`);
    }

    /**
     * Handle window resize events with debounce
     */
    @HostListener('window:resize', [])
    onResize(): void {
        this.resizeSubject$.next();
    }

    /**
     * Save map state to restore on return
     * This helps with better user experience when navigating back to the map
     */
    saveMapState() {
        if (this.mapCustom) {
            const state = {
                center: {
                    lat: this.mapCustom.getCenter().lat(),
                    lng: this.mapCustom.getCenter().lng(),
                },
                zoom: this.mapCustom.getZoom(),
                selectedActivities: Array.from(this.selectedActivities),
            };

            // Save to sessionStorage
            try {
                sessionStorage.setItem('mapState', JSON.stringify(state));
            } catch (e) {
                console.error('Error saving map state', e);
            }
        }
    }

    /**
     * Restore map state if available
     */
    restoreMapState() {
        try {
            const stateString = sessionStorage.getItem('mapState');
            if (stateString) {
                const state = JSON.parse(stateString);

                // Apply center and zoom
                if (state.center && state.zoom) {
                    this.mapCustom.setCenter(state.center);
                    this.mapCustom.setZoom(state.zoom);
                }

                // Apply activity filters if name filter not specified
                if (
                    !this.name &&
                    state.selectedActivities &&
                    Array.isArray(state.selectedActivities)
                ) {
                    this.selectedActivities = new Set(state.selectedActivities);
                    this.filterFichas();
                }
            }
        } catch (e) {
            console.error('Error restoring map state', e);
        }
    }

    /**
     * Create styles for InfoWindow
     * This should be added to your component's CSS file
     */
    initializeInfoWindowStyles() {
        // Try to add InfoWindow styles
        try {
            // Create style element if not already exists
            if (!document.getElementById('map-info-window-styles')) {
                const style = document.createElement('style');
                style.id = 'map-info-window-styles';
                style.innerHTML = `
                    .info-window {
                        font-family: 'Roboto', Arial, sans-serif;
                        max-width: 280px;
                    }
                    .info-window-header {
                        padding-bottom: 8px;
                    }
                    .info-window-header h3 {
                        margin: 0;
                        font-size: 16px;
                        color: #1a73e8;
                        font-weight: 500;
                    }
                    .info-window-content {
                        font-size: 13px;
                        line-height: 1.4;
                        color: #5f6368;
                    }
                    .ver-mas-btn {
                        background-color: #1a73e8;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        padding: 6px 12px;
                        font-size: 13px;
                        margin-top: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: background-color 0.2s;
                    }
                    .ver-mas-btn:hover {
                        background-color: #1765cc;
                    }
                `;
                document.head.appendChild(style);
            }
        } catch (e) {
            console.error('Error initializing InfoWindow styles', e);
        }
    }
}
