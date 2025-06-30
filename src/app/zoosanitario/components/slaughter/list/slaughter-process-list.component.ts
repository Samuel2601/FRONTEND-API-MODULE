// src/app/components/slaughter-process-list/slaughter-process-list.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
    Subject,
    takeUntil,
    finalize,
    debounceTime,
    distinctUntilChanged,
} from 'rxjs';
import { ConfirmationService, MessageService, MenuItem } from 'primeng/api';
import { LazyLoadEvent } from 'primeng/api';
import {
    Introducer,
    SlaughterProcess,
    SlaughterProcessService,
    SlaughterProcessStatistics,
    PaginatedResponse,
} from 'src/app/zoosanitario/services/slaughter-process.service';
import { ImportsModule } from 'src/app/demo/services/import';
//import { SlaughterProcessFormComponent } from '../form/slaughter-process-form.component';
import { SlaughterProcessDashboardComponent } from '../dashboard/slaughter-process-dashboard.component';
import { SlaughterProcessDetailsComponent } from '../details/slaughter-process-details.component';
import { TableLazyLoadEvent } from 'primeng/table';

interface DropdownOption {
    label: string;
    value: any;
}

interface ProcessFilters {
    estado?: string;
    introductor?: string;
    fechaCreacion?: Date[];
}

@Component({
    selector: 'app-slaughter-process-list',
    standalone: true,
    imports: [
        ImportsModule,
        //SlaughterProcessFormComponent,
        SlaughterProcessDashboardComponent,
        SlaughterProcessDetailsComponent,
    ],
    templateUrl: './slaughter-process-list.component.html',
    styleUrls: ['./slaughter-process-list.component.scss'],
    providers: [ConfirmationService],
})
export class SlaughterProcessListComponent implements OnInit, OnDestroy {
    private readonly destroy$ = new Subject<void>();
    private readonly messageService = inject(MessageService);
    private readonly confirmationService = inject(ConfirmationService);

    constructor(private slaughterProcessService: SlaughterProcessService) {}

    // Estados del componente
    processes: SlaughterProcess[] = [];
    selectedProcesses: SlaughterProcess[] = [];
    selectedProcess: SlaughterProcess | null = null;
    selectedProcessId: string | null = null;
    statistics: SlaughterProcessStatistics | null = null;

    // Estados de UI
    loading = false;
    showDetailsDialog = false;
    showFormDialog = false;
    showDashboardDialog = false;
    canCreateProcess = true;

    // Paginación
    totalProcesses = 0;
    pageSize = 25;
    currentPage = 0;

    // Filtros y búsqueda
    searchOrder = '';
    filters: ProcessFilters = {};
    batchState = '';

    // Opciones para dropdowns
    stateOptions: DropdownOption[] = [
        { label: 'Todos los estados', value: null },
        { label: 'Iniciado', value: 'Iniciado' },
        { label: 'Pre-Faenamiento', value: 'PreFaenamiento' },
        { label: 'Pagado', value: 'Pagado' },
        { label: 'En Proceso', value: 'EnProceso' },
        { label: 'Finalizado', value: 'Finalizado' },
        { label: 'Anulado', value: 'Anulado' },
    ];

    introducerOptions: DropdownOption[] = [
        { label: 'Todos los introductores', value: null },
    ];

