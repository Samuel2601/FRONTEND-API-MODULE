﻿import {
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
} from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import {
    Location,
    LocationStrategy,
    PathLocationStrategy,
    PopStateEvent,
} from '@angular/common';
import * as turf from '@turf/turf';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { Subscription, debounceTime, forkJoin, map } from 'rxjs';
import {
    Geolocation,
    PermissionStatus,
    Position,
} from '@capacitor/geolocation';

import { App } from '@capacitor/app';
import { MenuItem, MenuItemCommandEvent, MessageService } from 'primeng/api';
declare global {
    interface JQueryStatic {
        Finger: any;
    }
}
import { FormControl, FormGroup } from '@angular/forms';
import { Tooltip, TooltipModule } from 'primeng/tooltip';
import { SpeedDial } from 'primeng/speeddial';
import { HelperService } from 'src/app/demo/services/helper.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { Loader } from '@googlemaps/js-api-loader';
import { LayoutService } from 'src/app/layout/service/app.layout.service';
import { DashboardModule } from '../../dashboard/dashboard.module';
import { CreateFichaSectorialComponent } from '../ficha-sectorial/create-ficha-sectorial/create-ficha-sectorial.component';
import { CreateIncidentesDenunciaComponent } from '../incidentes-denuncia/create-incidentes-denuncia/create-incidentes-denuncia.component';
import { DashboardComponent } from '../../dashboard/dashboard.component';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CreateDireccionGeoComponent } from '../direccion-geo/create-direccion-geo/create-direccion-geo.component';
import { AdminService } from 'src/app/demo/services/admin.service';
import { ListService } from 'src/app/demo/services/list.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { GoogleMapsService } from 'src/app/demo/services/google.maps.service';

