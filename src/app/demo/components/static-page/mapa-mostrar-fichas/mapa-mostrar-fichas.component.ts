import { DatePipe } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Loader } from '@googlemaps/js-api-loader';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { GoogleMapsService } from 'src/app/demo/services/google.maps.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ImportsModule } from 'src/app/demo/services/import';
import { ListService } from 'src/app/demo/services/list.service';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

interface MarkerGroup {
    position: google.maps.LatLng;
    markers: {
        marker: google.maps.Marker;
        item: any;
        infoWindow: google.maps.InfoWindow;
    }[];
}

@Component({
    selector: 'app-mapa-mostrar-fichas',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './mapa-mostrar-fichas.component.html',
    styleUrl: './mapa-mostrar-fichas.component.scss',
    providers: [DatePipe],
})
export class MapaMostrarFichasComponent implements OnInit, OnDestroy {
    @Input() ficha!: any;
    @Input() incidente!: boolean;
    url: string = GLOBAL.url;
    mapCustom: google.maps.Map;
    load_fullscreen: boolean = false;
    fichas_sectoriales_arr: any[];

    constructor(
        private list: ListService,
        private helperService: HelperService,
        private router: Router,
        private googlemaps: GoogleMapsService,
        private datePipe: DatePipe
    ) {}

    async ngOnInit() {
        await this.initMap();
    }

