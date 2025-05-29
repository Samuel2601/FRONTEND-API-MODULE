import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Nominado, Proyecto } from '../../interface/proyecto.interfaces';
import { ProyectoService } from '../../service/proyecto.service';
import { ImportsModule } from 'src/app/demo/services/import';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-proyecto-celebres',
    templateUrl: './proyecto-celebres.component.html',
    styleUrls: ['./proyecto-celebres.component.scss'],
    standalone: true,
    imports: [ImportsModule],
    providers: [MessageService],
})
export class ProyectoCelebresComponent implements OnInit {
    proyecto: Proyecto | null = null;
    nominados: Nominado[] = [];
    nominadoSeleccionado: Nominado | null = null;
    mostrarCuadricula: boolean = true;
    cargando: boolean = true;
    errorCarga: boolean = false;
    datosYaCargados: boolean = false;

    constructor(
        private proyectoService: ProyectoService,
        private messageService: MessageService,
        private sanitizer: DomSanitizer,
        private route: ActivatedRoute,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.route.queryParams.subscribe((params) => {
            const proyectoId = params['proyecto'] || '1';
            const nominadoId = params['nominado'];

            // Si los datos ya están cargados y solo cambia el nominado,
            // no necesitamos recargar del servidor
            if (
                this.datosYaCargados &&
                this.proyecto &&
                this.proyecto.numero.toString() === proyectoId
            ) {
                if (nominadoId) {
                    this.mostrarNominadoPorId(nominadoId);
                } else {
                    this.mostrarCuadricula = true;
                    this.nominadoSeleccionado = null;
                }
            } else {
                // Primera carga o cambio de proyecto
                this.cargarProyecto(proyectoId, nominadoId);
            }
        });
    }

    cargarProyecto(id: string = '1', nominadoId?: string): void {
        this.cargando = true;
        this.proyectoService.getProyecto(id).subscribe({
            next: (response: any) => {
                this.proyecto = response.data[0];
                this.cargarNominados(this.proyecto._id, nominadoId);
            },
            error: (error) => {
                this.errorCarga = true;
                this.cargando = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo cargar la información del proyecto',
                });
                console.error('Error al cargar proyecto:', error);
            },
        });
    }

    cargarNominados(proyectoId: string, nominadoId?: string): void {
        this.proyectoService.getNominados(proyectoId).subscribe({
            next: (response: any) => {
                this.nominados = response.data;
                this.cargando = false;
                this.datosYaCargados = true;

                if (nominadoId) {
                    this.mostrarNominadoPorId(nominadoId);
                }
            },
            error: (error) => {
                this.errorCarga = true;
                this.cargando = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo cargar la lista de nominados',
                });
                console.error('Error al cargar nominados:', error);
            },
        });
    }

    // Método para mostrar un nominado por su ID sin recargar datos
    mostrarNominadoPorId(nominadoId: string): void {
        const nominado = this.nominados.find(
            (n) => n.numero.toString() === nominadoId
        );

        if (nominado) {
            this.seleccionarNominado(nominado, false);
        } else {
            this.mostrarCuadricula = true;
        }
    }

    actualizarURL(numero: string | number): void {
        if (!this.proyecto) return;

        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                proyecto: this.proyecto.numero,
                nominado: numero.toString(),
            },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    verDetalleNominado(nominado: Nominado): void {
        this.seleccionarNominado(nominado, true);
    }

    seleccionarNominado(
        nominado: Nominado,
        actualizarHistorial: boolean
    ): void {
        this.nominadoSeleccionado = nominado;
        this.mostrarCuadricula = false;

        if (actualizarHistorial) {
            this.actualizarURL(nominado.numero);
        }
    }

    verSiguienteNominado(): void {
        if (!this.nominadoSeleccionado || this.nominados.length <= 1) return;

        const indiceActual = this.nominados.findIndex(
            (n) => n.numero === this.nominadoSeleccionado?.numero
        );

        if (indiceActual === -1) return;

        const indiceSiguiente = (indiceActual + 1) % this.nominados.length;
        const siguienteNominado = this.nominados[indiceSiguiente];

        this.seleccionarNominado(siguienteNominado, true);
    }

    verAnteriorNominado(): void {
        if (!this.nominadoSeleccionado || this.nominados.length <= 1) return;

        const indiceActual = this.nominados.findIndex(
            (n) => n.numero === this.nominadoSeleccionado?.numero
        );

        if (indiceActual === -1) return;

        const indiceAnterior =
            (indiceActual - 1 + this.nominados.length) % this.nominados.length;
        const anteriorNominado = this.nominados[indiceAnterior];

        this.seleccionarNominado(anteriorNominado, true);
    }

    volverACuadricula(): void {
        this.nominadoSeleccionado = null;
        this.mostrarCuadricula = true;

        if (this.proyecto) {
            this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { proyecto: this.proyecto.numero },
                replaceUrl: true,
            });
        }
    }

    // Resto de métodos sin cambios...
    getNombreCompleto(nominado: Nominado): string {
        if (nominado.persona.nombreCompleto) {
            return nominado.persona.nombreCompleto;
        }
        return `${nominado.persona.nombre} ${
            nominado.persona.apellidos || ''
        }`.trim();
    }

    manejarErrorImagen(event: any): void {
        event.target.src = 'assets/images/placeholder.png';
    }

    getSafeHtml(contenido: string): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(contenido);
    }

    esContenidoHTML(contenido: string): boolean {
        if (!contenido) return false;
        const htmlRegex = /<[^>]*>/;
        return htmlRegex.test(contenido);
    }
}