interface ExtendedPolygonOptions extends google.maps.PolygonOptions {
    id?: string;
}
@Component({
    standalone: false,
    selector: 'app-layers',
    templateUrl: './layers.component.html',
    styleUrl: './layers.component.scss',
    providers: [MessageService],
})
export class LayersComponent implements OnInit {
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
        private auth: AuthService,
        private googlemaps: GoogleMapsService
    ) {
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
        if (this.ref) {
            this.ref.close();
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

                this.updateItem();
                this.helperService.setMapComponent(this);
                this.initmap();
                await this.getWFSgeojson(this.urlgeoser);
                this.getLocation();
            } catch (error) {
                console.error('Error en ngOnInit:', error);
                this.router.navigate(['/notfound']);
            } finally {
                this.helperService.cerrarspinner('init index layer');
            }
        });
    }

    categorias: any[] = [];
    listCategoria() {
        this.list.listarCategorias(this.token).subscribe((response) => {
            if (response.data) {
                this.categorias = response.data;
                // console.log(this.categorias);
            }
        });
    }
    Listitems(label: string, campo: any, icono1: string, icono2: string) {
        const index = this.items.findIndex((item) => item.label === label);
        if (index !== -1) {
            // Actualizar el icono del elemento 'Barrios'
            this.items[index].icon = campo ? icono1 : icono2;
        }
    }

    //CARGA DE TEMPLATE
    /*  {
        icon: 'bi bi-crosshair',
        tooltipOptions: {
          tooltipLabel:'Ubicación',
          tooltipPosition:'right',
         //hideDelay:1000,
        },
        //visible:this.isMobil(),
        command: () => {
          this.getLocation();

        },
      },*/
    categoria: string;
    subcategoria: string;
    mostrarfiltro: boolean = true;
    updateItem() {
        this.items = [
            {
                label: 'Menu Principal',
                styleClass: 'itemcustom',
                expanded: true,
                items: [
                    {
                        icon: 'pi bi-bankcustom',
                        label: 'Alcaldía Ciudadana',
                        styleClass: 'itemcustom',
                        expanded: true,
                        items: [
                            {
                                icon: 'pi bi-estadistica',
                                label: 'Estadística',
                                styleClass: 'itemcustom',
                                //visible: this.check.DashboardComponent,
                                visible: false,
                                command: () => {
                                    if (this.check.DashboardComponent) {
                                        this.controlFullScreem();
                                        this.sidebarVisible = true;
                                    } else {
                                        this.messageService.add({
                                            severity: 'error',
                                            summary: 'ERROR',
                                            detail: 'No tienes permiso para esto',
                                        });
                                    }
                                },
                            },
                            {
                                icon: 'pi bi-ticcioce',
                                label: 'TIC-CIOCE',
                                styleClass: 'itemcustom',
                                //visible: this.check.DashboardComponent,
                                visible: false,
                                command: () => {
                                    if (
                                        (this.opcionb ? true : false) &&
                                        this.check
                                            .CreateIncidentesDenunciaComponent &&
                                        (this.latitud ? true : false) &&
                                        (this.longitud ? true : false)
                                    ) {
                                        this.nuevoIncidente('CIOCE');
                                    } else {
                                        if (
                                            (this.opcionb ? true : false) &&
                                            this.check
                                                .IndexIncidentesDenunciaComponent &&
                                            this.check.DashboardComponent
                                        ) {
                                            this.mostrarincidente = false;
                                            setTimeout(() => {
                                                this.mostrarfiltro = false;
                                                this.categoria = 'CIOCE';
                                                this.subcategoria = undefined;
                                                this.incidente();
                                            }, 500);
                                        } else {
                                            this.messageService.add({
                                                severity: 'error',
                                                summary: 'ERROR',
                                                detail: 'Primero selecciona un punto',
                                            });
                                        }
                                    }
                                },
                            },
                            {
                                icon: this.capaActiva
                                    ? 'pi bi-barrio-on-custom'
                                    : 'bi bi-barrio-off-custom',
                                label: 'Barrios',
                                styleClass: 'itemcustom',
                                command: () => {
                                    this.arr_polygon.length == 0
                                        ? this.reloadmap()
                                        : this.mostrarpoligono();
                                },
                            },
                            {
                                icon: !this.capaActivaWIFI
                                    ? 'bi bi-wifi-on'
                                    : 'bi bi-wifi-off',
                                label: 'Puntos Wifi',
                                styleClass: 'itemcustom',
                                command: () => {
                                    this.reloadWifi();
                                },
                            },
                            {
                                separator: true,
                            },
                            {
                                icon: 'pi bi-ficha_sectorial',
                                label: 'Fichas Sectorials',
                                styleClass: 'itemcustom',
                                expanded: true,
                                items: [
                                    {
                                        icon: 'pi bi-ver-ficha_sectorial',
                                        label: 'Ver Fichas Sectoriales',
                                        styleClass: 'itemcustom',
                                        command: () => {
                                            if (
                                                (this.opcionb ? true : false) &&
                                                this.check
                                                    .IndexFichaSectorialComponent
                                            ) {
                                                this.fichaTecnica();
                                            } else {
                                                this.messageService.add({
                                                    severity: 'error',
                                                    summary: 'ERROR',
                                                    detail: 'Primero selecciona un lugar',
                                                });
                                            }
                                        },
                                    },
                                    {
                                        icon: 'pi bi-new-ficha_sectorial',
                                        label: 'Nueva Ficha Sectorial',
                                        styleClass: 'itemcustom',
                                        visible: false,
                                        /* this.check
                                                .CreateFichaSectorialComponent,*/
                                        command: () => {
                                            if (
                                                (this.opcionb ? true : false) &&
                                                this.check
                                                    .CreateFichaSectorialComponent
                                            ) {
                                                this.nuevoFicha();
                                            } else {
                                                this.messageService.add({
                                                    severity: 'error',
                                                    summary: 'ERROR',
                                                    detail: 'Primero selecciona un lugar',
                                                });
                                            }
                                        },
                                    },
                                ],
                            },
                            {
                                separator: true,
                            },
                            {
                                icon: 'pi bi-incidentes',
                                label: 'Incidentes',
                                styleClass: 'itemcustom',
                                expanded: true,
                                visible:
                                    this.check
                                        .CreateIncidentesDenunciaComponent,
                                items: [
                                    {
                                        icon: 'pi bi-ver-incidentes',
                                        label: 'Ver Incidentes',
                                        styleClass: 'itemcustom',
                                        command: () => {
                                            if (
                                                this.check
                                                    .IndexIncidentesDenunciaComponent
                                            ) {
                                                this.mostrarincidente = false;
                                                setTimeout(() => {
                                                    this.mostrarfiltro = true;
                                                    this.categoria = undefined;
                                                    this.subcategoria =
                                                        undefined;
                                                    this.incidente();
                                                }, 500);
                                            } else {
                                                this.messageService.add({
                                                    severity: 'error',
                                                    summary: 'ERROR',
                                                    detail: 'Primero selecciona un lugar',
                                                });
                                            }
                                        },
                                    },
                                    {
                                        icon: 'pi bi-new-incidentes',
                                        label: 'Nuevo Incidente',
                                        styleClass: 'itemcustom',

                                        command: () => {
                                            if (
                                                (this.opcionb ? true : false) &&
                                                this.check
                                                    .CreateIncidentesDenunciaComponent &&
                                                (this.latitud ? true : false) &&
                                                (this.longitud ? true : false)
                                            ) {
                                                this.nuevoIncidente();
                                            } else {
                                                this.messageService.add({
                                                    severity: 'error',
                                                    summary: 'ERROR',
                                                    detail: 'Primero selecciona un punto',
                                                });
                                            }
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        icon: 'pi bi-ticcioce',
                        label: 'TIC-CIOCE',
                        styleClass: 'itemcustom',
                        visible: this.check.DashboardComponent,
                        command: () => {
                            if (
                                (this.opcionb ? true : false) &&
                                this.check.CreateIncidentesDenunciaComponent &&
                                (this.latitud ? true : false) &&
                                (this.longitud ? true : false)
                            ) {
                                this.nuevoIncidente('CIOCE');
                            } else {
                                if (
                                    (this.opcionb ? true : false) &&
                                    this.check
                                        .IndexIncidentesDenunciaComponent &&
                                    this.check.DashboardComponent
                                ) {
                                    this.mostrarincidente = false;
                                    setTimeout(() => {
                                        this.mostrarfiltro = false;
                                        this.categoria = 'CIOCE';
                                        this.subcategoria = undefined;
                                        this.incidente();
                                    }, 500);
                                } else {
                                    this.messageService.add({
                                        severity: 'error',
                                        summary: 'ERROR',
                                        detail: 'Primero selecciona un punto',
                                    });
                                }
                            }
                        },
                    },
                    {
                        icon: 'pi pi-directionscustom',
                        label: 'ESVIAL',
                        styleClass: 'itemcustom',
                        visible: false,
                        command: () => {
                            if (
                                (this.opcionb ? true : false) &&
                                this.check.CreateIncidentesDenunciaComponent &&
                                (this.latitud ? true : false) &&
                                (this.longitud ? true : false)
                            ) {
                                this.nuevoIncidente(
                                    'ESVIAL',
                                    'Transporte terrestre y seguridad vial'
                                );
                            } else {
                                if (
                                    (this.opcionb ? true : false) &&
                                    this.check
                                        .IndexIncidentesDenunciaComponent &&
                                    this.check.DashboardComponent
                                ) {
                                    this.mostrarincidente = false;
                                    setTimeout(() => {
                                        this.mostrarfiltro = false;
                                        this.categoria = 'ESVIAL';
                                        this.subcategoria =
                                            'Transporte terrestre y seguridad vial';
                                        this.incidente();
                                    }, 500);
                                } else {
                                    this.messageService.add({
                                        severity: 'error',
                                        summary: 'ERROR',
                                        detail: 'Primero selecciona un punto',
                                    });
                                }
                            }
                        },
                    },
                    {
                        icon: 'pi bi-dropletcustom',
                        label: 'EPMAPSE',
                        styleClass: 'itemcustom',
                        visible: false,
                        command: () => {
                            if (
                                (this.opcionb ? true : false) &&
                                this.check.CreateIncidentesDenunciaComponent &&
                                (this.latitud ? true : false) &&
                                (this.longitud ? true : false)
                            ) {
                                this.nuevoIncidente(
                                    'Agua Potable y Alcantarillado'
                                );
                            } else {
                                if (
                                    (this.opcionb ? true : false) &&
                                    this.check
                                        .IndexIncidentesDenunciaComponent &&
                                    this.check.DashboardComponent
                                ) {
                                    this.mostrarincidente = false;
                                    setTimeout(() => {
                                        this.mostrarfiltro = false;
                                        this.categoria =
                                            'Agua Potable y Alcantarillado';
                                        this.subcategoria = undefined;
                                        this.incidente();
                                    }, 500);
                                } else {
                                    this.messageService.add({
                                        severity: 'error',
                                        summary: 'ERROR',
                                        detail: 'Primero selecciona un punto',
                                    });
                                }
                            }
                        },
                    },
                    {
                        icon: 'pi bi-bomberos',
                        label: 'BOMBEROS',
                        styleClass: 'itemcustom',
                        visible: false,
                        command: () => {
                            if (
                                (this.opcionb ? true : false) &&
                                this.check.CreateIncidentesDenunciaComponent &&
                                (this.latitud ? true : false) &&
                                (this.longitud ? true : false)
                            ) {
                                this.nuevoIncidente(
                                    'Cuerpo de Bomberos',
                                    'Incendios / Desastres varios'
                                );
                            } else {
                                if (
                                    (this.opcionb ? true : false) &&
                                    this.check
                                        .IndexIncidentesDenunciaComponent &&
                                    this.check.DashboardComponent
                                ) {
                                    this.mostrarincidente = false;
                                    setTimeout(() => {
                                        this.mostrarfiltro = false;
                                        this.categoria = 'Cuerpo de Bomberos';
                                        this.subcategoria =
                                            'Incendios / Desastres varios';
                                        this.incidente();
                                    }, 500);
                                } else {
                                    this.messageService.add({
                                        severity: 'error',
                                        summary: 'ERROR',
                                        detail: 'Primero selecciona un punto',
                                    });
                                }
                            }
                        },
                    },
                    {
                        icon: 'pi bi-camionprimne',
                        label: 'Recolector',
                        styleClass: 'itemcustom',
                        items: [
                            {
                                icon: this.load_truck
                                    ? 'pi bi-camionoff'
                                    : 'pi bi-camionon',
                                label: 'Ver Recolectores',
                                styleClass: 'itemcustom',
                                command: () => {
                                    if (this.load_truck) {
                                        this.load_truck = false;
                                        this.cargarRecolectores();
                                        // Iniciar el intervalo y almacenar el identificador devuelto en una variable
                                        this.intervalId = setInterval(() => {
                                            this.cargarRecolectores();
                                        }, 1000);
                                    } else {
                                        // Detener el intervalo si está activo
                                        clearInterval(this.intervalId);
                                        this.load_truck = true;
                                        this.clearMarkers();
                                    }
                                    setTimeout(() => {
                                        this.updateItem();
                                    }, 200);
                                },
                            },
                            {
                                icon: 'pi bi-path',
                                label: 'Ver Rutas',
                                styleClass: 'itemcustom',
                                command: async () => {
                                    if (this.rutas.length == 0) {
                                        const aux = await this.getWFSgeojson(
                                            this.urlgeoserruta2
                                        );
                                        if (aux && aux.features) {
                                            this.rutas = aux.features;
                                            this.visiblepath = true;
                                        } else {
                                            this.messageService.add({
                                                severity: 'error',
                                                summary: 'Ocurrio Algo',
                                                detail: 'Sin conexión',
                                            });
                                        }
                                    } else {
                                        this.visiblepath = true;
                                    }
                                },
                            },
                            {
                                icon: 'pi bi-trashcustom',
                                label: 'Denuncia/Incidente',
                                styleClass: 'itemcustom',
                                visible: false,
                                command: () => {
                                    if (
                                        (this.opcionb ? true : false) &&
                                        this.check
                                            .CreateIncidentesDenunciaComponent &&
                                        (this.latitud ? true : false) &&
                                        (this.longitud ? true : false)
                                    ) {
                                        this.nuevoIncidente(
                                            'Higiene',
                                            ' Servicio de recolección de desechos'
                                        );
                                    } else {
                                        if (
                                            (this.opcionb ? true : false) &&
                                            this.check
                                                .IndexIncidentesDenunciaComponent &&
                                            this.check.DashboardComponent
                                        ) {
                                            this.mostrarincidente = false;
                                            setTimeout(() => {
                                                this.mostrarfiltro = false;
                                                this.categoria = 'Higiene';
                                                this.subcategoria =
                                                    ' Servicio de recolección de desechos';
                                                this.incidente();
                                            }, 500);
                                        } else {
                                            this.messageService.add({
                                                severity: 'error',
                                                summary: 'ERROR',
                                                detail: 'Primero selecciona un punto',
                                            });
                                        }
                                    }
                                },
                            },
                        ],
                    },
                ],
            },
        ];
        //this.addtemplateSP();
        this.addtemplateMn();
        this.addtemplateFR();
        this.addtemplateBG();
    }
    load_truck: boolean = true;
    intervalId: any;
    pushmenu: boolean = false;
    addtemplateMn() {
        setTimeout(() => {
            const panelmenu = document.getElementById('panelmenu');

            // Verificar si el speedDial ya está en el mapa antes de agregarlo
            if (!this.pushmenu && this.mapCustom.controls && panelmenu) {
                this.pushmenu = true;
                const customControlDiv = document.createElement('div');
                customControlDiv.appendChild(panelmenu);

                // Añadir el speedDial al control solo si no está agregado
                this.mapCustom.controls[
                    google.maps.ControlPosition.LEFT_TOP
                ].push(customControlDiv);
            }
        }, 200);
    }
    isMenuAdded(): boolean {
        const speedDial = document.getElementById('speedDial');
        const speedDialParent = speedDial.parentElement;
        return (
            speedDialParent &&
            speedDialParent.tagName === 'DIV' &&
            speedDialParent.parentNode === this.mapCustom.getDiv()
        );
    }

    addtemplateSP() {
        setTimeout(() => {
            const speedDial = document.getElementsByTagName('p-speedDial')[0];

            // Verificar si el speedDial ya está en el mapa antes de agregarlo
            if (!this.isSpeedDialAdded()) {
                const customControlDiv = document.createElement('div');
                customControlDiv.appendChild(speedDial);

                // Añadir el speedDial al control solo si no está agregado
                this.mapCustom.controls[
                    google.maps.ControlPosition.LEFT_TOP
                ].push(customControlDiv);
            }

            if (this.speedDials) {
                this.speedDials.forEach((speedDial, index) => {
                    speedDial.show();
                });
            }
        }, 1000);
    }
    isSpeedDialAdded(): boolean {
        const speedDial = document.getElementsByTagName('p-speedDial')[0];
        const speedDialParent = speedDial.parentElement;
        return (
            speedDialParent &&
            speedDialParent.tagName === 'DIV' &&
            speedDialParent.parentNode === this.mapCustom.getDiv()
        );
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
            const formularioMap = this.formularioMapRef.nativeElement;
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

    //CONEXION DE FEATURE
    async getWFSgeojson(url: any) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            console.log(data);
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
                document.getElementById('map') as HTMLElement,
                {
                    zoom: 15,
                    center: haightAshbury,
                    mapTypeId: 'terrain',
                    fullscreenControl: false,
                    mapTypeControlOptions: {
                        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                        position: google.maps.ControlPosition.LEFT_BOTTOM,
                    },
                    gestureHandling: 'greedy', //'cooperative', // Control de gestos
                }
            );
            this.initFullscreenControl();
            this.mapCustom.addListener('click', (event: any) => {
                this.onClickHandlerMap(event);
            });
        });
    }

    inforecolector: any[] = [];
    markersrecolectores: Map<string, any> = new Map();

    async cargarRecolectores() {
        try {
            const response = await this.admin.obtenerGPS().toPromise();

            if (response) {
                const promises = response.map(async (feature: any) => {
                    let device = this.inforecolector.find(
                        (element) => element.deviceId == feature.deviceId
                    );

                    if (!device) {
                        const response2 = await this.admin
                            .obtenerNameGPS(feature.deviceId)
                            .toPromise();
                        device = {
                            deviceId: feature.deviceId,
                            ...response2[0],
                        };
                        this.inforecolector.push(device);
                    }

                    const latlng = new google.maps.LatLng(
                        feature.latitude,
                        feature.longitude
                    );

                    if (this.markersrecolectores.has(feature.deviceId)) {
                        // Actualizar la posición del marcador existente
                        const marker = this.markersrecolectores.get(
                            feature.deviceId
                        );
                        marker.setPosition(latlng);
                        marker.setIcon({
                            url: feature.attributes.motion
                                ? './assets/menu/camionON.png'
                                : './assets/menu/camionOFF.png',
                            scaledSize: new google.maps.Size(40, 40),
                            anchor: new google.maps.Point(13, 41),
                        });
                    } else {
                        // Crear un nuevo marcador si no existe
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
                            content: `<div style="font-family: Arial, sans-serif; font-size: 14px; width:200px">
                                        <b style="text-align: center">${device.name}</b>
                                      </div>`,
                        });

                        marker.addListener('click', () => {
                            this.mapCustom.setCenter(latlng);
                            infoWindow.open(this.mapCustom, marker);
                        });

                        this.markersrecolectores.set(feature.deviceId, marker);
                    }
                });

                await Promise.all(promises);
            }
        } catch (error) {
            console.error(error);
        }
    }

    // Animación para eliminar los marcadores antiguos
    /* oldMarkers.forEach((marker: google.maps.Marker) => {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(() => {
          marker.setMap(null);
        }, 1000); // 1000 milisegundos (1 segundo) de retraso antes de quitar el marcador
      });*/

    clearMarkers() {
        this.markersrecolectores.forEach((element) => {
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
                this.addtemplateMn();
                this.addtemplateFR();
                this.exitFullscreen();
            } else {
                this.load_fullscreen = true;
                this.mapCustom.setOptions({ mapTypeControl: false });
                this.addtemplateMn();
                this.addtemplateFR();
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
        this.updateItem();
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
            // console.log(this.arr_polygon);
            this.arr_polygon.forEach((polygon: google.maps.Polygon) => {
                polygon.setMap(this.mapCustom);
            });
            this.capaActiva = true;
            this.centrarMap();
        }
        this.updateItem();
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
            // console.log(center, zoom);
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
        this.updateItem();
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
                this.updateItem();
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
                    this.updateItem();
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
            try {
                // Solicitar permisos de ubicación
                const permissionStatus: PermissionStatus =
                    await Geolocation.requestPermissions();

                // Verificar si el permiso fue concedido
                if (permissionStatus.location === 'granted') {
                    // Obtener la ubicación actual
                    const coordinates: Position =
                        await Geolocation.getCurrentPosition({
                            enableHighAccuracy: true,
                            timeout: 10000,
                        });

                    this.latitud = coordinates.coords.latitude;
                    this.longitud = coordinates.coords.longitude;

                    this.addMarker(
                        { lat: this.latitud, lng: this.longitud },
                        'Ubicación',
                        'Tu ubicación Actual'
                    );
                    this.poligonoposition();
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Permiso Denegado',
                        detail: 'No se pudo obtener el permiso de ubicación.',
                    });
                }
            } catch (error) {
                console.error('Error getting location: ', error);
                this.messageService.add({
                    severity: 'error',
                    summary: '404',
                    detail: error.message || 'Sin conexión',
                });
            }
        } else {
            // Código para navegador (sin cambios)
            this.messageService.add({
                severity: 'info',
                summary: 'Info',
                detail: 'Tu ubicación puede ser no exacta',
            });

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
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
                        console.error(
                            'Error getting location: ' + error.message
                        );
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
    arr_wifi: any[] = [];
    async reloadWifi() {
        if (this.capaActivaWIFI) {
            if (this.arr_wifi.length != 0) {
                this.arr_wifi.forEach((marker) =>
                    marker.setMap(this.mapCustom)
                );
            } else {
                this.arr_wifi = [];
                await this.getWFSgeojson(this.urlgeoserwifi).then((e) => {
                    const geoJson = e;
                    geoJson.features.forEach((feature: any) => {
                        const latlng = new google.maps.LatLng(
                            feature.geometry.coordinates[1],
                            feature.geometry.coordinates[0]
                        );
                        const marker = new google.maps.Marker({
                            title: feature.id,
                            position: latlng,
                            map: this.mapCustom,
                            icon: {
                                url: './assets/icon/router-fill.svg',
                                scaledSize: new google.maps.Size(25, 41),
                                anchor: new google.maps.Point(13, 41),
                            },
                        });
                        const infoWindow = new google.maps.InfoWindow({
                            content: `
                      <div style="font-family: Arial, sans-serif; font-size: 14px; width:200px">
                          <b style="text-align: center">${feature.properties.punto}</b>
                      </div>`,
                        });
                        marker.addListener('click', () => {
                            this.mapCustom.setCenter(latlng);
                            //this.mapCustom.setZoom(18);
                            infoWindow.open(this.mapCustom, marker);
                        });

                        this.arr_wifi.push(marker);
                    });
                });
                this.arr_wifi.forEach((marker) =>
                    marker.setMap(this.mapCustom)
                );
            }
            this.capaActivaWIFI = false;
            //this.capaActivaWIFIpop = true;
        } else {
            this.arr_wifi.forEach((marker) => marker.setMap(null));
            this.capaActivaWIFI = true;
        }

        this.updateItem();
    }
    fichaTecnica() {
        //console.log('actividad');
        this.controlFullScreem();
        this.mostrarficha = false;
        this.mostrarincidente = false;
        if (this.opcionb) {
            this.mostrarficha = true;
        }
        if (this.mapCustom) {
            //this.map.off('click', this.onClickHandlerMap);
            if (this.mostrarficha) {
            }
        }
    }
    incidente() {
        this.controlFullScreem();
        this.mostrarficha = false;
        this.mostrarincidente = false;
        this.mostrarincidente = true;
        if (this.mapCustom) {
            if (this.mostrarincidente) {
            }
        }
    }

    nuevoFicha() {
        this.controlFullScreem();
        const data = this.opcionb; // JSON que quieres enviar
        this.modalService.dismissAll();
        //const this.ref = this.modalService.open(CreateFichaSectorialComponent, { centered: true });
        //this.ref.componentInstance.data = data;

        this.ref = this.dialogService.open(CreateFichaSectorialComponent, {
            header: '',
            width: this.isMobil() ? '100%' : '50%',
            data: { data: data },
        });
        App.addListener('backButton', (data) => {
            this.ref.close();
        });
    }
    nuevoIncidente(tipo?: string, subtipo?: string) {
        this.controlFullScreem();
        const data = this.opcionb; // JSON que quieres enviar
        /*this.modalService.dismissAll();
      const this.ref = this.modalService.open(CreateIncidentesDenunciaComponent, { centered: true });
      this.ref.componentInstance.data = data;
      this.ref.componentInstance.direccion = { latitud: this.latitud, longitud: this.longitud };
      */
        this.ref = this.dialogService.open(CreateIncidentesDenunciaComponent, {
            header: '',
            width: this.isMobil() ? '100%' : '50%',
            data: {
                data: data,
                direccion: {
                    latitud: this.latitud,
                    longitud: this.longitud,
                },
                tipo: tipo,
                subtipo: subtipo,
            },
        });
        App.addListener('backButton', (data) => {
            this.ref.destroy();
        });
    }
    controlFullScreem() {
        const elementToSendFullscreen = this.mapCustom.getDiv()
            .firstChild as HTMLElement;
        if (this.isFullscreen(elementToSendFullscreen)) {
            this.mapCustom.setOptions({ mapTypeControl: true });
            this.load_fullscreen = false;
            this.addtemplateMn();
            this.addtemplateFR();
            this.exitFullscreen();
        }
    }
    modaldireccion: boolean = false;
    modalcreatedireccion(feature: any) {
        this.sidebarVisible ? (this.sidebarVisible = false) : '';
        this.mostrarficha ? (this.mostrarficha = false) : '';
        this.mostrarincidente ? (this.mostrarincidente = false) : '';
        this.ref = this.dialogService.open(CreateDireccionGeoComponent, {
            header: 'Nueva imagen Direcion',
            width: this.isMobil() ? '100%' : '50%',
            data: { feature: feature },
            dismissableMask: true,
        });
        App.addListener('backButton', (data) => {
            this.ref.destroy();
        });
    }
    visiblepath: boolean = false;
    rutas: any[] = [];
    pathselect: any[] = [];
    pathson: any[] = [];
    selectpath: any;
    pathpush(item: any) {
        if (item) {
            if (!this.pathselect.includes(item)) {
                this.pathselect.push(item);
            } else {
                const index = this.pathselect.indexOf(item);
                if (index !== -1) {
                    this.pathselect.splice(index, 1);
                }
            }
            this.rutasdialog();
        }
    }

    rutasdialog() {
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
        if (this.pathson.length > 0) {
            this.pathson.forEach((element: any) => {
                element.setMap(null);
            });
        }
        this.pathson = [];
        this.pathselect.forEach((element: any, index: number) => {
            const path = [];
            if (element.geometry.coordinates) {
                element.geometry.coordinates.forEach((paths: any) => {
                    for (const coord of paths) {
                        path.push({ lat: coord[1], lng: coord[0] });
                    }
                });
            }

            const route = new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: colors[index % colors.length],
                strokeOpacity: 1.0,
                strokeWeight: 6, // Ajusta este valor para hacer la línea más ancha
            });

            route.addListener('click', (event: any) => {
                const infoWindow = new google.maps.InfoWindow({
                    content: element.properties.nombre,
                });

                infoWindow.setPosition(event.latLng);
                infoWindow.open(this.mapCustom);
            });

            route.setMap(this.mapCustom);
            this.pathson.push(route);
        });
    }
    viewwifi(feature: any) {
        if (typeof feature !== 'string') {
            const marker = this.arr_wifi.find((element) => {
                if (element.title == feature.id) {
                    return element;
                }
            });
            if (marker) {
                const latlng = new google.maps.LatLng(
                    feature.geometry.coordinates[1],
                    feature.geometry.coordinates[0]
                );
                this.latitud = feature.geometry.coordinates[1];
                this.longitud = feature.geometry.coordinates[0];
                const infoWindow = new google.maps.InfoWindow({
                    content: `
                <div style="font-family: Arial, sans-serif; font-size: 14px; width:200px">
                    <b style="text-align: center">${feature.properties.punto}</b>
                </div>`,
                });
                this.mapCustom.setCenter(latlng);
                //this.mapCustom.setZoom(18);

                infoWindow.open(this.mapCustom, marker);
                this.poligonoposition();
            }
        }
    }
}

