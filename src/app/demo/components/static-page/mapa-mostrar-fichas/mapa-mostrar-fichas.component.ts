import { DatePipe } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Loader } from '@googlemaps/js-api-loader';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { GoogleMapsService } from 'src/app/demo/services/google.maps.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ImportsModule } from 'src/app/demo/services/import';
import { ListService } from 'src/app/demo/services/list.service';

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
        setTimeout(async () => {
            // console.log('FICHA QUE RECIBE:', this.ficha);
            if (this.ficha) {
                this.fichas_sectoriales_arr = [this.ficha];
                await this.marcadoresmapa();
            } else {
                await this.listarFichaSectorialMapa();
            }
        }, 1000);
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
        });
    }

    async listarFichaSectorialMapa() {
        this.list
            .listarFichaSectorialMapa()
            .subscribe(async (response: any) => {
                if (response.data && response.data.length > 0) {
                    this.fichas_sectoriales_arr = response.data;
                    await this.marcadoresmapa();
                }
            });
    }
    async marcadoresmapa() {
        const bounds = new google.maps.LatLngBounds(); // Crear objeto para los límites de los marcadores

        this.fichas_sectoriales_arr.forEach((item: any) => {
            //console.log(item);
            const position = new google.maps.LatLng(
                item.direccion_geo.latitud,
                item.direccion_geo.longitud
            );

            const marker = new google.maps.Marker({
                position: position,
                map: this.mapCustom,
                title: item.direccion_geo.nombre,
                icon: {
                    url: item.icono_marcador?item.icono_marcador:'https://i.postimg.cc/QdcR9bnm/puntero-del-mapa.png', // URL de la imagen del icono del marcador
                    scaledSize: item.icono_marcador||item.icono_marcador!='https://i.postimg.cc/QdcR9bnm/puntero-del-mapa.png'?new google.maps.Size(120, 120):new google.maps.Size(50, 50), // Tamaño personalizado del icono
                },
            });

            // Añadir la posición del marcador a los límites
            bounds.extend(position);

            // Contenido del InfoWindow
            let infoContent = `
                <div>
                    <h5>${item.title_marcador}</h5>                          
            `;

            // Añadir imagen si está disponible
            /* if (item.foto && item.foto[0]) {
                const url_foto=this.url + 'obtener_imagen/ficha_sectorial/' + item.foto[0];
                infoContent += `<img src="${url_foto}" style="max-width: 200px; max-height: 150px;" />`;
            }*/

            // Añadir botón si es un artículo
            const formattedDate = this.datePipe.transform(
                item.fecha_evento,
                'short'
            );
            if (
                item.es_articulo &&
                this.router.url !== `/ver-ficha/${item._id}`
            ) {
                infoContent += `
                <a href="/ver-ficha/${item._id}" class="btn-ver-articulo">Ver Artículo</a> <br> Fecha del evento: ${formattedDate}
                `;
            } else {
                infoContent += `
                Fecha del evento: ${formattedDate}
                `;
            }
            // Añadir botón para abrir Google Maps
            infoContent += `
                <br>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${item.direccion_geo.latitud},${item.direccion_geo.longitud}" target="_blank" class="btn-direcciones">Cómo llegar</a>
            `;

            infoContent += `</div>`;

            const infoWindow = new google.maps.InfoWindow({
                headerContent: item.direccion_geo.nombre,
                content: infoContent,
                maxWidth: 400,
            });

            marker.addListener('click', () => {
                infoWindow.open(this.mapCustom, marker);
                //this.mapCustom.setZoom(15); // Ajusta el nivel de zoom según tus necesidades
                this.mapCustom.setCenter(marker.getPosition());
            });
            infoWindow.addListener('closeclick', () => {
                //this.mapCustom.setZoom(15); // Ajusta el nivel de zoom según tus necesidades
                //this.mapCustom.setCenter(marker.getPosition());
            });

            // Verificar si la URL actual coincide con el marcador
            if (this.router.url === `/ver-ficha/${item._id}`) {
                infoWindow.open(this.mapCustom, marker);
                this.mapCustom.setZoom(15); // Ajusta el nivel de zoom según tus necesidades
                this.mapCustom.setCenter(marker.getPosition());
            }
        });

        if (this.mapCustom) {
            // Ajustar el centro y zoom del mapa para mostrar todos los marcadores
            this.mapCustom.fitBounds(bounds);
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
