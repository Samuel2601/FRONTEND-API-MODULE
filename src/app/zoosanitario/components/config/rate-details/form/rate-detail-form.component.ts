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
import { Rate } from 'src/app/zoosanitario/interfaces/slaughter.interface';
import {
    ApplicationCondition,
    FormulaTestRequest,
    FormulaValidationRequest,
    RateDetail,
    RateDetailService,
} from 'src/app/zoosanitario/services/rate-details.service';

import { RateService } from 'src/app/zoosanitario/services/rate.service';

interface TestValues {
    quantity: number;
    weight: number;
    days: number;
}

interface TestResult {
    success: boolean;
    value?: number;
    error?: string;
    details?: string;
}

@Component({
    selector: 'app-rate-detail-form',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './rate-detail-form.component.html',
    styleUrls: ['./rate-detail-form.component.scss'],
})
export class RateDetailFormComponent implements OnInit, OnChanges {
    @Input() rateDetail: RateDetail | null = null;
    @Input() mode: 'create' | 'edit' | 'view' = 'create';
    @Input() rates: Rate[] = [];
    @Output() save = new EventEmitter<RateDetail>();
    @Output() cancel = new EventEmitter<void>();

    detailForm: FormGroup;
    saving = false;
    validating = false;
    testing = false;

    showValidationDialog = false;
    validationResult: any = null;

    rateOptions: any[] = [];

    unitOptions = [
        { label: 'Unidad', value: 'Unidad' },
        { label: 'Peso', value: 'Peso' },
    ];

    isFormulaMode = false;
    customFormula = '';
    testValues: TestValues = { quantity: 1, weight: 1, days: 1 };
    testResult: TestResult | null = null;

    conditionFieldOptions = [
        { label: 'Tipo de Persona', value: 'personType' },
        { label: 'Tipo de Animal', value: 'animalType' },
        { label: 'Cantidad', value: 'quantity' },
        { label: 'Peso Total', value: 'totalWeight' },
        { label: 'Valor Total', value: 'totalValue' },
    ];

    operatorOptions = [
        { label: 'Igual a', value: 'eq' },
        { label: 'No igual a', value: 'ne' },
        { label: 'Mayor que', value: 'gt' },
        { label: 'Mayor o igual', value: 'gte' },
        { label: 'Menor que', value: 'lt' },
        { label: 'Menor o igual', value: 'lte' },
        { label: 'En', value: 'in' },
        { label: 'No en', value: 'nin' },
        { label: 'Entre', value: 'between' },
    ];

    applicationConditions: ApplicationCondition[] = [];
    newCondition: Partial<ApplicationCondition> = {};

    constructor(
        private fb: FormBuilder,
        private rateService: RateService,
        private rateDetailService: RateDetailService,
        private messageService: MessageService
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        this.loadRateOptions();
        this.loadFormData();
    }

    ngOnChanges(): void {
        this.loadRateOptions();
        this.loadFormData();
    }

    private initForm(): void {
        this.detailForm = this.fb.group({
            rate: ['', Validators.required],
            description: ['', [Validators.required, Validators.minLength(10)]],
            unit: ['Unidad', Validators.required],
            isFormula: [false],
            formulaText: [''],
            fixedValue: [0],
            isActive: [true],
            effectiveDate: [new Date(), Validators.required],
            expirationDate: [null],
            version: [1],
        });

        // Escuchar cambios en isFormula
        this.detailForm
            .get('isFormula')
            ?.valueChanges.subscribe((isFormula) => {
                this.isFormulaMode = isFormula;
                const formulaControl = this.detailForm.get('formulaText');
                const fixedControl = this.detailForm.get('fixedValue');

                if (isFormula) {
                    formulaControl?.setValidators([Validators.required]);
                    fixedControl?.clearValidators();
                } else {
                    formulaControl?.clearValidators();
                    fixedControl?.setValidators([
                        Validators.required,
                        Validators.min(0),
                    ]);
                }

                formulaControl?.updateValueAndValidity();
                fixedControl?.updateValueAndValidity();
            });
    }

    private loadRateOptions(): void {
        this.rateOptions = this.rates.map((rate) => ({
            label: `${rate.code} - ${rate.name}`,
            value: rate._id,
        }));
    }

    private loadFormData(): void {
        if (this.rateDetail) {
            this.detailForm.patchValue({
                rate: this.rateDetail.rate,
                description: this.rateDetail.description,
                unit: this.rateDetail.unit,
                isFormula: this.rateDetail.isFormula,
                formulaText: this.rateDetail.formulaText || '',
                fixedValue: this.rateDetail.fixedValue || 0,
                isActive: this.rateDetail.isActive,
                effectiveDate: new Date(this.rateDetail.effectiveDate),
                expirationDate: this.rateDetail.expirationDate
                    ? new Date(this.rateDetail.expirationDate)
                    : null,
                version: this.rateDetail.version,
            });

            this.applicationConditions =
                this.rateDetail.applicationConditions || [];
            this.isFormulaMode = this.rateDetail.isFormula;
            this.customFormula = this.rateDetail.formulaText || '';
        } else {
            this.applicationConditions = [];
            this.isFormulaMode = false;
        }

        if (this.mode === 'view') {
            this.detailForm.disable();
        } else {
            this.detailForm.enable();
        }
    }

