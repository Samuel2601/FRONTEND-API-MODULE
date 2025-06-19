import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { ImportsModule } from 'src/app/demo/services/import';

import { Table } from 'primeng/table';
import { ConfirmationService, MessageService } from 'primeng/api';
import { RateService } from 'src/app/zoosanitario/services/rate.service';
import {
    PaginationOptions,
    Rate,
    RateFilters,
} from 'src/app/zoosanitario/interfaces/rate.interface';
import { RateFormComponent } from '../form/rate-form.component';

@Component({
    selector: 'app-rate-list',
    standalone: true,
    imports: [ImportsModule, RateFormComponent],
    templateUrl: './rate-list.component.html',
    styleUrls: ['./rate-list.component.scss'],
})
export class RateListComponent implements OnInit {
    @ViewChild('dt') table!: Table;

    private rateService = inject(RateService);
    private confirmationService = inject(ConfirmationService);
    private messageService = inject(MessageService);

    // Datos
    rates: Rate[] = [];
    selectedRates: Rate[] = [];
    loading = false;

    // Paginación
    totalRecords = 0;
    rows = 10;
    first = 0;

    // Filtros - Corregido el filtro de status
    filters: any = {};
    globalFilterValue = '';

    // Opciones para dropdowns
    typeOptions = [
        { label: 'Tasa', value: 'TASA' },
        { label: 'Tarifa', value: 'TARIFA' },
        { label: 'Servicios', value: 'SERVICIOS' },
    ];

    personTypeOptions = [
        { label: 'Natural', value: 'Natural' },
        { label: 'Jurídica', value: 'Jurídica' },
    ];

    // Modal
    showDialog = false;
    selectedRate: Rate | null = null;
    isEditMode = false;

    ngOnInit() {
        this.loadRates();
    }