    async initMap() {
        this.googlemaps.getLoader().then(() => {
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
                    gestureHandling: 'greedy', //'cooperative', // Control de gestos
                }
            );

            this.initFullscreenControl();
            setTimeout(async () => {
                if (this.ficha) {
                    if (Array.isArray(this.ficha)) {
                        this.fichas_sectoriales_arr = this.ficha;
                    } else {
                        this.fichas_sectoriales_arr = [this.ficha];
                    }
                    //console.log(this.fichas_sectoriales_arr);
                    await this.getcategorias();
                    await this.marcadoresmapa();
                } else {
                    await this.listarFichaSectorialMapa();
                }
            }, 1000);
        });
    }

    async listarFichaSectorialMapa() {
        this.list
            .listarFichaSectorialMapa()
            .subscribe(async (response: any) => {
                if (response.data && response.data.length > 0) {
                    this.fichas_sectoriales_arr = response.data;
                    //console.log(this.fichas_sectoriales_arr);
                    await this.getcategorias();
                    await this.marcadoresmapa();
                }
            });
    }
    actividades: any[] = [];
    actividad_select: any[] = [];
    async getcategorias() {
        this.actividades = [];
        this.fichas_sectoriales_arr.forEach((item: any) => {
            if (!item.actividad) {
                return; // Saltar al siguiente elemento
            }
            // Verificar si la actividad ya existe en el array
            if (
                !this.actividades.find(
                    (actividad) => actividad._id === item.actividad._id
                )
            ) {
                this.actividades.push(item.actividad);
            }
        });
        this.actividad_select.push(
            this.actividades.find(
                (act: any) => act.nombre === 'Festividades'
            ) || this.actividades[0]
        );

        //console.log(this.actividad_select);
    }

    private markers: google.maps.Marker[] = [];
    private markerGroups: MarkerGroup[] = [];
    private activeInfoWindow: google.maps.InfoWindow | null = null;
    private markerCluster: MarkerClusterer | undefined;
    private readonly GROUPING_RADIUS_METERS = 20; // Radio de agrupación en metros

    async marcadoresmapa() {
        const bounds = new google.maps.LatLngBounds();

        // Limpiar marcadores y grupos existentes
        this.markers.forEach((marker) => {
            marker.setMap(null);
            marker = null;
        });
        if (this.markerCluster) {
            this.markerCluster.clearMarkers();
        }
        this.markers = [];
        this.markerGroups = [];
        // Agrupar marcadores por posición
        this.fichas_sectoriales_arr.forEach((item: any) => {
            if (
                !item.direccion_geo ||
                !item.direccion_geo.latitud ||
                !item.direccion_geo.longitud ||
                (this.actividad_select.length > 0 &&
                    !this.actividad_select.find(
                        (act: any) => act._id === item.actividad._id
                    ))
            ) {
                return; // Saltar al siguiente elemento
            }

            const position = new google.maps.LatLng(
                item.direccion_geo.latitud,
                item.direccion_geo.longitud
            );

            const marker = this.createMarker(position, item);
            const infoWindow = this.createInfoWindow(item);

            // Buscar grupo cercano existente o crear uno nuevo
            let nearestGroup = this.findNearestGroup(position);

            if (nearestGroup) {
                // Si encontramos un grupo cercano, añadimos el marcador a ese grupo
                nearestGroup.markers.push({ marker, item, infoWindow });
                // Recalcular el centro del grupo (promedio de todas las posiciones)
                this.updateGroupCenter(nearestGroup);
            } else {
                // Si no hay grupo cercano, crear uno nuevo
                const newGroup = {
                    position: position,
                    markers: [{ marker, item, infoWindow }],
                };
                this.markerGroups.push(newGroup);
            }

            this.markers.push(marker);
            bounds.extend(position);
        });

        // Configurar listeners para cada grupo
        this.markerGroups.forEach((group) => {
            // Actualizar la posición de los marcadores en el grupo
            group.markers.forEach(({ marker }) => {
                if (group.markers.length > 1) {
                    // Si hay múltiples marcadores en el grupo, ajustar sus posiciones
                    marker.setPosition(group.position);
                }

                marker.addListener('click', () => {
                    if (group.markers.length > 1) {
                        this.handleGroupClick(group);
                    } else {
                        this.setupSingleMarkerListeners(
                            marker,
                            group.markers[0].infoWindow,
                            group.position
                        );
                    }
                });
            });
        });

        if (this.mapCustom) {
            this.markerCluster = new MarkerClusterer({
                map: this.mapCustom,
                markers: this.markers,
            });

            this.mapCustom.fitBounds(bounds);
        }
    }

    private updateGroupCenter(group: MarkerGroup) {
        // Calcular el centro promedio del grupo
        let totalLat = 0;
        let totalLng = 0;
        const count = group.markers.length;

        group.markers.forEach(({ marker }) => {
            totalLat += marker.getPosition()!.lat();
            totalLng += marker.getPosition()!.lng();
        });

        group.position = new google.maps.LatLng(
            totalLat / count,
            totalLng / count
        );
    }

    private findNearestGroup(position: google.maps.LatLng): MarkerGroup | null {
        for (const group of this.markerGroups) {
            const distance = this.calculateDistance(position, group.position);
            if (distance <= this.GROUPING_RADIUS_METERS) {
                return group;
            }
        }
        return null;
    }
    private calculateDistance(
        pos1: google.maps.LatLng,
        pos2: google.maps.LatLng
    ): number {
        // Usar la fórmula haversine para calcular la distancia en metros
        const R = 6371000; // Radio de la Tierra en metros
        const φ1 = this.toRadians(pos1.lat());
        const φ2 = this.toRadians(pos2.lat());
        const Δφ = this.toRadians(pos2.lat() - pos1.lat());
        const Δλ = this.toRadians(pos2.lng() - pos1.lng());

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distancia en metros
    }

    private toRadians(degrees: number): number {
        return (degrees * Math.PI) / 180;
    }

    private createInfoWindow(item: any): google.maps.InfoWindow {
        const formattedDate = this.datePipe.transform(
            this.incidente ? item.createdAt : item.fecha_evento,
            'short'
        );
        //<h5>${this.incidente ? 'Incidente' : item.title_marcador}</h5>;
        let infoContent = `
            <div class="info-window-content">
                ${
                    item.es_articulo &&
                    this.router.url !== `/ver-ficha/${item._id}`
                        ? `<a href="/ver-ficha/${item._id}" class="btn-ver-articulo">Ver Artículo</a><br>`
                        : ''
                }
                <p>Fecha${
                    this.incidente ? '' : ' del evento'
                }: ${formattedDate}</p>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${
                    item.direccion_geo.latitud
                },${
            item.direccion_geo.longitud
        }" target="_blank" class="btn-direcciones">
                    Cómo llegar
                </a>
            </div>
        `;

        return new google.maps.InfoWindow({
            headerContent: this.incidente ? 'Incidente' : item.title_marcador,
            content: infoContent,
            maxWidth: 400,
        });
    }

    private createMarker(
        position: google.maps.LatLng,
        item: any
    ): google.maps.Marker {
        return new google.maps.Marker({
            title: this.incidente ? 'Incidente' : item.title_marcador,
            position: position,
            map: this.mapCustom,
            icon: {
                url:
                    item.icono_marcador ||
                    'https://i.postimg.cc/QdcR9bnm/puntero-del-mapa.png',
                scaledSize: this.getMarkerSize(item),
            },
        });
    }

    private getMarkerSize(item: any): google.maps.Size {
        const isPast =
            new Date(item.fecha_evento).getTime() < new Date().getTime();
        const hasCustomIcon =
            item.icono_marcador &&
            item.icono_marcador !==
                'https://i.postimg.cc/QdcR9bnm/puntero-del-mapa.png';

        if (isPast) return new google.maps.Size(50, 50);
        if (hasCustomIcon) return new google.maps.Size(80, 80);
        return new google.maps.Size(60, 60);
    }

    private handleGroupClick(group: MarkerGroup) {
        // Cerrar InfoWindow activo si existe
        if (this.activeInfoWindow) {
            this.activeInfoWindow.close();
        }

        // Crear contenido para múltiples marcadores
        const content = this.createGroupInfoWindowContent(group);
        const infoWindow = new google.maps.InfoWindow({
            content: content.content,
            maxWidth: 400,
        });

        infoWindow.setPosition(group.position);
        infoWindow.open(this.mapCustom);
        this.activeInfoWindow = infoWindow;
        if (this.mapCustom) {
            this.mapCustom.setCenter(group.position);
        }
    }

    private createGroupInfoWindowContent(group: MarkerGroup): {
        content: string;
    } {
        let content = '<div class="marker-group-content">';
        group.markers.forEach(({ item }, index) => {
            const formattedDate = this.datePipe.transform(
                this.incidente ? item.createdAt : item.fecha_evento,
                'short'
            );

            content += `
            <div class="marker-item" ${
                index > 0
                    ? 'style="border-top: 1px solid #ccc; margin-top: 10px; padding-top: 10px;"'
                    : ''
            }>
                <h5>${this.incidente ? 'Incidente' : item.title_marcador}</h5>
                <p>Fecha: ${formattedDate}</p>
                ${
                    item.es_articulo &&
                    this.router.url !== `/ver-ficha/${item._id}`
                        ? `<a href="/ver-ficha/${item._id}" class="btn-ver-articulo">Ver Artículo</a>`
                        : ''
                }
                <a href="https://www.google.com/maps/dir/?api=1&destination=${
                    item.direccion_geo.latitud
                },${item.direccion_geo.longitud}" 
                   target="_blank" class="btn-direcciones">
                    Cómo llegar
                </a>
            </div>
        `;
        });

        return { content: content + '</div>' };
    }

    private setupSingleMarkerListeners(
        marker: google.maps.Marker,
        infoWindow: google.maps.InfoWindow,
        position: google.maps.LatLng
    ) {
        if (this.activeInfoWindow) {
            this.activeInfoWindow.close();
        }
        infoWindow.open(this.mapCustom, marker);
        this.activeInfoWindow = infoWindow;

        if (this.mapCustom) {
            this.mapCustom.setCenter(position);
        }
    }

    verArticulo(fichaId: string): void {
        // Redirigir a la página de detalle de la ficha sectorial como artículo
        this.router.navigate(['/ver-ficha', fichaId]);
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
            console.log(e.latLng.lat(), e.latLng.lng());
        }
    };
    ngOnDestroy(): void {
        // Limpia el mapa cuando el componente se destruye
        if (this.mapCustom) {
            google.maps.event.clearInstanceListeners(this.mapCustom);
            this.mapCustom = null;
            console.log('Mapa liberado');
        }
    }
}
