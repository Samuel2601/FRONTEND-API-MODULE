import { Component, OnInit, ViewChild } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Table } from 'primeng/table';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    TariffConfig,
    TariffConfigService,
} from 'src/app/zoosanitario/services/tariff-config.service';
import { TariffConfigFormComponent } from '../form/tariff-config-form.component';

@Component({
    selector: 'app-tariff-config-list',
    standalone: true,
    imports: [ImportsModule, TariffConfigFormComponent],
    templateUrl: './tariff-config-list.component.html',
    styleUrls: ['./tariff-config-list.component.scss'],
    providers: [MessageService, ConfirmationService],
})
export class TariffConfigListComponent implements OnInit {
    @ViewChild('dt') table!: Table;

    tariffs: TariffConfig[] = [];
    loading = false;
    showForm = false;
    selectedTariff?: TariffConfig;

    // Opciones para filtros
    typeOptions = [
        { label: 'Inscripción', value: 'INSCRIPTION' },
        { label: 'Tarifa de Faenamiento', value: 'SLAUGHTER_FEE' },
        { label: 'Servicios Adicionales', value: 'ADDITIONAL_SERVICE' },
        { label: 'Uso Prolongado', value: 'PROLONGED_USE' },
        { label: 'Productos Externos', value: 'EXTERNAL_PRODUCTS' },
        { label: 'Avícola', value: 'POULTRY' },
        { label: 'Establecimiento Privado', value: 'PRIVATE_ESTABLISHMENT' },
        { label: 'Multa Clandestino', value: 'FINE_CLANDESTINE' },
        {
            label: 'Multa Acceso No Autorizado',
            value: 'FINE_UNAUTHORIZED_ACCESS',
        },
    ];

    categoryOptions = [
        { label: 'Bovino', value: 'BOVINE' },
        { label: 'Porcino', value: 'PORCINE' },
        { label: 'Mixto', value: 'MIXED' },
        { label: 'General', value: 'GENERAL' },
        { label: 'Establecimiento Privado', value: 'PRIVATE_ESTABLISHMENT' },
        { label: 'Avícola', value: 'POULTRY' },
    ];

    calculationTypeOptions = [
        { label: 'Monto Fijo', value: 'FIXED_AMOUNT' },
        { label: 'Porcentaje RBU', value: 'PERCENTAGE_RBU' },
        { label: 'Por Unidad', value: 'PER_UNIT' },
        { label: 'Por Kilogramo', value: 'PER_KG' },
        { label: 'Porcentaje por Peso', value: 'PERCENTAGE_WEIGHT' },
    ];

    currentRBU = 470;

    constructor(
        private tariffService: TariffConfigService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit() {
        this.loadTariffs();
        this.loadCurrentRBU();
    }

    loadTariffs() {
        this.loading = true;
        this.tariffService.getAllTariffs().subscribe({
            next: (tariffs: any) => {
                this.tariffs = tariffs.data;
                this.loading = false;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error.message,
                });
                this.loading = false;
            },
        });
    }

    loadCurrentRBU() {
        this.tariffService.getCurrentRBU().subscribe({
            next: (result) => {
                this.currentRBU = result.currentRBU;
            },
            error: (error) => {
                console.error('Error al cargar RBU:', error);
            },
        });
    }

    newTariff() {
        this.selectedTariff = undefined;
        this.showForm = true;
    }

    editTariff(tariff: TariffConfig) {
        this.selectedTariff = { ...tariff };
        this.showForm = true;
    }

    deleteTariff(tariff: TariffConfig) {
        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar la tarifa "${tariff.name}"?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí',
            rejectLabel: 'No',
            accept: () => {
                this.tariffService.deleteTariff(tariff._id!).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Eliminado',
                            detail: 'Tarifa eliminada correctamente',
                        });
                        this.loadTariffs();
                    },
                    error: (error) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: error.message,
                        });
                    },
                });
            },
        });
    }

    toggleStatus(tariff: TariffConfig) {
        const updatedTariff = { ...tariff, isActive: !tariff.isActive };
        this.tariffService.updateTariff(tariff._id!, updatedTariff).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Actualizado',
                    detail: `Tarifa ${
                        updatedTariff.isActive ? 'activada' : 'desactivada'
                    }`,
                });
                this.loadTariffs();
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error.message,
                });
            },
        });
    }

    onFormSaved() {
        this.showForm = false;
        this.selectedTariff = undefined;
        this.loadTariffs();
    }

    onFormCancelled() {
        this.showForm = false;
        this.selectedTariff = undefined;
    }

    initializeDefaults() {
        this.confirmationService.confirm({
            message:
                '¿Está seguro de inicializar las tarifas por defecto? Esto puede sobrescribir configuraciones existentes.',
            header: 'Confirmar Inicialización',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí',
            rejectLabel: 'No',
            accept: () => {
                this.tariffService.initializeDefaults().subscribe({
                    next: (result) => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Inicializado',
                            detail: `${result.created} tarifas creadas por defecto`,
                        });
                        this.loadTariffs();
                    },
                    error: (error) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: error.message,
                        });
                    },
                });
            },
        });
    }

    clear(table: Table) {
        table.clear();
    }

    getTypeLabel(type: string): string {
        const option = this.typeOptions.find((opt) => opt.value === type);
        return option ? option.label : type;
    }

    getCategoryLabel(category: string): string {
        const option = this.categoryOptions.find(
            (opt) => opt.value === category
        );
        return option ? option.label : category;
    }

    getCalculationTypeLabel(calculationType: string): string {
        const option = this.calculationTypeOptions.find(
            (opt) => opt.value === calculationType
        );
        return option ? option.label : calculationType;
    }

    getCalculationDisplay(tariff: TariffConfig): string {
        switch (tariff.calculationType) {
            case 'FIXED_AMOUNT':
                return `$${tariff.fixedAmount}`;
            case 'PERCENTAGE_RBU':
                return `${tariff.percentageRBU}% RBU ($${(
                    (this.currentRBU * tariff.percentageRBU) /
                    100
                ).toFixed(2)})`;
            case 'PER_UNIT':
                return `$${tariff.unitPrice} por unidad`;
            case 'PER_KG':
                return `$${tariff.pricePerKg} por kg`;
            case 'PERCENTAGE_WEIGHT':
                return `${tariff.minPercentage}% - ${tariff.maxPercentage}% por peso`;
            default:
                return '-';
        }
    }
}
