import { Component, OnInit } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import { RateDetailFormComponent } from '../form/rate-detail-form.component';
import { RateService } from 'src/app/zoosanitario/services/rate.service';
import {
    CalculationRequest,
    RateDetail,
    RateDetailService,
} from 'src/app/zoosanitario/services/rate-details.service';
import { Rate } from 'src/app/zoosanitario/interfaces/slaughter.interface';

interface RateDetailFilters {
    search: string;
    rateId: string;
    unit: string;
    isActive: boolean[];
    isFormula: boolean | null;
}

interface TestData {
    quantity: number;
    weight: number;
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
        unit: '',
        isActive: [],
        isFormula: null,
    };

    rateOptions: any[] = [];

    unitOptions = [
        { label: 'Unidad', value: 'Unidad' },
        { label: 'Peso', value: 'Peso' },
    ];

    statusOptions = [
        { label: 'Activo', value: true },
        { label: 'Inactivo', value: false },
    ];

    calculationTypeOptions = [
        { label: 'Valor Fijo', value: false },
        { label: 'Fórmula', value: true },
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
    calculationResult: any | null = null;

    constructor(
        private rateService: RateService,
        private rateDetailService: RateDetailService,
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
            const response: any = await this.rateDetailService
                .getAll()
                .toPromise();
            console.log(response);
            if (response?.success && response.data) {
                this.rateDetails = response.data.docs;
                this.applyFilters();
            }
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

        if (this.filters.unit) {
            filtered = filtered.filter(
                (detail) => detail.unit === this.filters.unit
            );
        }

        if (this.filters.isActive.length > 0) {
            filtered = filtered.filter((detail) =>
                this.filters.isActive.includes(detail.isActive)
            );
        }

        if (this.filters.isFormula !== null) {
            filtered = filtered.filter(
                (detail) => detail.isFormula === this.filters.isFormula
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
            await this.rateDetailService.delete(detail._id!).toPromise();
            this.showSuccess('Detalle eliminado correctamente');
            this.loadRateDetails();
        } catch (error) {
            this.showError('Error al eliminar el detalle');
        }
    }

    async onDetailSave(detail: RateDetail): Promise<void> {
        try {
            if (this.formMode === 'create') {
                await this.rateDetailService.create(detail).toPromise();
                this.showSuccess('Detalle creado correctamente');
            } else {
                await this.rateDetailService
                    .update(detail._id!, detail)
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
        if (!this.selectedDetail || !this.selectedDetail._id) return;

        this.calculating = true;
        try {
            const request: CalculationRequest = {
                rateDetailId: this.selectedDetail._id,
                amount: this.testData.quantity,
                context: {
                    quantity: this.testData.quantity,
                    weight: this.testData.weight,
                    fixedValue: this.selectedDetail.fixedValue || 0,
                },
            };

            const response = await this.rateDetailService
                .calculateValue(request)
                .toPromise();

            if (response?.success && response.data) {
                this.calculationResult = response.data;
            }
        } catch (error) {
            this.showError('Error al calcular el valor');
        } finally {
            this.calculating = false;
        }
    }

    async toggleStatus(detail: RateDetail): Promise<void> {
        try {
            const newStatus = !detail.isActive;
            await this.rateDetailService
                .toggleStatus(detail._id!, newStatus)
                .toPromise();

            this.showSuccess(
                `Detalle ${
                    newStatus ? 'activado' : 'desactivado'
                } correctamente`
            );
            this.loadRateDetails();
        } catch (error) {
            this.showError('Error al cambiar el estado');
        }
    }

    getRateName(rateId: string): string {
        const rate = this.rates.find((r) => r._id === rateId);
        return rate ? `${rate.code} - ${rate.name}` : 'Tarifa no encontrada';
    }

    getUnitSeverity(unit: string): 'success' | 'info' | 'warning' | 'danger' {
        return unit === 'Unidad' ? 'success' : 'info';
    }

    getCalculationType(detail: RateDetail): string {
        return detail.isFormula ? 'Fórmula' : 'Fijo';
    }

    getCalculationTypeSeverity(
        isFormula: boolean
    ): 'success' | 'info' | 'warning' | 'danger' {
        return isFormula ? 'warning' : 'success';
    }

    formatValue(detail: RateDetail): string {
        if (detail.isFormula) {
            return 'Calculado por fórmula';
        }

        const value = detail.fixedValue || 0;
        return new Intl.NumberFormat('es-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(value);
    }

    formatFormula(detail: RateDetail): string {
        if (!detail.isFormula || !detail.formulaText) {
            return 'Sin fórmula';
        }
        return detail.formulaText;
    }

    formatEffectiveDate(date: Date | undefined): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('es-EC');
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
