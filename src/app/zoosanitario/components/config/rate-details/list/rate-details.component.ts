import { Component, OnInit } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import { RateDetailFormComponent } from '../form/rate-detail-form.component';
import {
    Rate,
    RateDetail,
} from 'src/app/zoosanitario/interfaces/slaughter.interface';
import { RateService } from 'src/app/zoosanitario/services/rate.service';

interface RateDetailFilters {
    search: string;
    rateId: string;
    unitType: string;
    isActive: boolean[];
}

interface TestData {
    quantity: number;
    weight: number;
}

interface CalculationResult {
    value: number;
    details?: string;
}

@Component({
    selector: 'app-rate-details',
    standalone: true,
    imports: [ImportsModule, RateDetailFormComponent],
    providers: [ConfirmationService],
    templateUrl: './rate-details.component.html',
    styleUrls: ['./rate-details.component.scss'],
})
export class RateDetailsComponent implements OnInit {
    rateDetails: RateDetail[] = [];
    filteredRateDetails: RateDetail[] = [];
    rates: Rate[] = [];
    loading = false;

    pageSize = 25;
    totalRecords = 0;

    filters: RateDetailFilters = {
        search: '',
        rateId: '',
        unitType: '',
        isActive: [],
    };

    rateOptions: any[] = [];

    unitTypeOptions = [
        { label: 'Fijo', value: 'FIXED' },
        { label: 'Porcentaje', value: 'PERCENTAGE' },
        { label: 'Por Unidad', value: 'PER_UNIT' },
        { label: 'Por Kilogramo', value: 'PER_KG' },
        { label: 'Por Día', value: 'PER_DAY' },
    ];

    statusOptions = [
        { label: 'Activo', value: true },
        { label: 'Inactivo', value: false },
    ];

    // Form dialog
    showFormDialog = false;
    selectedDetail: RateDetail | null = null;
    formMode: 'create' | 'edit' | 'view' = 'create';
    dialogTitle = '';

    // Formula dialog
    showFormulaDialog = false;
    testData: TestData = { quantity: 1, weight: 1 };
    calculating = false;
    calculationResult: CalculationResult | null = null;

    constructor(
        private rateService: RateService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.loadRates();
        this.loadRateDetails();
    }

    async loadRates(): Promise<void> {
        try {
            const response = await this.rateService.getAll().toPromise();
            if (response) {
                this.rates = response;
                this.rateOptions = response.map((rate) => ({
                    label: `${rate.code} - ${rate.name}`,
                    value: rate._id,
                }));
            }
        } catch (error) {
            this.showError('Error al cargar las tarifas');
        }
    }

    async loadRateDetails(): Promise<void> {
        this.loading = true;
        try {
            // Simulamos carga de detalles - en realidad usaríamos un endpoint específico
            const allDetails: RateDetail[] = [];

            for (const rate of this.rates) {
                const response = await this.rateService
                    .getRateDetails(rate._id)
                    .toPromise();
                if (response?.success && response.data) {
                    allDetails.push(...response.data);
                }
            }

            this.rateDetails = allDetails;
            this.applyFilters();
        } catch (error) {
            this.showError('Error al cargar los detalles de tarifa');
        } finally {
            this.loading = false;
        }
    }

    onFilterChange(): void {
        this.applyFilters();
    }

    applyFilters(): void {
        let filtered = [...this.rateDetails];

        if (this.filters.search) {
            const search = this.filters.search.toLowerCase();
            filtered = filtered.filter((detail) =>
                detail.description.toLowerCase().includes(search)
            );
        }

        if (this.filters.rateId) {
            filtered = filtered.filter(
                (detail) => detail.rate === this.filters.rateId
            );
        }

        if (this.filters.unitType) {
            filtered = filtered.filter(
                (detail) => detail.unitType === this.filters.unitType
            );
        }

        if (this.filters.isActive.length > 0) {
            filtered = filtered.filter((detail) =>
                this.filters.isActive.includes(detail.isActive)
            );
        }

        this.filteredRateDetails = filtered;
        this.totalRecords = filtered.length;
    }

    openCreateForm(): void {
        this.selectedDetail = null;
        this.formMode = 'create';
        this.dialogTitle = 'Nuevo Detalle de Tarifa';
        this.showFormDialog = true;
    }

    editDetail(detail: RateDetail): void {
        this.selectedDetail = { ...detail };
        this.formMode = 'edit';
        this.dialogTitle = 'Editar Detalle de Tarifa';
        this.showFormDialog = true;
    }

