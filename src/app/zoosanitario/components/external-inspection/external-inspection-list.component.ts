import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import { Router, ActivatedRoute } from '@angular/router';

import {
    ExternalInspectionService,
    ExternalInspection,
    InspectionSummary,
    InspectionStatistics,
} from '../../services/external-inspection.service';
import { ExternalInspectionFormComponent } from './form/external-inspection-form.component';
import { AnimalTypeService } from '../../services/animal-type.service';
import { IonSplitPane } from '@ionic/angular/standalone';

interface InspectionFilters {
    resultado?: string;
    especie?: string;
    fecha?: Date;
    veterinario?: string;
}

// Nueva interfaz para estadísticas del backend
interface BackendStatistics {
    total: number;
    averages: {
        age: number;
        weight: number;
        temperature: number;
        heartRate: number;
        respiratoryRate: number;
    };
    resultBreakdown: {
        apto: number;
        devolucion: number;
        cuarentena: number;
        comision: number;
    };
    speciesBreakdown: Record<string, number>;
    sexBreakdown: {
        macho: number;
        hembra: number;
    };
}

// Interfaz adaptada para el frontend
interface AdaptedStatistics {
    total: number;
    pendientes: number;
    aptas: number;
    devolucion: number;
    cuarentena: number;
    comision: number;
    averages?: {
        age: number;
        weight: number;
        temperature: number;
        heartRate: number;
        respiratoryRate: number;
    };
    speciesBreakdown?: Record<string, number>;
    sexBreakdown?: {
        macho: number;
        hembra: number;
    };
}