    ngOnInit(): void {
        this.loadInitialData();
        this.loadIntroducers();
        this.loadStatistics();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ========================================
    // MÉTODOS DE CARGA DE DATOS
    // ========================================

    loadInitialData(): void {
        this.loadProcesses({
            first: 0,
            rows: this.pageSize,
        });
    }

    loadProcesses(event?: TableLazyLoadEvent): void {
        this.loading = true;

        const queryParams = {
            page:
                Math.floor(
                    (event?.first || 0) / (event?.rows || this.pageSize)
                ) + 1,
            limit: event?.rows || this.pageSize,
            sort: this.buildSortString(event),
            populate: 'introductor recepcion inspeccionesExternas factura',
            filters: {},
        };

        const filters = this.buildFilters();
        if (Object.keys(filters).length > 0) {
            queryParams.filters = filters;
        }

        this.slaughterProcessService
            .getSlaughterProcesses(queryParams)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (response: any) => {
                    console.log('Procesos encontrados:', response);
                    this.processes = response.slaughterProcesses;
                    this.totalProcesses = response.pagination.totalDocs;
                    this.currentPage = response.page - 1;
                },
                error: (error) => {
                    console.error('Error loading processes:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cargar los procesos de faenamiento',
                    });
                    this.processes = [];
                    this.totalProcesses = 0;
                },
            });
    }

    loadStatistics(): void {
        this.slaughterProcessService
            .getStatistics(this.buildFilters())
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (stats: SlaughterProcessStatistics) => {
                    console.log('Estadísticas del proceso:', stats);
                    this.statistics = stats;
                },
                error: (error) => {
                    console.error('Error loading statistics:', error);
                    // No mostrar error al usuario para estadísticas
                    this.statistics = null;
                },
            });
    }

    loadIntroducers(): void {
        // En una implementación real, cargarías los introductores desde el servicio correspondiente
        // Por ahora mantenemos solo la opción por defecto
        this.introducerOptions = [
            { label: 'Todos los introductores', value: null },
        ];
    }

    // ========================================
    // MÉTODOS DE FILTRADO Y BÚSQUEDA
    // ========================================

    searchByOrder(): void {
        if (this.searchOrder.trim()) {
            this.loading = true;
            // Limpiar caché antes de la búsqueda
            this.slaughterProcessService.clearCache();

            this.slaughterProcessService
                .getSlaughterProcessByNumber(this.searchOrder.trim())
                .pipe(
                    takeUntil(this.destroy$),
                    finalize(() => (this.loading = false))
                )
                .subscribe({
                    next: (response: PaginatedResponse<SlaughterProcess>) => {
                        console.log('Proceso encontrado:', response);
                        this.processes = response.docs;
                        this.totalProcesses = response.totalDocs;
                        this.currentPage = 0;
                    },
                    error: (error) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'No se encontró el proceso con ese número de orden',
                        });
                        this.refresh();
                    },
                });
        } else {
            this.refresh();
        }
    }

    onFilterChange(): void {
        // Limpiar caché cuando cambien los filtros
        this.slaughterProcessService.clearCache();

        this.currentPage = 0;
        this.loadProcesses({
            first: 0,
            rows: this.pageSize,
        });
        this.loadStatistics();
    }

    buildFilters(): any {
        const filters: any = {};

        if (this.filters.estado) {
            filters.estado = this.filters.estado;
        }

        if (this.filters.introductor) {
            filters.introductor = this.filters.introductor;
        }

        if (
            this.filters.fechaCreacion &&
            this.filters.fechaCreacion.length === 2
        ) {
            filters.createdAt = {
                $gte: this.filters.fechaCreacion[0],
                $lte: this.filters.fechaCreacion[1],
            };
        }

        return filters;
    }

    buildSortString(event?: TableLazyLoadEvent): string {
        if (event?.sortField) {
            const direction = event.sortOrder === 1 ? '' : '-';
            if (typeof event.sortField === 'string') {
                return `${direction}${event.sortField}`;
            } else if (
                Array.isArray(event.sortField) &&
                event.sortField.length > 0
            ) {
                return `${direction}${event.sortField[0]}`;
            }
        }
        return '-createdAt'; // Orden por defecto
    }

    refresh(): void {
        // Limpiar caché completamente antes del refresh
        this.slaughterProcessService.clearCache();

        // Mostrar mensaje de actualización
        this.messageService.add({
            severity: 'info',
            summary: 'Actualizando',
            detail: 'Cargando datos actualizados...',
        });

        // Resetear filtros y estado
        this.searchOrder = '';
        this.filters = {};
        this.selectedProcesses = [];

        // Recargar datos
        this.loadProcesses({
            first: this.currentPage * this.pageSize,
            rows: this.pageSize,
        });
        this.loadStatistics();
    }

    // ========================================
    // MÉTODOS DE ACCIONES
    // ========================================

    openCreateDialog(): void {
        this.selectedProcessId = null;
        this.showFormDialog = true;
    }

    viewDetails(process: SlaughterProcess): void {
        this.selectedProcess = process;
        this.showDetailsDialog = true;
    }

    editProcess(process: SlaughterProcess): void {
        this.selectedProcessId = process._id!;
        this.showFormDialog = true;
    }

    editProcessFromDetails(): void {
        if (this.selectedProcess) {
            this.selectedProcessId = this.selectedProcess._id!;
            this.showDetailsDialog = false;
            this.showFormDialog = true;
        }
    }

    openDashboard(): void {
        this.showDashboardDialog = true;
    }

    // ========================================
    // MÉTODOS DE ACCIONES EN LOTE
    // ========================================

    updateBatchState(): void {
        if (!this.batchState || this.selectedProcesses.length === 0) {
            return;
        }

        this.confirmationService.confirm({
            message: `¿Está seguro de cambiar el estado de ${this.selectedProcesses.length} proceso(s) a "${this.batchState}"?`,
            header: 'Confirmar Cambio de Estado',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.processBatchStateUpdate();
            },
        });
    }

    private processBatchStateUpdate(): void {
        const updatePromises = this.selectedProcesses.map((process) =>
            this.slaughterProcessService
                .updateSlaughterProcessState(
                    process._id!,
                    this.batchState,
                    'Actualización en lote'
                )
                .toPromise()
        );

        Promise.all(updatePromises)
            .then(() => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: `Estado actualizado en ${this.selectedProcesses.length} proceso(s)`,
                });
                this.clearSelection();
                this.refresh();
            })
            .catch((error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al actualizar algunos procesos',
                });
            });
    }

    exportSelected(): void {
        if (this.selectedProcesses.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Debe seleccionar al menos un proceso para exportar',
            });
            return;
        }

        // Aquí implementarías la lógica de exportación
        this.messageService.add({
            severity: 'info',
            summary: 'Exportación',
            detail: 'Funcionalidad de exportación en desarrollo',
        });
    }

    clearSelection(): void {
        this.selectedProcesses = [];
        this.batchState = '';
    }

    // ========================================
    // MÉTODOS DE ACCIONES DEL PROCESO
    // ========================================

    getProcessActions(process: SlaughterProcess): MenuItem[] {
        const actions: MenuItem[] = [
            {
                label: 'Ver Resumen',
                icon: 'pi pi-info-circle',
                command: () => this.viewSummary(process),
            },
        ];

        const validTransitions = this.getValidTransitions(process.estado);
        if (validTransitions.length > 0) {
            actions.push({ separator: true });
            validTransitions.forEach((state) => {
                actions.push({
                    label: `Cambiar a ${state}`,
                    icon: this.getStateIcon(state),
                    command: () => this.changeProcessState(process, state),
                });
            });
        }

        if (process.estado !== 'Anulado' && process.estado !== 'Finalizado') {
            actions.push({ separator: true });
            actions.push({
                label: 'Anular Proceso',
                icon: 'pi pi-ban',
                command: () => this.cancelProcess(process),
            });
        }

        if (process.estado === 'Anulado') {
            actions.push({
                label: 'Restaurar',
                icon: 'pi pi-refresh',
                command: () => this.restoreProcess(process),
            });
        }

        actions.push({ separator: true });
        actions.push({
            label: 'Eliminar',
            icon: 'pi pi-trash',
            command: () => this.confirmDelete(process),
        });

        return actions;
    }

    viewSummary(process: SlaughterProcess): void {
        if (!process._id) return;
        console.log('viewSummary', process);
        this.slaughterProcessService
            .getSlaughterProcessSummary(process._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (summary) => {
                    console.log('Resumen del proceso:', summary);
                    this.messageService.add({
                        severity: 'info',
                        summary: 'Resumen',
                        detail: 'Ver consola para detalles del resumen',
                    });
                },
                error: (error) => {
                    console.error('Error loading summary:', error);
                },
            });
    }

    changeProcessState(process: SlaughterProcess, newState: string): void {
        this.confirmationService.confirm({
            message: `¿Está seguro de cambiar el estado del proceso "${process.numeroOrden}" a "${newState}"?`,
            header: 'Confirmar Cambio de Estado',
            icon: 'pi pi-question-circle',
            accept: () => {
                if (!process._id) return;

                this.slaughterProcessService
                    .updateSlaughterProcessState(process._id, newState)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => {
                            this.refresh();
                        },
                        error: (error) => {
                            console.error('Error updating state:', error);
                        },
                    });
            },
        });
    }

    cancelProcess(process: SlaughterProcess): void {
        this.confirmationService.confirm({
            message: `¿Está seguro de anular el proceso "${process.numeroOrden}"? Esta acción no se puede deshacer.`,
            header: 'Confirmar Anulación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                if (!process._id) return;

                const reason = 'Anulado por el usuario';
                this.slaughterProcessService
                    .cancelSlaughterProcess(process._id, reason)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => {
                            this.refresh();
                        },
                        error: (error) => {
                            console.error('Error canceling process:', error);
                        },
                    });
            },
        });
    }

    restoreProcess(process: SlaughterProcess): void {
        this.confirmationService.confirm({
            message: `¿Está seguro de restaurar el proceso "${process.numeroOrden}"?`,
            header: 'Confirmar Restauración',
            icon: 'pi pi-question-circle',
            accept: () => {
                if (!process._id) return;

                this.slaughterProcessService
                    .restoreSlaughterProcess(process._id)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => {
                            this.refresh();
                        },
                        error: (error) => {
                            console.error('Error restoring process:', error);
                        },
                    });
            },
        });
    }

    confirmDelete(process: SlaughterProcess): void {
        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar el proceso "${process.numeroOrden}"? Esta acción requiere justificación.`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-trash',
            accept: () => {
                if (!process._id) return;

                const reason = 'Eliminado por el usuario'; // En una implementación real, esto debería ser un prompt
                this.slaughterProcessService
                    .deleteSlaughterProcessWithJustification(
                        process._id,
                        reason
                    )
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => {
                            this.refresh();
                        },
                        error: (error) => {
                            console.error('Error deleting process:', error);
                        },
                    });
            },
        });
    }

    // ========================================
    // MÉTODOS DE EVENTOS
    // ========================================

    onProcessSaved(process?: SlaughterProcess): void {
        this.showFormDialog = false;
        this.refresh();
        this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Proceso guardado correctamente',
        });
    }

    onProcessUpdated(process?: SlaughterProcess): void {
        this.refresh();
        this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Proceso actualizado correctamente',
        });
    }

    onFormDialogClosed(): void {
        this.showFormDialog = false;
        this.selectedProcessId = null;
    }

    // ========================================
    // MÉTODOS AUXILIARES
    // ========================================

    canEditProcess(process: SlaughterProcess | null): boolean {
        if (!process) return false;
        return process.estado !== 'Finalizado' && process.estado !== 'Anulado';
    }

    getValidTransitions(currentState: string): string[] {
        const transitions: { [key: string]: string[] } = {
            Iniciado: ['PreFaenamiento'],
            PreFaenamiento: ['Pagado'],
            Pagado: ['EnProceso'],
            EnProceso: ['Finalizado'],
            Finalizado: [],
            Anulado: [],
        };
        return transitions[currentState] || [];
    }

    getStateSeverity(
        state: string
    ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
        const severities: { [key: string]: any } = {
            Iniciado: 'info',
            PreFaenamiento: 'warning',
            Pagado: 'info',
            EnProceso: 'warning',
            Finalizado: 'success',
            Anulado: 'danger',
        };
        return severities[state] || 'secondary';
    }

    getStateIcon(state: string): string {
        const icons: { [key: string]: string } = {
            Iniciado: 'pi pi-play',
            PreFaenamiento: 'pi pi-clock',
            Pagado: 'pi pi-dollar',
            EnProceso: 'pi pi-cog',
            Finalizado: 'pi pi-check',
            Anulado: 'pi pi-ban',
        };
        return icons[state] || 'pi pi-circle';
    }

    getIntroducerName(introductor: string | Introducer): string {
        if (typeof introductor === 'string') {
            return 'Cargando...';
        }
        return introductor?.name || 'N/A';
    }

    getIntroducerType(introductor: string | Introducer): string {
        if (typeof introductor === 'string') {
            return '';
        }
        return introductor?.personType || '';
    }

    getReceptionDate(recepcion: any): Date | null {
        if (typeof recepcion === 'string') {
            return null;
        }
        return recepcion?.fechaHoraRecepcion || null;
    }

    getReceptionCertificate(recepcion: any): string {
        if (typeof recepcion === 'string') {
            return 'Cargando...';
        }
        return (
            recepcion?.animalHealthCertificate?.numeroCZPM || 'Sin certificado'
        );
    }

    getInspectionsCount(inspections: string[] | any[]): string {
        if (!inspections) return '0';
        return inspections.length.toString();
    }

    hasInvoice(factura: string[] | any[]): boolean {
        return factura && factura.length > 0;
    }

    getUserName(user: string | any): string {
        if (typeof user === 'string') {
            return 'Cargando...';
        }
        if (user && user.name) {
            return user.last_name
                ? `${user.name} ${user.last_name}`
                : user.name;
        }
        return 'N/A';
    }

    getIntroducerDocument(introducer: any): string | null {
        if (typeof introducer === 'string') {
            return null;
        }
        return introducer?.document;
    }

    getReceptionState(reception: any): string | null {
        if (typeof reception === 'string') {
            return null;
        }
        return reception?.estado;
    }
    hasInspections(inspections: any[]): boolean {
        return inspections && inspections.length > 0;
    }

    getInspectionsStatus(inspections: any[]): string {
        if (!inspections) return 'Sin inspecciones';

        const pending = inspections.filter((i) => i.resultado === 'Pendiente');
        const aptas = inspections.filter((i) => i.resultado === 'Apto');
        const devoluciones = inspections.filter(
            (i) => i.resultado === 'Devolución'
        );
        const cuarentenas = inspections.filter(
            (i) => i.resultado === 'Cuarentena'
        );
        const comisiones = inspections.filter(
            (i) => i.resultado === 'Comisión'
        );

        if (pending.length > 0) {
            return `${pending.length} inspecciones pendientes`;
        } else if (aptas.length > 0) {
            return `${aptas.length} inspecciones aptas`;
        } else if (devoluciones.length > 0) {
            return `${devoluciones.length} inspecciones devueltas`;
        } else if (cuarentenas.length > 0) {
            return `${cuarentenas.length} inspecciones cuarentenas`;
        } else if (comisiones.length > 0) {
            return `${comisiones.length} inspecciones comisionadas`;
        } else {
            return 'Sin inspecciones';
        }
    }

    getInvoiceNumber(invoices: any[]): string {
        if (!invoices) return 'Sin facturas';

        const invoice = invoices.find((i) => i.status === 'Generated');
        if (invoice) {
            return invoice.invoiceNumber;
        }
        return 'Sin facturas';
    }

    getReceptionStateSeverity(
        state: string
    ): 'success' | 'info' | 'warning' | 'danger' {
        const severities: { [key: string]: any } = {
            Pendiente: 'warning',
            Procesando: 'info',
            Completado: 'success',
            Rechazado: 'danger',
        };
        return severities[state] || 'info';
    }
}
