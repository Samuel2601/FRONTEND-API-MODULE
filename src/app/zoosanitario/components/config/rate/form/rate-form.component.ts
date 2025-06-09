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
} from 'src/app/zoosanitario/interfaces/slaughter.interface';
import { RateService } from 'src/app/zoosanitario/services/rate.service';

@Component({
    selector: 'app-rate-form',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './rate-form.component.html',
    styleUrls: ['./rate-form.component.scss'],
})
export class RateFormComponent implements OnInit, OnChanges {
    @Input() rate: Rate | null = null;
    @Input() mode: 'create' | 'edit' | 'view' = 'create';
    @Output() save = new EventEmitter<Rate>();
    @Output() cancel = new EventEmitter<void>();

    rateForm: FormGroup;
    saving = false;
    validating = false;

    showValidationDialog = false;
    validationResult: any = null;

    typeOptions = [
        { label: 'Inscripción', value: 'INSCRIPTION' },
        { label: 'Servicios Faenamiento', value: 'SLAUGHTER_SERVICES' },
        { label: 'Servicios Adicionales', value: 'ADDITIONAL_SERVICES' },
        { label: 'Multas', value: 'PENALTIES' },
        { label: 'Permisos', value: 'PERMITS' },
    ];

    statusOptions = [
        { label: 'Activo', value: 'ACTIVE' },
        { label: 'Inactivo', value: 'INACTIVE' },
        { label: 'Expirado', value: 'EXPIRED' },
    ];

    ruleFieldOptions = [
        { label: 'Tipo de Persona', value: 'personType' },
        { label: 'Tipo de Animal', value: 'animalType' },
        { label: 'Cantidad', value: 'quantity' },
        { label: 'Fecha', value: 'date' },
        { label: 'Introductor', value: 'introducer' },
        { label: 'Total Factura', value: 'invoiceTotal' },
    ];

    operatorOptions = [
        { label: 'Igual a', value: 'eq' },
        { label: 'Diferente de', value: 'ne' },
        { label: 'Mayor que', value: 'gt' },
        { label: 'Mayor o igual que', value: 'gte' },
        { label: 'Menor que', value: 'lt' },
        { label: 'Menor o igual que', value: 'lte' },
        { label: 'Incluido en', value: 'in' },
        { label: 'No incluido en', value: 'nin' },
        { label: 'Entre', value: 'between' },
    ];

    applicabilityRules: ApplicationCondition[] = [];
    newRule: Partial<ApplicationCondition> = {};

    constructor(
        private fb: FormBuilder,
        private rateService: RateService,
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
        this.rateForm = this.fb.group({
            code: ['', [Validators.required, Validators.pattern(/^[A-Z_]+$/)]],
            name: ['', [Validators.required, Validators.minLength(3)]],
            description: [''],
            type: ['', Validators.required],
            status: ['ACTIVE', Validators.required],
            priority: [
                1,
                [Validators.required, Validators.min(1), Validators.max(10)],
            ],
            effectiveFrom: [new Date(), Validators.required],
            effectiveUntil: [null],
        });
    }

    private loadFormData(): void {
        if (this.rate) {
            this.rateForm.patchValue({
                code: this.rate.code,
                name: this.rate.name,
                description: this.rate.description,
                type: this.rate.type,
                status: this.rate.status,
                priority: this.rate.priority,
                effectiveFrom: new Date(this.rate.effectiveFrom),
                effectiveUntil: this.rate.effectiveUntil
                    ? new Date(this.rate.effectiveUntil)
                    : null,
            });

            this.applicabilityRules = this.rate.applicabilityRules || [];
        } else {
            this.applicabilityRules = [];
        }

        if (this.mode === 'view') {
            this.rateForm.disable();
        } else {
            this.rateForm.enable();
        }
    }

    onSubmit(): void {
        if (this.rateForm.valid) {
            const formValue = this.rateForm.value;
            const rateData: Rate = {
                ...formValue,
                applicabilityRules: this.applicabilityRules,
                _id: this.rate?._id || '',
                createdAt: this.rate?.createdAt || new Date(),
                updatedAt: new Date(),
            };

            this.save.emit(rateData);
        }
    }

    onCancel(): void {
        this.cancel.emit();
    }

    switchToEditMode(): void {
        this.mode = 'edit';
        this.rateForm.enable();
    }

    // Rule management
    addRule(): void {
        if (this.isNewRuleValid()) {
            const rule: ApplicationCondition = {
                field: this.newRule.field!,
                operator: this.newRule.operator!,
                value: this.newRule.value!,
                logicalOperator:
                    this.applicabilityRules.length > 0 ? 'AND' : 'AND',
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

    // Validation
    async validateFormula(): Promise<void> {
        if (this.rateForm.invalid) return;

        this.validating = true;
        try {
            const formData = {
                formula: JSON.stringify(this.applicabilityRules),
                testData: this.rateForm.value,
            };

            const response = await this.rateService
                .validateFormula(formData)
                .toPromise();

            this.validationResult = response?.data || {
                success: true,
                message: 'Validación completada correctamente',
            };

            this.showValidationDialog = true;
        } catch (error) {
            this.validationResult = {
                success: false,
                message: 'Error durante la validación',
                details: ['Verifique la sintaxis de las reglas'],
            };
            this.showValidationDialog = true;
        } finally {
            this.validating = false;
        }
    }

    getFormPreview(): string {
        const preview = {
            ...this.rateForm.value,
            applicabilityRules: this.applicabilityRules,
        };
        return JSON.stringify(preview, null, 2);
    }

    // Validation helpers
    isFieldInvalid(fieldName: string): boolean {
        const field = this.rateForm.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }

    getFieldError(fieldName: string): string {
        const field = this.rateForm.get(fieldName);
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
}
