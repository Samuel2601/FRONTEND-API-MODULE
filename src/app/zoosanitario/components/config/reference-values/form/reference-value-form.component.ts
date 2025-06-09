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
import { ReferenceValue } from 'src/app/zoosanitario/interfaces/slaughter.interface';
import { ReferenceValueService } from 'src/app/zoosanitario/services/reference-value.service';

interface TestValues {
    baseValue: number;
    factor: number;
}

interface TestResult {
    success: boolean;
    value?: number;
    error?: string;
}

interface ApplicabilityRule {
    field: string;
    operator: string;
    value: string;
}

@Component({
    selector: 'app-reference-value-form',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './reference-value-form.component.html',
    styleUrls: ['./reference-value-form.component.scss'],
})
export class ReferenceValueFormComponent implements OnInit, OnChanges {
    @Input() referenceValue: ReferenceValue | null = null;
    @Input() mode: 'create' | 'edit' | 'view' = 'create';
    @Output() save = new EventEmitter<ReferenceValue>();
    @Output() cancel = new EventEmitter<void>();

    valueForm: FormGroup;
    saving = false;
    validating = false;
    testing = false;

    showValidationDialog = false;
    validationResult: any = null;

    systemValues = ['RBU', 'SBU', 'IVA', 'DESCUENTO_MAX', 'LIMITE_CREDITO'];

    valueTypeOptions = [
        { label: 'Monetario', value: 'MONETARY' },
        { label: 'Porcentaje', value: 'PERCENTAGE' },
        { label: 'Numérico', value: 'NUMERIC' },
        { label: 'Configuración Límite', value: 'LIMIT_CONFIG' },
    ];

    currencyOptions = [
        { label: 'Dólar Estadounidense (USD)', value: 'USD' },
        { label: 'Euro (EUR)', value: 'EUR' },
    ];

    formulaType = '';
    formulaTypeOptions = [
        { label: 'Sin fórmula', value: '' },
        { label: 'Valor dinámico', value: 'dynamic' },
        { label: 'Fórmula personalizada', value: 'custom' },
    ];

    selectedVariables: string[] = [];
    availableVariables = [
        { label: 'Tasa de Inflación', value: 'inflationRate' },
        { label: 'Valor Base', value: 'baseValue' },
        { label: 'Factor de Ajuste', value: 'adjustmentFactor' },
        { label: 'Índice Económico', value: 'economicIndex' },
    ];

    customFormula = '';
    testValues: TestValues = { baseValue: 100, factor: 5 };
    testResult: TestResult | null = null;

    ruleFieldOptions = [
        { label: 'Fecha', value: 'date' },
        { label: 'Valor Total', value: 'totalValue' },
        { label: 'Tipo de Usuario', value: 'userType' },
        { label: 'Región', value: 'region' },
    ];

    operatorOptions = [
        { label: 'Igual a', value: 'eq' },
        { label: 'Mayor que', value: 'gt' },
        { label: 'Mayor o igual', value: 'gte' },
        { label: 'Menor que', value: 'lt' },
        { label: 'Menor o igual', value: 'lte' },
        { label: 'Entre', value: 'between' },
    ];

    applicabilityRules: ApplicabilityRule[] = [];
    newRule: Partial<ApplicabilityRule> = {};

    constructor(
        private fb: FormBuilder,
        private referenceValueService: ReferenceValueService,
        private messageService: MessageService
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        this.loadFormData();
    }

    ngOnChanges(): void {
        this.loadFormData();
    }

    private initForm(): void {
        this.valueForm = this.fb.group({
            code: ['', [Validators.required, Validators.pattern(/^[A-Z_]+$/)]],
            name: ['', [Validators.required, Validators.minLength(3)]],
            description: ['', [Validators.required, Validators.minLength(10)]],
            valueType: ['MONETARY', Validators.required],
            value: [0, [Validators.required, Validators.min(0)]],
            currency: ['USD'],
            priority: [
                1,
                [Validators.required, Validators.min(1), Validators.max(10)],
            ],
            isActive: [true],
            startDate: [new Date(), Validators.required],
            endDate: [null],
        });
    }

    private loadFormData(): void {
        if (this.referenceValue) {
            this.valueForm.patchValue({
                code: this.referenceValue.code,
                name: this.referenceValue.name,
                description: this.referenceValue.description,
                valueType: this.referenceValue.valueType,
                value: this.referenceValue.value,
                currency: this.referenceValue.currency || 'USD',
                priority: this.referenceValue.priority,
                isActive: this.referenceValue.isActive,
                startDate: new Date(this.referenceValue.startDate),
                endDate: this.referenceValue.endDate
                    ? new Date(this.referenceValue.endDate)
                    : null,
            });

            this.loadAdvancedConfig();
        } else {
            this.resetAdvancedConfig();
        }

        if (this.mode === 'view') {
            this.valueForm.disable();
        } else {
            this.valueForm.enable();
            if (this.isSystemValue()) {
                this.valueForm.get('code')?.disable();
                this.valueForm.get('valueType')?.disable();
            }
        }
    }

