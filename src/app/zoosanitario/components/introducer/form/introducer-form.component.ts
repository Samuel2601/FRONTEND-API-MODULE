import { map, filter, debounceTime, distinctUntilChanged } from 'rxjs';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import { IntroducerService } from 'src/app/zoosanitario/services/introducer.service';
import { AnimalTypeService } from 'src/app/zoosanitario/services/animal-type.service';
import { AdminService } from 'src/app/demo/services/admin.service';

@Component({
    selector: 'app-introducer-form',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './introducer-form.component.html',
    styleUrls: ['./introducer-form.component.scss'],
    providers: [MessageService],
})
export class IntroducerFormComponent implements OnInit {
    form!: FormGroup;
    isEditMode = false;
    introducerId?: string;
    loading = false;
    submitting = false;
    consultingDocument = false; // Para mostrar loading durante consulta

    typeOptions = [
        { label: 'Persona Natural', value: 'Natural' },
        { label: 'Persona Jurídica', value: 'Jurídica' },
    ];

    introducerTypeOptions = [];

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private introducerService: IntroducerService,
        private messageService: MessageService,
        private animalTypeService: AnimalTypeService,
        private adminService: AdminService // Agregar el servicio
    ) {}

    async ngOnInit(): Promise<void> {
        this.initForm();
        this.setupDocumentWatcher(); // Nueva función para detectar cambios

        this.introducerId = this.route.snapshot.paramMap.get('id') || undefined;
        if (this.introducerId) {
            this.isEditMode = true;
            this.loadIntroducer();
        }
        await this.loadAnimalTypes();
    }

    setupDocumentWatcher(): void {
        // Detectar cambios en idNumber para consulta automática
        this.form
            .get('idNumber')
            ?.valueChanges.pipe(
                debounceTime(500), // Esperar 500ms después del último cambio
                distinctUntilChanged(),
                filter((value) => this.shouldConsultDocument(value))
            )
            .subscribe((documentNumber: string) => {
                this.consultarCiudadano(documentNumber);
            });

        // Resetear nombre automático cuando cambie el documento
        this.form.get('idNumber')?.valueChanges.subscribe(() => {
            this.nameFromConsult = false;
        });

        // Actualizar validadores cuando cambie personType
        this.form.get('personType')?.valueChanges.subscribe((personType) => {
            this.updateValidators(personType);
        });
    }

    shouldConsultDocument(documentNumber: string): boolean {
        if (!documentNumber || this.consultingDocument) return false;

        // Para persona natural: consultar cuando tenga exactamente 10 dígitos (cédula)
        // o más de 10 dígitos (RUC de persona natural)
        if (this.isNaturalPerson) {
            return /^\d{10,13}$/.test(documentNumber);
        }

        return false; // No consultar para persona jurídica automáticamente
    }

    nameFromConsult = false; // Bandera para saber si el nombre viene de consulta

    consultarCiudadano(documentNumber: string): void {
        if (documentNumber.length < 10) return;

        this.consultingDocument = true;

        // Determinar si es cédula (10 dígitos) o RUC (más de 10)
        const documentType = documentNumber.length === 10 ? 'cédula' : 'RUC';

        this.adminService.getCiudadanoInfo(documentNumber).subscribe({
            next: (response: any) => {
                if (response && response.nombre) {
                    // Autocompletar el nombre y marcarlo como readonly
                    this.form.patchValue(
                        {
                            name: response.nombre,
                        },
                        { emitEvent: false }
                    );

                    this.nameFromConsult = true;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Información encontrada',
                        detail: `Datos de ${documentType} consultados correctamente`,
                    });
                } else {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Sin resultados',
                        detail: `No se encontró información para la ${documentType} proporcionada`,
                    });
                }
                this.consultingDocument = false;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error de consulta',
                    detail: `Error al consultar ${documentType}: ${
                        error.message || 'Servicio no disponible'
                    }`,
                });
                this.consultingDocument = false;
            },
        });
    }

    async loadAnimalTypes(): Promise<void> {
        this.animalTypeService
            .getAll({ limit: 100, fields: 'species,category', slaughter: true })
            .subscribe({
                next: (response: any) => {
                    this.introducerTypeOptions = response.data.animalTypes
                        .filter((a: any) => a.species && a.category)
                        .map((a: any) => ({
                            label: `${a.species} (${a.category})`,
                            value: a.id,
                        }));
                },
                error: (error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cargar tipos de animales',
                    });
                    this.loading = false;
                },
            });
    }

    initForm(): void {
        this.form = this.fb.group({
            personType: [
                { value: 'Natural', disabled: false },
                Validators.required,
            ],

            // Persona Natural
            name: [{ value: '', disabled: false }],

            // Persona Jurídica
            companyName: [{ value: '', disabled: false }],

            // Documentos - Validación dinámica
            idNumber: [
                { value: '', disabled: false },
                [Validators.required, this.documentValidator.bind(this)],
            ],
            ruc: [{ value: '', disabled: false }],

            // Contacto
            phone: [
                { value: '', disabled: false },
                Validators.pattern(/^\d{7,15}$/),
            ],
            email: [{ value: '', disabled: false }, Validators.email],
            address: [{ value: '', disabled: false }],

            // Tipo de introductor
            cattleTypes: [{ value: [], disabled: false }, Validators.required],

            // Notas
            notes: [{ value: '', disabled: false }],
        });

        // Suscribirse a cambios de tipo
        this.form.get('personType')?.valueChanges.subscribe((personType) => {
            this.updateValidators(personType);
        });
    }

    // Validador personalizado para documentos
    documentValidator(control: any) {
        const value = control.value;
        if (!value) return null;

        const personType = this.form?.get('personType')?.value;

        if (personType === 'Natural') {
            // Para persona natural: permitir cédula (10) o RUC (13)
            if (!/^\d{10}$|^\d{13}$/.test(value)) {
                return {
                    invalidDocument:
                        'Debe tener 10 dígitos (cédula) o 13 dígitos (RUC)',
                };
            }
        } else {
            // Para persona jurídica: solo cédula del representante (10 dígitos)
            if (!/^\d{10}$/.test(value)) {
                return {
                    invalidDocument:
                        'La cédula del representante debe tener 10 dígitos',
                };
            }
        }

        return null;
    }

    updateValidators(personType: string): void {
        const nameControl = this.form.get('name');
        const companyNameControl = this.form.get('companyName');
        const rucControl = this.form.get('ruc');
        const idNumberControl = this.form.get('idNumber');

        if (personType === 'Natural') {
            // Validadores para persona natural
            nameControl?.setValidators([Validators.required]);
            companyNameControl?.clearValidators();
            rucControl?.clearValidators();

            // Limpiar valores de persona jurídica
            companyNameControl?.setValue('');
            rucControl?.setValue('');
        } else {
            // Validadores para persona jurídica
            nameControl?.setValidators([Validators.required]); // Nombre del representante
            companyNameControl?.setValidators([Validators.required]);
            rucControl?.setValidators([
                Validators.required,
                Validators.pattern(/^\d{13}$/),
            ]);
        }

        // Actualizar validación del documento
        idNumberControl?.updateValueAndValidity();

        // Actualizar estado de validación
        nameControl?.updateValueAndValidity();
        companyNameControl?.updateValueAndValidity();
        rucControl?.updateValueAndValidity();
    }

    loadIntroducer(): void {
        this.loading = true;
        this.introducerService.getById(this.introducerId!).subscribe({
            next: (response: any) => {
                if (this.introducerTypeOptions.length === 0) {
                    setTimeout(() => this.loadIntroducer(), 500);
                    return;
                }

                const introducer = response.data.introducer;

                let cattleTypeValues = [];
                if (
                    introducer.cattleTypes &&
                    Array.isArray(introducer.cattleTypes)
                ) {
                    cattleTypeValues = introducer.cattleTypes
                        .filter((type: any) => type && (type.id || type.value))
                        .map((type: any) => type.value || type.id || type);
                }

                this.form.patchValue({
                    ...introducer,
                    cattleTypes: cattleTypeValues,
                });

                this.loading = false;
            },
            error: (error) => {
                console.error('Error cargando introducer:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar introductor: ' + error.message,
                });
                this.loading = false;
            },
        });
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.markFormGroupTouched(this.form);
            return;
        }

        this.submitting = true;
        // Usar getRawValue() para incluir campos deshabilitados
        const formValue = this.form.getRawValue();

        const operation = this.isEditMode
            ? this.introducerService.update(this.introducerId!, formValue)
            : this.introducerService.create(formValue);

        operation.subscribe({
            next: (introducer) => {
                console.log('Introducer:', introducer);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: `Introductor ${
                        this.isEditMode ? 'actualizado' : 'creado'
                    } correctamente`,
                });
                this.router.navigate([
                    '/zoosanitario/introducers/view',
                    introducer.data._id,
                ]);
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error.message,
                });
                this.submitting = false;
            },
        });
    }

    cancel(): void {
        this.router.navigate(['/zoosanitario/introducers']);
    }

    markFormGroupTouched(formGroup: FormGroup) {
        Object.keys(formGroup.controls).forEach((field) => {
            const control = formGroup.get(field);
            control?.markAsTouched({ onlySelf: true });
        });
    }

    get isNaturalPerson(): boolean {
        return this.form.get('personType')?.value === 'Natural';
    }

    getFieldError(fieldName: string): string {
        const field = this.form.get(fieldName);
        if (!field || !field.invalid || !field.touched) return '';

        if (field.errors?.['required']) return 'Este campo es requerido';
        if (field.errors?.['email']) return 'Email inválido';
        if (field.errors?.['invalidDocument'])
            return field.errors['invalidDocument'];
        if (field.errors?.['pattern']) {
            if (fieldName === 'ruc') return 'El RUC debe tener 13 dígitos';
            if (fieldName === 'phone')
                return 'El teléfono debe tener entre 7 y 15 dígitos';
        }
        return '';
    }

    // Método para consulta manual (opcional)
    consultarDocumentoManual(): void {
        const documentNumber = this.form.get('idNumber')?.value;
        if (documentNumber && documentNumber.length >= 10) {
            this.consultarCiudadano(documentNumber);
        }
    }

    // Permitir edición manual del nombre
    editarNombreManual(): void {
        this.nameFromConsult = false;
        this.form.get('name')?.enable();
    }
}
