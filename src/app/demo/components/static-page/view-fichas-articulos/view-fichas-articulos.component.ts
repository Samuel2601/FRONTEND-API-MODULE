import { Component, Input, OnInit } from '@angular/core';
import { FilterService } from 'src/app/demo/services/filter.service';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { ImportsModule } from 'src/app/demo/services/import';
import { MapaMostrarFichasComponent } from '../mapa-mostrar-fichas/mapa-mostrar-fichas.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ListService } from 'src/app/demo/services/list.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    selector: 'app-view-fichas-articulos',
    standalone: true,
    imports: [ImportsModule, MapaMostrarFichasComponent],
    templateUrl: './view-fichas-articulos.component.html',
    styleUrl: './view-fichas-articulos.component.scss',
})
export class ViewFichasArticulosComponent implements OnInit {
    @Input() fichaId!: string;
    ficha: any;
    public url = GLOBAL.url;
    currentImage: string = '';
    imageIndex: number = 0;
    liked: boolean = false;
    displayFoto: boolean = true; //automatico mostrar
    responsiveOptions = [
        {
            breakpoint: '1199px',
            numVisible: 1,
            numScroll: 1,
        },
        {
            breakpoint: '991px',
            numVisible: 2,
            numScroll: 1,
        },
        {
            breakpoint: '767px',
            numVisible: 1,
            numScroll: 1,
        },
    ];

    constructor(
        private filterService: FilterService,
        private route: ActivatedRoute,
        private listService: ListService,
        private auth: AuthService,
        private router: Router,
        private sanitizer: DomSanitizer
    ) {}
    fichas_sectoriales_arr: any[] = [];
    onHide() {
        this.displayFoto = false;
    }
    listarFichaSectorial(): void {
        this.listService
            .listarFichaSectorialArticulos()
            .subscribe((response: any) => {
                if (response.data && response.data.length > 0) {
                    this.fichas_sectoriales_arr = response.data;
                }
            });
    }
    load: boolean = true;
    ngOnInit(): void {
        this.route.params.subscribe((params) => {
            if (params['id']) {
                this.fichaId = params['id'];
            }

            // console.log('RECIBIO LA FICHA: ', this.fichaId);
            if (this.fichaId) {
                this.obtenerFicha();
                this.listarFichaSectorial();
            }
        });
    }
    view_map: boolean = false;
    obtenerFicha(): void {
        this.view_map = false;
        this.filterService.obtenerFichaPublica(this.fichaId).subscribe(
            (response: any) => {
                if (response.data) {
                    this.ficha = response.data;
                    console.log(this.ficha);
                    this.updateSanitizedDescripcion();
                    this.iniciarCambioDeImagen();
                    this.liked = this.checkIfLiked();
                    setTimeout(() => {
                        this.view_map = true;
                        this.load = false;
                    }, 500);
                }
            },
            (error) => {
                console.error(error);
                this.load = false;
                throw new Error(error);
            }
        );
    }

    iniciarCambioDeImagen(): void {
        if (this.ficha.foto && this.ficha.foto.length > 0) {
            this.currentImage = this.ficha.foto[0];
            setInterval(() => {
                this.imageIndex =
                    (this.imageIndex + 1) % this.ficha.foto.length;
                this.currentImage = this.ficha.foto[this.imageIndex];
            }, 5000); // Cambia la imagen cada 5 segundos
        }
    }

    isMobile(): boolean {
        return window.innerWidth <= 768;
    }