@Component({
    selector: 'app-external-inspection-list',
    standalone: true,
    imports: [IonSplitPane, ImportsModule, ExternalInspectionFormComponent],
    templateUrl: './external-inspection-list.component.html',
    styleUrls: ['./external-inspection-list.component.scss'],
    providers: [ConfirmationService],
})
export class ExternalInspectionListComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    // Inputs del componente
    @Input() receptionId?: string;
    @Input() processId?: string;
    @Input() inspectionNumber?: string;

    // Estados
    loading = false;
    inspections: ExternalInspection[] = [];
    totalInspections = 0;
    statistics: AdaptedStatistics | null = null;

    // Control de modo de visualización
    showingAllInspections = false; // Nuevo: controla si mostramos todas o una específica

    // Filtros y búsqueda
    filters: InspectionFilters = {};
    searchNumber = '';

    // Paginación
    currentPage = 1;
    pageSize = 25;

    // Selección
    selectedInspections: ExternalInspection[] = [];
    batchResult = '';

    // Diálogos
    showDetailsDialog = false;
    showFormDialog = false;
    showPhotoViewer = false;
    selectedInspection: ExternalInspection | null = null;
    selectedInspectionId: string | null = null;
    selectedPhoto = '';

    // Navegación entre registros
    currentInspectionIndex = -1;

    // Fase actual del proceso
    phase: 'recepcion' | 'anteMortem' = 'recepcion';

    // Opciones para el switch de fases
    phaseOptions = [
        { label: 'Recepción', value: 'recepcion', icon: 'pi pi-clipboard' },
        { label: 'Ante Mortem', value: 'anteMortem', icon: 'pi pi-heart' },
    ];

    // Opciones para dropdowns
    resultOptions = [
        { label: 'Todos', value: '' },
        { label: 'Pendiente', value: 'Pendiente' },
        { label: 'Apto', value: 'Apto' },
        { label: 'Devolución', value: 'Devolución' },
        { label: 'Cuarentena', value: 'Cuarentena' },
        { label: 'Comisión', value: 'Comisión' },
    ];

    speciesOptions: any = [];

    constructor(
        private externalInspectionService: ExternalInspectionService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private route: ActivatedRoute,
        private router: Router,
        private animalType: AnimalTypeService
    ) {}

    ngOnInit(): void {
        this.initializeComponent();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private initializeComponent(): void {
        // Obtener la fase desde los datos de la ruta
        this.phase =
            this.route.snapshot.firstChild?.data['phase'] ||
            this.route.snapshot.data['phase'] ||
            'recepcion'; // Valor por defecto

        // Determinar IDs según la fase
        if (this.phase === 'recepcion') {
            this.receptionId =
                this.route.snapshot.paramMap.get('receptionId') || undefined;
        } else if (this.phase === 'anteMortem') {
            this.processId =
                this.route.snapshot.paramMap.get('processId') || undefined;
        }

        this.inspectionNumber =
            this.route.snapshot.paramMap.get('inspectionNumber') || undefined;

        // Determinar si estamos en vista específica o general
        if (this.receptionId || this.processId || this.inspectionNumber) {
            this.showingAllInspections = false;
        } else {
            this.showingAllInspections = true;
        }

        console.log('INICIALIZANDO COMPONENTE DE EXTERNAL INSPECTIONS', {
            inspectionNumber: this.inspectionNumber,
            phase: this.phase,
            receptionId: this.receptionId,
            processId: this.processId,
            showingAllInspections: this.showingAllInspections,
        });

        if (this.inspectionNumber) {
            this.searchBySpecificNumber(this.inspectionNumber);
        } else {
            this.loadInspections();
            this.loadStatistics();
        }
        this.loadAnimalTypes();
    }

    loadAnimalTypes(): void {
        this.animalType
            .getAll({
                limit: 100,
                slaughter: true,
                fields: 'species,category',
            })
            .subscribe({
                next: (response: any) => {
                    console.log('Tipos de animales cargados:', response);
                    this.speciesOptions = response.data.animalTypes
                        .filter((a: any) => a.species && a.category)
                        .map((a: any) => ({
                            label: `${a.species} (${a.category})`,
                            value: a._id,
                        }));
                },
                error: (error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cargar tipos de animales',
                    });
                    this.loading = false;
                },
            });
    }

    loadInspections(event?: any, cache: boolean = true): void {
        // Si estamos mostrando todas las inspecciones, no aplicar filtro por número específico
        if (this.showingAllInspections) {
            this.loadAllInspections(event, cache);
            return;
        }

        if (this.isSearchMode) return;

        this.loading = true;

        if (event) {
            this.currentPage = Math.floor(event.first / event.rows) + 1;
            this.pageSize = event.rows;
        }
        console.log(
            'loadInspections',
            this.receptionId,
            this.processId,
            this.inspectionNumber
        );

        const inspectionNumber =
            this.receptionId || this.processId || this.inspectionNumber;

        if (inspectionNumber) {
            return this.searchBySpecificNumber(inspectionNumber);
        }

        // Si no hay número específico, cargar todas
        this.loadAllInspections(event, cache);
    }

    private loadAllInspections(event?: any, cache: boolean = true): void {
        this.loading = true;

        if (event) {
            this.currentPage = Math.floor(event.first / event.rows) + 1;
            this.pageSize = event.rows;
        }

        const filters: any = { ...this.filters };

        // Limpiar filtros vacíos
        Object.keys(filters).forEach((key) => {
            if (
                filters[key] === '' ||
                filters[key] === null ||
                filters[key] === undefined
            ) {
                delete filters[key];
            }
        });

        const queryParams: any = {
            page: this.currentPage.toString(),
            limit: this.pageSize.toString(),
            sort: JSON.stringify({ createdAt: -1 }),
            populate: 'recepcion especie',
            phase: this.phase,
        };

        if (Object.keys(filters).length > 0) {
            queryParams.filters = filters;
        }

        this.externalInspectionService
            .getInspections(queryParams, cache)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (response: any) => {
                    if (response.data) {
                        this.inspections = response.data.docs || [];
                        this.totalInspections = response.data.totalDocs || 0;
                    } else {
                        this.inspections = Array.isArray(response)
                            ? response
                            : [];
                        this.totalInspections = this.inspections.length;
                    }
                },
                error: (error) => {
                    console.error('Error cargando inspecciones:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudieron cargar las inspecciones',
                    });
                },
            });
    }

    clearSearch(): void {
        console.log('Limpiando búsqueda y mostrando todas las inspecciones');

        // Limpiar todos los filtros y parámetros de búsqueda
        this.showingAllInspections = true;
        this.isSearchMode = false;
        this.searchNumber = '';
        this.filters = {};
        this.currentPage = 1;

        // Limpiar IDs específicos
        this.receptionId = undefined;
        this.processId = undefined;
        this.inspectionNumber = undefined;

        // Limpiar la URL sin recargar la página
        this.clearUrlParams();

        // Recargar todas las inspecciones
        this.loadAllInspections(null, false);
        this.loadStatistics(false);

        this.messageService.add({
            severity: 'info',
            summary: 'Búsqueda Limpiada',
            detail: 'Mostrando todas las inspecciones disponibles',
        });
    }

    private clearUrlParams(): void {
        try {
            // Obtener la URL actual sin parámetros
            const url = this.router.url.split('?')[0];
            const baseUrl = url.split('/').slice(0, -1).join('/'); // Remover el último segmento (ID específico)

            // Navegar a la URL base sin parámetros
            this.router.navigateByUrl(baseUrl, { replaceUrl: true });
        } catch (error) {
            console.warn('No se pudo limpiar la URL:', error);
        }
    }

    loadStatistics(cache: boolean = true): void {
        const filters: any = { ...this.filters };

        Object.keys(filters).forEach((key) => {
            if (
                filters[key] === '' ||
                filters[key] === null ||
                filters[key] === undefined
            ) {
                delete filters[key];
            }
        });

        // Agregar la fase a los parámetros de estadísticas
        const statsParams = {
            ...filters,
            phase: this.phase,
        };

        this.externalInspectionService
            .getStatistics(statsParams, cache)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    if (response.data) {
                        this.statistics = this.adaptStatistics(
                            response.data.general
                                ? response.data.general
                                : response.data
                        );
                    }
                },
                error: (error) => {
                    console.error('Error cargando estadísticas:', error);
                },
            });
    }

    private adaptStatistics(backendStats: any): AdaptedStatistics {
        console.log('Adaptando estadísticas:', backendStats);

        // Determinar qué estadísticas usar según la fase actual
        let currentStats: any;
        if (this.phase === 'recepcion') {
            currentStats = backendStats.recepcionStats || backendStats;
        } else {
            currentStats = backendStats.anteMortemStats || backendStats;
        }

        // Si no tenemos estadísticas específicas de la fase, usar el formato anterior
        if (!currentStats.total && backendStats.total) {
            currentStats = backendStats;
        }

        const pendientes =
            currentStats.total -
            (currentStats.resultBreakdown?.apto || 0) -
            (currentStats.resultBreakdown?.devolucion || 0) -
            (currentStats.resultBreakdown?.cuarentena || 0) -
            (currentStats.resultBreakdown?.comision || 0);

        return {
            total: currentStats.total || 0,
            pendientes: Math.max(0, pendientes),
            aptas: currentStats.resultBreakdown?.apto || 0,
            devolucion: currentStats.resultBreakdown?.devolucion || 0,
            cuarentena: currentStats.resultBreakdown?.cuarentena || 0,
            comision: currentStats.resultBreakdown?.comision || 0,
            averages: currentStats.averages,
            speciesBreakdown: currentStats.speciesBreakdown,
            sexBreakdown: currentStats.sexBreakdown,
        };
    }

    isSearchMode = false;

    searchBySpecificNumber(numero: string): void {
        this.isSearchMode = true;
        this.loading = true;
        this.externalInspectionService
            .getInspectionByNumber(numero)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (response: any) => {
                    console.log('Respuesta de búsqueda:', response);
                    if (response.data) {
                        if (Array.isArray(response.data)) {
                            this.inspections = response.data;
                            this.totalInspections = response.data.length || 0;
                        } else {
                            this.inspections = [response.data];
                            this.totalInspections = 1;
                        }
                    } else {
                        this.inspections = Array.isArray(response)
                            ? response
                            : [response];
                        this.totalInspections = Array.isArray(response)
                            ? response.length
                            : 1;
                    }
                },
                error: (error) => {
                    console.error('Error buscando inspección:', error);
                    this.inspections = [];
                    this.totalInspections = 0;
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'No Encontrado',
                        detail: `No se encontró la inspección ${numero}`,
                    });
                },
            });
    }

    searchByNumber(): void {
        console.log('Buscando por número', this.searchNumber);
        if (this.searchNumber.trim()) {
            this.isSearchMode = true;
            this.showingAllInspections = false;
            this.searchBySpecificNumber(this.searchNumber.trim());
        } else {
            this.isSearchMode = false;
            this.showingAllInspections = true;
            this.loadInspections();
        }
    }

    onFilterChange(): void {
        this.currentPage = 1;
        this.loadInspections();
        this.loadStatistics();
    }

    onPhaseChange(): void {
        console.log('Cambiando fase a:', this.phase);

        // Reiniciar los datos
        this.currentPage = 1;
        this.selectedInspections = [];
        this.filters = {};
        this.searchNumber = '';
        this.isSearchMode = false;

        // Recargar datos para la nueva fase
        this.loadInspections(null, false);
        this.loadStatistics(false);

        this.messageService.add({
            severity: 'info',
            summary: 'Fase Cambiada',
            detail: `Mostrando datos de ${this.getPhaseTitle()}`,
        });
    }

    refresh(): void {
        this.currentPage = 1;
        this.selectedInspections = [];

        // Si no estamos mostrando todas, mantener el modo de búsqueda específica
        if (!this.showingAllInspections) {
            this.isSearchMode = false;
        }

        this.loadInspections(null, false);
        this.loadStatistics(false);
    }

    createNewInspection(): void {
        this.selectedInspectionId = null;
        this.currentInspectionIndex = -1;
        this.showFormDialog = true;
    }

    viewDetails(inspection: ExternalInspection): void {
        this.selectedInspection = inspection;
        this.showDetailsDialog = true;
    }

    editInspection(inspection: ExternalInspection, index?: number): void {
        console.log('Editando inspección', inspection);
        this.selectedInspectionId = inspection._id || null;
        this.currentInspectionIndex = index !== undefined ? index : -1;
        this.showFormDialog = true;
        this.showDetailsDialog = false;
    }

    editInspectionFromDetails(): void {
        if (this.selectedInspection) {
            // Buscar el índice de la inspección seleccionada en la lista
            const index = this.inspections.findIndex(
                (insp) => insp._id === this.selectedInspection?._id
            );
            this.selectedInspectionId = this.selectedInspection._id || null;
            this.currentInspectionIndex = index;
            this.showDetailsDialog = false;
            this.showFormDialog = true;
        }
    }

    // Navegación entre registros
    onNavigationChanged(direction: 'prev' | 'next'): void {
        if (
            direction === 'next' &&
            this.currentInspectionIndex < this.inspections.length - 1
        ) {
            this.currentInspectionIndex++;
        } else if (direction === 'prev' && this.currentInspectionIndex > 0) {
            this.currentInspectionIndex--;
        }

        if (
            this.currentInspectionIndex >= 0 &&
            this.currentInspectionIndex < this.inspections.length
        ) {
            const nextInspection =
                this.inspections[this.currentInspectionIndex];
            this.selectedInspectionId = nextInspection._id || null;
        }
    }

    confirmDelete(inspection: ExternalInspection): void {
        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar la inspección ${inspection.numero}?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, Eliminar',
            rejectLabel: 'Cancelar',
            accept: () => {
                this.showJustificationDialog(inspection);
            },
        });
    }

    private showJustificationDialog(inspection: ExternalInspection): void {
        const justification = prompt(
            'Ingrese la justificación para eliminar esta inspección:'
        );

        if (justification && justification.trim()) {
            this.deleteInspection(inspection, justification.trim());
        } else if (justification !== null) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Justificación Requerida',
                detail: 'Debe proporcionar una justificación para eliminar la inspección',
            });
        }
    }

    private deleteInspection(
        inspection: ExternalInspection,
        justification: string
    ): void {
        if (!inspection._id) return;

        this.externalInspectionService
            .deleteInspectionWithJustification(inspection._id, justification)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Eliminado',
                        detail: `Inspección ${inspection.numero} eliminada correctamente`,
                    });
                    this.refresh();
                },
                error: (error) => {
                    console.error('Error eliminando inspección:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo eliminar la inspección',
                    });
                },
            });
    }

    updateBatch(): void {
        if (this.selectedInspections.length === 0 || !this.batchResult) return;

        const inspectionIds = this.selectedInspections
            .map((i) => i._id)
            .filter((id) => id) as string[];

        const updateData: Partial<any> = {
            resultado: this.batchResult as any,
        };

        this.externalInspectionService
            .updateInspectionsBatch(inspectionIds, updateData)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Actualizado',
                        detail: `${this.selectedInspections.length} inspección(es) actualizadas`,
                    });
                    this.clearSelection();
                    this.refresh();
                },
                error: (error) => {
                    console.error('Error actualizando en lote:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudieron actualizar las inspecciones',
                    });
                },
            });
    }

    clearSelection(): void {
        this.selectedInspections = [];
        this.batchResult = '';
    }

    openPhotoViewer(photo: string): void {
        this.selectedPhoto = photo;
        this.showPhotoViewer = true;
    }

    onInspectionSaved(inspection: ExternalInspection): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: inspection._id
                ? 'Inspección actualizada'
                : 'Inspección creada',
        });

        this.loadInspections();
        this.loadStatistics();
    }

    onFormDialogClosed(): void {
        this.selectedInspectionId = null;
        this.currentInspectionIndex = -1;
        this.showFormDialog = false;
        this.refresh();
    }

    getResultSeverity(
        resultado: string
    ): 'success' | 'warning' | 'danger' | 'secondary' | 'info' {
        switch (resultado) {
            case 'Apto':
                return 'success';
            case 'Devolución':
                return 'danger';
            case 'Cuarentena':
                return 'warning';
            case 'Comisión':
                return 'info';
            case 'Pendiente':
            default:
                return 'warning';
        }
    }

    getResultIcon(resultado: string): string {
        switch (resultado) {
            case 'Apto':
                return 'pi pi-check-circle';
            case 'Devolución':
                return 'pi pi-times-circle';
            case 'Cuarentena':
                return 'pi pi-exclamation-triangle';
            case 'Comisión':
                return 'pi pi-send';
            case 'Pendiente':
            default:
                return 'pi pi-clock';
        }
    }

    getAvailableSpecies(): Array<{ species: string; count: number }> {
        if (!this.statistics?.speciesBreakdown) return [];

        return Object.entries(this.statistics.speciesBreakdown)
            .map(([species, count]) => ({ species, count }))
            .filter((item) => item.count > 0);
    }

    hasAverageData(): boolean {
        if (!this.statistics?.averages) return false;

        const averages = this.statistics.averages;
        return (
            averages.age > 0 ||
            averages.weight > 0 ||
            averages.temperature > 0 ||
            averages.heartRate > 0 ||
            averages.respiratoryRate > 0
        );
    }

    formatAverage(value: number, unit: string = ''): string {
        return value > 0 ? `${value.toFixed(1)}${unit}` : 'N/A';
    }

    /**
     * Obtiene los datos de inspección según la fase actual
     * Si estamos en ante mortem, mostramos esos datos, sino los de recepción
     */
    getInspectionData(inspection: ExternalInspection): any {
        if (this.phase === 'anteMortem') {
            // En ante mortem, preferimos mostrar los datos de ante mortem si existen
            if (
                inspection.examenAnteMortem &&
                Object.keys(inspection.examenAnteMortem).length > 0
            ) {
                return inspection.examenAnteMortem;
            }
            // Si no hay datos de ante mortem, mostramos los de recepción como referencia
            return inspection.inspeccionRecepcion || {};
        } else {
            // En recepción, siempre mostramos los datos de recepción
            return inspection.inspeccionRecepcion || {};
        }
    }

    /**
     * Verifica si la inspección tiene datos de recepción
     */
    hasReceptionData(inspection: ExternalInspection): boolean {
        return (
            inspection.inspeccionRecepcion &&
            Object.keys(inspection.inspeccionRecepcion).length > 0 &&
            inspection.inspeccionRecepcion.resultado !== 'Pendiente'
        );
    }

    /**
     * Verifica si la inspección tiene datos de ante mortem
     */
    hasAnteMortemData(inspection: ExternalInspection): boolean {
        return (
            inspection.examenAnteMortem &&
            Object.keys(inspection.examenAnteMortem).length > 0 &&
            inspection.examenAnteMortem.resultado !== 'Pendiente'
        );
    }

    /**
     * Obtiene el título de la fase para mostrar en la UI
     */
    getPhaseTitle(): string {
        const baseTitle =
            this.phase === 'recepcion'
                ? 'Inspecciones de Recepción'
                : 'Exámenes Ante Mortem';

        // Si estamos viendo una inspección específica, agregarlo al título
        if (
            !this.showingAllInspections &&
            (this.receptionId || this.processId || this.inspectionNumber)
        ) {
            const specificId =
                this.receptionId || this.processId || this.inspectionNumber;
            return `${baseTitle} - ${specificId}`;
        }

        return baseTitle;
    }

    /**
     * Indica si estamos en modo de vista específica o general
     */
    isSpecificView(): boolean {
        return (
            !this.showingAllInspections &&
            (!!this.receptionId || !!this.processId || !!this.inspectionNumber)
        );
    }

    /**
     * Verifica si se puede editar la inspección según la fase
     */
    canEditInspection(inspection: ExternalInspection): boolean {
        if (this.phase === 'recepcion') {
            return true; // Siempre se puede editar la recepción
        } else {
            // Para ante mortem, debe existir al menos la inspección de recepción
            return this.hasReceptionData(inspection);
        }
    }
}
