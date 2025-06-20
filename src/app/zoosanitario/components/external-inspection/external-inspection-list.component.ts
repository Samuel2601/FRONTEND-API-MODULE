import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';

import {
    ExternalInspectionService,
    ExternalInspection,
    InspectionSummary,
    InspectionStatistics,
} from '../../services/external-inspection.service';
import { ExternalInspectionFormComponent } from './form/external-inspection-form.component';
import { ActivatedRoute } from '@angular/router';
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
        this.inspectionNumber =
            this.route.snapshot.paramMap.get('inspectionNumber') || undefined;
        console.log(
            'INICIALIZANDO COMPONENTE DE EXTERNAL INSPECTIONS',
            this.inspectionNumber
        );
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
    phase: 'recepcion' | 'anteMortem' = 'recepcion';

    loadInspections(event?: any, cache: boolean = true): void {
        if (this.isSearchMode) return;

        this.loading = true;

        if (event) {
            this.currentPage = Math.floor(event.first / event.rows) + 1;
            this.pageSize = event.rows;
        }

        const filters: any = { ...this.filters };

        if (this.receptionId) {
            filters.recepcion = this.receptionId;
            this.phase = 'recepcion';
        }
        if (this.processId) {
            filters.proceso = this.processId;
            this.phase = 'anteMortem';
        }

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

    loadStatistics(cache: boolean = true): void {
        const filters: any = { ...this.filters };

        if (this.receptionId) {
            filters.recepcion = this.receptionId;
        }
        if (this.processId) {
            filters.proceso = this.processId;
        }

        Object.keys(filters).forEach((key) => {
            if (
                filters[key] === '' ||
                filters[key] === null ||
                filters[key] === undefined
            ) {
                delete filters[key];
            }
        });

        this.externalInspectionService
            .getStatistics(filters, cache)
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
        const pendientes =
            backendStats.total -
            (backendStats.resultBreakdown.apto +
                backendStats.resultBreakdown.devolucion +
                backendStats.resultBreakdown.cuarentena +
                backendStats.resultBreakdown.comision);

        return {
            total: backendStats.total,
            pendientes: Math.max(0, pendientes),
            aptas: backendStats.resultBreakdown.apto,
            devolucion: backendStats.resultBreakdown.devolucion,
            cuarentena: backendStats.resultBreakdown.cuarentena,
            comision: backendStats.resultBreakdown.comision,
            averages: backendStats.averages,
            speciesBreakdown: backendStats.speciesBreakdown,
            sexBreakdown: backendStats.sexBreakdown,
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
                    console.log('Respuesta de busqueda:', response);
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
            this.searchBySpecificNumber(this.searchNumber.trim());
        } else {
            this.isSearchMode = false;
            this.loadInspections();
        }
    }

    onFilterChange(): void {
        this.currentPage = 1;
        this.loadInspections();
        this.loadStatistics();
    }

    refresh(): void {
        this.currentPage = 1;
        this.selectedInspections = [];
        this.isSearchMode = false;
        this.loadInspections(null, false);
        this.loadStatistics(false);
    }

    viewDetails(inspection: ExternalInspection): void {
        this.selectedInspection = inspection;
        this.showDetailsDialog = true;
    }

    editInspection(inspection: ExternalInspection): void {
        console.log('Editando inspección', inspection);
        this.selectedInspectionId = inspection._id || null;
        this.showFormDialog = true;
        this.showDetailsDialog = false;
    }

    editInspectionFromDetails(): void {
        if (this.selectedInspection) {
            this.selectedInspectionId = this.selectedInspection._id || null;
            this.showDetailsDialog = false;
            this.showFormDialog = true;
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
        this.showFormDialog = false;
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

    getInspectionData(inspection: ExternalInspection): any {
        if (this.phase === 'recepcion') {
            return inspection.inspeccionRecepcion || {};
        } else {
            return inspection.examenAnteMortem || {};
        }
    }
}