    compartirEnTwitter(): void {
        const url = `https://geoapi.esmeraldas.gob.ec/ver-ficha/${this.fichaId}`;
        const text = `Mira este artículo: ${this.ficha.title_marcador}`;
        const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
            url
        )}&text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank');
        this.incrementarCompartido();
    }

    compartirEnFacebook(): void {
        const url = `https://geoapi.esmeraldas.gob.ec/ver-ficha/${this.fichaId}`;
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            url
        )}`;
        window.open(facebookUrl, '_blank');
        this.incrementarCompartido();
    }

    copiarEnlace(): void {
        const url = `https://geoapi.esmeraldas.gob.ec/ver-ficha/${this.fichaId}`;
        navigator.clipboard.writeText(url).then(
            () => {
                alert('Enlace copiado al portapapeles');
                this.incrementarCompartido();
            },
            (err) => {
                console.error('Error al copiar el enlace: ', err);
            }
        );
    }

    incrementarCompartido(): void {
        this.ficha.compartido = (this.ficha.compartido || 0) + 1;
        this.filterService.actualizarFichaCompartido(this.fichaId).subscribe(
            (response: any) => {
                console.log('Compartido actualizado');
            },
            (error) => {
                console.error('Error al actualizar compartido: ', error);
            }
        );
    }

    toggleMeGusta(): void {
        if (this.auth.token()) {
            const userId: string = this.auth.idUserToken();
            this.liked = !this.liked;
            if (this.liked) {
                this.ficha.me_gusta.push(userId); // Reemplazar con el ID del usuario real
            } else {
                const index = this.ficha.me_gusta.indexOf(userId); // Reemplazar con el ID del usuario real
                if (index > -1) {
                    this.ficha.me_gusta.splice(index, 1);
                }
            }
            const token = this.auth.token();
            this.filterService
                .actualizarFichaMeGusta(token, this.fichaId, userId)
                .subscribe(
                    (response: any) => {
                        console.log('Me gusta actualizado');
                    },
                    (error) => {
                        console.error('Error al actualizar me gusta: ', error);
                    }
                );
        } else {
            this.auth.redirectToLoginIfNeeded(true);
        }
    }

    checkIfLiked(): boolean {
        if (this.auth.token()) {
            const userId: string = this.auth.idUserToken();
            // Reemplazar 'usuario_id' con el ID del usuario real
            return this.ficha.me_gusta && this.ficha.me_gusta.includes(userId);
        } else {
            return false;
        }
    }

    getSeverityClass(
        status: string
    ):
        | 'severity-success'
        | 'severity-secondary'
        | 'severity-info'
        | 'severity-warning'
        | 'severity-danger'
        | 'severity-contrast' {
        if (status) {
            switch (status.toLowerCase()) {
                case 'suspendido':
                    return 'severity-danger';

                case 'finalizado':
                    return 'severity-success';

                case 'en proceso':
                    return 'severity-info';

                case 'pendiente':
                    return 'severity-warning';

                case 'planificada':
                    return 'severity-info';

                default:
                    return 'severity-secondary'; // Asegúrate de retornar un valor válido por defecto
            }
        } else {
            return null;
        }
    }
    addAllEventsToCalendar() {
        const title = encodeURIComponent(this.ficha.title_marcador);
        const startDate = this.formatGoogleCalendarDate(
            this.ficha.fecha_evento
        );
        const endDate = this.formatGoogleCalendarDate(
            new Date(
                new Date(this.ficha.fecha_evento).getTime() + 60 * 60 * 1000
            )
        ); // Duración de 1 hora
        const details = encodeURIComponent(this.ficha.descripcion);
        const latitude = this.ficha.direccion_geo.latitud;
        const longitude = this.ficha.direccion_geo.longitud;
        const location = `${latitude},${longitude}`;

        const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;
        window.open(url, '_blank');
    }
    formatGoogleCalendarDate(dateString: any): string {
        const date = new Date(dateString);
        // Formato requerido: YYYYMMDDTHHMMSSZ
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }
    goToHomePage(): void {
        this.router.navigate(['/home']);
    }

    sanitizedContent: SafeHtml;
    cleanHtmlContent(content: string): string {
        // Limpiar las comillas escapadas en el contenido
        content = content.replace(/&quot;/g, '"');
        // Elimina las etiquetas <pre> y permite <iframe>
        return content.replace(
            /<pre data-language="plain">(.*?)<\/pre>/gs,
            (_, innerContent) =>
                innerContent
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
        );
    }

    get sanitizedDescripcion(): SafeHtml {
        //const descripcion = this.fichaSectorialForm.get('descripcion').value;
        return this.sanitizedContent;
    }
    // Método para actualizar el contenido sanitizado
    updateSanitizedDescripcion(): void {
        console.log(this.ficha.descripcion);
        const rawContent = this.ficha.descripcion;
        const cleanedContent = this.cleanHtmlContent(rawContent);
        this.sanitizedContent =
            this.sanitizer.bypassSecurityTrustHtml(cleanedContent);
    }
}
