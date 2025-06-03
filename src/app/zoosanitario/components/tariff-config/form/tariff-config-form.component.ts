import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnInit,
    OnChanges,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    TariffConfig,
    TariffConfigService,
} from 'src/app/zoosanitario/services/tariff-config.service';

@Component({
    selector: 'app-tariff-config-form',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './tariff-config-form.component.html',
    styleUrls: ['./tariff-config-form.component.scss'],
    providers: [MessageService],
})
export class TariffConfigFormComponent implements OnInit, OnChanges {
    @Input() tariff?: TariffConfig;
    @Input() currentRBU = 470;
    @Output() saved = new EventEmitter<TariffConfig>();
    @Output() cancelled = new EventEmitter<void>();

    form!: FormGroup;
    loading = false;

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

    constructor(
        private fb: FormBuilder,
        private tariffService: TariffConfigService,
        private messageService: MessageService
    ) {
        this.initForm();
    }

    ngOnInit() {
        if (this.tariff) {
            this.loadTariffData();
        }
    }

    ngOnChanges() {
        if (this.tariff) {
            this.loadTariffData();
        } else {
            this.form.reset();
            this.setDefaultValues();
        }
    }

    initForm() {
        this.form = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            type: ['', Validators.required],
            category: ['', Validators.required],
            calculationType: ['', Validators.required],
            fixedAmount: [0, [Validators.min(0)]],
            percentageRBU: [0, [Validators.min(0), Validators.max(100)]],
            unitPrice: [0, [Validators.min(0)]],
            pricePerKg: [0, [Validators.min(0)]],
            minPercentage: [0, [Validators.min(0), Validators.max(100)]],
            maxPercentage: [0, [Validators.min(0), Validators.max(100)]],
            currentRBU: [
                this.currentRBU,
                [Validators.required, Validators.min(0)],
            ],
            description: [''],
            isActive: [true],
            specialConditions: this.fb.group({
                requiresTimeLimit: [false],
                timeLimitHours: [24, [Validators.min(1)]],
                appliesAfterHours: [false],
            }),
        });

        this.setupFormValidation();
    }

    setupFormValidation() {
        // Escuchar cambios en el tipo de cálculo para validar campos específicos
        this.form.get('calculationType')?.valueChanges.subscribe((value) => {
            this.updateValidationByCalculationType(value);
        });

        // Validar que maxPercentage sea mayor que minPercentage
        this.form.get('minPercentage')?.valueChanges.subscribe(() => {
            this.validatePercentageRange();
        });

        this.form.get('maxPercentage')?.valueChanges.subscribe(() => {
            this.validatePercentageRange();
        });
    }

    updateValidationByCalculationType(calculationType: string) {
        // Limpiar validaciones específicas
        const fieldsToUpdate = [
            'fixedAmount',
            'percentageRBU',
            'unitPrice',
            'pricePerKg',
            'minPercentage',
            'maxPercentage',
        ];

        fieldsToUpdate.forEach((field) => {
            const control = this.form.get(field);
            control?.clearValidators();
            control?.setValidators([Validators.min(0)]);
        });

        // Agregar validaciones específicas según el tipo
        switch (calculationType) {
            case 'FIXED_AMOUNT':
                this.form
                    .get('fixedAmount')
                    ?.setValidators([
                        Validators.required,
                        Validators.min(0.01),
                    ]);
                break;
            case 'PERCENTAGE_RBU':
                this.form
                    .get('percentageRBU')
                    ?.setValidators([
                        Validators.required,
                        Validators.min(0.01),
                        Validators.max(100),
                    ]);
                break;
            case 'PER_UNIT':
                this.form
                    .get('unitPrice')
                    ?.setValidators([
                        Validators.required,
                        Validators.min(0.01),
                    ]);
                break;
            case 'PER_KG':
                this.form
                    .get('pricePerKg')
                    ?.setValidators([
                        Validators.required,
                        Validators.min(0.01),
                    ]);
                break;
            case 'PERCENTAGE_WEIGHT':
                this.form
                    .get('minPercentage')
                    ?.setValidators([
                        Validators.required,
                        Validators.min(0),
                        Validators.max(100),
                    ]);
                this.form
                    .get('maxPercentage')
                    ?.setValidators([
                        Validators.required,
                        Validators.min(0),
                        Validators.max(100),
                    ]);
                break;
        }

        // Actualizar validaciones
        fieldsToUpdate.forEach((field) => {
            this.form.get(field)?.updateValueAndValidity();
        });
    }

    validatePercentageRange() {
        const minPercentage = this.form.get('minPercentage')?.value || 0;
        const maxPercentage = this.form.get('maxPercentage')?.value || 0;

        if (minPercentage > maxPercentage && maxPercentage > 0) {
            this.form.get('maxPercentage')?.setErrors({ invalidRange: true });
        }
    }

    loadTariffData() {
        if (this.tariff) {
            this.form.patchValue({
                ...this.tariff,
                specialConditions: this.tariff.specialConditions || {
                    requiresTimeLimit: false,
                    timeLimitHours: 24,
                    appliesAfterHours: false,
                },
            });
        }
    }

    setDefaultValues() {
        this.form.patchValue({
            currentRBU: this.currentRBU,
            isActive: true,
            specialConditions: {
                requiresTimeLimit: false,
                timeLimitHours: 24,
                appliesAfterHours: false,
            },
        });
    }

    onSubmit() {
        if (this.form.valid) {
            this.loading = true;
            const formData = this.form.value;

            const operation = this.tariff
                ? this.tariffService.updateTariff(this.tariff._id!, formData)
                : this.tariffService.createTariff(formData);

            operation.subscribe({
                next: (result) => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: `Tarifa ${
                            this.tariff ? 'actualizada' : 'creada'
                        } correctamente`,
                    });
                    this.saved.emit(result);
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
        } else {
            this.markFormGroupTouched();
        }
    }

    onCancel() {
        this.cancelled.emit();
    }

    markFormGroupTouched() {
        Object.keys(this.form.controls).forEach((key) => {
            const control = this.form.get(key);
            control?.markAsTouched();

            if (control instanceof FormGroup) {
                Object.keys(control.controls).forEach((nestedKey) => {
                    control.get(nestedKey)?.markAsTouched();
                });
            }
        });
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.form.get(fieldName);
        return !!(field?.invalid && (field?.dirty || field?.touched));
    }

    getFieldError(fieldName: string): string {
        const field = this.form.get(fieldName);
        if (field?.errors) {
            if (field.errors['required'])
                return `${this.getFieldLabel(fieldName)} es requerido`;
            if (field.errors['min'])
                return `Valor mínimo: ${field.errors['min'].min}`;
            if (field.errors['max'])
                return `Valor máximo: ${field.errors['max'].max}`;
            if (field.errors['minlength'])
                return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
            if (field.errors['invalidRange'])
                return 'El porcentaje máximo debe ser mayor al mínimo';
        }
        return '';
    }

    getFieldLabel(fieldName: string): string {
        const labels: { [key: string]: string } = {
            name: 'Nombre',
            type: 'Tipo',
            category: 'Categoría',
            calculationType: 'Tipo de Cálculo',
            fixedAmount: 'Monto Fijo',
            percentageRBU: 'Porcentaje RBU',
            unitPrice: 'Precio por Unidad',
            pricePerKg: 'Precio por Kg',
            minPercentage: 'Porcentaje Mínimo',
            maxPercentage: 'Porcentaje Máximo',
            currentRBU: 'RBU Actual',
        };
        return labels[fieldName] || fieldName;
    }

    getCalculatedValue(): string {
        const calculationType = this.form.get('calculationType')?.value;

        switch (calculationType) {
            case 'FIXED_AMOUNT':
                const fixedAmount = this.form.get('fixedAmount')?.value || 0;
                return `$${fixedAmount}`;

            case 'PERCENTAGE_RBU':
                const percentage = this.form.get('percentageRBU')?.value || 0;
                const calculated = (this.currentRBU * percentage) / 100;
                return `${percentage}% RBU = $${calculated.toFixed(2)}`;

            case 'PER_UNIT':
                const unitPrice = this.form.get('unitPrice')?.value || 0;
                return `$${unitPrice} por unidad`;

            case 'PER_KG':
                const pricePerKg = this.form.get('pricePerKg')?.value || 0;
                return `$${pricePerKg} por kg`;

            case 'PERCENTAGE_WEIGHT':
                const minPct = this.form.get('minPercentage')?.value || 0;
                const maxPct = this.form.get('maxPercentage')?.value || 0;
                return `${minPct}% - ${maxPct}% por peso`;

            default:
                return '-';
        }
    }

    shouldShowField(calculationType: string, fieldName: string): boolean {
        const fieldMap: { [key: string]: string[] } = {
            FIXED_AMOUNT: ['fixedAmount'],
            PERCENTAGE_RBU: ['percentageRBU'],
            PER_UNIT: ['unitPrice'],
            PER_KG: ['pricePerKg'],
            PERCENTAGE_WEIGHT: ['minPercentage', 'maxPercentage'],
        };

        return fieldMap[calculationType]?.includes(fieldName) || false;
    }
}