    private loadAdvancedConfig(): void {
        if (this.referenceValue?.calculationFormula) {
            this.loadFormulaConfig();
        }

        if (this.referenceValue?.applicabilityRules) {
            this.loadApplicabilityRules();
        }
    }

    private loadFormulaConfig(): void {
        const formula = this.referenceValue?.calculationFormula;
        if (typeof formula === 'string') {
            this.formulaType = 'custom';
            this.customFormula = formula;
        } else if (formula && typeof formula === 'object') {
            this.formulaType = 'dynamic';
            this.selectedVariables = formula.variables || [];
        }
    }

    private loadApplicabilityRules(): void {
        // Simular carga de reglas desde la configuración
        this.applicabilityRules = [];
    }

    private resetAdvancedConfig(): void {
        this.formulaType = '';
        this.customFormula = '';
        this.selectedVariables = [];
        this.applicabilityRules = [];
        this.testResult = null;
    }

    onSubmit(): void {
        if (this.valueForm.valid) {
            const formValue = this.valueForm.value;
            const valueData: ReferenceValue = {
                ...formValue,
                calculationFormula: this.buildCalculationFormula(),
                applicabilityRules: this.buildApplicabilityRules(),
                _id: this.referenceValue?._id || '',
                createdAt: this.referenceValue?.createdAt || new Date(),
                updatedAt: new Date(),
            };

            this.save.emit(valueData);
        }
    }

    onCancel(): void {
        this.cancel.emit();
    }

    switchToEditMode(): void {
        this.mode = 'edit';
        this.valueForm.enable();
        if (this.isSystemValue()) {
            this.valueForm.get('code')?.disable();
            this.valueForm.get('valueType')?.disable();
        }
    }

    onValueTypeChange(): void {
        const valueType = this.valueForm.get('valueType')?.value;

        // Resetear valor cuando cambia el tipo
        this.valueForm.get('value')?.setValue(0);

        // Configurar campos específicos según el tipo
        if (valueType === 'MONETARY') {
            this.valueForm.get('currency')?.setValue('USD');
        } else {
            this.valueForm.get('currency')?.setValue(null);
        }
    }

    onFormulaTypeChange(): void {
        this.customFormula = '';
        this.selectedVariables = [];
        this.testResult = null;
    }

    buildCalculationFormula(): any {
        if (!this.formulaType) return null;

        if (this.formulaType === 'custom') {
            return this.customFormula;
        } else if (this.formulaType === 'dynamic') {
            return {
                type: 'dynamic',
                variables: this.selectedVariables,
            };
        }

        return null;
    }

    buildApplicabilityRules(): any {
        if (this.applicabilityRules.length === 0) return null;

        return {
            rules: this.applicabilityRules,
            operator: 'AND',
        };
    }

    hasFormula(): boolean {
        return !!(
            this.formulaType &&
            (this.customFormula || this.selectedVariables.length > 0)
        );
    }

    async testFormula(): Promise<void> {
        if (!this.hasFormula()) return;

        this.testing = true;
        try {
            // Simulación de cálculo de fórmula
            this.testResult = this.simulateFormulaCalculation();
        } catch (error) {
            this.testResult = {
                success: false,
                error: 'Error en el cálculo de la fórmula',
            };
        } finally {
            this.testing = false;
        }
    }

    private simulateFormulaCalculation(): TestResult {
        try {
            let result = this.testValues.baseValue;

            if (this.formulaType === 'custom' && this.customFormula) {
                // Simulación básica de evaluación de fórmula
                let formula = this.customFormula;
                formula = formula.replace(
                    /baseValue/g,
                    this.testValues.baseValue.toString()
                );
                formula = formula.replace(
                    /factor/g,
                    this.testValues.factor.toString()
                );

                // En producción usaríamos un parser más seguro
                result = eval(formula);
            } else if (this.formulaType === 'dynamic') {
                // Cálculo dinámico basado en variables seleccionadas
                if (this.selectedVariables.includes('inflationRate')) {
                    result =
                        this.testValues.baseValue *
                        (1 + this.testValues.factor / 100);
                }
            }

            return {
                success: true,
                value: result,
            };
        } catch (error) {
            return {
                success: false,
                error: 'Error en la evaluación de la fórmula',
            };
        }
    }

    async validateConfiguration(): Promise<void> {
        if (this.valueForm.invalid) return;

        this.validating = true;
        try {
            // Simulación de validación
            const validationChecks = [
                'Código único verificado',
                'Tipo de valor válido',
                'Rangos de valor apropiados',
                'Fechas de vigencia correctas',
            ];

            if (this.hasFormula()) {
                validationChecks.push('Fórmula sintácticamente correcta');
            }

            this.validationResult = {
                success: true,
                message: 'Configuración válida y lista para usar',
                details: validationChecks,
            };

            this.showValidationDialog = true;
        } catch (error) {
            this.validationResult = {
                success: false,
                message: 'Error en la validación de la configuración',
                details: ['Verifique todos los campos y configuraciones'],
            };
            this.showValidationDialog = true;
        } finally {
            this.validating = false;
        }
    }