    loadRates(skipCache: boolean = false) {
        this.loading = true;

        const paginationOptions: PaginationOptions = {
            page: Math.floor(this.first / this.rows) + 1,
            limit: this.rows,
        };

        this.rateService
            .getRatesWithPagination(this.filters, paginationOptions, skipCache)
            .subscribe({
                next: (response) => {
                    console.log('Respuesta del servidor:', response);
                    this.rates = response.data || [];
                    this.totalRecords = response.pagination?.totalDocs || 0;
                    this.loading = false;
                },
                error: (error) => {
                    console.error('Error loading rates:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cargar las tarifas',
                    });
                    this.loading = false;
                    this.rates = []; // Limpiar en caso de error
                    this.totalRecords = 0;
                },
            });
    }

    onGlobalFilter(event: Event) {
        const target = event.target as HTMLInputElement;
        this.globalFilterValue = target.value;

        // Para paginación lazy, necesitamos aplicar el filtro en el servidor
        // Resetear a la primera página cuando se aplica un filtro global
        this.first = 0;

        // Agregar el filtro global a los filtros existentes
        if (target.value.trim()) {
            this.filters.search = target.value.trim();
        } else {
            delete this.filters.search;
        }

        this.loadRates();
    }

    openNew() {
        this.selectedRate = null;
        this.isEditMode = false;
        this.showDialog = true;
    }

    editRate(rate: Rate) {
        this.selectedRate = { ...rate };
        this.isEditMode = true;
        this.showDialog = true;
    }

    deleteRate(rate: Rate) {
        this.confirmationService.confirm({
            message: `¿Está seguro de que desea eliminar "${rate.description}"?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí',
            rejectLabel: 'No',
            accept: () => {
                if (rate._id) {
                    this.rateService.delete(rate._id).subscribe({
                        next: () => {
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Éxito',
                                detail: 'Tarifa eliminada correctamente',
                            });
                            this.loadRates(true); // Saltar cache al eliminar
                        },
                        error: (error) => {
                            console.error('Error al eliminar:', error);
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Error al eliminar la tarifa',
                            });
                        },
                    });
                }
            },
        });
    }

    deleteSelectedRates() {
        if (!this.selectedRates || this.selectedRates.length === 0) {
            return;
        }

        this.confirmationService.confirm({
            message: `¿Está seguro de que desea eliminar ${this.selectedRates.length} tarifa(s) seleccionada(s)?`,
            header: 'Confirmar eliminación múltiple',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí',
            rejectLabel: 'No',
            accept: () => {
                const deletePromises = this.selectedRates
                    .filter((rate) => rate._id)
                    .map((rate) =>
                        this.rateService.delete(rate._id!).toPromise()
                    );

                if (deletePromises.length > 0) {
                    Promise.all(deletePromises)
                        .then(() => {
                            this.selectedRates = [];
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Éxito',
                                detail: 'Tarifas eliminadas correctamente',
                            });
                            this.loadRates(true); // Saltar cache al eliminar
                        })
                        .catch((error) => {
                            console.error('Error al eliminar tarifas:', error);
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Error al eliminar algunas tarifas',
                            });
                            this.loadRates(true); // Refrescar de todas formas
                        });
                }
            },
        });
    }

    onDialogHide() {
        this.showDialog = false;
        this.selectedRate = null;
        this.isEditMode = false;
    }

    onRateSaved() {
        this.showDialog = false;
        this.selectedRate = null;
        this.isEditMode = false;
        this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: this.isEditMode
                ? 'Tarifa actualizada correctamente'
                : 'Tarifa creada correctamente',
        });
        this.loadRates(true); // Saltar cache al guardar
    }

    exportExcel() {
        // Implementar exportación a Excel
        this.messageService.add({
            severity: 'info',
            summary: 'Exportación',
            detail: 'Funcionalidad de exportación pendiente de implementación',
        });
    }

    // Corregido: usar 'status' en lugar de 'isActive'
    getSeverity(status: boolean): 'success' | 'danger' | 'info' {
        return status ? 'danger' : 'success';
    }

    getStatusText(status: boolean): string {
        return status ? 'Inactivo' : 'Activo';
    }

    // Método mejorado de refresh
    refreshRates() {
        this.messageService.add({
            severity: 'info',
            summary: 'Actualizando',
            detail: 'Consultando datos actualizados desde el servidor...',
        });

        // Limpiar selecciones
        this.selectedRates = [];

        // Resetear paginación al hacer refresh
        this.first = 0;

        // Limpiar cache específico de rates
        this.rateService.clearRateCache();

        // Cargar datos sin cache
        this.loadRates(true);
    }

    // Método mejorado para manejar cambios de página y ordenamiento
    onPageChange(event: any) {
        console.log('Page change event:', event);

        this.first = event.first;
        this.rows = event.rows;

        // Manejar ordenamiento si está presente
        if (event.sortField) {
            const sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';
            this.filters.sort = { [event.sortField]: sortOrder };
        } else {
            delete this.filters.sort;
        }

        this.loadRates();
    }

    onFilterChange() {
        // Resetear a la primera página cuando se cambian filtros
        this.first = 0;
        this.loadRates();
    }

    clearFilters() {
        // Limpiar todos los filtros
        this.filters = {};
        this.globalFilterValue = '';

        // Limpiar el filtro global de la tabla
        if (this.table) {
            this.table.clear();
        }

        // Resetear paginación
        this.first = 0;

        // Refrescar datos con cache limpio
        this.refreshRates();
    }

    // Método auxiliar para formatear arrays de tipos de persona
    formatPersonTypes(personTypes: string[]): string {
        if (!personTypes || personTypes.length === 0) {
            return 'Sin tipos asignados';
        }
        return personTypes.join(', ');
    }

    // Método auxiliar para formatear tipos de animal
    formatAnimalTypes(animalTypes: any[]): string {
        if (!animalTypes || animalTypes.length === 0) {
            return 'Sin tipos asignados';
        }
        return animalTypes.map((at) => at.species).join(', ');
    }
}
