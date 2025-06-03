import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import { TariffConfigService } from 'src/app/zoosanitario/services/tariff-config.service';

interface RbuHistory {
    date: Date;
    oldValue: number;
    newValue: number;
    updatedConfigs: number;
    user?: string;
}

@Component({
    selector: 'app-rbu-management',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './rbu-management.component.html',
    styleUrls: ['./rbu-management.component.scss'],
    providers: [MessageService, ConfirmationService],
})
export class RbuManagementComponent implements OnInit {
    rbuForm!: FormGroup;
    currentRBU = 470;
    loading = false;
    showHistory = false;

    // Simulación de historial (en un caso real vendría del backend)
    rbuHistory: RbuHistory[] = [
        {
            date: new Date('2024-01-01'),
            oldValue: 450,
            newValue: 470,
            updatedConfigs: 15,
            user: 'Admin',
        },
        {
            date: new Date('2023-06-01'),
            oldValue: 430,
            newValue: 450,
            updatedConfigs: 12,
            user: 'Admin',
        },
        {
            date: new Date('2023-01-01'),
            oldValue: 410,
            newValue: 430,
            updatedConfigs: 10,
            user: 'Admin',
        },
    ];

    predefinedValues = [
        { label: 'RBU 2024 - $470', value: 470 },
        { label: 'RBU 2023 - $450', value: 450 },
        { label: 'RBU 2022 - $430', value: 430 },
        { label: 'Personalizado', value: null },
    ];

    constructor(
        private fb: FormBuilder,
        private tariffService: TariffConfigService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {
        this.initForm();
    }

    ngOnInit() {
        this.loadCurrentRBU();
    }

    initForm() {
        this.rbuForm = this.fb.group({
            newRBU: [
                470,
                [
                    Validators.required,
                    Validators.min(100),
                    Validators.max(2000),
                ],
            ],
            predefinedValue: [470],
            reason: ['', Validators.required],
            effectiveDate: [new Date(), Validators.required],
        });

        // Escuchar cambios en valor predefinido
        this.rbuForm.get('predefinedValue')?.valueChanges.subscribe((value) => {
            if (value !== null) {
                this.rbuForm.get('newRBU')?.setValue(value);
            }
        });
    }

    loadCurrentRBU() {
        this.loading = true;
        this.tariffService.getCurrentRBU().subscribe({
            next: (result) => {
                this.currentRBU = result.currentRBU;
                this.rbuForm.get('newRBU')?.setValue(this.currentRBU);
                this.loading = false;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo cargar el RBU actual',
                });
                this.loading = false;
            },
        });
    }

    updateRBU() {
        if (this.rbuForm.valid) {
            const newRBU = this.rbuForm.get('newRBU')?.value;
            const reason = this.rbuForm.get('reason')?.value;

            if (newRBU === this.currentRBU) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Sin Cambios',
                    detail: 'El nuevo valor es igual al actual',
                });
                return;
            }

            this.confirmationService.confirm({
                message: `¿Está seguro de actualizar el RBU de $${this.currentRBU} a $${newRBU}?
                 Esto afectará todas las tarifas que usen porcentaje de RBU.

                 Motivo: ${reason}`,
                header: 'Confirmar Actualización de RBU',
                icon: 'pi pi-exclamation-triangle',
                acceptLabel: 'Sí, Actualizar',
                rejectLabel: 'Cancelar',
                accept: () => {
                    this.performRBUUpdate(newRBU, reason);
                },
            });
        } else {
            this.markFormGroupTouched();
        }
    }

    performRBUUpdate(newRBU: number, reason: string) {
        this.loading = true;

        this.tariffService.updateRBU(newRBU).subscribe({
            next: (result) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'RBU Actualizado',
                    detail: `RBU actualizado de $${result.oldRBU} a $${result.newRBU}. ${result.updatedConfigs} configuraciones afectadas.`,
                });

                // Agregar al historial
                this.rbuHistory.unshift({
                    date: new Date(),
                    oldValue: result.oldRBU,
                    newValue: result.newRBU,
                    updatedConfigs: result.updatedConfigs,
                    user: 'Usuario Actual',
                });

                this.currentRBU = result.newRBU;
                this.rbuForm.get('reason')?.setValue('');
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

    calculatePercentageChange(): number {
        const newRBU = this.rbuForm.get('newRBU')?.value || 0;
        if (this.currentRBU === 0) return 0;

        return ((newRBU - this.currentRBU) / this.currentRBU) * 100;
    }

    getChangeIndicator(): string {
        const change = this.calculatePercentageChange();
        if (change > 0) return 'increase';
        if (change < 0) return 'decrease';
        return 'same';
    }

    getImpactMessage(): string {
        const newRBU = this.rbuForm.get('newRBU')?.value || 0;
        const change = this.calculatePercentageChange();

        if (Math.abs(change) < 0.1) {
            return 'Sin cambios significativos en las tarifas';
        }

        const direction = change > 0 ? 'incremento' : 'reducción';
        return `Esto resultará en un ${direction} del ${Math.abs(
            change
        ).toFixed(1)}% en las tarifas basadas en RBU`;
    }

    markFormGroupTouched() {
        Object.keys(this.rbuForm.controls).forEach((key) => {
            const control = this.rbuForm.get(key);
            control?.markAsTouched();
        });
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.rbuForm.get(fieldName);
        return !!(field?.invalid && (field?.dirty || field?.touched));
    }

    getFieldError(fieldName: string): string {
        const field = this.rbuForm.get(fieldName);
        if (field?.errors) {
            if (field.errors['required'])
                return `${this.getFieldLabel(fieldName)} es requerido`;
            if (field.errors['min'])
                return `Valor mínimo: $${field.errors['min'].min}`;
            if (field.errors['max'])
                return `Valor máximo: $${field.errors['max'].max}`;
        }
        return '';
    }

    getFieldLabel(fieldName: string): string {
        const labels: { [key: string]: string } = {
            newRBU: 'Nuevo RBU',
            reason: 'Motivo',
            effectiveDate: 'Fecha Efectiva',
        };
        return labels[fieldName] || fieldName;
    }

    resetForm() {
        this.rbuForm.reset();
        this.rbuForm.get('newRBU')?.setValue(this.currentRBU);
        this.rbuForm.get('predefinedValue')?.setValue(this.currentRBU);
        this.rbuForm.get('effectiveDate')?.setValue(new Date());
    }

    toggleHistory() {
        this.showHistory = !this.showHistory;
    }

    exportHistory() {
        // Implementar exportación del historial
        const csvContent = this.generateHistoryCSV();
        this.downloadCSV(csvContent, 'historial_rbu.csv');
    }

    generateHistoryCSV(): string {
        const headers = [
            'Fecha',
            'Valor Anterior',
            'Nuevo Valor',
            'Cambio (%)',
            'Configuraciones Afectadas',
            'Usuario',
        ];
        const rows = this.rbuHistory.map((record) => [
            record.date.toLocaleDateString(),
            record.oldValue.toString(),
            record.newValue.toString(),
            (
                ((record.newValue - record.oldValue) / record.oldValue) *
                100
            ).toFixed(2) + '%',
            record.updatedConfigs.toString(),
            record.user || 'N/A',
        ]);

        return [headers, ...rows].map((row) => row.join(',')).join('\n');
    }

    downloadCSV(content: string, filename: string) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}
