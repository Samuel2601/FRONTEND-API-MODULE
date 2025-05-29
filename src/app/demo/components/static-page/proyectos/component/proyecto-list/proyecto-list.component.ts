import { Component, OnInit } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProyectoService } from '../../service/proyecto.service';
import { Proyecto } from '../../interface/proyecto.interfaces';
import { Router } from '@angular/router';
import { ImportsModule } from 'src/app/demo/services/import';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';

@Component({
    selector: 'app-proyecto-list',
    templateUrl: './proyecto-list.component.html',
    styleUrls: ['./proyecto-list.component.scss'],
    standalone: true,
    imports: [ImportsModule],
    providers: [MessageService, ConfirmationService],
})
export class ProyectoListComponent implements OnInit {
    proyectos: Proyecto[] = [];
    cargando: boolean = true;
    errorCarga: boolean = false;
    filtroGlobal: string = '';

    public url = GLOBAL.url;

    estadoOptions = [
        { label: 'Activo', value: 'activo' },
        { label: 'Inactivo', value: 'inactivo' },
        { label: 'En proceso', value: 'en_proceso' },
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
                this.cargando = false;
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

    crearNuevoProyecto(): void {
        this.router.navigate(['/proyectos/nuevo']);
    }

    editarProyecto(proyecto: Proyecto): void {
        this.router.navigate(['/proyectos/editar', proyecto._id]);
    }

    verProyecto(proyecto: Proyecto): void {
        this.router.navigate(['/proyectos'], {
            queryParams: { proyecto: proyecto.numero },
        });
    }

    eliminarProyecto(proyecto: Proyecto): void {
        this.confirmationService.confirm({
            message: `¿Está seguro que desea eliminar el proyecto "${proyecto.nombre}"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                // Aquí iría la lógica para eliminar el proyecto
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Proyecto eliminado correctamente',
                });
            },
        });
    }

    filtrarTabla(event: any): void {
        const valor = event.target.value;
        this.filtroGlobal = valor;
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
            case 'en_proceso':
                return 'warning';
            default:
                return 'info';
        }
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
