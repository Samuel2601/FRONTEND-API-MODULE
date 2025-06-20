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
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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

    // Tipos de animales
    animalTypeOptions: any[] = [];

    ngOnInit() {
        this.initForm();
        this.loadAnimalTypes();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['rate'] && this.rateForm) {
            this.loadRateData();
        }
    }

    initForm() {
        this.rateForm = this.fb.group({
            code: [
                '',
                [
                    Validators.required,
                    Validators.minLength(1),
                    Validators.maxLength(20),
                ],
            ],
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
            personType: [['Natural', 'Jurídica']], // Array por defecto
            animalTypes: [[], [Validators.required]], // Array de ObjectIds
        });

        this.loadRateData();
    }

    loadAnimalTypes() {
        this.animalTypeService
            .getAll({ limit: 100, fields: 'species,category' })
            .subscribe({
                next: (response: any) => {
                    console.log(response);
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

    loadRateData() {
        console.log('loadRateData', this.rate);
        if (this.rate && this.isEditMode) {
            const rateData: any = { ...this.rate };

            // Asegurar que personType sea un array
            if (rateData.personType && !Array.isArray(rateData.personType)) {
                rateData.personType = [rateData.personType];
            }

            // Asegurar que animalTypes sea un array
            if (rateData.animalTypes && !Array.isArray(rateData.animalTypes)) {
                rateData.animalTypes = [rateData.animalTypes];
            }

            // AQUÍ ESTÁ EL CAMBIO CLAVE:
            // Solo extraer los IDs (_id) para el patchValue, no los objetos completos
            if (rateData.animalTypes && Array.isArray(rateData.animalTypes)) {
                rateData.animalTypes = rateData.animalTypes.map((type: any) => {
                    // Si ya es un string (ID), devolverlo tal como está
                    if (typeof type === 'string') {
                        return type;
                    }
                    // Si es un objeto, extraer solo el _id
                    return type._id;
                });
            }

            this.rateForm.patchValue(rateData);

            console.log('rateData', this.rateForm.value);
        } else {
            this.rateForm.reset({
                code: '',
                description: '',
                type: '',
                rubroxAtributo: '',
                position: 1,
                personType: ['Natural', 'Jurídica'],
                animalTypes: [],
            });
        }
    }

    onSubmit() {
        this.submitted = true;

        if (this.rateForm.invalid) {
            this.markFormGroupTouched();
            return;
        }

        this.loading = true;
        const formValue = { ...this.rateForm.value };

        // Convertir código a mayúsculas y hacer trim
        if (formValue.code) {
            formValue.code = formValue.code.toString().toUpperCase().trim();
        }

        if (this.isEditMode && this.rate?._id) {
            this.rateService.update(this.rate._id, formValue).subscribe({
                next: () => {
                    this.loading = false;
                    this.rateSaved.emit();
                },
                error: (error) => {
                    console.error('Error updating rate:', error);
                    this.loading = false;
                },
            });
        } else {
            this.rateService.create(formValue).subscribe({
                next: () => {
                    this.loading = false;
                    this.rateSaved.emit();
                },
                error: (error) => {
                    console.error('Error creating rate:', error);
                    this.loading = false;
                },
            });
        }
    }

    onCancel() {
        this.cancel.emit();
    }

    markFormGroupTouched() {
        Object.keys(this.rateForm.controls).forEach((key) => {
            const control = this.rateForm.get(key);
            control?.markAsTouched();

            if (control instanceof FormGroup) {
                this.markFormGroupTouched();
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

    // Método para manejar la selección múltiple de tipos de persona
    onPersonTypeChange(event: any) {
        const value = event.value;
        this.rateForm.patchValue({ personType: value });
    }

    // Método para manejar la selección múltiple de tipos de animal
    onAnimalTypesChange(event: any) {
        const value = event.value;
        this.rateForm.patchValue({ animalTypes: value });
    }
}
