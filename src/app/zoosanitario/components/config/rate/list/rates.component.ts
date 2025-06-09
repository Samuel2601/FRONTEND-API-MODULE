import { Component, OnInit } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import { Rate } from 'src/app/zoosanitario/interfaces/slaughter.interface';
import { RateService } from 'src/app/zoosanitario/services/rate.service';
import { RateFormComponent } from '../form/rate-form.component';

interface RateFilters {
    search: string;
    type: string;
    status: string;
}

@Component({
    selector: 'app-rates',
    standalone: true,
    imports: [ImportsModule, RateFormComponent],
    providers: [ConfirmationService],
    templateUrl: './rates.component.html',
    styleUrls: ['./rates.component.scss'],
})
export class RatesComponent implements OnInit {
    rates: Rate[] = [];
    filteredRates: Rate[] = [];
    loading = false;

    pageSize = 25;
    totalRecords = 0;

    filters: RateFilters = {
        search: '',
        type: '',
        status: '',
    };

    typeOptions = [
        { label: 'Inscripción', value: 'INSCRIPTION' },
        { label: 'Servicios Faenamiento', value: 'SLAUGHTER_SERVICES' },
        { label: 'Servicios Adicionales', value: 'ADDITIONAL_SERVICES' },
        { label: 'Multas', value: 'PENALTIES' },
        { label: 'Permisos', value: 'PERMITS' },
    ];

    statusOptions = [
        { label: 'Activo', value: 'ACTIVE' },
        { label: 'Inactivo', value: 'INACTIVE' },
        { label: 'Expirado', value: 'EXPIRED' },
    ];

    // Form dialog
    showFormDialog = false;
    selectedRate: Rate | null = null;
    formMode: 'create' | 'edit' | 'view' = 'create';
    dialogTitle = '';

    // History dialog
    showHistoryDialog = false;
    selectedRateHistory: any[] = [];

    constructor(
        private rateService: RateService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.loadRates();
    }

    async loadRates(): Promise<void> {
        this.loading = true;
        try {
            const response = await this.rateService.getAll().toPromise();
            if (response) {
                this.rates = response;
                this.applyFilters();
            }
        } catch (error) {
            this.showError('Error al cargar las tarifas');
        } finally {
            this.loading = false;
        }
    }

    onFilterChange(): void {
        this.applyFilters();
    }

    applyFilters(): void {
        let filtered = [...this.rates];

        if (this.filters.search) {
            const search = this.filters.search.toLowerCase();
            filtered = filtered.filter(
                (rate) =>
                    rate.code.toLowerCase().includes(search) ||
                    rate.name.toLowerCase().includes(search) ||
                    rate.description.toLowerCase().includes(search)
            );
        }

        if (this.filters.type) {
            filtered = filtered.filter(
                (rate) => rate.type === this.filters.type
            );
        }

        if (this.filters.status) {
            filtered = filtered.filter(
                (rate) => rate.status === this.filters.status
            );
        }

        this.filteredRates = filtered;
        this.totalRecords = filtered.length;
    }

    clearFilters(): void {
        this.filters = { search: '', type: '', status: '' };
        this.applyFilters();
    }

    openCreateForm(): void {
        this.selectedRate = null;
        this.formMode = 'create';
        this.dialogTitle = 'Nueva Tarifa';
        this.showFormDialog = true;
    }

    editRate(rate: Rate): void {
        this.selectedRate = { ...rate };
        this.formMode = 'edit';
        this.dialogTitle = 'Editar Tarifa';
        this.showFormDialog = true;
    }

    viewRate(rate: Rate): void {
        this.selectedRate = rate;
        this.formMode = 'view';
        this.dialogTitle = 'Detalles de Tarifa';
        this.showFormDialog = true;
    }

    async viewHistory(rate: Rate): Promise<void> {
        try {
            const response = await this.rateService
                .getRateHistory(rate._id)
                .toPromise();
            if (response?.success && response.data) {
                this.selectedRateHistory = response.data;
                this.showHistoryDialog = true;
            }
        } catch (error) {
            this.showError('Error al cargar el historial');
        }
    }

    deleteRate(rate: Rate): void {
        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar la tarifa "${rate.name}"?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            accept: () => this.performDelete(rate),
        });
    }

    async performDelete(rate: Rate): Promise<void> {
        try {
            await this.rateService.delete(rate._id).toPromise();
            this.showSuccess('Tarifa eliminada correctamente');
            this.loadRates();
        } catch (error) {
            this.showError('Error al eliminar la tarifa');
        }
    }

    async onRateSave(rate: Rate): Promise<void> {
        try {
            if (this.formMode === 'create') {
                await this.rateService.create(rate).toPromise();
                this.showSuccess('Tarifa creada correctamente');
            } else {
                await this.rateService.update(rate._id, rate).toPromise();
                this.showSuccess('Tarifa actualizada correctamente');
            }

            this.showFormDialog = false;
            this.loadRates();
        } catch (error) {
            this.showError('Error al guardar la tarifa');
        }
    }

    onFormCancel(): void {
        this.showFormDialog = false;
        this.selectedRate = null;
    }

    getTypeSeverity(type: string): 'success' | 'info' | 'warning' | 'danger' {
        const severityMap: {
            [key: string]: 'success' | 'info' | 'warning' | 'danger';
        } = {
            INSCRIPTION: 'success',
            SLAUGHTER_SERVICES: 'info',
            ADDITIONAL_SERVICES: 'warning',
            PENALTIES: 'danger',
            PERMITS: 'info',
        };
        return severityMap[type] || 'info';
    }

    getStatusSeverity(status: string): 'success' | 'warning' | 'danger' {
        const severityMap: { [key: string]: 'success' | 'warning' | 'danger' } =
            {
                ACTIVE: 'success',
                INACTIVE: 'warning',
                EXPIRED: 'danger',
            };
        return severityMap[status] || 'warning';
    }

    getHistoryIcon(type: string): string {
        const iconMap: { [key: string]: string } = {
            create: 'pi pi-plus',
            update: 'pi pi-pencil',
            delete: 'pi pi-trash',
            activate: 'pi pi-check',
            deactivate: 'pi pi-times',
        };
        return iconMap[type] || 'pi pi-info';
    }

    private showSuccess(message: string): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: message,
            life: 3000,
        });
    }

    private showError(message: string): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: message,
            life: 5000,
        });
    }
}