    onSubmit(): void {
        if (this.detailForm.valid) {
            const formValue = this.detailForm.value;
            const detailData: RateDetail = {
                ...formValue,
                applicationConditions: this.applicationConditions,
                _id: this.rateDetail?._id,
                createdAt: this.rateDetail?.createdAt || new Date(),
                updatedAt: new Date(),
            };

            this.save.emit(detailData);
        }
    }

    onCancel(): void {
        this.cancel.emit();
    }

    switchToEditMode(): void {
        this.mode = 'edit';
        this.detailForm.enable();
    }

    onFormulaTypeChange(): void {
        if (this.isFormulaMode) {
            this.customFormula =
                this.detailForm.get('formulaText')?.value || '';
        }
    }

    hasFormula(): boolean {
        return this.isFormulaMode && !!this.customFormula;
    }

    async testFormula(): Promise<void> {
        if (!this.hasFormula()) return;

        this.testing = true;
        try {
            const testRequest: FormulaTestRequest = {
                formulaText: this.customFormula,
                testCases: [
                    {
                        name: 'Prueba Manual',
                        context: {
                            quantity: this.testValues.quantity,
                            weight: this.testValues.weight,
                            days: this.testValues.days,
                            fixedValue: this.detailForm.value.fixedValue || 0,
                        },
                    },
                ],
            };

            const response = await this.rateDetailService
                .testFormula(testRequest)
                .toPromise();

            if (response?.data?.testResults?.[0]) {
                const result = response.data.testResults[0];
                this.testResult = {
                    success: result.success,
                    value: result.result,
                    error: result.error,
                    details: `Contexto: cantidad=${this.testValues.quantity}, peso=${this.testValues.weight}, días=${this.testValues.days}`,
                };
            }
        } catch (error) {
            this.testResult = {
                success: false,
                error: 'Error al probar la fórmula',
            };
        } finally {
            this.testing = false;
        }
    }

    async validateConfiguration(): Promise<void> {
        if (this.detailForm.invalid) return;

        this.validating = true;
        try {
            if (this.isFormulaMode && this.customFormula) {
                const validationRequest: FormulaValidationRequest = {
                    formulaText: this.customFormula,
                };

                const response = await this.rateDetailService
                    .validateFormula(validationRequest)
                    .toPromise();

                if (response?.data) {
                    this.validationResult = {
                        success: response.data.valid,
                        message: response.data.message,
                        details: response.data.valid
                            ? ['Fórmula sintácticamente correcta']
                            : ['Error en la sintaxis de la fórmula'],
                    };
                }
            } else {
                this.validationResult = {
                    success: true,
                    message: 'Configuración válida',
                    details: ['Valor fijo configurado correctamente'],
                };
            }

            this.showValidationDialog = true;
        } catch (error) {
            this.validationResult = {
                success: false,
                message: 'Error en la validación',
                details: ['No se pudo validar la configuración'],
            };
            this.showValidationDialog = true;
        } finally {
            this.validating = false;
        }
    }

    // Condition management
    addCondition(): void {
        if (this.isNewConditionValid()) {
            const condition: ApplicationCondition = {
                field: this.newCondition.field!,
                operator: this.newCondition.operator as any,
                value: this.newCondition.value!,
                logicalOperator:
                    this.applicationConditions.length > 0 ? 'AND' : 'AND',
            };

            this.applicationConditions.push(condition);
            this.newCondition = {};
        }
    }

    removeCondition(index: number): void {
        this.applicationConditions.splice(index, 1);
    }

    isNewConditionValid(): boolean {
        return !!(
            this.newCondition.field &&
            this.newCondition.operator &&
            this.newCondition.value
        );
    }

    getConditionFieldLabel(field: string): string {
        const option = this.conditionFieldOptions.find(
            (opt) => opt.value === field
        );
        return option?.label || field;
    }

    getOperatorLabel(operator: string): string {
        const option = this.operatorOptions.find(
            (opt) => opt.value === operator
        );
        return option?.label || operator;
    }

    // UI helpers
    getNumberMode(): string {
        return 'currency';
    }

    getCurrency(): string {
        return 'USD';
    }

    getMinDecimals(): number {
        return 2;
    }

    getMaxDecimals(): number {
        return 4;
    }

    getUnitTypeLabel(): string {
        const unit = this.detailForm.get('unit')?.value;
        return unit || 'Sin definir';
    }

    formatPreviewValue(): string {
        const isFormula = this.detailForm.get('isFormula')?.value;
        const value = this.detailForm.get('fixedValue')?.value || 0;

        if (isFormula) {
            return 'Calculado por fórmula';
        }

        return new Intl.NumberFormat('es-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    }

    hasLimits(): boolean {
        return false; // El nuevo modelo no tiene límites min/max
    }

    formatLimits(): string {
        return 'N/A';
    }

    // Validation helpers
    isFieldInvalid(fieldName: string): boolean {
        const field = this.detailForm.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }

    getFieldError(fieldName: string): string {
        const field = this.detailForm.get(fieldName);
        if (field && field.errors) {
            if (field.errors['required']) return 'Este campo es requerido';
            if (field.errors['minlength'])
                return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
            if (field.errors['min'])
                return `Valor mínimo: ${field.errors['min'].min}`;
        }
        return '';
    }
}
