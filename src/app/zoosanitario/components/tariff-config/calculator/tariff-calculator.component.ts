import {
    AdditionalServicesParams,
    FineCalculationParams,
    InscriptionCalculationParams,
    ProlongedUseParams,
    SlaughterCalculationParams,
    TariffCalculation,
    TariffConfigService,
} from './../../../services/tariff-config.service';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { MessageService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';

@Component({
    selector: 'app-tariff-calculator',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './tariff-calculator.component.html',
    styleUrls: ['./tariff-calculator.component.scss'],
    providers: [MessageService],
})
export class TariffCalculatorComponent implements OnInit {
    calculatorForm!: FormGroup;
    loading = false;
    currentRBU = 470;

    // Resultados de cálculos
    slaughterResult?: TariffCalculation;
    additionalServicesResult?: TariffCalculation;
    prolongedUseResult?: TariffCalculation;
    inscriptionResult?: TariffCalculation;
    fineResult?: TariffCalculation;
    totalAmount = 0;

    // Opciones para dropdowns
    speciesOptions = [
        { label: 'Bovino', value: 'BOVINE' },
        { label: 'Porcino', value: 'PORCINE' },
    ];

    introducerTypeOptions = [
        { label: 'Bovino Mayor', value: 'BOVINE_MAJOR' },
        { label: 'Porcino Menor', value: 'PORCINE_MINOR' },
        { label: 'Mixto', value: 'MIXED' },
    ];

    fineTypeOptions = [
        { label: 'Faenamiento Clandestino', value: 'FINE_CLANDESTINE' },
        { label: 'Acceso No Autorizado', value: 'FINE_UNAUTHORIZED_ACCESS' },
    ];

    categoryOptions = [
        { label: 'Bovino', value: 'BOVINE' },
        { label: 'Porcino', value: 'PORCINE' },
        { label: 'Mixto', value: 'MIXED' },
    ];

    additionalServices = [
        { label: 'Lavado y Desinfección', type: 'WASHING', percentage: 5 },
        {
            label: 'Refrigeración Adicional',
            type: 'ADDITIONAL_COOLING',
            percentage: 8,
        },
        {
            label: 'Procesamiento Especial',
            type: 'SPECIAL_PROCESSING',
            percentage: 12,
        },
    ];

    constructor(
        private fb: FormBuilder,
        private tariffService: TariffConfigService,
        private messageService: MessageService
    ) {
        this.initForm();
    }

    ngOnInit() {
        this.loadCurrentRBU();
    }

    initForm() {
        this.calculatorForm = this.fb.group({
            // Faenamiento
            slaughter: this.fb.group({
                species: ['BOVINE', Validators.required],
                quantity: [1, [Validators.required, Validators.min(1)]],
                weight: [400, [Validators.min(1)]],
                introducerType: ['BOVINE_MAJOR', Validators.required],
            }),

            // Inscripción
            inscription: this.fb.group({
                introducerType: ['BOVINE_MAJOR', Validators.required],
                year: [
                    new Date().getFullYear(),
                    [Validators.required, Validators.min(2020)],
                ],
            }),

            // Uso Prolongado
            prolongedUse: this.fb.group({
                species: ['BOVINE', Validators.required],
                arrivalTime: [new Date(), Validators.required],
                slaughterTime: [new Date(), Validators.required],
                quantity: [1, [Validators.required, Validators.min(1)]],
            }),

            // Multas
            fine: this.fb.group({
                fineType: ['FINE_CLANDESTINE', Validators.required],
                category: ['BOVINE'],
                quantity: [1, [Validators.min(1)]],
                percentage: [100, [Validators.min(0), Validators.max(100)]],
            }),

            // Servicios adicionales
            enableAdditionalServices: [false],
            selectedServices: [[]],
        });

        // Configurar fecha de faenamiento por defecto (24 horas después)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        this.calculatorForm
            .get('prolongedUse.slaughterTime')
            ?.setValue(tomorrow);
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

    calculateSlaughterFee() {
        const slaughterData = this.calculatorForm.get('slaughter')?.value;
        if (!slaughterData || !this.calculatorForm.get('slaughter')?.valid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Datos Incompletos',
                detail: 'Complete los datos de faenamiento',
            });
            return;
        }

        this.loading = true;
        const params: SlaughterCalculationParams = {
            species: slaughterData.species,
            quantity: slaughterData.quantity,
            weight: slaughterData.weight,
            introducerType: slaughterData.introducerType,
        };

        this.tariffService.calculateSlaughterFee(params).subscribe({
            next: (result) => {
                this.slaughterResult = result;
                this.calculateAdditionalServicesIfEnabled();
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

    calculateAdditionalServicesIfEnabled() {
        if (
            this.calculatorForm.get('enableAdditionalServices')?.value &&
            this.slaughterResult
        ) {
            const selectedServices =
                this.calculatorForm.get('selectedServices')?.value || [];

            if (selectedServices.length > 0) {
                const services = selectedServices.map((serviceType: string) => {
                    const service = this.additionalServices.find(
                        (s) => s.type === serviceType
                    );
                    return {
                        type: serviceType,
                        percentage: service?.percentage || 5,
                    };
                });

                const params: AdditionalServicesParams = {
                    totalSlaughterAmount: this.slaughterResult.amount,
                    services: services,
                };

                this.tariffService
                    .calculateAdditionalServices(params)
                    .subscribe({
                        next: (result) => {
                            this.additionalServicesResult = result;
                            this.updateTotalAmount();
                        },
                        error: (error) => {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error en Servicios Adicionales',
                                detail: error.message,
                            });
                        },
                    });
            } else {
                this.additionalServicesResult = undefined;
                this.updateTotalAmount();
            }
        } else {
            this.additionalServicesResult = undefined;
            this.updateTotalAmount();
        }
    }

    calculateProlongedUse() {
        const prolongedData = this.calculatorForm.get('prolongedUse')?.value;
        if (!prolongedData || !this.calculatorForm.get('prolongedUse')?.valid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Datos Incompletos',
                detail: 'Complete los datos de uso prolongado',
            });
            return;
        }

        this.loading = true;
        const params: ProlongedUseParams = {
            species: prolongedData.species,
            arrivalTime: new Date(prolongedData.arrivalTime),
            slaughterTime: new Date(prolongedData.slaughterTime),
            quantity: prolongedData.quantity,
        };

        this.tariffService.calculateProlongedUse(params).subscribe({
            next: (result) => {
                this.prolongedUseResult = result;
                this.updateTotalAmount();
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

    calculateInscription() {
        const inscriptionData = this.calculatorForm.get('inscription')?.value;
        if (
            !inscriptionData ||
            !this.calculatorForm.get('inscription')?.valid
        ) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Datos Incompletos',
                detail: 'Complete los datos de inscripción',
            });
            return;
        }

        this.loading = true;
        const params: InscriptionCalculationParams = {
            introducerType: inscriptionData.introducerType,
            year: inscriptionData.year,
        };

        this.tariffService.calculateInscription(params).subscribe({
            next: (result) => {
                this.inscriptionResult = result;
                this.updateTotalAmount();
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

    calculateFine() {
        const fineData = this.calculatorForm.get('fine')?.value;
        if (!fineData || !this.calculatorForm.get('fine')?.valid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Datos Incompletos',
                detail: 'Complete los datos de multa',
            });
            return;
        }

        this.loading = true;
        const params: FineCalculationParams = {
            fineType: fineData.fineType,
            category: fineData.category,
            quantity: fineData.quantity,
            percentage: fineData.percentage,
        };

        this.tariffService.calculateFine(params).subscribe({
            next: (result) => {
                this.fineResult = result;
                this.updateTotalAmount();
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

    updateTotalAmount() {
        this.totalAmount = 0;

        if (this.slaughterResult)
            this.totalAmount += this.slaughterResult.amount;
        if (this.additionalServicesResult)
            this.totalAmount += this.additionalServicesResult.amount;
        if (this.prolongedUseResult)
            this.totalAmount += this.prolongedUseResult.amount;
        if (this.inscriptionResult)
            this.totalAmount += this.inscriptionResult.amount;
        if (this.fineResult) this.totalAmount += this.fineResult.amount;
    }

    calculateAll() {
        this.clearResults();
        this.calculateSlaughterFee();
        this.calculateProlongedUse();
        this.calculateInscription();
    }

    clearResults() {
        this.slaughterResult = undefined;
        this.additionalServicesResult = undefined;
        this.prolongedUseResult = undefined;
        this.inscriptionResult = undefined;
        this.fineResult = undefined;
        this.totalAmount = 0;
    }

    clearAll() {
        this.calculatorForm.reset();
        this.initForm();
        this.clearResults();
    }

    onAdditionalServicesToggle() {
        if (!this.calculatorForm.get('enableAdditionalServices')?.value) {
            this.calculatorForm.get('selectedServices')?.setValue([]);
            this.additionalServicesResult = undefined;
            this.updateTotalAmount();
        }
    }

    onSelectedServicesChange() {
        if (this.calculatorForm.get('enableAdditionalServices')?.value) {
            this.calculateAdditionalServicesIfEnabled();
        }
    }

    getHoursDifference(): number {
        const arrival = this.calculatorForm.get(
            'prolongedUse.arrivalTime'
        )?.value;
        const slaughter = this.calculatorForm.get(
            'prolongedUse.slaughterTime'
        )?.value;

        if (arrival && slaughter) {
            const arrivalDate = new Date(arrival);
            const slaughterDate = new Date(slaughter);
            const diffMs = slaughterDate.getTime() - arrivalDate.getTime();
            return Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
        }

        return 0;
    }
}
