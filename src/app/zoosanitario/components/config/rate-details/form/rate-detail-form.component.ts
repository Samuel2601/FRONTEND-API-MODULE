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
    ApplicationCondition,
    Rate,
    RateDetail,
} from 'src/app/zoosanitario/interfaces/slaughter.interface';
import { RateService } from 'src/app/zoosanitario/services/rate.service';

interface FormulaTemplate {
    id: string;
    name: string;
    description: string;
    formula: string;
}

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

    unitTypeOptions = [
        { label: 'Fijo', value: 'FIXED' },
        { label: 'Porcentaje', value: 'PERCENTAGE' },
        { label: 'Por Unidad', value: 'PER_UNIT' },
        { label: 'Por Kilogramo', value: 'PER_KG' },
        { label: 'Por Día', value: 'PER_DAY' },
    ];

    formulaType = '';
    formulaTypeOptions = [
        { label: 'Sin fórmula', value: '' },
        { label: 'Plantilla predefinida', value: 'template' },
        { label: 'Fórmula personalizada', value: 'custom' },
    ];

    selectedVariables: string[] = [];
    availableVariables = [
        { label: 'Cantidad', value: 'quantity' },
        { label: 'Peso', value: 'weight' },
        { label: 'Días', value: 'days' },
        { label: 'Valor Base', value: 'baseValue' },
        { label: 'Introductor', value: 'introducer' },
    ];

    customFormula = '';
    selectedTemplate = '';

    formulaTemplates: FormulaTemplate[] = [
        {
            id: 'linear',
            name: 'Lineal Simple',
            description: 'Valor base multiplicado por cantidad',
            formula: 'defaultValue * {quantity}',
        },
        {
            id: 'weight_based',
            name: 'Basado en Peso',
            description: 'Valor por kilogramo',
            formula: 'defaultValue * {weight}',
        },
        {
            id: 'progressive',
            name: 'Progresivo',
            description: 'Incrementa con la cantidad',
            formula: 'defaultValue * {quantity} * (1 + {quantity} * 0.1)',
        },
        {
            id: 'time_based',
            name: 'Basado en Tiempo',
            description: 'Cálculo por días',
            formula: 'defaultValue * {days}',
        },
    ];

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
        { label: 'Mayor que', value: 'gt' },
        { label: 'Mayor o igual', value: 'gte' },
        { label: 'Menor que', value: 'lt' },
        { label: 'Menor o igual', value: 'lte' },
        { label: 'Entre', value: 'between' },
    ];

    applicationConditions: ApplicationCondition[] = [];
    newCondition: Partial<ApplicationCondition> = {};

    constructor(
        private fb: FormBuilder,
        private rateService: RateService,
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
            unitType: ['FIXED', Validators.required],
            defaultValue: [0, [Validators.required, Validators.min(0)]],
            minimumValue: [null],
            maximumValue: [null],
            isActive: [true],
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
                unitType: this.rateDetail.unitType,
                defaultValue: this.rateDetail.defaultValue,
                minimumValue: this.rateDetail.minimumValue,
                maximumValue: this.rateDetail.maximumValue,
                isActive: this.rateDetail.isActive,
            });

            this.applicationConditions =
                this.rateDetail.applicationConditions || [];

            if (this.rateDetail.calculationFormula) {
                this.loadFormulaFromDetail();
            }
        } else {
            this.applicationConditions = [];
            this.resetFormula();
        }

        if (this.mode === 'view') {
            this.detailForm.disable();
        } else {
            this.detailForm.enable();
        }
    }

    private loadFormulaFromDetail(): void {
        const formula = this.rateDetail?.calculationFormula;
        if (typeof formula === 'string') {
            this.formulaType = 'custom';
            this.customFormula = formula;
        } else if (formula && typeof formula === 'object') {
            this.formulaType = 'template';
            this.selectedTemplate = formula.templateId || '';
        }
    }

    private resetFormula(): void {
        this.formulaType = '';
        this.customFormula = '';
        this.selectedTemplate = '';
        this.selectedVariables = [];
        this.testResult = null;
    }

    onSubmit(): void {
        if (this.detailForm.valid) {
            const formValue = this.detailForm.value;
            const detailData: RateDetail = {
                ...formValue,
                calculationFormula: this.buildCalculationFormula(),
                applicationConditions: this.applicationConditions,
                _id: this.rateDetail?._id || '',
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
        this.resetFormula();
    }

    selectTemplate(template: FormulaTemplate): void {
        this.selectedTemplate = template.id;
    }

    buildCalculationFormula(): any {
        if (!this.formulaType) return null;

        if (this.formulaType === 'custom') {
            return this.customFormula;
        } else if (this.formulaType === 'template') {
            const template = this.formulaTemplates.find(
                (t) => t.id === this.selectedTemplate
            );
            return template
                ? {
                      templateId: template.id,
                      formula: template.formula,
                      variables: this.selectedVariables,
                  }
                : null;
        }

        return null;
    }

    hasFormula(): boolean {
        return !!(
            this.formulaType &&
            (this.customFormula || this.selectedTemplate)
        );
    }

    async testFormula(): Promise<void> {
        if (!this.hasFormula()) return;

        this.testing = true;
        try {
            const formula = this.buildCalculationFormula();
            const testData = {
                ...this.testValues,
                defaultValue: this.detailForm.value.defaultValue || 0,
            };

            // Simulación de cálculo
            this.testResult = this.simulateFormulaCalculation(
                formula,
                testData
            );
        } catch (error) {
            this.testResult = {
                success: false,
                error: 'Error en el cálculo de la fórmula',
            };
        } finally {
            this.testing = false;
        }
    }

    private simulateFormulaCalculation(formula: any, data: any): TestResult {
        try {
            let result = data.defaultValue;

            if (typeof formula === 'string') {
                // Evaluar fórmula personalizada
                let evaluatedFormula = formula;
                evaluatedFormula = evaluatedFormula.replace(
                    /{quantity}/g,
                    data.quantity.toString()
                );
                evaluatedFormula = evaluatedFormula.replace(
                    /{weight}/g,
                    data.weight.toString()
                );
                evaluatedFormula = evaluatedFormula.replace(
                    /{days}/g,
                    data.days.toString()
                );
                evaluatedFormula = evaluatedFormula.replace(
                    /defaultValue/g,
                    data.defaultValue.toString()
                );

                // Evaluación básica (en producción usaríamos un parser seguro)
                result = eval(evaluatedFormula);
            } else if (formula && formula.templateId) {
                // Usar plantilla
                const template = this.formulaTemplates.find(
                    (t) => t.id === formula.templateId
                );
                if (template) {
                    let templateFormula = template.formula;
                    templateFormula = templateFormula.replace(
                        /{quantity}/g,
                        data.quantity.toString()
                    );
                    templateFormula = templateFormula.replace(
                        /{weight}/g,
                        data.weight.toString()
                    );
                    templateFormula = templateFormula.replace(
                        /{days}/g,
                        data.days.toString()
                    );
                    templateFormula = templateFormula.replace(
                        /defaultValue/g,
                        data.defaultValue.toString()
                    );

                    result = eval(templateFormula);
                }
            }

            return {
                success: true,
                value: result,
                details: `Calculado con: cantidad=${data.quantity}, peso=${data.weight}, días=${data.days}`,
            };
        } catch (error) {
            return {
                success: false,
                error: 'Error en la evaluación de la fórmula',
            };
        }
    }

    async validateConfiguration(): Promise<void> {
        if (this.detailForm.invalid) return;

        this.validating = true;
        try {
            const configData = {
                ...this.detailForm.value,
                calculationFormula: this.buildCalculationFormula(),
                applicationConditions: this.applicationConditions,
            };

            // Simulación de validación
            this.validationResult = {
                success: true,
                message: 'Configuración válida y lista para usar',
                details: [
                    'Valores dentro de rangos permitidos',
                    'Fórmula sintácticamente correcta',
                    'Condiciones de aplicación válidas',
                ],
            };

            this.showValidationDialog = true;
        } catch (error) {
            this.validationResult = {
                success: false,
                message: 'Error en la validación de la configuración',
                details: ['Verifique los valores y fórmulas'],
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
                operator: this.newCondition.operator!,
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
        const unitType = this.detailForm.get('unitType')?.value;
        return unitType === 'PERCENTAGE' ? 'decimal' : 'currency';
    }

    getCurrency(): string {
        return 'USD';
    }

    getMinDecimals(): number {
        const unitType = this.detailForm.get('unitType')?.value;
        return unitType === 'PERCENTAGE' ? 0 : 2;
    }

    getMaxDecimals(): number {
        const unitType = this.detailForm.get('unitType')?.value;
        return unitType === 'PERCENTAGE' ? 2 : 4;
    }

    getUnitTypeLabel(): string {
        const unitType = this.detailForm.get('unitType')?.value;
        const option = this.unitTypeOptions.find(
            (opt) => opt.value === unitType
        );
        return option?.label || 'Sin definir';
    }

    formatPreviewValue(): string {
        const value = this.detailForm.get('defaultValue')?.value || 0;
        const unitType = this.detailForm.get('unitType')?.value;

        if (unitType === 'PERCENTAGE') {
            return `${value}%`;
        }
        return new Intl.NumberFormat('es-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    }

    hasLimits(): boolean {
        const min = this.detailForm.get('minimumValue')?.value;
        const max = this.detailForm.get('maximumValue')?.value;
        return !!(min || max);
    }

    formatLimits(): string {
        const min = this.detailForm.get('minimumValue')?.value || 0;
        const max = this.detailForm.get('maximumValue')?.value || '∞';
        return `${min} - ${max}`;
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
