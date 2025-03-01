import {
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/demo/services/auth.service';
import { FilterService } from 'src/app/demo/services/filter.service';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { ImportsModule } from 'src/app/demo/services/import';
import { ListService } from 'src/app/demo/services/list.service';
import { LoginComponent } from '../../login/login.component';
import { ConfirmationService, MessageService } from 'primeng/api';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-item',
    standalone: true,
    imports: [ImportsModule, LoginComponent],
    templateUrl: './item.component.html',
    styleUrl: './item.component.scss',
    providers: [MessageService, ConfirmationService],
})
export class ItemComponent implements OnInit, OnChanges {
    @Input() fichaId: string;
    @Output() onClose = new EventEmitter<void>();
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
        private sanitizer: DomSanitizer,
        private messageService: MessageService
    ) {}
    fichas_sectoriales_arr: any[] = [];
    onHide() {
        this.displayFoto = false;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['fichaId']) {
            this.obtenerFicha();
        }
    }

    async listarFichaSectorial(): Promise<void> {
        this.listService
            .listarFichaSectorialArticulos()
            .subscribe((response: any) => {
                if (response.data && response.data.length > 0) {
                    // 1. Filtrar solo los elementos con "createdAt" definido
                    let fichasConFecha = response.data.filter(
                        (item: any) =>
                            item.createdAt && item._id !== this.ficha._id
                    );

                    // 2. Ordenar las fichas por "createdAt" de más reciente a más antiguo
                    fichasConFecha.sort((a: any, b: any) => {
                        return (
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime()
                        );
                    });

                    // 3. Guardar las fichas filtradas en el array
                    this.fichas_sectoriales_arr = fichasConFecha;
                } else {
                    // Si no hay datos, inicializar el array vacío
                    this.fichas_sectoriales_arr = [];
                    //console.log('No hay fichas disponibles.');
                }
            });
    }

    load: boolean = true;
    view_map: boolean = false;
    name: string;

    async ngOnInit() {
        this.route.params.subscribe((params) => {
            this.fichaId = params['id'] || null;
        });

        this.route.queryParams.subscribe((queryParams) => {
            this.name = queryParams['name'] || null;
        });

        if (this.name) {
            await this.obtenerFichaPorNombre();
        } else if (this.fichaId) {
            await this.obtenerFicha();
        }
    }

    async obtenerFicha() {
        //console.log('Buscando ficha:', this.fichaId);
        this.view_map = false;
        this.filterService.obtenerFichaPublica(this.fichaId).subscribe(
            (response: any) => {
                if (response.data) {
                    //console.log(response);
                    this.setFichaData(response.data);
                }
            },
            (error) => {
                console.error(error);
                this.load = false;
            }
        );
    }

    async obtenerFichaPorNombre() {
        this.view_map = false;
        this.listService
            .listarFichaSectorial(null, { title_marcador: this.name })
            .subscribe(
                (response: any) => {
                    //console.log('RECIBIO LA FICHA POR NOMBRE: ', this.name);
                    if (response.data) {
                        //console.log(response);
                        const data =
                            response.data?.length > 0 ? response.data[0] : null;
                        this.setFichaData(data);
                    }
                },
                (error) => {
                    console.error(error);
                    this.load = false;
                }
            );
    }

    private setFichaData(data: any) {
        this.ficha = data;
        this.updateSanitizedDescripcion();
        this.iniciarCambioDeImagen();
        this.liked = this.checkIfLiked();
        this.load = false;
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
        return window.innerWidth <= 575;
    }

    compartirEnTwitter(): void {
        const url = `https://geoapi.esmeraldas.gob.ec/mapa-turistico/maps?name=${this.name}`;
        const text = `Mira este artículo: ${this.ficha.title_marcador}`;
        const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
            url
        )}&text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank');
        this.incrementarCompartido();
    }

    compartirEnFacebook(): void {
        const url = `https://geoapi.esmeraldas.gob.ec/mapa-turistico/maps?name=${this.name}`;
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            url
        )}`;
        window.open(facebookUrl, '_blank');
        this.incrementarCompartido();
    }

    copiarEnlace(): void {
        const url = `https://geoapi.esmeraldas.gob.ec/mapa-turistico/maps?name=${this.name}`;
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
        this.filterService.actualizarFichaCompartido(this.ficha._id).subscribe(
            (response: any) => {
                //console.log('Compartido actualizado');
            },
            (error) => {
                console.error('Error al actualizar compartido: ', error);
            }
        );
    }
    loginVisible: boolean = false;
    toggleMeGusta(): void {
        const token = this.auth.token();
        if (token) {
            const userId: string = this.auth.idUserToken(token.toString());
            this.liked = !this.liked;
            if (this.liked) {
                this.ficha.me_gusta.push(userId); // Reemplazar con el ID del usuario real
            } else {
                const index = this.ficha.me_gusta.indexOf(userId); // Reemplazar con el ID del usuario real
                if (index > -1) {
                    this.ficha.me_gusta.splice(index, 1);
                }
            }

            this.filterService
                .actualizarFichaMeGusta(token, this.ficha._id, userId)
                .subscribe(
                    (response: any) => {
                        //console.log('Me gusta actualizado');
                    },
                    (error) => {
                        console.error('Error al actualizar me gusta: ', error);
                    }
                );
        } else {
            this.loginVisible = true; // Abre el modal de login
        }
    }
    nuevoComentario: string = '';
    hitrate: number = 0;
    enviandoComentario: boolean = false;

    agregarComentario(): void {
        if (this.enviandoComentario) return; // Evita doble envío

        const token = this.auth.token();
        const idUser = this.auth.idUserToken();

        if (!token) {
            this.loginVisible = true;
            return;
        }

        const comentarioLimpio = this.nuevoComentario.trim();
        if (!comentarioLimpio) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Comentario vacío',
                detail: 'No puedes enviar un comentario vacío.',
            });
            return;
        }

        this.enviandoComentario = true;

        this.filterService
            .agregarComentario(
                token.toString(),
                this.ficha._id,
                idUser,
                comentarioLimpio,
                this.hitrate
            )
            .subscribe({
                next: (response: any) => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Comentario agregado',
                        detail: 'Su comentario ha sido agregado exitosamente.',
                    });

                    // Agregar el comentario sin recargar la lista completa
                    this.ficha.comentarios = response.comentarios;

                    // Resetear formulario
                    this.nuevoComentario = '';
                    this.hitrate = 0;
                },
                error: (error) => {
                    console.error('Error al agregar comentario:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail:
                            error?.error?.message ||
                            'Hubo un problema al agregar el comentario.',
                    });
                },
            });
    }

    esComentarioPropio(comentario: any): boolean {
        return comentario.usuario._id === this.auth.idUserToken();
    }

    eliminarComentario(comentario: any): void {}

    checkIfLiked(): boolean {
        if (this.auth.token(true)) {
            const userId: string = this.auth.idUserToken();
            return (
                this.ficha.me_gusta &&
                this.ficha.me_gusta.some((user) => user._id === userId)
            );
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
        content = content.replace(/&nbsp;/g, ' ');
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
        const rawContent = this.ficha.descripcion;
        if (!rawContent) {
            return;
        }
        const cleanedContent = this.cleanHtmlContent(rawContent);
        this.sanitizedContent =
            this.sanitizer.bypassSecurityTrustHtml(cleanedContent);
    }

    /**
     * Abre Google Maps con la dirección para llegar al destino
     */
    abrirGoogleMaps() {
        if (!this.ficha || !this.ficha.direccion_geo) {
            console.error('No hay coordenadas disponibles');
            return;
        }

        const { latitud, longitud } = this.ficha.direccion_geo;

        if (!latitud || !longitud) {
            console.error('Coordenadas incompletas:', this.ficha.direccion_geo);
            return;
        }

        // URL para abrir la navegación en Google Maps
        let googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`;

        // Añadir el nombre del lugar como parámetro de consulta para mejorar la experiencia
        if (this.ficha.title_marcador) {
            googleMapsUrl += `&query=${encodeURIComponent(
                this.ficha.title_marcador
            )}`;
        }

        // Para dispositivos móviles, intenta abrir la aplicación de Google Maps
        // si está disponible, o el navegador en caso contrario
        window.open(googleMapsUrl, '_blank');
    }

    getInitials(name: string): string {
        if (!name) return '';
        const names = name.split(' ');
        return names.length > 1 ? `${names[0][0]}${names[1][0]}` : names[0][0];
    }
}
