import { Component, OnInit } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import { ReferenceValue } from 'src/app/zoosanitario/interfaces/slaughter.interface';
import { ReferenceValueService } from 'src/app/zoosanitario/services/reference-value.service';
import { ReferenceValueFormComponent } from '../form/reference-value-form.component';

interface ReferenceValueFilters {
    search: string;
    valueType: string;
    isActive: boolean | null;
}

interface RecentUpdate {
    code: string;
    oldValue: number;
    newValue: number;
    valueType: string;
    updatedAt: Date;
}

@Component({
    selector: 'app-reference-values',
    standalone: true,
    imports: [ImportsModule, ReferenceValueFormComponent],
    providers: [ConfirmationService],
    templateUrl: './reference-values.component.html',
    styleUrls: ['./reference-values.component.scss'],
})
export class ReferenceValuesComponent implements OnInit {
    referenceValues: ReferenceValue[] = [];
    filteredValues: ReferenceValue[] = [];
    recentUpdates: RecentUpdate[] = [];
    loading = false;
    updating = false;

    pageSize = 25;
    totalRecords = 0;

    filters: ReferenceValueFilters = {
        search: '',
        valueType: '',
        isActive: null,
    };

    valueTypeOptions = [
        { label: 'Monetario', value: 'MONETARY' },
        { label: 'Porcentaje', value: 'PERCENTAGE' },
        { label: 'Numérico', value: 'NUMERIC' },
        { label: 'Configuración Límite', value: 'LIMIT_CONFIG' },
    ];

    statusOptions = [
        { label: 'Activo', value: true },
        { label: 'Inactivo', value: false },
    ];

    // System values
    currentRBU = 0;
    currentSBU = 0;
    systemValues = ['RBU', 'SBU', 'IVA', 'DESCUENTO_MAX', 'LIMITE_CREDITO'];

    // Form dialog
    showFormDialog = false;
    selectedValue: ReferenceValue | null = null;
    formMode: 'create' | 'edit' | 'view' = 'create';
    dialogTitle = '';

    // Quick update dialogs
    showRBUDialog = false;
    showSBUDialog = false;
    newRBUValue: number | null = null;
    newSBUValue: number | null = null;
    updateReason = '';

    // History dialog
    showHistoryDialog = false;
    selectedValueHistory: any[] = [];

    constructor(
        private referenceValueService: ReferenceValueService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.loadReferenceValues();
        this.loadRecentUpdates();
        this.loadSystemValues();
    }

    async loadReferenceValues(): Promise<void> {
        this.loading = true;
        try {
            const response = await this.referenceValueService
                .getActiveValues()
                .toPromise();
            if (response?.success && response.data) {
                this.referenceValues = response.data;
                this.applyFilters();
            }
        } catch (error) {
            this.showError('Error al cargar los valores de referencia');
        } finally {
            this.loading = false;
        }
    }

    async loadSystemValues(): Promise<void> {
        try {
            // Cargar RBU
            const rbuResponse = await this.referenceValueService
                .getValueByCode('RBU')
                .toPromise();
            if (rbuResponse?.success && rbuResponse.data) {
                this.currentRBU = rbuResponse.data.value;
            }

            // Cargar SBU
            const sbuResponse = await this.referenceValueService
                .getValueByCode('SBU')
                .toPromise();
            if (sbuResponse?.success && sbuResponse.data) {
                this.currentSBU = sbuResponse.data.value;
            }
        } catch (error) {
            console.error('Error loading system values:', error);
        }
    }

    loadRecentUpdates(): void {
        // Simular cargar actualizaciones recientes
        // En producción esto vendría de un endpoint específico
        this.recentUpdates = [
            {
                code: 'RBU',
                oldValue: 850.0,
                newValue: 875.5,
                valueType: 'MONETARY',
                updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            },
            {
                code: 'IVA',
                oldValue: 15.0,
                newValue: 16.0,
                valueType: 'PERCENTAGE',
                updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            },
        ];
    }

    onFilterChange(): void {
        this.applyFilters();
    }

    applyFilters(): void {
        let filtered = [...this.referenceValues];

        if (this.filters.search) {
            const search = this.filters.search.toLowerCase();
            filtered = filtered.filter(
                (value) =>
                    value.code.toLowerCase().includes(search) ||
                    value.name.toLowerCase().includes(search) ||
                    value.description.toLowerCase().includes(search)
            );
        }

        if (this.filters.valueType) {
            filtered = filtered.filter(
                (value) => value.valueType === this.filters.valueType
            );
        }

        if (this.filters.isActive !== null) {
            filtered = filtered.filter(
                (value) => value.isActive === this.filters.isActive
            );
        }

        this.filteredValues = filtered;
        this.totalRecords = filtered.length;
    }

    clearFilters(): void {
        this.filters = { search: '', valueType: '', isActive: null };
        this.applyFilters();
    }

    openCreateForm(): void {
        this.selectedValue = null;
        this.formMode = 'create';
        this.dialogTitle = 'Nuevo Valor de Referencia';
        this.showFormDialog = true;
    }

    editValue(value: ReferenceValue): void {
        this.selectedValue = { ...value };
        this.formMode = 'edit';
        this.dialogTitle = 'Editar Valor de Referencia';
        this.showFormDialog = true;
    }

    viewValue(value: ReferenceValue): void {
        this.selectedValue = value;
        this.formMode = 'view';
        this.dialogTitle = 'Detalles del Valor de Referencia';
        this.showFormDialog = true;
    }

