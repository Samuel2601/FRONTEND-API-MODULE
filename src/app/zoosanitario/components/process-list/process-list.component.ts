import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import {
    takeUntil,
    finalize,
    debounceTime,
    distinctUntilChanged,
} from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Table } from 'primeng/table';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    SlaughterProcess,
    SlaughterProcessDashboard,
    SlaughterProcessService,
} from '../../services/slaughter-process.service';
import {
    Introducer,
    IntroducerService,
} from '../../services/introducer.service';

interface ProcessFilter {
    global?: string;
    processNumber?: string;
    introducerName?: string;
    status?: string;
    species?: string;
    dateFrom?: Date;
    dateTo?: Date;
}

interface StatusOption {
    label: string;
    value: string;
    severity: 'success' | 'info' | 'warning' | 'danger' | 'secondary';
    icon: string;
}

interface StatusOption {
    label: string;
    value: string;
    severity: 'success' | 'info' | 'warning' | 'danger' | 'secondary';
    icon: string;
}

@Component({
    selector: 'app-process-list',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './process-list.component.html',
    styleUrls: ['./process-list.component.scss'],
    providers: [ConfirmationService],
})
export class ProcessListComponent implements OnInit, OnDestroy {
    @ViewChild('dt') table!: Table;

    private destroy$ = new Subject<void>();

    // Estados de carga
    loading = true;
    refreshing = false;

    // Datos
    processes: SlaughterProcess[] = [];
    totalRecords = 0;
    introducers: Introducer[] = [];
    dashboardData: SlaughterProcessDashboard | null = null;

    // Paginación
    first = 0;
    rows = 10;
    rowsPerPageOptions = [5, 10, 20, 50];

    // Filtros
    filters: ProcessFilter = {};
    globalFilterValue = '';

    // Opciones para filtros
    statusOptions: StatusOption[] = [
        {
            label: 'Todos',
            value: '',
            severity: 'secondary',
            icon: 'pi pi-list',
        },
        {
            label: 'Recepción',
            value: 'RECEPTION',
            severity: 'info',
            icon: 'pi pi-inbox',
        },
        {
            label: 'Verificación de Pagos',
            value: 'PAYMENT_VERIFICATION',
            severity: 'warning',
            icon: 'pi pi-credit-card',
        },
        {
            label: 'Inspección Externa',
            value: 'EXTERNAL_INSPECTION',
            severity: 'info',
            icon: 'pi pi-search',
        },
        {
            label: 'Faenamiento',
            value: 'SLAUGHTER',
            severity: 'warning',
            icon: 'pi pi-cog',
        },
        {
            label: 'Inspección Interna',
            value: 'INTERNAL_INSPECTION',
            severity: 'info',
            icon: 'pi pi-shield',
        },
        {
            label: 'Despacho',
            value: 'DISPATCH',
            severity: 'success',
            icon: 'pi pi-send',
        },
        {
            label: 'Completado',
            value: 'COMPLETED',
            severity: 'success',
            icon: 'pi pi-check-circle',
        },
        {
            label: 'Cancelado',
            value: 'CANCELLED',
            severity: 'danger',
            icon: 'pi pi-times-circle',
        },
        {
            label: 'Suspendido',
            value: 'SUSPENDED',
            severity: 'danger',
            icon: 'pi pi-pause-circle',
        },
    ];

    speciesOptions = [
        { label: 'Todas las Especies', value: '' },
        { label: 'Bovino', value: 'BOVINE' },
        { label: 'Porcino', value: 'PORCINE' },
    ];

    // Columnas de la tabla
    columns = [
        { field: 'processNumber', header: 'Número de Proceso', sortable: true },
        { field: 'introducer', header: 'Introductor', sortable: false },
        { field: 'overallStatus', header: 'Estado', sortable: true },
        {
            field: 'reception.receivedAnimals',
            header: 'Animales',
            sortable: false,
        },
        { field: 'createdAt', header: 'Fecha de Inicio', sortable: true },
        {
            field: 'financialData.totalCosts.totalAmount',
            header: 'Costo Total',
            sortable: true,
        },
        { field: 'actions', header: 'Acciones', sortable: false },
    ];

    exportOptions = [
        {
            label: 'Excel',
            icon: 'pi pi-file-excel',
            command: () => this.exportData('excel'),
        },
        {
            label: 'CSV',
            icon: 'pi pi-file',
            command: () => this.exportData('csv'),
        },
        {
            label: 'PDF',
            icon: 'pi pi-file-pdf',
            command: () => this.exportData('pdf'),
        },
    ];

    // Columnas visibles (para personalización)
    selectedColumns = [...this.columns];

    //Función para trackear filas
    someSelectedColumns(column: string): boolean {
        return this.selectedColumns.some((col) => col.field === column);
    }

    get columnsCount(): number {
        // Adjust the keys to match your column field names
        return this.selectedColumns?.length || 0;
    }

