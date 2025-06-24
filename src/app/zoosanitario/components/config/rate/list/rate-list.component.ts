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

    statusFilterOptions = [
        { label: 'Activo', value: true },
        { label: 'Inactivo', value: false },
    ];

    invoiceFilterOptions = [
        { label: 'Permite facturación', value: true },
        { label: 'No permite facturación', value: false },
    ];

    autoChargeFilterOptions = [
        { label: 'Cobro automático', value: true },
        { label: 'Sin cobro automático', value: false },
    ];

    // Mapas para etiquetas
    chargeFrequencyLabels = {
        NONE: 'Ninguna',
        YEARLY: 'Anual',
        FISCAL_YEAR: 'Año fiscal',
        PER_SLAUGHTER_PROCESS: 'Por proceso',
    };

    // Modal
    showDialog = false;
    showViewDialog = false;
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
                    this.rates = [];
                    this.totalRecords = 0;
                },
            });
    }

    onGlobalFilter(event: Event) {
        const target = event.target as HTMLInputElement;
        this.globalFilterValue = target.value;

        this.first = 0;

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

    viewRate(rate: Rate) {
        this.selectedRate = { ...rate };
        this.showViewDialog = true;
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
                            this.loadRates(true);
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
                            this.loadRates(true);
                        })
                        .catch((error) => {
                            console.error('Error al eliminar tarifas:', error);
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Error al eliminar algunas tarifas',
                            });
                            this.loadRates(true);
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

    onViewDialogHide() {
        this.showViewDialog = false;
        this.selectedRate = null;
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
        this.loadRates(true);
    }

    exportExcel() {
        this.messageService.add({
            severity: 'info',
            summary: 'Exportación',
            detail: 'Funcionalidad de exportación pendiente de implementación',
        });
    }

    refreshRates() {
        this.messageService.add({
            severity: 'info',
            summary: 'Actualizando',
            detail: 'Consultando datos actualizados desde el servidor...',
        });

        this.selectedRates = [];
        this.first = 0;
        this.rateService.clearRateCache();
        this.loadRates(true);
    }

    onPageChange(event: any) {
        console.log('Page change event:', event);

        this.first = event.first;
        this.rows = event.rows;

        if (event.sortField) {
            const sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';
            this.filters.sort = { [event.sortField]: sortOrder };
        } else {
            delete this.filters.sort;
        }

        this.loadRates();
    }

    onFilterChange() {
        this.first = 0;
        this.loadRates();
    }

    clearFilters() {
        this.filters = {};
        this.globalFilterValue = '';

        if (this.table) {
            this.table.clear();
        }

        this.first = 0;
        this.refreshRates();
    }

    // === MÉTODOS AUXILIARES PARA DISPLAYS ===

    getTypeSeverity(
        type: string
    ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
        const severityMap: {
            [key: string]:
                | 'success'
                | 'info'
                | 'warning'
                | 'danger'
                | 'secondary';
        } = {
            TASA: 'info',
            TARIFA: 'success',
            SERVICIOS: 'warning',
        };
        return severityMap[type] || 'secondary';
    }

    getStatusText(status?: boolean, deletedAt?: Date): string {
        if (deletedAt) {
            return 'Eliminado';
        }
        return status ? 'Activo' : 'Inactivo';
    }

    getStatusSeverity(
        status?: boolean,
        deletedAt?: Date
    ): 'success' | 'danger' | 'warning' {
        if (deletedAt) {
            return 'danger';
        }
        return status ? 'success' : 'warning';
    }

    getChargeFrequencyLabel(frequency?: string): string {
        if (!frequency || frequency === 'NONE') {
            return 'Ninguna';
        }
        return this.chargeFrequencyLabels[frequency] || frequency;
    }

    getAnimalTypeDisplay(animalType: any): string {
        if (typeof animalType === 'string') {
            return animalType;
        }
        return animalType?.species || 'N/A';
    }

    formatPersonTypes(personTypes: string[]): string {
        if (!personTypes || personTypes.length === 0) {
            return 'Ambos tipos';
        }
        if (personTypes.length === 2) {
            return 'Ambos tipos';
        }
        return personTypes.join(', ');
    }

    formatAnimalTypes(animalTypes: any[]): string {
        if (!animalTypes || animalTypes.length === 0) {
            return 'Sin tipos asignados';
        }
        return animalTypes
            .map((at) => (typeof at === 'string' ? at : at.species))
            .join(', ');
    }

    // === MÉTODOS AUXILIARES PARA CONFIGURACIONES ===

    hasQuantityLimit(rate: Rate): boolean {
        return (
            !rate.quantityConfig?.isUnlimited &&
            (!!rate.quantityConfig?.maxQuantity || !!rate.maxQuantity)
        );
    }

    getQuantityDisplay(rate: Rate): string {
        if (rate.quantityConfig?.isUnlimited) {
            return 'Ilimitada';
        }

        const maxQty = rate.quantityConfig?.maxQuantity || rate.maxQuantity;
        return maxQty ? maxQty.toString() : 'No especificada';
    }

    isAutoCharged(rate: Rate): boolean {
        return !!rate.invoiceConfig?.automaticCharge;
    }

    getAllowsInvoice(rate: Rate): boolean {
        return rate.invoiceConfig?.allowInvoice !== false;
    }

    isAlwaysIncluded(rate: Rate): boolean {
        return !!rate.invoiceConfig?.alwaysInclude;
    }

    getInvoiceConfigSummary(rate: Rate): string[] {
        const summary: string[] = [];

        if (!this.getAllowsInvoice(rate)) {
            summary.push('No facturable');
        }

        if (this.isAlwaysIncluded(rate)) {
            summary.push('Incluir siempre');
        }

        if (this.isAutoCharged(rate)) {
            summary.push('Cobro automático');
        }

        return summary;
    }

    hasDependencies(rate: Rate): boolean {
        return !!(
            rate.dependencies?.requiresPreviousRate ||
            rate.dependencies?.requiresSlaughterProcess ||
            !rate.dependencies?.standaloneAllowed
        );
    }

    hasValidationRules(rate: Rate): boolean {
        return !!(
            rate.validationRules?.prerequisiteRates?.length ||
            rate.validationRules?.quantityValidationRate ||
            rate.validationRules?.quantityValidationType !== 'NONE'
        );
    }

    // === MÉTODOS PARA TOOLTIPS Y DETALLES ===

    getRateTooltip(rate: Rate): string {
        const details = [];

        if (rate.code_tributo) {
            details.push(`Código Tributo: ${rate.code_tributo}`);
        }

        if (rate.rubroxAtributo) {
            details.push(`Rubro: ${rate.rubroxAtributo}`);
        }

        if (this.hasQuantityLimit(rate)) {
            details.push(`Cantidad: ${this.getQuantityDisplay(rate)}`);
        }

        const invoiceConfig = this.getInvoiceConfigSummary(rate);
        if (invoiceConfig.length > 0) {
            details.push(`Facturación: ${invoiceConfig.join(', ')}`);
        }

        return details.join(' | ');
    }

    getInvoiceTooltip(rate: Rate): string {
        const details = [];

        if (this.getAllowsInvoice(rate)) {
            details.push('Facturación permitida');
        } else {
            details.push('Facturación no permitida');
        }

        if (this.isAlwaysIncluded(rate)) {
            details.push('Se incluye automáticamente');
        }

        if (this.isAutoCharged(rate)) {
            const frequency = this.getChargeFrequencyLabel(
                rate.invoiceConfig?.chargeFrequency
            );
            details.push(`Cobro automático: ${frequency}`);
        }

        if (rate.invoiceConfig?.uniqueByIntroducerYear) {
            details.push('Único por introductor al año');
        }

        return details.join('\n');
    }

    getDependenciesTooltip(rate: Rate): string {
        const details = [];

        if (rate.dependencies?.requiresPreviousRate) {
            details.push('Requiere rate previo');
        }

        if (rate.dependencies?.requiresSlaughterProcess) {
            details.push('Requiere proceso de sacrificio');
        }

        if (!rate.dependencies?.standaloneAllowed) {
            details.push('No puede ser independiente');
        }

        return details.join('\n');
    }
}
