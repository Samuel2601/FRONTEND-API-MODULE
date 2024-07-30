import {
    Component,
    AfterViewInit,
    OnInit,
    HostListener,
    ViewChild,
    ElementRef,
    Output,
    EventEmitter,
    QueryList,
    ViewChildren,
    TemplateRef,
    ApplicationRef,
    Input,
    OnDestroy,
} from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import {
    CommonModule,
    Location,
    LocationStrategy,
    PathLocationStrategy,
    PopStateEvent,
} from '@angular/common';
import * as turf from '@turf/turf';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { Subscription, debounceTime, forkJoin, map, filter } from 'rxjs';
import { Capacitor, Plugins } from '@capacitor/core';
const { Geolocation } = Plugins;
import { App } from '@capacitor/app';
import {
    ConfirmationService,
    MenuItem,
    MessageService,
    PrimeNGConfig,
} from 'primeng/api';
declare global {
    interface JQueryStatic {
        Finger: any;
    }
}
import {
    FormBuilder,
    FormControl,
    FormGroup,
    FormsModule,
    Validators,
} from '@angular/forms';
import { SpeedDial } from 'primeng/speeddial';
import { HelperService } from 'src/app/demo/services/helper.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { Loader } from '@googlemaps/js-api-loader';
import { LayoutService } from 'src/app/layout/service/app.layout.service';
import {
    DialogService,
    DynamicDialogConfig,
    DynamicDialogRef,
} from 'primeng/dynamicdialog';
import { AdminService } from 'src/app/demo/services/admin.service';
import { ListService } from 'src/app/demo/services/list.service';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { CarouselModule } from 'primeng/carousel';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Stepper, StepperModule } from 'primeng/stepper';
import { EditorModule } from 'primeng/editor';
import { ReactiveFormsModule } from '@angular/forms';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { FloatLabelModule } from 'primeng/floatlabel';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import {
    Camera,
    CameraResultType,
    CameraSource,
    Photo,
} from '@capacitor/camera';
import { GalleriaModule } from 'primeng/galleria';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { BadgeModule } from 'primeng/badge';
import { CreateService } from 'src/app/demo/services/create.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { GoogleMapsService } from 'src/app/demo/services/google.maps.service';
interface ExtendedPolygonOptions extends google.maps.PolygonOptions {
    id?: string;
}
@Component({
    selector: 'app-mapa',
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
    ],
    templateUrl: './mapa.component.html',
    styleUrl: './mapa.component.scss',
    providers: [
        MessageService,
        DialogService,
        DynamicDialogConfig,
        DynamicDialogRef,
        ConfirmationService,
    ],
})
export class MapaComponent implements OnInit, OnDestroy{
    @Input() cate: any = '';
    @Input() sub: any = '';
    @ViewChildren(SpeedDial) speedDials: QueryList<SpeedDial> | undefined;
    @ViewChild('formulariomap', { static: true }) formularioMapRef!: ElementRef;

