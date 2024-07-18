import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Loader } from '@googlemaps/js-api-loader';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ImportsModule } from 'src/app/demo/services/import';
import { ListService } from 'src/app/demo/services/list.service';

@Component({
    selector: 'app-mapa-mostrar-fichas',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './mapa-mostrar-fichas.component.html',
    styleUrl: './mapa-mostrar-fichas.component.scss',
})
export class MapaMostrarFichasComponent {
    
    mapCustom: google.maps.Map;
    load_fullscreen: boolean = false;
    loader = new Loader({
        apiKey: 'AIzaSyAnO4FEgIlMcRRB0NY5bn_h_EQzdyNUoPo', // Reemplaza con tu propia API key de Google Maps
        version: 'weekly',
    });

    constructor(
        private list: ListService,
        private helperService: HelperService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.initMap();
        this.listarFichaSectorialMapa();
    }

    initMap(): void {
        this.loader.load().then(() => {
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
        });
    }
    fichas_sectoriales_arr:any[];
    listarFichaSectorialMapa(): void {
        this.list.listarFichaSectorialMapa().subscribe((response: any) => {
            if (response.data && response.data.length > 0) {
                this.fichas_sectoriales_arr=response.data;
                const bounds = new google.maps.LatLngBounds(); // Crear objeto para los límites de los marcadores

                this.fichas_sectoriales_arr.forEach((item: any) => {
                    console.log(item);
                    const position = new google.maps.LatLng(
                        item.direccion_geo.latitud,
                        item.direccion_geo.longitud
                    );

                    const marker = new google.maps.Marker({
                        position: position,
                        map: this.mapCustom,
                        title: item.direccion_geo.nombre,
                        icon: {
                            url: item.icono_marcador, // URL de la imagen del icono del marcador
                            scaledSize: new google.maps.Size(80, 80), // Tamaño personalizado del icono
                        },
                    });

                    // Añadir la posición del marcador a los límites
                    bounds.extend(position);

                    // Contenido del InfoWindow
                    let infoContent = `
                      <div>
                          <h5>${item.direccion_geo.nombre}</h5>
                          ${item.descripcion}
                  `;

                    // Añadir imagen si está disponible
                    if (item.imagen_url) {
                        infoContent += `<img src="${item.imagen_url}" style="max-width: 200px; max-height: 150px;" />`;
                    }

                    // Añadir botón si es un artículo
                    if (item.es_articulo) {
                        infoContent += `
                          <button (click)="verArticulo('${item._id}')">Ver Artículo</button>
                      `;
                    }

                    infoContent += `</div>`;

                    const infoWindow = new google.maps.InfoWindow({
                        content: infoContent,
                    });

                    marker.addListener('click', () => {
                        infoWindow.open(this.mapCustom, marker);
                    });
                });

                // Ajustar el centro y zoom del mapa para mostrar todos los marcadores
                this.mapCustom.fitBounds(bounds);
            }
        });
    }

    verArticulo(fichaId: string): void {
        // Redirigir a la página de detalle de la ficha sectorial como artículo
        this.router.navigate(['/detalle-articulo', fichaId]);
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
        }
    }
}
