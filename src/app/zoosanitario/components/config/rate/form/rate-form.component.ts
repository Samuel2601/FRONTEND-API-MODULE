import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnInit,
    OnChanges,
    SimpleChanges,
    inject,
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import { Rate } from 'src/app/zoosanitario/interfaces/rate.interface';
import { AnimalTypeService } from 'src/app/zoosanitario/services/animal-type.service';
import { RateService } from 'src/app/zoosanitario/services/rate.service';

@Component({
    selector: 'app-rate-form',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './rate-form.component.html',
    styleUrls: ['./rate-form.component.scss'],
    providers: [MessageService],
})
export class RateFormComponent implements OnInit, OnChanges {
    @Input() rate: Rate | null = null;
    @Input() isEditMode = false;
    @Output() rateSaved = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    private fb = inject(FormBuilder);
    private rateService = inject(RateService);
    private animalTypeService = inject(AnimalTypeService);
    constructor(private messageService: MessageService) {}

    rateForm!: FormGroup;
    quantityConfigForm!: FormGroup;
    loading = false;
    submitted = false;

    // Opciones para dropdowns
    typeOptions = [
        { label: 'Tasa', value: 'TASA' },
        { label: 'Tarifa', value: 'TARIFA' },
        { label: 'Servicios', value: 'SERVICIOS' },
    ];

    personTypeOptions = [
        { label: 'Natural', value: 'Natural' },
        { label: 'Jurídica', value: 'Jurídica' },
    ];

    statusOptions = [
        { label: 'Activo', value: true },
        { label: 'Inactivo', value: false },
    ];

    chargeFrequencyOptions = [
        { label: 'Ninguna', value: 'NONE' },
        { label: 'Anual', value: 'YEARLY' },
        { label: 'Año fiscal', value: 'FISCAL_YEAR' },
        { label: 'Por proceso de sacrificio', value: 'PER_SLAUGHTER_PROCESS' },
    ];

    quantityValidationOptions = [
        { label: 'Ninguna', value: 'NONE' },
        { label: 'Máximo basado en', value: 'MAX_BASED_ON' },
        { label: 'Coincidencia exacta', value: 'EXACT_MATCH' },
        { label: 'Proporcional', value: 'PROPORTIONAL' },
    ];

    // Tipos de animales y rates disponibles
    animalTypeOptions: any[] = [];
    availableRates: any[] = [];