    viewDetail(detail: RateDetail): void {
        this.selectedDetail = detail;
        this.formMode = 'view';
        this.dialogTitle = 'Detalles de Tarifa';
        this.showFormDialog = true;
    }

    viewFormula(detail: RateDetail): void {
        this.selectedDetail = detail;
        this.testData = { quantity: 1, weight: 1 };
        this.calculationResult = null;
        this.showFormulaDialog = true;
    }

    async testCalculation(detail: RateDetail): Promise<void> {
        this.selectedDetail = detail;
        this.testData = { quantity: 1, weight: 1 };
        this.calculationResult = null;
        this.showFormulaDialog = true;

        // Auto-ejecutar cálculo
        setTimeout(() => this.calculateTestValue(), 100);
    }

    deleteDetail(detail: RateDetail): void {
        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar el detalle "${detail.description}"?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            accept: () => this.performDelete(detail),
        });
    }

    async performDelete(detail: RateDetail): Promise<void> {
        try {
            // Simulamos delete - usaríamos endpoint específico
            await this.rateService.delete(detail._id).toPromise();
            this.showSuccess('Detalle eliminado correctamente');
            this.loadRateDetails();
        } catch (error) {
            this.showError('Error al eliminar el detalle');
        }
    }

    async onDetailSave(detail: RateDetail): Promise<void> {
        try {
            if (this.formMode === 'create') {
                await this.rateService
                    .createRateDetail(detail.rate, detail)
                    .toPromise();
                this.showSuccess('Detalle creado correctamente');
            } else {
                await this.rateService
                    .updateRateDetail(detail._id, detail)
                    .toPromise();
                this.showSuccess('Detalle actualizado correctamente');
            }

            this.showFormDialog = false;
            this.loadRateDetails();
        } catch (error) {
            this.showError('Error al guardar el detalle');
        }
    }

    onFormCancel(): void {
        this.showFormDialog = false;
        this.selectedDetail = null;
    }

    async calculateTestValue(): Promise<void> {
        if (!this.selectedDetail) return;

        this.calculating = true;
        try {
            const response = await this.rateService
                .calculateRateDetailValue(
                    this.selectedDetail._id,
                    this.testData
                )
                .toPromise();

            if (response?.success && response.data) {
                this.calculationResult = {
                    value: response.data.calculatedValue,
                    details: response.data.details,
                };
            } else {
                // Cálculo simulado si no hay endpoint
                this.calculationResult = this.simulateCalculation();
            }
        } catch (error) {
            // Fallback a cálculo simulado
            this.calculationResult = this.simulateCalculation();
        } finally {
            this.calculating = false;
        }
    }

    private simulateCalculation(): CalculationResult {
        if (!this.selectedDetail) return { value: 0 };

        let value = this.selectedDetail.defaultValue || 0;
        let details = '';

        switch (this.selectedDetail.unitType) {
            case 'PER_UNIT':
                value = value * this.testData.quantity;
                details = `${value} × ${this.testData.quantity} unidades`;
                break;
            case 'PER_KG':
                value = value * this.testData.weight;
                details = `${value} × ${this.testData.weight} kg`;
                break;
            case 'PERCENTAGE':
                value =
                    this.testData.quantity *
                    this.testData.weight *
                    (value / 100);
                details = `${
                    this.testData.quantity * this.testData.weight
                } × ${value}%`;
                break;
            default:
                details = 'Valor fijo';
        }

        return { value, details };
    }

    getRateName(rateId: string): string {
        const rate = this.rates.find((r) => r._id === rateId);
        return rate ? `${rate.code} - ${rate.name}` : 'Tarifa no encontrada';
    }

    getUnitTypeSeverity(
        unitType: string
    ): 'success' | 'info' | 'warning' | 'danger' {
        const severityMap: {
            [key: string]: 'success' | 'info' | 'warning' | 'danger';
        } = {
            FIXED: 'success',
            PERCENTAGE: 'info',
            PER_UNIT: 'warning',
            PER_KG: 'warning',
            PER_DAY: 'danger',
        };
        return severityMap[unitType] || 'info';
    }

    formatValue(value: number | undefined, unitType: string): string {
        if (value === undefined || value === null) return 'N/A';

        switch (unitType) {
            case 'PERCENTAGE':
                return `${value}%`;
            case 'FIXED':
            case 'PER_UNIT':
            case 'PER_KG':
            case 'PER_DAY':
                return new Intl.NumberFormat('es-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                }).format(value);
            default:
                return value.toString();
        }
    }

    formatFormula(formula: any): string {
        if (typeof formula === 'string') return formula;
        return JSON.stringify(formula, null, 2);
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
