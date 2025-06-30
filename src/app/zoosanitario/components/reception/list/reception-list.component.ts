// src/app/components/reception-list/reception-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import {
    takeUntil,
    finalize,
    debounceTime,
    distinctUntilChanged,
} from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import { Reception } from 'src/app/zoosanitario/interfaces/slaughter.interface';
import {
    ReceptionFilters,
    ReceptionService,
    ReceptionStats,
} from 'src/app/zoosanitario/services/reception.service';
import { TableLazyLoadEvent } from 'primeng/table';

@Component({
    selector: 'app-reception-list',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './reception-list.component.html',
    styleUrls: ['./reception-list.component.scss'],
    providers: [ConfirmationService],
})
export class ReceptionListComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    // Estados de carga
    loading = false;
    loadingStats = false;

    // Datos
    receptions: any[] = [];
    statistics: any | null = null;
    selectedReception: any | null = null;

    // Paginación
    totalRecords = 0;
    pageSize = 10;
    currentPage = 0;

    // Filtros
    filters: ReceptionFilters = {};

    // Opciones para dropdowns
    estadoOptions = [
        { label: 'Pendiente', value: 'Pendiente' },
        { label: 'Procesando', value: 'Procesando' },
        { label: 'Completado', value: 'Completado' },
        { label: 'Rechazado', value: 'Rechazado' },
    ];

    // Diálogos
    showDetailsDialog = false;

    constructor(
        private receptionService: ReceptionService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private router: Router
    ) {
        this.setupSearchDebounce();
    }

    ngOnInit(): void {
        this.loadData();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Configurar debounce para búsqueda
     */
    private setupSearchDebounce(): void {
        this.searchSubject
            .pipe(
                debounceTime(500),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe((searchTerm) => {
                this.filters.certificado = searchTerm || undefined;
                this.applyFilters();
            });
    }

    /**
     * Cargar datos iniciales
     */
    loadData(): void {
        this.loadStatistics();
        this.loadReceptions();
    }

    /**
     * Cargar estadísticas - CORREGIDO para mapear la respuesta correcta
     */
    private loadStatistics(): void {
        this.loadingStats = true;

        this.receptionService
            .getStatistics()
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.loadingStats = false))
            )
            .subscribe({
                next: (response: any) => {
                    console.log('Estadísticas:', response);

                    // Mapear la respuesta correctamente según la estructura real
                    if (response.success && response.data) {
                        this.statistics = {
                            total: response.data.total,
                            pendientes:
                                response.data.stateBreakdown?.pendiente || 0,
                            procesando:
                                response.data.stateBreakdown?.procesando || 0,
                            completados:
                                response.data.stateBreakdown?.completado || 0,
                            rechazados:
                                response.data.stateBreakdown?.rechazado || 0,

                            // Promedios de transporte
                            avgTemperature:
                                response.data.transportAverages?.temperature ||
                                0,
                            avgHumidity:
                                response.data.transportAverages?.humidity || 0,

                            // Prioridad promedio
                            avgPriority: response.data.avgPriority || 0,

                            // Condiciones higiénicas
                            hygienicOptimas:
                                response.data.hygienicConditionsBreakdown
                                    ?.optimas || 0,
                            hygienicAceptables:
                                response.data.hygienicConditionsBreakdown
                                    ?.aceptables || 0,
                            hygienicDeficientes:
                                response.data.hygienicConditionsBreakdown
                                    ?.deficientes || 0,

                            // Cálculos adicionales
                            tasaCompletado:
                                response.data.total > 0
                                    ? Math.round(
                                          ((response.data.stateBreakdown
                                              ?.completado || 0) /
                                              response.data.total) *
                                              100
                                      )
                                    : 0,
                            tasaRechazado:
                                response.data.total > 0
                                    ? Math.round(
                                          ((response.data.stateBreakdown
                                              ?.rechazado || 0) /
                                              response.data.total) *
                                              100
                                      )
                                    : 0,
                            condicionesOptimas:
                                response.data.total > 0
                                    ? Math.round(
                                          ((response.data
                                              .hygienicConditionsBreakdown
                                              ?.optimas || 0) /
                                              response.data.total) *
                                              100
                                      )
                                    : 0,
                        };
                    }
                },
                error: (error) => {
                    console.error('Error cargando estadísticas:', error);
                    // No mostrar error toast aquí ya que BaseService ya lo maneja
                },
            });
    }

    /**
     * Cargar recepciones (llamado por lazy loading) - CORREGIDO para mapear la respuesta correcta
     */
    loadReceptions(event?: TableLazyLoadEvent): void {
        this.loading = true;

        // Configurar paginación
        const page = event
            ? Math.floor((event.first || 0) / (event.rows || this.pageSize)) + 1
            : 1;
        const limit = event?.rows || this.pageSize;

        // Configurar ordenamiento
        let sortParams = {};
        if (event?.sortField) {
            const sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';
            sortParams = { sort: `${event.sortField}:${sortOrder}` };
        }

        // Combinar filtros
        const queryFilters = { ...this.filters, ...sortParams };
        const populate = 'animalHealthCertificate';
        this.receptionService
            .getReceptions(queryFilters, page, limit, populate)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (response: any) => {
                    console.log('Respuesta recepciones:', response);

                    if (response.success && response.data) {
                        // Mapear correctamente según la estructura real de la respuesta
                        this.receptions = response.data.receptions || [];
                        this.totalRecords =
                            response.data.pagination.totalDocs || 0;
                        this.currentPage = page;

                        // Enriquecer los datos si es necesario
                        this.receptions = this.receptions.map((reception) => ({
                            ...reception,
                            // Si animalHealthCertificate es solo un ID, crear un objeto con propiedades por defecto
                            animalHealthCertificate:
                                typeof reception.animalHealthCertificate ===
                                'string'
                                    ? {
                                          _id: reception.animalHealthCertificate,
                                          numeroCZPM: `CERT-${
                                              reception._id?.slice(-6) ||
                                              '000000'
                                          }`,
                                          autorizadoA: 'N/A',
                                          vehiculo: 'N/A',
                                          totalProductos: 0,
                                          validoHasta: null,
                                          codigoAreaOrigen: 'N/A',
                                          codigoAreaDestino: 'N/A',
                                      }
                                    : reception.animalHealthCertificate,
                        }));
                    } else {
                        this.receptions = [];
                        this.totalRecords = 0;
                    }
                },
                error: (error) => {
                    console.error('Error cargando recepciones:', error);
                    this.receptions = [];
                    this.totalRecords = 0;
                },
            });
    }

    /**
     * Aplicar filtros
     */
    applyFilters(): void {
        // Reiniciar a la primera página cuando se aplican filtros
        this.currentPage = 0;
        this.loadReceptions();

        // Recargar estadísticas si hay filtros activos
        if (
            Object.keys(this.filters).some(
                (key) => this.filters[key as keyof ReceptionFilters]
            )
        ) {
            this.loadStatistics();
        }
    }

    /**
     * Limpiar filtros
     */
    clearFilters(): void {
        this.filters = {};
        this.applyFilters();

        this.messageService.add({
            severity: 'info',
            summary: 'Filtros Limpiados',
            detail: 'Se han eliminado todos los filtros',
        });
    }

    /**
     * Manejar búsqueda con debounce
     */
    onSearchInput(event: any): void {
        const value = event.target.value?.trim();
        this.searchSubject.next(value);
    }

    /**
     * Ver detalles de recepción
     */
    viewReception(reception: Reception): void {
        this.selectedReception = reception;
        this.showDetailsDialog = true;
    }

    /**
     * Editar recepción (cambiar estado)
     */
    editReception(reception: any): void {
        // Mostrar diálogo para cambiar estado
        this.confirmationService.confirm({
            message: `¿Desea cambiar el estado de la recepción ${reception.animalHealthCertificate?.numeroCZPM}?`,
            header: 'Cambiar Estado',
            icon: 'pi pi-question-circle',
            accept: () => {
                // Aquí se podría implementar un diálogo específico para cambiar estado
                // Por ahora, navegamos a la página de edición
                /*this.router.navigate([
                    '/zoosanitario/reception',
                    reception._id,
                    'edit',
                ]);*/
            },
        });
    }

    /**
     * Eliminar recepción
     */
    deleteReception(reception: any): void {
        this.confirmationService.confirm({
            message: `¿Está seguro de que desea eliminar la recepción ${reception.animalHealthCertificate?.numeroCZPM}? Esta acción no se puede deshacer.`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, Eliminar',
            rejectLabel: 'Cancelar',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.performDelete(reception);
            },
        });
    }

    /**
     * Realizar eliminación
     */
    private performDelete(reception: Reception): void {
        if (!reception._id) return;

        this.receptionService
            .delete(reception._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Recepción Eliminada',
                        detail: 'La recepción ha sido eliminada exitosamente',
                    });

                    // Recargar datos
                    this.loadData();
                },
                error: (error) => {
                    console.error('Error eliminando recepción:', error);
                    // El error toast se maneja en BaseService
                },
            });
    }

    /**
     * Crear nueva recepción
     */
    createReception(): void {
        //this.router.navigate(['/zoosanitario/reception/new']);
    }

    /**
     * Obtener severidad para el estado
     */
    getEstadoSeverity(
        estado: string
    ): 'success' | 'warning' | 'danger' | 'secondary' | 'info' {
        switch (estado) {
            case 'Pendiente':
                return 'warning';
            case 'Procesando':
                return 'info';
            case 'Completado':
                return 'success';
            case 'Rechazado':
                return 'danger';
            default:
                return 'secondary';
        }
    }

    /**
     * Obtener severidad para la prioridad
     */
    getPrioridadSeverity(
        prioridad: number
    ): 'success' | 'warning' | 'danger' | 'secondary' | 'info' {
        if (prioridad >= 8) return 'danger';
        if (prioridad >= 5) return 'warning';
        if (prioridad >= 3) return 'info';
        return 'secondary';
    }

    /**
     * Obtener severidad para las condiciones higiénicas
     */
    getCondicionesSeverity(
        condiciones: string | undefined
    ): 'success' | 'warning' | 'danger' | 'secondary' {
        switch (condiciones) {
            case 'Óptimas':
                return 'success';
            case 'Aceptables':
                return 'warning';
            case 'Deficientes':
                return 'danger';
            default:
                return 'secondary';
        }
    }

    /**
     * Verificar si hay filtros activos
     */
    hasActiveFilters(): boolean {
        return Object.keys(this.filters).some(
            (key) =>
                this.filters[key as keyof ReceptionFilters] !== undefined &&
                this.filters[key as keyof ReceptionFilters] !== null &&
                this.filters[key as keyof ReceptionFilters] !== ''
        );
    }

    /**
     * Obtener texto del resumen de filtros
     */
    getFilterSummary(): string {
        const activeFilters = [];

        if (this.filters.estado) {
            activeFilters.push(`Estado: ${this.filters.estado}`);
        }

        if (this.filters.fechaDesde) {
            activeFilters.push(
                `Desde: ${new Date(
                    this.filters.fechaDesde
                ).toLocaleDateString()}`
            );
        }

        if (this.filters.fechaHasta) {
            activeFilters.push(
                `Hasta: ${new Date(
                    this.filters.fechaHasta
                ).toLocaleDateString()}`
            );
        }

        if (this.filters.certificado) {
            activeFilters.push(`Certificado: ${this.filters.certificado}`);
        }

        return activeFilters.join(' | ');
    }

    /**
     * Exportar datos (funcionalidad futura)
     */
    exportData(): void {
        this.messageService.add({
            severity: 'info',
            summary: 'Función en Desarrollo',
            detail: 'La exportación de datos estará disponible próximamente',
        });
    }

    /**
     * Navegar al workflow de una recepción
     */
    goToWorkflow(reception: Reception): void {
        if (reception._id) {
            // this.router.navigate(['/zoosanitario/workflow', reception._id]);
        }
    }

    /**
     * Obtener texto de estado con íconos
     */
    getEstadoIcon(estado: string): string {
        switch (estado) {
            case 'Pendiente':
                return 'pi pi-clock';
            case 'Procesando':
                return 'pi pi-cog';
            case 'Completado':
                return 'pi pi-check-circle';
            case 'Rechazado':
                return 'pi pi-times-circle';
            default:
                return 'pi pi-question';
        }
    }

    /**
     * Formatear fecha relativa
     */
    getRelativeTime(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - new Date(date).getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) {
            return 'Hace menos de 1 hora';
        } else if (diffHours < 24) {
            return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        } else if (diffDays < 7) {
            return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
        } else {
            return new Date(date).toLocaleDateString();
        }
    }

    /**
     * Refrescar datos manualmente
     */
    refreshData(): void {
        this.loadData();

        this.messageService.add({
            severity: 'success',
            summary: 'Datos Actualizados',
            detail: 'La información ha sido actualizada correctamente',
        });
    }
}