    ngOnInit() {
        this.initForm();
        this.loadAnimalTypes();
        this.loadAvailableRates();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['rate'] && this.rateForm) {
            this.loadRateData();
        }
    }

    initForm() {
        this.rateForm = this.fb.group({
            // Campos básicos
            code: [
                '',
                [
                    Validators.required,
                    Validators.minLength(1),
                    Validators.maxLength(20),
                ],
            ],
            code_tributo: ['', [Validators.maxLength(20)]],
            description: [
                '',
                [Validators.required, Validators.maxLength(1000)],
            ],
            type: ['', [Validators.required]],
            rubroxAtributo: ['', [Validators.required]],
            position: [
                1,
                [Validators.required, Validators.min(1), Validators.max(100)],
            ],
            maxQuantity: [null, [Validators.min(1)]],
            status: [true],
            personType: [['Natural', 'Jurídica']], // Array por defecto
            animalTypes: [[], [Validators.required]], // Array de ObjectIds
            baseLegalRate: [],

            // Configuración de cantidad
            quantityConfig: this.fb.group({
                maxQuantity: [null, [Validators.min(1)]],
                isUnlimited: [true],
                maxQuantityBasedOnRate: [null],
            }),

            // Configuración de facturación
            invoiceConfig: this.fb.group({
                allowInvoice: [true],
                alwaysInclude: [false],
                automaticCharge: [false],
                chargeFrequency: ['NONE'],
                uniqueByIntroducerYear: [false],
            }),

            // Dependencias
            dependencies: this.fb.group({
                requiresPreviousRate: [null],
                requiresSlaughterProcess: [false],
                standaloneAllowed: [true],
            }),

            // Reglas de validación
            validationRules: this.fb.group({
                prerequisiteRates: [[]],
                quantityValidationRate: [null],
                quantityValidationType: ['NONE'],
            }),
        });

        // Referencia para el template
        this.quantityConfigForm = this.rateForm.get(
            'quantityConfig'
        ) as FormGroup;

        this.loadRateData();
    }

    legalReferencesArray: FormArray = this.fb.array([]);
    legalReferenceTypes: any = [
        { label: 'Artículo', value: 'ART' },
        { label: 'Sección', value: 'SEC' },
    ];
    addLegalReference() {
        this.legalReferencesArray.push(this.createLegalReferenceGroup());
    }

    removeLegalReference(index: number) {
        if (this.legalReferencesArray.length > 1) {
            this.legalReferencesArray.removeAt(index);
        }
    }
    // Métodos para manejar referencias legales
    createLegalReferenceGroup(): FormGroup {
        return this.fb.group({
            type: ['', [Validators.required]],
            number: ['', [Validators.required]],
            date: [null],
            article: [''],
            title: ['', [Validators.required]],
            description: ['', [Validators.maxLength(500)]],
            url: [''],
        });
    }

    loadAnimalTypes() {
        this.animalTypeService
            .getAll({ limit: 100, fields: 'species,category' })
            .subscribe({
                next: (response: any) => {
                    this.animalTypeOptions = response.data.animalTypes.map(
                        (type: any) => ({
                            label: type.species + ' (' + type.category + ')',
                            value: type._id,
                        })
                    );
                },
                error: (error) => {
                    console.error('Error loading animal types:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cargar tipos de animales',
                    });
                },
            });
    }

    loadAvailableRates() {
        this.rateService
            .getRatesWithPagination({}, { page: 1, limit: 100 })
            .subscribe({
                next: (response: any) => {
                    this.availableRates =
                        response.data
                            ?.filter(
                                (rate: Rate) => rate._id !== this.rate?._id
                            ) // Excluir el rate actual
                            .map((rate: Rate) => ({
                                label: `${rate.code} - ${rate.rubroxAtributo}`,
                                value: rate._id,
                            })) || [];
                },
                error: (error) => {
                    console.error('Error loading available rates:', error);
                },
            });
    }

    loadRateData() {
        if (this.rate && this.isEditMode) {
            const rateData: any = { ...this.rate };

            // Asegurar que personType sea un array
            if (rateData.personType && !Array.isArray(rateData.personType)) {
                rateData.personType = [rateData.personType];
            }

            // Asegurar que animalTypes sea un array de IDs
            if (rateData.animalTypes && Array.isArray(rateData.animalTypes)) {
                rateData.animalTypes = rateData.animalTypes.map((type: any) => {
                    return typeof type === 'string' ? type : type._id;
                });
            }

            // Procesar los campos anidados con valores por defecto
            rateData.quantityConfig = {
                maxQuantity: rateData.quantityConfig?.maxQuantity || null,
                isUnlimited: rateData.quantityConfig?.isUnlimited ?? true,
                maxQuantityBasedOnRate:
                    rateData.quantityConfig?.maxQuantityBasedOnRate || null,
            };

            rateData.invoiceConfig = {
                allowInvoice: rateData.invoiceConfig?.allowInvoice ?? true,
                alwaysInclude: rateData.invoiceConfig?.alwaysInclude ?? false,
                automaticCharge:
                    rateData.invoiceConfig?.automaticCharge ?? false,
                chargeFrequency:
                    rateData.invoiceConfig?.chargeFrequency || 'NONE',
                uniqueByIntroducerYear:
                    rateData.invoiceConfig?.uniqueByIntroducerYear ?? false,
            };

            rateData.dependencies = {
                requiresPreviousRate:
                    rateData.dependencies?.requiresPreviousRate || null,
                requiresSlaughterProcess:
                    rateData.dependencies?.requiresSlaughterProcess ?? false,
                standaloneAllowed:
                    rateData.dependencies?.standaloneAllowed ?? true,
            };

            rateData.validationRules = {
                prerequisiteRates:
                    rateData.validationRules?.prerequisiteRates || [],
                quantityValidationRate:
                    rateData.validationRules?.quantityValidationRate || null,
                quantityValidationType:
                    rateData.validationRules?.quantityValidationType || 'NONE',
            };

            this.rateForm.patchValue(rateData);
        } else {
            this.rateForm.reset({
                code: '',
                code_tributo: '',
                description: '',
                type: '',
                rubroxAtributo: '',
                position: 1,
                maxQuantity: null,
                status: true,
                personType: ['Natural', 'Jurídica'],
                animalTypes: [],
                baseLegalRate: null,
                quantityConfig: {
                    maxQuantity: null,
                    isUnlimited: true,
                    maxQuantityBasedOnRate: null,
                },
                invoiceConfig: {
                    allowInvoice: true,
                    alwaysInclude: false,
                    automaticCharge: false,
                    chargeFrequency: 'NONE',
                    uniqueByIntroducerYear: false,
                },
                dependencies: {
                    requiresPreviousRate: null,
                    requiresSlaughterProcess: false,
                    standaloneAllowed: true,
                },
                validationRules: {
                    prerequisiteRates: [],
                    quantityValidationRate: null,
                    quantityValidationType: 'NONE',
                },
            });
        }
    }

    onSubmit() {
        this.submitted = true;

        if (this.rateForm.invalid) {
            this.markFormGroupTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario incompleto',
                detail: 'Por favor, complete todos los campos requeridos',
            });
            return;
        }

        this.loading = true;
        const formValue = { ...this.rateForm.value };

        // Limpiar y formatear campos
        if (formValue.code) {
            formValue.code = formValue.code.toString().toUpperCase().trim();
        }
        if (formValue.code_tributo) {
            formValue.code_tributo = formValue.code_tributo
                .toString()
                .toUpperCase()
                .trim();
        }

        // Limpiar valores null/undefined en objetos anidados
        this.cleanNestedObjects(formValue);

        if (this.isEditMode && this.rate?._id) {
            this.rateService.update(this.rate._id, formValue).subscribe({
                next: () => {
                    this.loading = false;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Rate actualizado correctamente',
                    });
                    this.rateSaved.emit();
                },
                error: (error) => {
                    console.error('Error updating rate:', error);
                    this.loading = false;
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail:
                            error.error?.message ||
                            'Error al actualizar el rate',
                    });
                },
            });
        } else {
            this.rateService.create(formValue).subscribe({
                next: () => {
                    this.loading = false;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Rate creado correctamente',
                    });
                    this.rateSaved.emit();
                },
                error: (error) => {
                    console.error('Error creating rate:', error);
                    this.loading = false;
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail:
                            error.error?.message || 'Error al crear el rate',
                    });
                },
            });
        }
    }

    private cleanNestedObjects(obj: any) {
        Object.keys(obj).forEach((key) => {
            if (
                obj[key] &&
                typeof obj[key] === 'object' &&
                !Array.isArray(obj[key])
            ) {
                // Limpiar propiedades null/undefined de objetos anidados
                Object.keys(obj[key]).forEach((nestedKey) => {
                    if (
                        obj[key][nestedKey] === null ||
                        obj[key][nestedKey] === undefined
                    ) {
                        delete obj[key][nestedKey];
                    }
                });

                // Si el objeto queda vacío, eliminarlo
                if (Object.keys(obj[key]).length === 0) {
                    delete obj[key];
                }
            }
        });
    }

    onCancel() {
        this.cancel.emit();
    }

    markFormGroupTouched() {
        Object.keys(this.rateForm.controls).forEach((key) => {
            const control = this.rateForm.get(key);
            control?.markAsTouched();

            if (control instanceof FormGroup) {
                this.markNestedFormGroupTouched(control);
            }
        });
    }

    private markNestedFormGroupTouched(formGroup: FormGroup) {
        Object.keys(formGroup.controls).forEach((key) => {
            const control = formGroup.get(key);
            control?.markAsTouched();

            if (control instanceof FormGroup) {
                this.markNestedFormGroupTouched(control);
            }
        });
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.rateForm.get(fieldName);
        return !!(
            field &&
            field.invalid &&
            (field.dirty || field.touched || this.submitted)
        );
    }

    getFieldError(fieldName: string): string {
        const field = this.rateForm.get(fieldName);
        if (
            field &&
            field.errors &&
            (field.dirty || field.touched || this.submitted)
        ) {
            if (field.errors['required']) {
                return 'Este campo es requerido';
            }
            if (field.errors['minlength']) {
                return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
            }
            if (field.errors['maxlength']) {
                return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
            }
            if (field.errors['min']) {
                return `El valor mínimo es ${field.errors['min'].min}`;
            }
            if (field.errors['max']) {
                return `El valor máximo es ${field.errors['max'].max}`;
            }
            if (field.errors['email']) {
                return 'Formato de email inválido';
            }
        }
        return '';
    }

    // Validador personalizado para código único
    async validateCodeUnique() {
        const codeControl = this.rateForm.get('code');
        if (codeControl && codeControl.value && codeControl.value.length >= 2) {
            try {
                const result = await this.rateService
                    .validateCodeExists(
                        codeControl.value.toUpperCase().trim(),
                        this.isEditMode ? this.rate?._id : undefined
                    )
                    .toPromise();

                if (result?.exists) {
                    codeControl.setErrors({ unique: true });
                }
            } catch (error) {
                console.error('Error validating code:', error);
            }
        }
    }

    onCodeBlur() {
        this.validateCodeUnique();
    }

    // Métodos auxiliares para el template
    get codeErrors() {
        const field = this.rateForm.get('code');
        if (field?.errors?.['unique']) {
            return 'Este código ya existe';
        }
        return this.getFieldError('code');
    }

    // Métodos para manejar cambios en selects múltiples
    onPersonTypeChange(event: any) {
        const value = event.value;
        this.rateForm.patchValue({ personType: value });
    }

    onAnimalTypesChange(event: any) {
        const value = event.value;
        this.rateForm.patchValue({ animalTypes: value });
    }
}
