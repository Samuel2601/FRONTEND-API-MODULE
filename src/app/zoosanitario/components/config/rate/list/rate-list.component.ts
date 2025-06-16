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

    // Filtros
    filters: RateFilters = {};
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
                    console.log(response);
                    this.rates = response.data;
                    this.totalRecords = response.pagination.totalDocs;
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
                },
            });
    }

    onGlobalFilter(event: Event) {
        const target = event.target as HTMLInputElement;
        this.globalFilterValue = target.value;
        this.table.filterGlobal(target.value, 'contains');
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
            accept: () => {
                if (rate._id) {
                    this.rateService.delete(rate._id).subscribe({
                        next: () => {
                            this.loadRates();
                        },
                    });
                }
            },
        });
    }

    deleteSelectedRates() {
        this.confirmationService.confirm({
            message:
                '¿Está seguro de que desea eliminar las tarifas seleccionadas?',
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                const deleteObservables = this.selectedRates
                    .filter((rate) => rate._id)
                    .map((rate) => this.rateService.delete(rate._id!));

                if (deleteObservables.length > 0) {
                    Promise.all(
                        deleteObservables.map((obs) => obs.toPromise())
                    ).then(() => {
                        this.selectedRates = [];
                        this.loadRates();
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
        this.loadRates();
    }

    exportExcel() {
        // Implementar exportación a Excel
        this.messageService.add({
            severity: 'info',
            summary: 'Exportación',
            detail: 'Funcionalidad de exportación pendiente de implementación',
        });
    }

    getSeverity(status: boolean): 'success' | 'danger' | 'info' {
        return status ? 'success' : 'danger';
    }

    getStatusText(status: boolean): string {
        return status ? 'Activo' : 'Inactivo';
    }

    refreshRates() {
        this.messageService.add({
            severity: 'info',
            summary: 'Actualizando',
            detail: 'Consultando datos actualizados...',
        });

        // Resetear paginación al hacer refresh
        this.first = 0;

        // Cargar datos sin cache
        this.loadRates(true);
    }

    onPageChange(event: any) {
        this.first = event.first;
        this.rows = event.rows;
        this.loadRates();
    }

    onFilterChange() {
        this.first = 0;
        this.loadRates();
    }

    clearFilters() {
        this.filters = {};
        this.globalFilterValue = '';
        this.table.clear();
        this.loadRates(true); // También refrescar al limpiar filtros
    }
}