    mapOptions = {
        center: {
            lat: 0,
            lng: 0,
        },
        zoom: 4,
    };
    mapCustom: google.maps.Map;
    markers: google.maps.Marker[] = [];
    //VARIABLES
    showCrosshair: boolean = false;
    url = GLOBAL.url;
    myControl = new FormControl();
    public filter: any = [];
    showOptions: boolean = false;
    latitud: number;
    longitud: number;
    wfsPolylayer: any;
    buscarPolylayer: any;
    capasInteractivas: any[] = [];
    editing: boolean = false;
    googleStreets: any;
    lista_feature: any = ([] = []);
    bton: any;
    opcionb: any;
    color = 'red'; // Cambia 'red' por el color deseado
    iconUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="${this.color}" width="14" height="14">
<path d="M0 0h24v24H0z" fill="none"/>
<path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/>
</svg>`;

    redIcon = L.icon({
        iconUrl: this.iconUrl,
        shadowUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });
    isLongPress = false;
    longPressTimeout: any;
    mostrarCreateDireccion = false;
    mostrarficha = false;
    mostrarincidente = false;
    capaActiva: boolean = false;
    capaActivaWIFI: boolean = true;
    urlgeoserwifi =
        'https://geoapi.esmeraldas.gob.ec/geoserver/catastro/wms?service=WFS&version=1.1.0&request=GetFeature&srsname=EPSG%3A4326&typeName=catastro%3Apuntos-wifi&outputFormat=application%2Fjson';
    urlgeoserruta =
        'https://geoapi.esmeraldas.gob.ec/geoserver/catastro/wms?service=WFS&version=1.1.0&request=GetFeature&srsname=EPSG%3A4326&typeName=catastro%3ARUTA2-CARRO2&outputFormat=application%2Fjson';
    urlgeoserruta2 =
        'https://geoapi.esmeraldas.gob.ec/geoserver/catastro/wms?service=WFS&version=1.1.0&request=GetFeature&srsname=EPSG%3A4326&typeName=catastro%3ACAPAS-RUTAS&outputFormat=application%2Fjson';
    //ACAPAS-RUTAS
    urlgeoser =
        'https://geoapi.esmeraldas.gob.ec/geoserver/catastro/wms?service=WFS&version=1.1.0&request=GetFeature&srsname=EPSG%3A4326&typeName=catastro%3Ageo_barrios&outputFormat=application%2Fjson';
    urlgeolocal =
        'http://192.168.120.35/geoserver/catastro/wms?service=WFS&version=1.1.0&request=GetFeature&srsname=EPSG%3A4326&typeName=catastro%3Ageo_barrios&outputFormat=application%2Fjson';
    token = this.auth.token() || undefined;
    check: any = {};
    sidebarVisible: boolean = false;
    private openInfoWindow: google.maps.InfoWindow | null = null;
    arr_polygon: any[] = [];
    canpopup: boolean = false;
    load_fullscreen: boolean = false;
    items: MenuItem[] = [];
    visible: boolean = false;
    temp_poligon: any;
    //CONSTRUCTOR
    fillColor = getComputedStyle(document.documentElement).getPropertyValue(
        '--primary-color'
    );
    strokeColor = getComputedStyle(document.documentElement).getPropertyValue(
        '--gray-900'
    );
    fillColor2 = getComputedStyle(document.documentElement).getPropertyValue(
        '--blue-500'
    );
    strokeColor2 = getComputedStyle(document.documentElement).getPropertyValue(
        '--blue-900'
    );
    backgroundColor = getComputedStyle(
        document.documentElement
    ).getPropertyValue('--surface-0');

    subscription!: Subscription;

    query: string;
    predictions: google.maps.places.AutocompletePrediction[];

    constructor(
        private modalService: NgbModal,
        private elementRef: ElementRef,
        private helperService: HelperService,
        private router: Router,
        private layoutService: LayoutService,
        private messageService: MessageService,
        private dialogService: DialogService,
        private ref: DynamicDialogRef,
        private admin: AdminService,
        private list: ListService,
        private appRef: ApplicationRef,
        private fb: FormBuilder,
        private confirmationService: ConfirmationService,
        private config: PrimeNGConfig,
        private adminservice: AdminService,
        private createService: CreateService,
        private auth: AuthService,
        private googlemaps:GoogleMapsService
    ) {
        this.incidencia = this.fb.group({
            direccion_geo: [{ value: '' }],
            ciudadano: [{ value: '' }, Validators.required],
            categoria: [{ value: '' }, Validators.required],
            subcategoria: [{ value: '' }, Validators.required],
            descripcion: ['', Validators.required],
            estado:['']
        });
        this.subscription = this.layoutService.configUpdate$
            .pipe(debounceTime(25))
            .subscribe((config) => {
                const documentStyle = getComputedStyle(
                    document.documentElement
                );
                this.fillColor =
                    documentStyle.getPropertyValue('--primary-color');
                this.strokeColor = documentStyle.getPropertyValue('--gray-900');
                this.backgroundColor =
                    documentStyle.getPropertyValue('--surface-0');
                this.actualizarpoligono();
            });
    }
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
                    detail: 'Sin conincidencias',
                });
            });
    }
    imprimir(prediction: any) {
        //console.log(prediction)
        this.helperService
            .getLatLngFromAddress(prediction.description)
            .then((location) => {
                this.latitud = location.lat();
                this.longitud = location.lng();
                this.poligonoposition(false);
                //console.log('Latitude:', location.lat(), 'Longitude:', location.lng());
                //this.addMarker(location,'NUEVO SISTEMA DE BUSQUEDA');
            })
            .catch((error) => {
                console.error('Error getting location:', error);
            });
    }
    ngOnDestroy() {
        if (this.mapCustom) {
            google.maps.event.clearInstanceListeners(this.mapCustom);
            this.mapCustom = null;
          //  console.log("Mapa liberado");
        }
    }
    async ngOnInit() {
        this.helperService.llamarspinner('init index layer');
        const checkObservables = {
            IndexFichaSectorialComponent:
                await this.auth.hasPermissionComponent(
                    '/ficha_sectorial',
                    'get'
                ),
            IndexIncidentesDenunciaComponent:
                await this.auth.hasPermissionComponent(
                    '/incidentes_denuncia',
                    'get'
                ),
            CreateIncidentesDenunciaComponent:
                await this.auth.hasPermissionComponent(
                    '/incidentes_denuncia',
                    'post'
                ),
            CreateFichaSectorialComponent:
                await this.auth.hasPermissionComponent(
                    '/ficha_sectorial',
                    'post'
                ),
            CreateDireccionGeoComponent: await this.auth.hasPermissionComponent(
                '/direccion_geo',
                'post'
            ),
            DashboardComponent: await this.auth.hasPermissionComponent(
                'dashboard',
                'get'
            ),
        };
        forkJoin(checkObservables).subscribe(async (check) => {
            this.check = check;
            try {
                App.addListener('backButton', (data) => {
                    this.sidebarVisible ? (this.sidebarVisible = false) : '';
                    this.mostrarficha ? (this.mostrarficha = false) : '';
                    this.mostrarincidente
                        ? (this.mostrarincidente = false)
                        : '';
                });
                this.listCategoria();
                await this.getWFSgeojson(this.urlgeoser);
            } catch (error) {
                console.error('Error en ngOnInit:', error);
                this.router.navigate(['/notfound']);
            } finally {
                this.helperService.cerrarspinner('init index layer');
            }
        });
    }
    addtemplateBG() {
        setTimeout(() => {
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
            speedDial.style['border-radius'] = '50%';
            speedDial.style.color = '#f90017';
            speedDial.style.background = 'var(--surface-0)';

            speedDial.addEventListener('click', () => {
                this.getLocation();
            });
            // Verificar si el speedDial ya está en el mapa antes de agregarlo
            const customControlDiv = document.createElement('div');
            customControlDiv.appendChild(speedDial);
            // Añadir el speedDial al control solo si no está agregado
            if (!this.isFormularioBG()) {
                this.mapCustom.controls[
                    google.maps.ControlPosition.RIGHT_BOTTOM
                ].push(customControlDiv);
            }
        }, 1000);
    }
    isFormularioBG(): boolean {
        // Verificar si el formulario ya está en el mapa
        const mapControls =
            this.mapCustom.controls[
                google.maps.ControlPosition.RIGHT_BOTTOM
            ].getArray();
        for (let i = 0; i < mapControls.length; i++) {
            const control = mapControls[i] as HTMLElement;
            if (control.contains(this.formularioMapRef.nativeElement)) {
                return true; // El formulario ya está agregado al mapa
            }
        }
        return false; // El formulario no está agregado al mapa
    }

    addtemplateFR() {
        setTimeout(() => {
            let formularioMap = undefined;
            if (this.formularioMapRef) {
                formularioMap = this.formularioMapRef.nativeElement;
            }
            if (this.load_fullscreen) {
                if (!this.isFormularioMapAdded()) {
                    const customControlDiv = document.createElement('div');
                    customControlDiv.appendChild(formularioMap);
                    this.mapCustom.controls[
                        google.maps.ControlPosition.BOTTOM_CENTER
                    ].push(customControlDiv);
                }
            } else {
                // Quitar el div del mapa si está agregado
                if (this.isFormularioMapAdded()) {
                    const formularioMapDiv = formularioMap.parentElement;
                    formularioMapDiv.removeChild(formularioMap);
                }
            }
        }, 1000);
    }
    isFormularioMapAdded(): boolean {
        // Verificar si el formulario ya está en el mapa
        const mapControls =
            this.mapCustom.controls[
                google.maps.ControlPosition.BOTTOM_CENTER
            ].getArray();
        for (let i = 0; i < mapControls.length; i++) {
            const control = mapControls[i] as HTMLElement;
            if (control.contains(this.formularioMapRef.nativeElement)) {
                return true; // El formulario ya está agregado al mapa
            }
        }
        return false; // El formulario no está agregado al mapa
    }
    categorias: any[] = [];
    categoria: string;
    subcategoria: string;
    mostrarfiltro: boolean = true;

    load_truck: boolean = true;
    intervalId: any;
    pushmenu: boolean = false;

    //CONEXION DE FEATURE
    async getWFSgeojson(url: any) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            this.guardarfeature(data);
            if (this.lista_feature.length == 0) {
                //this.reloadmap(data);
            }
            return data;
        } catch (error) {
            console.error('error:', error);
            return null;
        }
    }

    guardarfeature(data: any) {
        if (data.features) {
            var aux = [];
            aux.push(data.features);
            this.lista_feature.push(...aux[0]);
            this.filter = this.lista_feature;
        }
    }
    //INICIALIZADOR DEL MAPA
    initmap() {
        this.googlemaps.getLoader().then(() => {
            this.helperService.autocompleteService =
                new google.maps.places.AutocompleteService();
            this.helperService.geocoderService = new google.maps.Geocoder();

            const haightAshbury = { lat: 0.977035, lng: -79.655415 };
            this.mapCustom = new google.maps.Map(
                document.getElementById('map2') as HTMLElement,
                {
                    zoom: 15,
                    center: haightAshbury,
                    mapTypeId: 'terrain',
                    fullscreenControl: false,
                    mapTypeControlOptions: {
                        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                        position: google.maps.ControlPosition.LEFT_BOTTOM,
                    },
                }
            );
            this.initFullscreenControl();
            this.mapCustom.addListener('click', (event: any) => {
                this.onClickHandlerMap(event);
            });
        });
    }
    truk: any = [];
    //ver recolector / Reportar
    cargarRecolectores() {
        // Crear una copia de los marcadores actuales
        const oldMarkers = this.truk.slice();

        this.admin.obtenerGPS().subscribe(
            (respone) => {
                if (respone) {
                    respone.forEach((feature: any) => {
                        const latlng = new google.maps.LatLng(
                            feature.latitude,
                            feature.longitude
                        );
                        const marker = new google.maps.Marker({
                            position: latlng,
                            map: this.mapCustom,
                            icon: {
                                url: feature.attributes.motion
                                    ? './assets/menu/camionON.png'
                                    : './assets/menu/camionOFF.png',
                                scaledSize: new google.maps.Size(40, 40),
                                anchor: new google.maps.Point(13, 41),
                            },
                        });

                        const infoWindow = new google.maps.InfoWindow({
                            content: `
          <div style="font-family: Arial, sans-serif; font-size: 14px; width:200px">
              <b style="text-align: center">${feature.deviceId}</b>
          </div>`,
                        });

                        marker.addListener('click', () => {
                            this.mapCustom.setCenter(latlng);
                            infoWindow.open(this.mapCustom, marker);
                        });

                        this.truk.push(marker);
                    });

                    // Animación para eliminar los marcadores antiguos
                    /* oldMarkers.forEach((marker: google.maps.Marker) => {
      marker.setAnimation(google.maps.Animation.BOUNCE);
      setTimeout(() => {
        marker.setMap(null);
      }, 1000); // 1000 milisegundos (1 segundo) de retraso antes de quitar el marcador
    });*/
                    let opacity = 1;
                    const fadeOutInterval = setInterval(() => {
                        opacity -= 0.1;
                        oldMarkers.forEach((marker) => {
                            marker.setOpacity(opacity);
                            if (opacity <= 0) {
                                marker.setMap(null);
                                clearInterval(fadeOutInterval);
                            }
                        });
                    }, 100);
                }
            },
            (error) => {
                console.error(error);
            }
        );
    }
    clearMarkers() {
        this.truk.forEach((element) => {
            element.setMap(null);
        });
    }
    initFullscreenControl(): void {
        const elementToSendFullscreen = this.mapCustom.getDiv()
            .firstChild as HTMLElement;
        const fullscreenControl = document.querySelector(
            '.fullscreen-control'
        ) as HTMLElement;
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
                (document as any).msFullscreenElement) == element
        );
    }
    requestFullscreen(element: any) {
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
    exitFullscreen() {
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
    onClickHandlerMap = async (e: any) => {
        if (this.mapCustom) {
            this.opcionb = false;
            this.latitud = e.latLng.lat();
            this.longitud = e.latLng.lng();
            this.myControl.setValue(
                (this.latitud + ';' + this.longitud).toString()
            );

            this.poligonoposition();
        }
    };
    popupStates: boolean[] = [];
    // Adds a marker to the map and push to the array.
    addMarker(
        position: google.maps.LatLng | google.maps.LatLngLiteral,
        tipo: 'Wifi' | 'Poligono' | 'Ubicación' | string,
        message?: string,
        feature?: any
    ) {
        if (feature) this.opcionb = feature;
        this.deleteMarkers('');
        const map = this.mapCustom;
        const marker = new google.maps.Marker({
            position,
            map,
            title: tipo,
        });
        // Cerrar el popup actualmente abierto
        if (this.openInfoWindow) {
            this.openInfoWindow.close();
        }

        // Abrir un nuevo popup con el nombre del barrio
        const infoWindow = new google.maps.InfoWindow({
            ariaLabel: tipo,
            content: message ? message : 'Marcador',
        });
        infoWindow.setPosition(position);
        infoWindow.open(this.mapCustom);

        this.openInfoWindow = infoWindow;
        this.markers.push(marker);
        this.popupStates.push(false);
        // Añade un listener para el evento 'click' en el marcador
        marker.addListener('click', () => {
            //this.mapCustom.setZoom(18);
            infoWindow.open(this.mapCustom, marker);
        });
        this.mapCustom.setZoom(18);
        /*marker.addListener('click', () => {
    const index = this.markers.indexOf(marker);
    if (this.popupStates[index]) {
        this.openInfoWindow.close();
        this.popupStates[index] = false;
    } else {
        const infoWindow = new google.maps.InfoWindow({
            content: 'Contenido del popup'
        });
        infoWindow.open(this.mapCustom, marker);
        this.openInfoWindow = infoWindow;
        this.popupStates[index] = true;
    }
  });*/
    }

    // Sets the map on all markers in the array.
    setMapOnAll(map: google.maps.Map | null) {
        for (let i = 0; i < this.markers.length; i++) {
            this.markers[i].setMap(map);
        }
    }

    // Removes the markers from the map, but keeps them in the array.
    hideMarkers(): void {
        this.setMapOnAll(null);
    }

    // Shows any markers currently in the array.
    showMarkers(): void {
        this.setMapOnAll(this.mapCustom);
    }

    // Deletes all markers in the array by removing references to them.
    deleteMarkers(tipo: any): void {
        this.hideMarkers();
        this.markers = this.markers.filter(
            (marker) => marker.getTitle() !== tipo
        );
    }

    actualizarpoligono() {
        this.arr_polygon.forEach((polygon: google.maps.Polygon) => {
            polygon.setOptions({
                fillColor: this.fillColor,
                strokeColor: this.strokeColor,
            });
            polygon.setMap(null);
            polygon.setMap(this.mapCustom);
        });
    }

    mostrarpoligono() {
        if (this.capaActiva) {
            this.arr_polygon.forEach((polygon: google.maps.Polygon) => {
                polygon.setMap(null);
            });
            this.capaActiva = false;
        } else {
            //console.log(this.arr_polygon);
            this.arr_polygon.forEach((polygon: google.maps.Polygon) => {
                polygon.setMap(this.mapCustom);
            });
            this.capaActiva = true;
            this.centrarMap();
        }
    }
    centrarMap() {
        if (this.mapCustom) {
            const bounds = new google.maps.LatLngBounds();

            // Calcular los límites que abarcan todos los polígonos
            this.arr_polygon.forEach((polygon: google.maps.Polygon) => {
                polygon
                    .getPath()
                    .getArray()
                    .forEach((latLng) => {
                        bounds.extend(latLng);
                    });
            });

            // Ajustar el mapa para que abarque todos los polígonos
            this.mapCustom.fitBounds(bounds);

            // Obtener el centro y el nivel de zoom adecuado para incluir todos los polígonos
            const center = bounds.getCenter();
            const zoom = this.calculateZoomLevel(bounds);
            //console.log(center, zoom);
            // Ajustar el mapa para que abarque todos los polígonos
            this.mapCustom.setCenter({ lat: 0.935233, lng: -79.681929 });
            this.mapCustom.setZoom(zoom);
        }
    }
    // Método auxiliar para calcular el nivel de zoom adecuado
    calculateZoomLevel(bounds: google.maps.LatLngBounds): number {
        const GLOBE_WIDTH = 256; // ancho de un tile en el nivel de zoom 0
        const angle = bounds.toSpan().lng();
        const mapDiv = this.mapCustom.getDiv();
        const width = mapDiv.offsetWidth;
        const zoom = Math.floor(
            Math.log((width * 360) / angle / GLOBE_WIDTH) / Math.LN2
        );
        return zoom;
    }

    borrarpoligonos() {
        this.arr_polygon.forEach((polygon: google.maps.Polygon) => {
            polygon.setMap(null);
        });
        this.arr_polygon = [];
    }

    //IMPLEMENTOS

    reloadmap() {
        this.capaActiva = true;
        this.arr_polygon = [];
        this.lista_feature.forEach((feature: any) => {
            this.poligonoview(false, feature);
        });
        this.centrarMap();
    }

    poligonoview(ver: boolean, featurecall: any, search?: boolean) {
        if (search) {
            this.latitud = undefined;
            this.longitud = undefined;
            this.deleteMarkers('');
        }

        if (typeof featurecall !== 'string') {
            const feature = featurecall;
            if (ver) {
                // this.latitud = null;
                //this.longitud = null;

                if (this.capaActiva) {
                    this.arr_polygon.forEach((polygon: google.maps.Polygon) => {
                        polygon.setMap(null);
                    });
                    this.capaActiva = false;
                }
                //this.myControl.setValue(feature.properties.nombre);
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
                            : this.strokeColor2, // "#FF0000",
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: !ver ? this.fillColor : this.fillColor2, //"#FF0000",
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
                    } else {
                        if (
                            !this.arr_polygon.some(
                                (item) => item.id == polygonId
                            )
                        ) {
                            this.arr_polygon.push(polygon);
                        }
                    }
                    // Agregar evento de clic al polígono para mostrar el popup
                    this.levantarpopup(polygon, feature);
                    // Trasladar el mapa a la posición del polígono si ver es true
                    if (ver) {
                        const bounds = new google.maps.LatLngBounds();
                        paths.forEach((path) => {
                            path.forEach((latlng) => {
                                bounds.extend(latlng);
                            });
                        });
                        // this.mapCustom.panToBounds(bounds);
                        this.mapCustom.fitBounds(bounds); //zoom automatico
                    }
                }
            }
        }
    }
    poligonoposition(nomostrar?: boolean) {
        let buscarbol = false;
        const puntoUsuario = turf.point([this.longitud, this.latitud]);
        for (const feature of this.lista_feature) {
            if (
                feature.geometry &&
                feature.geometry.coordinates &&
                feature.geometry.coordinates[0] &&
                feature.geometry.coordinates[0][0].length > 4
            ) {
                const poligono = turf.polygon(feature.geometry.coordinates[0]);

                if (turf.booleanContains(poligono, puntoUsuario)) {
                    this.opcionb = feature;
                    /*if (this.check.DashboardComponent&&this.isMobil()) {
            this.sidebarVisible = true;
          }*/
                    this.poligonoview(true, feature);
                    buscarbol = true;
                    break;
                }
            }
        }
        if (!buscarbol) {
            this.messageService.add({
                severity: 'info',
                summary: 'Info',
                detail: 'Tu ubicación no se encuentra dentro de uno de los barrios',
            });
        }
        if (!nomostrar) {
            if (
                (!this.mostrarficha &&
                    this.check.CreateIncidentesDenunciaComponent) ||
                !this.token
            ) {
                this.addMarker(
                    { lat: this.latitud, lng: this.longitud },
                    buscarbol ? 'Poligono' : 'Ubicación',
                    buscarbol ? this.opcionb.properties.nombre : undefined
                );
            }
        }
    }
    feature_img: any;
    url_imag: string = '';
    infoWindowActual: google.maps.InfoWindow;
    public features: { [id: string]: any } = {};
    id_feature: any;
    levantarpopup(polygon: any, feature: any) {
        if (this.infoWindowActual && !this.capaActiva) {
            this.infoWindowActual.close();
            this.infoWindowActual = null;
            this.url_imag = null;
        }
        this.features[polygon.id] = null;
        polygon.addListener('click', (event: any) => {
            if (this.features[polygon.id] == feature && !this.capaActiva) {
                this.latitud = event.latLng.lat();
                this.longitud = event.latLng.lng();
                this.addMarker(
                    { lat: this.latitud, lng: this.longitud },
                    'Poligono',
                    feature.properties.nombre,
                    feature
                );
            } else {
                this.openInfoWindow.open(null);
                if (this.infoWindowActual) {
                    this.infoWindowActual.close();
                    this.features[polygon.id] = null;
                    this.infoWindowActual = null;
                }

                if (!this.infoWindowActual) {
                    this.features[polygon.id] = feature;
                    this.id_feature = polygon.id;
                    this.url_imag = `${this.url}obtener_imagen/direccion_geo/${
                        this.features[this.id_feature].id
                    }`;

                    const content = this.createInfoWindowContent(feature);

                    this.infoWindowActual = new google.maps.InfoWindow({
                        content: content,
                        ariaLabel: 'info',
                    });

                    google.maps.event.addListener(
                        this.infoWindowActual,
                        'closeclick',
                        () => {
                            this.infoWindowActual = null;
                        }
                    );

                    this.infoWindowActual.setPosition(event.latLng);
                    this.infoWindowActual.open(this.mapCustom);
                } else {
                    this.infoWindowActual.setPosition(event.latLng);
                    this.infoWindowActual.open(this.mapCustom);
                }
            }
        });
    }
    @ViewChild('infoWindowTemplate', { static: true })
    infoWindowTemplate: TemplateRef<any>;
    createInfoWindowContent(feature: any): HTMLElement {
        const view = this.infoWindowTemplate.createEmbeddedView({ feature });
        const div = document.createElement('div');
        div.appendChild(view.rootNodes[0]);
        this.appRef.attachView(view);
        return div;
    }

    responsiveimage(): string {
        let aux = window.innerWidth - 120;
        return (aux + 'px').toString();
    }
    isMobil() {
        return this.helperService.isMobil();
    }

    async getLocation() {
        if (this.isMobil()) {
            const permission = await Geolocation['requestPermissions']();
            if (permission !== 'granted') {
                const coordinates = await Geolocation['getCurrentPosition']();
            }
        } else {
            this.messageService.add({
                severity: 'info',
                summary: 'Info',
                detail: 'Tu ubicación puede ser no exacta',
            });
        }
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    this.latitud = position.coords.latitude;
                    this.longitud = position.coords.longitude;
                    this.addMarker(
                        { lat: this.latitud, lng: this.longitud },
                        'Ubicación',
                        'Tu ubicación Actual'
                    );
                    this.poligonoposition();
                },
                (error) => {
                    console.error('Error getting location: ' + error.message);
                    this.messageService.add({
                        severity: 'error',
                        summary: '404',
                        detail: error.message || 'Sin conexión',
                    });
                }
            );
        } else {
            console.error('Geolocation is not supported by this browser.');
            this.messageService.add({
                severity: 'error',
                summary: 'ERROR',
                detail: 'Geolocation is not supported by this browser.',
            });
        }
    }
    filterOptions(event?: any) {
        //this.opcionb = undefined;
        this.filter = this.lista_feature.filter((option: any) => {
            if (
                (option.properties.nombre &&
                    option.properties.nombre
                        .toLowerCase()
                        .includes(event.query.toLowerCase())) ||
                (!this.capaActivaWIFI &&
                    option.properties.punto &&
                    option.properties.punto
                        .toLowerCase()
                        .includes(event.query.toLowerCase()))
            ) {
                return option;
            }
        });
        this.showOptions = true;
    }
    hideOptions() {
        setTimeout(() => {
            this.showOptions = false;
        }, 200);
    }

    controlFullScreem() {
        const elementToSendFullscreen = this.mapCustom.getDiv()
            .firstChild as HTMLElement;
        if (this.isFullscreen(elementToSendFullscreen)) {
            this.mapCustom.setOptions({ mapTypeControl: true });
            this.load_fullscreen = false;
            this.exitFullscreen();
        }
    }
    modaldireccion: boolean = false;

    visiblepath: boolean = false;
    rutas: any[] = [];
    pathselect: any[] = [];
    pathson: any[] = [];
    selectpath: any;

    incidencia: FormGroup<any>;

    visible_categoria: boolean = false;
    visible_subcategoria: boolean = false;

    incidente() {
        this.visible_categoria = true;
        this.listCategoria();
    }
    estados_id:string='';
    listEstado() {
        this.list.listarEstadosIncidentes(this.token).subscribe((response) => {
            if (response.data) {
                let arr:any[]=[];
                arr=response.data;
                const pendiente= arr.find(element=>element.nombre=="Pendiente");
                this.estados_id=pendiente._id;
                this.incidencia.get('estado').setValue(this.estados_id);
            }
        });
    }
    listCategoria() {
        this.listEstado();
        this.list.listarCategorias(this.token).subscribe((response) => {
            if (response.data) {
                this.categorias = response.data;
                //console.log(this.categorias);
                if (this.cate) {
                    let aux = this.categorias.find(
                        (element) => element.nombre == this.cate
                    );

                    if (aux) {
                        //console.log(aux);
                        this.navigateToStep(1);
                        this.onCategoriaClick(aux);
                    }
                }
            }
        });
    }
    subcategorias: any[] = [];
    onCategoriaClick(cateogria: any) {
        //console.log(cateogria);
        this.incidencia.get('categoria').setValue(cateogria);
        //this.visible_categoria = false;
        this.visible_subcategoria = true;
        this.list
            .listarSubcategorias(this.token, {'categoria':cateogria._id})
            .subscribe((response) => {
                //console.log(response);
                if (response.data) {
                    this.subcategorias = response.data;
                    if (this.sub) {
                        let aux = this.subcategorias.find(
                            (element) => element.nombre == this.sub
                        );
                        if (aux) {
                           // console.log(aux);

                            this.onSubCategoriaClick(aux);
                        }
                    }
                }
            });
    }
    visible_map: boolean = false;

    onSubCategoriaClick(subcategoria: any): void {
        //console.log(subcategoria);
        this.visible_map = true;
        this.incidencia.get('subcategoria').setValue(subcategoria);
        this.navigateToStep(2);
        this.recargarmapa();
    }
    cateactive(cate: any, tipo: string) {
        if (
            this.incidencia.get(tipo).value &&
            cate === this.incidencia.get(tipo).value.nombre
        ) {
            const documentStyle = getComputedStyle(document.documentElement);
            return documentStyle.getPropertyValue('--primary-color');
        } else {
            return '';
        }
    }

    recargarmapa() {
        setTimeout(() => {
            this.initmap();
            this.addtemplateBG();
            this.addtemplateFR();
            //console.log(this.opcionb, this.latitud, this.longitud);
            if (this.latitud && this.longitud) {
                setTimeout(() => {
                    this.addMarker(
                        { lat: this.latitud, lng: this.longitud },
                        'Ubicación',
                        'Tu ubicación elejida'
                    );
                    this.poligonoposition();
                }, 1000);
            } else {
                this.getLocation();
            }
        }, 500);
    }
    iconPaths: { [key: string]: string } = {};

    getIconPath(categoria: any): string {
        if (!this.iconPaths[categoria.nombre]) {
            const svgPath = `assets/categorias/${categoria.nombre}.svg`;
            const pngPath = `assets/categorias/${categoria.nombre}.png`;

            // Verificar si el archivo SVG existe
            if (this.fileExists(svgPath)) {
                this.iconPaths[categoria.nombre] = svgPath;
            } else {
                this.iconPaths[categoria.nombre] = pngPath;
            }
        }

        return this.iconPaths[categoria.nombre];
    }
    fileExists(url: string): boolean {
        const http = new XMLHttpRequest();
        http.open('HEAD', url, false);
        http.send();
        return http.status !== 404;
    }
    nextDescript(nextCallback) {
        nextCallback.emit();
        this.incidencia.get('direccion_geo').setValue({
            nombre: this.opcionb?.properties?.nombre
                ? this.opcionb.properties.nombre
                : 'Barrio sin nombre',
            latitud: this.latitud,
            longitud: this.longitud,
        });
    }

    @ViewChild('fileUpload') fileUpload: FileUpload;
    enviar() {
        //console.log(this.incidencia.value);
        //console.log(this.selectedFilesnew);
        if (this.files.length > 0) {
            this.confirmationService.confirm({
                message:
                    'Tienes imágenes sin cargar. ¿Deseas cargarlas antes de enviar?',
                header: 'Confirmación',
                icon: 'pi pi-exclamation-triangle',
                accept: () => {
                    // Acción de cargar las imágenes
                    this.cargarImagenes();
                },
                reject: () => {
                    // Acción de enviar sin cargar las imágenes
                    this.procederSinCargar();
                },
            });
        } else {
            this.procederSinCargar();
        }
    }
    messages: any[] = []; // Declaración de mensajes
    cargarImagenes() {
        this.selectedFilesnew = [...this.files, ...this.selectedFilesnew];
        this.files = [];
        setTimeout(() => {
            this.messages.push({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Imágenes cargadas correctamente',
            });
            this.procederSinCargar();
        }, 1000);
    }

    procederSinCargar() {
        this.helperService.llamarspinner('sinardap funcion');
        // Lógica para proceder sin cargar las imágenes
        //console.log('Enviado sin cargar imágenes adicionales');
        //console.log(this.incidencia.value);
        //console.log(this.selectedFilesnew);

        ////console.log(this.nuevoIncidenteDenuncia.value);
        this.incidencia
            .get('ciudadano')
            ?.setValue(this.auth.idUserToken(this.token));

        if (this.incidencia.valid) {
            this.createService
                .registrarIncidenteDenuncia(
                    this.token,
                    this.incidencia.value,
                    this.selectedFilesnew
                )
                .subscribe(
                    (response) => {
                        // Manejar la respuesta del servidor
                        //console.log(response);
                        if (response.data) {
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Ingresado',
                                detail: 'Correctamente',
                            });
                            this.helperService.cerrarspinner('sinardap');
                            setTimeout(() => {
                                this.helperService.cerrarMapa();
                            }, 1000);
                        }
                    },
                    (error) => {
                        // Manejar errores
                        console.error(error);
                        if (error.error.message == 'InvalidToken') {
                            this.router.navigate(['/auth/login']);
                        } else {
                            this.messageService.add({
                                severity: 'error',
                                summary: ('(' + error.status + ')').toString(),
                                detail: error.error.message || 'Sin conexión',
                            });
                        }
                        this.helperService.cerrarspinner('sinardap');
                    }
                );
        } else {
            this.messageService.add({
                severity: 'error',
                summary: 'ERROR',
                detail: 'Complete todo el formulario',
            });
            this.helperService.cerrarspinner('sinardap');
        }
    }
    upload: boolean = true;
    imagenesSeleccionadas: any[] = [];
    load_carrusel = false;
    public file: Array<any> = [];
    selectedFiles: File[] = [];
    mostrargale = false;
    onFilesSelected(event: any): void {
        //console.log(event);
        this.load_carrusel = false;
        const files: FileList = event.files;
        //console.log(event.files);
        for (let file of event.files) {
            this.selectedFiles.push(file);
            const objectURL = URL.createObjectURL(file);
            this.imagenesSeleccionadas.push({ itemImageSrc: objectURL });
            if (this.selectedFiles.length == 5) {
                this.upload = false;
            }
        }
        //console.log(this.selectedFiles);
        this.messageService.add({
            severity: 'info',
            summary: 'Excelente',
            detail: this.selectedFiles.length + 'Imagenes subidas',
        });

        this.mostrargale = true;
    }
    async tomarFotoYEnviar(event: any) {
        this.load_carrusel = false;
        this.upload = true;
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source: CameraSource.Prompt,
            promptLabelPhoto: 'Seleccionar de la galería',
            promptLabelPicture: 'Tomar foto',
        });
        if (image && image.base64String && this.selectedFiles.length <= 5) {
            const byteCharacters = atob(image.base64String);
            const byteNumbers = new Array(byteCharacters.length);

            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' }); // Puedes ajustar el tipo según el formato de tu imagen
            let im = new File([blob], 'prueba', { type: 'image/jpeg' });
            this.selectedFilesnew.push(im);

            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.imagenesSeleccionadas.push({
                    itemImageSrc: e.target.result,
                });
            };
            setTimeout(() => {
                this.mostrargale = true;
            }, 1000);
            reader.readAsDataURL(im);
            this.load_carrusel = true;

            if (this.selectedFilesnew.length == 5) {
                this.upload = false;
            }
        } else {
            this.messageService.add({
                severity: 'warning',
                summary: 'MAX img',
                detail: 'Solo puede enviar 5 imangenes',
            });
            this.load_carrusel = true;
            //console.error('Error al obtener la cadena base64 de la imagen.');
        }
    }
    displayCustom: boolean | undefined;

    images: any[] | undefined;
    activeIndexG: number = 0;
    imageClick(index: number) {
        this.activeIndexG = index;
        this.displayCustom = true;
    }
    responsiveOptions = [
        {
            breakpoint: '1024px',
            numVisible: 5,
        },
        {
            breakpoint: '768px',
            numVisible: 3,
        },
        {
            breakpoint: '560px',
            numVisible: 1,
        },
    ];

    ///FILE UPLOAD
    files = [];
    totalSize: number = 0;
    totalSizePercent: number = 0;

    choose(event, callback) {
        callback();
    }
    clearFiles(clearCallback: Function) {
        clearCallback();
        this.totalSize = 0;
        this.totalSizePercent = 0;
        this.files = [];
    }
    onRemoveTemplatingFile(
        event,
        file,
        removeFileCallback,
        index,
        upload: boolean
    ) {
        removeFileCallback(event, index);
        if (!upload) {
            const fileIndex = this.files.indexOf(file);
            if (fileIndex > -1) {
                this.files.splice(fileIndex, 1);
                this.totalSize -= parseInt(this.formatSize(file.size));
                this.totalSizePercent = ((this.totalSize / 1024) * 100) / 5;
            }
        } else {
            const fileIndex = this.selectedFilesnew.indexOf(file);
            if (fileIndex > -1) {
                this.selectedFilesnew.splice(fileIndex, 1);
            }
        }
    }

    onClearTemplatingUpload(clear) {
        clear();
        this.totalSize = 0;
        this.totalSizePercent = 0;
    }

    onTemplatedUpload() {
        this.messageService.add({
            severity: 'info',
            summary: 'Exito',
            detail: 'Imagenes Listos para enviar',
            life: 3000,
        });
    }

    onSelectedFiles(event) {
        const selectedFiles = event.currentFiles;
        const totalFiles =
            this.files.length +
            selectedFiles.length +
            this.selectedFilesnew.length;

        if (totalFiles > 5) {
            const excessFiles = totalFiles - 5;
            selectedFiles.splice(-excessFiles, excessFiles);
            this.messageService.add({
                severity: 'warn',
                summary: 'Ya estás al límite',
                detail: 'Solo puede mandar 5 imagenes.',
                life: 3000,
            });
        }

        this.files = [...this.files, ...selectedFiles];

        this.files.forEach((file) => {
            this.totalSize += parseInt(this.formatSize(file.size));
        });

        this.totalSizePercent = ((this.totalSize / 1024) * 100) / 5;
    }
    selectedFilesnew: any[] = [];
    uploadEvent(callback) {
        callback();
        this.selectedFilesnew = [...this.files, ...this.selectedFilesnew];
        this.files = [];
        //console.log(this.selectedFilesnew);
    }

    formatSize(bytes) {
        const k = 1024;
        const dm = 3;
        const sizes = this.config.translation.fileSizeTypes;
        if (bytes === 0) {
            return `0 ${sizes[0]}`;
        }

        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const formattedSize = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
        return `${formattedSize} ${sizes[i]}`;
    }
    @ViewChild('stepper') stepper: Stepper;
    activeIndex: number = 0;
    navigateToStep(index: number) {
        this.activeIndex = index;
        // Si necesitas usar el método `goto`, asegúrate de que `stepper` esté disponible
        if (this.stepper) {
            this.stepper.activeStep = index;
        }
    }
}
