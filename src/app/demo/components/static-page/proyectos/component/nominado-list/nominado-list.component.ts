import { Component, OnInit } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProyectoService } from '../../service/proyecto.service';
import { Nominado, Proyecto } from '../../interface/proyecto.interfaces';
import { Router } from '@angular/router';
import { ImportsModule } from 'src/app/demo/services/import';

@Component({
    selector: 'app-nominado-list',
    templateUrl: './nominado-list.component.html',
    styleUrls: ['./nominado-list.component.scss'],
    standalone: true,
    imports: [ImportsModule],
    providers: [MessageService, ConfirmationService],
})
export class NominadoListComponent implements OnInit {
    nominados: Nominado[] = [];
    proyectos: Proyecto[] = [];
    proyectoSeleccionado: string = '';
    cargando: boolean = true;
    errorCarga: boolean = false;
    filtroGlobal: string = '';

    estadoOptions = [
        { label: 'Activo', value: 'activo' },
        { label: 'Inactivo', value: 'inactivo' },
        { label: 'Revisión', value: 'revision' },
    ];

    constructor(
        private proyectoService: ProyectoService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.cargarProyectos();
    }

    cargarProyectos(): void {
        this.cargando = true;
        this.proyectoService.getProyectos().subscribe({
            next: (response: any) => {
                this.proyectos = response.data;
                if (this.proyectos.length > 0) {
                    this.proyectoSeleccionado =
                        this.proyectos[0]._id.toString();
                    this.cargarNominados(this.proyectoSeleccionado);
                } else {
                    this.cargando = false;
                }
            },
            error: (error) => {
                this.errorCarga = true;
                this.cargando = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo cargar la lista de proyectos',
                });
                console.error('Error al cargar proyectos:', error);
            },
        });
    }

    cargarNominados(proyectoId: string): void {
        this.cargando = true;
        this.proyectoService.getNominados(proyectoId).subscribe({
            next: (response: any) => {
                this.nominados = response.data;
                this.cargando = false;
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

    onCambioProyecto(event: any): void {
        const proyectoId = event.value;
        console.log(proyectoId);
        this.cargarNominados(proyectoId);
    }

    crearNuevoNominado(): void {
        this.router.navigate(['/nominados/nuevo'], {
            queryParams: { proyecto: this.proyectoSeleccionado },
        });
    }

    editarNominado(nominado: Nominado): void {
        this.router.navigate(['/nominados/editar', nominado._id]);
    }

    verNominado(nominado: Nominado): void {
        const proyecto = this.proyectos.find(
            (p) => p._id === nominado.proyecto
        );
        if (proyecto) {
            this.router.navigate(['/proyectos'], {
                queryParams: {
                    proyecto: proyecto.numero,
                    nominado: nominado.numero,
                },
            });
        }
    }

    eliminarNominado(nominado: Nominado): void {
        this.confirmationService.confirm({
            message: `¿Está seguro que desea eliminar a "${this.getNombreCompleto(
                nominado
            )}"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                // Aquí iría la lógica para eliminar el nominado
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Nominado eliminado correctamente',
                });
            },
        });
    }

    filtrarTabla(event: any): void {
        const valor = event.target.value;
        this.filtroGlobal = valor;
    }

    getNombreCompleto(nominado: Nominado): string {
        if (nominado.persona.nombreCompleto) {
            return nominado.persona.nombreCompleto;
        }
        return `${nominado.persona.nombre} ${
            nominado.persona.apellidos || ''
        }`.trim();
    }

    getEstadoLabel(estado: string): string {
        const opcion = this.estadoOptions.find((opt) => opt.value === estado);
        return opcion ? opcion.label : estado;
    }

    getSeveridadEstado(
        estado: string
    ): 'success' | 'info' | 'secondary' | 'contrast' | 'warning' | 'danger' {
        switch (estado) {
            case 'activo':
                return 'success';
            case 'inactivo':
                return 'danger';
            case 'revision':
                return 'warning';
            default:
                return 'info';
        }
    }

    getNombreProyecto(proyectoId: string): string {
        const proyecto = this.proyectos.find((p) => p._id === proyectoId);
        return proyecto ? proyecto.nombre : 'N/A';
    }

    formatearFecha(fecha: Date | string | undefined): string {
        if (!fecha) return 'N/A';
        return new Date(fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }
}