    async viewHistory(value: ReferenceValue): Promise<void> {
        try {
            // Simular historial - en producción usar endpoint específico
            this.selectedValueHistory = [
                {
                    type: 'update',
                    action: 'Actualización de Valor',
                    description: `Valor actualizado de ${this.formatValue(
                        value.value - 25,
                        value.valueType
                    )} a ${this.formatValue(value.value, value.valueType)}`,
                    valueChange: {
                        from: this.formatValue(
                            value.value - 25,
                            value.valueType
                        ),
                        to: this.formatValue(value.value, value.valueType),
                    },
                    reason: 'Ajuste por inflación anual',
                    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                    user: 'Admin',
                },
                {
                    type: 'create',
                    action: 'Creación de Valor',
                    description: `Valor de referencia creado con valor inicial ${this.formatValue(
                        value.value - 25,
                        value.valueType
                    )}`,
                    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    user: 'Sistema',
                },
            ];
            this.showHistoryDialog = true;
        } catch (error) {
            this.showError('Error al cargar el historial');
        }
    }

    testCalculation(value: ReferenceValue): void {
        if (value.calculationFormula) {
            this.showInfo('Función de cálculo disponible próximamente');
        }
    }

    deleteValue(value: ReferenceValue): void {
        if (this.isSystemValue(value.code)) {
            this.showWarning('No se pueden eliminar valores del sistema');
            return;
        }

        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar el valor "${value.name}"?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            accept: () => this.performDelete(value),
        });
    }

    async performDelete(value: ReferenceValue): Promise<void> {
        try {
            await this.referenceValueService.delete(value._id).toPromise();
            this.showSuccess('Valor de referencia eliminado correctamente');
            this.loadReferenceValues();
        } catch (error) {
            this.showError('Error al eliminar el valor de referencia');
        }
    }

    async onValueSave(value: ReferenceValue): Promise<void> {
        try {
            if (this.formMode === 'create') {
                await this.referenceValueService.create(value).toPromise();
                this.showSuccess('Valor de referencia creado correctamente');
            } else {
                await this.referenceValueService
                    .update(value._id, value)
                    .toPromise();
                this.showSuccess(
                    'Valor de referencia actualizado correctamente'
                );
            }

            this.showFormDialog = false;
            this.loadReferenceValues();
            this.loadSystemValues();
        } catch (error) {
            this.showError('Error al guardar el valor de referencia');
        }
    }

    onFormCancel(): void {
        this.showFormDialog = false;
        this.selectedValue = null;
    }

    // Quick updates
    updateRBU(): void {
        this.newRBUValue = this.currentRBU;
        this.updateReason = '';
        this.showRBUDialog = true;
    }

    updateSBU(): void {
        this.newSBUValue = this.currentSBU;
        this.updateReason = '';
        this.showSBUDialog = true;
    }

    async confirmRBUUpdate(): Promise<void> {
        if (!this.newRBUValue || this.newRBUValue <= 0) return;

        this.updating = true;
        try {
            const response = await this.referenceValueService
                .updateRBU(this.newRBUValue)
                .toPromise();
            if (response?.success) {
                this.showSuccess('RBU actualizado correctamente');
                this.currentRBU = this.newRBUValue;
                this.showRBUDialog = false;
                this.loadReferenceValues();
            } else {
                this.showError('Error al actualizar RBU');
            }
        } catch (error) {
            this.showError('Error al actualizar RBU');
        } finally {
            this.updating = false;
        }
    }

    async confirmSBUUpdate(): Promise<void> {
        if (!this.newSBUValue || this.newSBUValue <= 0) return;

        this.updating = true;
        try {
            const response = await this.referenceValueService
                .updateSBU(this.newSBUValue)
                .toPromise();
            if (response?.success) {
                this.showSuccess('SBU actualizado correctamente');
                this.currentSBU = this.newSBUValue;
                this.showSBUDialog = false;
                this.loadReferenceValues();
            } else {
                this.showError('Error al actualizar SBU');
            }
        } catch (error) {
            this.showError('Error al actualizar SBU');
        } finally {
            this.updating = false;
        }
    }

    cancelQuickUpdate(): void {
        this.showRBUDialog = false;
        this.showSBUDialog = false;
        this.newRBUValue = null;
        this.newSBUValue = null;
        this.updateReason = '';
    }

    // UI helpers
    formatValue(value: number, valueType: string): string {
        switch (valueType) {
            case 'MONETARY':
                return new Intl.NumberFormat('es-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                }).format(value);
            case 'PERCENTAGE':
                return `${value}%`;
            case 'NUMERIC':
                return value.toLocaleString('es-US');
            default:
                return value.toString();
        }
    }

    getValueTypeSeverity(
        valueType: string
    ): 'success' | 'info' | 'warning' | 'danger' {
        const severityMap: {
            [key: string]: 'success' | 'info' | 'warning' | 'danger';
        } = {
            MONETARY: 'success',
            PERCENTAGE: 'info',
            NUMERIC: 'warning',
            LIMIT_CONFIG: 'danger',
        };
        return severityMap[valueType] || 'info';
    }

    getValueClass(valueType: string): string {
        return `value-${valueType.toLowerCase()}`;
    }

    getRowClass(value: ReferenceValue): string {
        const classes = [];
        if (this.isSystemValue(value.code)) classes.push('system-value');
        if (!value.isActive) classes.push('inactive-value');
        return classes.join(' ');
    }

    isSystemValue(code: string): boolean {
        return this.systemValues.includes(code);
    }

    hasCalculationFormula(value: ReferenceValue): boolean {
        return !!value.calculationFormula;
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

    private showWarning(message: string): void {
        this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: message,
            life: 4000,
        });
    }

    private showInfo(message: string): void {
        this.messageService.add({
            severity: 'info',
            summary: 'Información',
            detail: message,
            life: 3000,
        });
    }
}