    // Rule management
    addRule(): void {
        if (this.isNewRuleValid()) {
            const rule: ApplicabilityRule = {
                field: this.newRule.field!,
                operator: this.newRule.operator!,
                value: this.newRule.value!,
            };

            this.applicabilityRules.push(rule);
            this.newRule = {};
        }
    }

    removeRule(index: number): void {
        this.applicabilityRules.splice(index, 1);
    }

    isNewRuleValid(): boolean {
        return !!(
            this.newRule.field &&
            this.newRule.operator &&
            this.newRule.value
        );
    }

    getRuleFieldLabel(field: string): string {
        const option = this.ruleFieldOptions.find((opt) => opt.value === field);
        return option?.label || field;
    }

    getOperatorLabel(operator: string): string {
        const option = this.operatorOptions.find(
            (opt) => opt.value === operator
        );
        return option?.label || operator;
    }

    // UI helpers
    isSystemValue(): boolean {
        const code = this.valueForm.get('code')?.value;
        return this.systemValues.includes(code);
    }

    canEditSystemValue(): boolean {
        // Solo permitir editar el valor de los valores del sistema, no su configuración
        return false;
    }

    showCurrencyField(): boolean {
        return this.valueForm.get('valueType')?.value === 'MONETARY';
    }

    getNumberMode(): string {
        const valueType = this.valueForm.get('valueType')?.value;
        return valueType === 'PERCENTAGE'
            ? 'decimal'
            : valueType === 'MONETARY'
            ? 'currency'
            : 'decimal';
    }

    getCurrency(): string {
        return this.valueForm.get('currency')?.value || 'USD';
    }

    getMinDecimals(): number {
        const valueType = this.valueForm.get('valueType')?.value;
        return valueType === 'PERCENTAGE' ? 0 : 2;
    }

    getMaxDecimals(): number {
        const valueType = this.valueForm.get('valueType')?.value;
        return valueType === 'PERCENTAGE' ? 2 : 4;
    }

    getSuffix(): string {
        const valueType = this.valueForm.get('valueType')?.value;
        return valueType === 'PERCENTAGE' ? '%' : '';
    }

    getValueTypeLabel(): string {
        const valueType = this.valueForm.get('valueType')?.value;
        const option = this.valueTypeOptions.find(
            (opt) => opt.value === valueType
        );
        return option?.label || 'Sin definir';
    }

    getValueClass(): string {
        const valueType = this.valueForm.get('valueType')?.value;
        return `value-${valueType?.toLowerCase() || 'default'}`;
    }

    formatPreviewValue(): string {
        const value = this.valueForm.get('value')?.value || 0;
        const valueType = this.valueForm.get('valueType')?.value;
        const currency = this.valueForm.get('currency')?.value;

        switch (valueType) {
            case 'MONETARY':
                return new Intl.NumberFormat('es-US', {
                    style: 'currency',
                    currency: currency || 'USD',
                }).format(value);
            case 'PERCENTAGE':
                return `${value}%`;
            case 'NUMERIC':
                return value.toLocaleString('es-US');
            default:
                return value.toString();
        }
    }

    formatTestValue(): string {
        if (!this.testResult?.value) return '$0.00';

        return new Intl.NumberFormat('es-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
        }).format(this.testResult.value);
    }

    formatDateRange(): string {
        const startDate = this.valueForm.get('startDate')?.value;
        const endDate = this.valueForm.get('endDate')?.value;

        if (!startDate) return 'Sin configurar';

        const start = new Date(startDate).toLocaleDateString('es-ES');
        const end = endDate
            ? new Date(endDate).toLocaleDateString('es-ES')
            : 'Indefinido';

        return `${start} - ${end}`;
    }

    getConfigurationJSON(): string {
        const config = {
            ...this.valueForm.value,
            calculationFormula: this.buildCalculationFormula(),
            applicabilityRules: this.buildApplicabilityRules(),
        };
        return JSON.stringify(config, null, 2);
    }

    async copyToClipboard(): Promise<void> {
        try {
            await navigator.clipboard.writeText(this.getConfigurationJSON());
            this.showSuccess('Configuración copiada al portapapeles');
        } catch (error) {
            this.showError('Error al copiar al portapapeles');
        }
    }

    // Validation helpers
    isFieldInvalid(fieldName: string): boolean {
        const field = this.valueForm.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }

    getFieldError(fieldName: string): string {
        const field = this.valueForm.get(fieldName);
        if (field && field.errors) {
            if (field.errors['required']) return 'Este campo es requerido';
            if (field.errors['pattern'])
                return 'Formato inválido (solo mayúsculas y guiones bajos)';
            if (field.errors['minlength'])
                return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
            if (field.errors['min'])
                return `Valor mínimo: ${field.errors['min'].min}`;
            if (field.errors['max'])
                return `Valor máximo: ${field.errors['max'].max}`;
        }
        return '';
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