    constructor(
        private slaughterService: SlaughterProcessService,
        private introducerService: IntroducerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.loadData();
        this.loadIntroducers();
        this.loadDashboardStats();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Cargar datos principales
     */
    loadData(event?: any): void {
        this.loading = !event; // Si viene de lazy loading, no mostrar loading general

        const page = event ? event.first / event.rows + 1 : 1;
        const limit = event ? event.rows : this.rows;

        // Construir filtros
        const filters: any = {
            page,
            limit,
        };

        if (this.filters.status) {
            filters.status = this.filters.status;
        }

        if (this.filters.processNumber) {
            filters.processNumber = this.filters.processNumber;
        }

        if (this.filters.species) {
            filters.species = this.filters.species;
        }

        if (this.filters.dateFrom) {
            filters.dateFrom = this.filters.dateFrom;
        }

        if (this.filters.dateTo) {
            filters.dateTo = this.filters.dateTo;
        }

        if (this.globalFilterValue) {
            filters.search = this.globalFilterValue;
        }

        this.slaughterService
            .searchProcesses(filters)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => {
                    this.loading = false;
                    this.refreshing = false;
                })
            )
            .subscribe({
                next: (response) => {
                    this.processes = response.processes;
                    this.totalRecords = response.total;

                    if (event) {
                        this.first = event.first;
                        this.rows = event.rows;
                    }
                },
                error: (error) => {
                    console.error('Error cargando procesos:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudieron cargar los procesos',
                    });
                },
            });
    }

    /**
     * Obtener conteo de procesos por estado
     */
    getStatusCount(status: string): number {
        if (!this.dashboardData?.processesByStatus) return 0;

        const statusKey =
            status.toLowerCase() as keyof typeof this.dashboardData.processesByStatus;
        return this.dashboardData.processesByStatus[statusKey] || 0;
    }

    /**
     * Actualizar método rowTrackBy si no existe
     */
    rowTrackBy = (index: number, item: SlaughterProcess): any => {
        return item._id;
    };

    /**
     * Cargar lista de introductores para filtros
     */
    private loadIntroducers(): void {
        this.introducerService
            .getAllIntroducers()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (introducers) => {
                    this.introducers = introducers;
                },
                error: (error) => {
                    console.error('Error cargando introductores:', error);
                },
            });
    }

    /**
     * Cargar estadísticas del dashboard
     */
    private loadDashboardStats(): void {
        this.slaughterService
            .getDashboard()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data) => {
                    this.dashboardData = data;
                },
                error: (error) => {
                    console.error('Error cargando estadísticas:', error);
                },
            });
    }

    /**
     * Aplicar filtro global
     */
    onGlobalFilter(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.globalFilterValue = value;

        // Debounce para evitar demasiadas llamadas
        setTimeout(() => {
            this.loadData();
        }, 500);
    }

    /**
     * Limpiar filtros
     */
    clearFilters(): void {
        this.globalFilterValue = '';
        this.filters = {};
        this.table.clear();
        this.loadData();
    }

    /**
     * Aplicar filtros específicos
     */
    applyFilters(): void {
        this.first = 0; // Resetear paginación
        this.loadData();
    }

    /**
     * Refrescar datos
     */
    refresh(): void {
        this.refreshing = true;
        this.loadData();
        this.loadDashboardStats();

        this.messageService.add({
            severity: 'success',
            summary: 'Actualizado',
            detail: 'Lista de procesos actualizada',
        });
    }

    /**
     * Ver detalles de un proceso
     */
    viewProcess(process: SlaughterProcess): void {
        this.router.navigate(['/faenamiento/procesos', process._id]);
    }

    /**
     * Editar proceso (navegar a la etapa correspondiente)
     */
    editProcess(process: SlaughterProcess): void {
        switch (process.overallStatus) {
            case 'RECEPTION':
            case 'PAYMENT_VERIFICATION':
                this.router.navigate([
                    '/faenamiento/procesos',
                    process._id,
                    'recepcion',
                ]);
                break;
            case 'EXTERNAL_INSPECTION':
                this.router.navigate([
                    '/faenamiento/procesos',
                    process._id,
                    'inspeccion-externa',
                ]);
                break;
            case 'SLAUGHTER':
                this.router.navigate([
                    '/faenamiento/procesos',
                    process._id,
                    'faenamiento',
                ]);
                break;
            case 'INTERNAL_INSPECTION':
                this.router.navigate([
                    '/faenamiento/procesos',
                    process._id,
                    'inspeccion-interna',
                ]);
                break;
            case 'DISPATCH':
                this.router.navigate([
                    '/faenamiento/procesos',
                    process._id,
                    'despacho',
                ]);
                break;
            default:
                this.viewProcess(process);
        }
    }

    /**
     * Cancelar proceso
     */
    cancelProcess(process: SlaughterProcess): void {
        this.confirmationService.confirm({
            message: `¿Está seguro de que desea cancelar el proceso ${process.processNumber}?`,
            header: 'Confirmar Cancelación',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                // Aquí iría la lógica para cancelar el proceso
                this.messageService.add({
                    severity: 'info',
                    summary: 'Proceso Cancelado',
                    detail: `El proceso ${process.processNumber} ha sido cancelado`,
                });
                this.refresh();
            },
        });
    }

    /**
     * Navegar a nuevo proceso
     */
    newProcess(): void {
        this.router.navigate(['/faenamiento/recepcion']);
    }

    /**
     * Exportar datos
     */
    exportData(format: 'csv' | 'excel' | 'pdf'): void {
        // Implementar lógica de exportación
        this.messageService.add({
            severity: 'info',
            summary: 'Exportando',
            detail: `Generando archivo ${format.toUpperCase()}...`,
        });
    }

    /**
     * Obtener nombre del introductor
     */
    getIntroducerName(process: SlaughterProcess): string {
        if (process.introducer) {
            if (process.introducer.type === 'NATURAL') {
                return `${process.introducer.firstName} ${process.introducer.lastName}`;
            } else {
                return process.introducer.companyName || 'Sin nombre';
            }
        }
        return 'N/A';
    }

    /**
     * Obtener etiqueta de estado en español
     */
    getStatusLabel(status: string): string {
        return this.slaughterService.getStatusLabel(status);
    }

    /**
     * Obtener severidad del estado
     */
    getStatusSeverity(
        status: string
    ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
        const statusOption = this.statusOptions.find(
            (opt) => opt.value === status
        );
        return statusOption?.severity || 'secondary';
    }

    /**
     * Obtener ícono del estado
     */
    getStatusIcon(status: string): string {
        const statusOption = this.statusOptions.find(
            (opt) => opt.value === status
        );
        return statusOption?.icon || 'pi pi-circle';
    }

    /**
     * Obtener total de animales en un proceso
     */
    getTotalAnimals(process: SlaughterProcess): number {
        return process.reception?.receivedAnimals?.length || 0;
    }

    /**
     * Obtener especies de animales en un proceso
     */
    getSpeciesSummary(process: SlaughterProcess): string {
        if (!process.reception?.receivedAnimals?.length) return 'N/A';

        const bovine = process.reception.receivedAnimals.filter(
            (a) => a.species === 'BOVINE'
        ).length;
        const porcine = process.reception.receivedAnimals.filter(
            (a) => a.species === 'PORCINE'
        ).length;

        const parts = [];
        if (bovine > 0) parts.push(`${bovine} Bovino${bovine > 1 ? 's' : ''}`);
        if (porcine > 0)
            parts.push(`${porcine} Porcino${porcine > 1 ? 's' : ''}`);

        return parts.join(', ');
    }

    /**
     * Calcular progreso del proceso
     */
    getProcessProgress(status: string): number {
        return this.slaughterService.calculateProcessProgress(status);
    }

    /**
     * Formatear moneda
     */
    formatCurrency(value: number): string {
        if (!value) return '$0.00';
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    }

    /**
     * Calcular días transcurridos
     */
    getDaysElapsed(startDate: Date): number {
        const now = new Date();
        const start = new Date(startDate);
        const diffTime = Math.abs(now.getTime() - start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Verificar si el proceso está retrasado
     */
    isProcessDelayed(process: SlaughterProcess): boolean {
        const daysElapsed = this.getDaysElapsed(process.createdAt!);
        // Considerar retrasado si lleva más de 2 días y no está completado
        return daysElapsed > 2 && process.overallStatus !== 'COMPLETED';
    }

    /**
     * Obtener próxima acción recomendada
     */
    getNextAction(process: SlaughterProcess): string {
        switch (process.overallStatus) {
            case 'RECEPTION':
                return 'Validar Certificado';
            case 'PAYMENT_VERIFICATION':
                return 'Verificar Pagos';
            case 'EXTERNAL_INSPECTION':
                return 'Inspección Externa';
            case 'SLAUGHTER':
                return 'Proceso de Faenamiento';
            case 'INTERNAL_INSPECTION':
                return 'Inspección Interna';
            case 'DISPATCH':
                return 'Crear Envío';
            case 'COMPLETED':
                return 'Proceso Completado';
            case 'CANCELLED':
                return 'Proceso Cancelado';
            case 'SUSPENDED':
                return 'Revisar Suspensión';
            default:
                return 'Sin acción definida';
        }
    }

    /**
     * Verificar si se puede editar el proceso
     */
    canEditProcess(process: SlaughterProcess): boolean {
        return !['COMPLETED', 'CANCELLED'].includes(process.overallStatus);
    }

    /**
     * Verificar si se puede cancelar el proceso
     */
    canCancelProcess(process: SlaughterProcess): boolean {
        return !['COMPLETED', 'CANCELLED'].includes(process.overallStatus);
    }

    /**
     * Obtener clase CSS para fila de la tabla
     */
    getRowClass(process: SlaughterProcess): string {
        if (process.overallStatus === 'COMPLETED') return 'row-completed';
        if (process.overallStatus === 'CANCELLED') return 'row-cancelled';
        if (process.overallStatus === 'SUSPENDED') return 'row-suspended';
        if (this.isProcessDelayed(process)) return 'row-delayed';
        return '';
    }

    /**
     * Manejar selección de columnas
     */
    onColumnToggle(event: any): void {
        this.selectedColumns = event.value;
    }
}
