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
    consultingDocument = false;
    consultingRuc = false; // Nueva bandera para consulta de RUC

    typeOptions = [
        { label: 'Persona Natural', value: 'Natural' },
        { label: 'Persona Jurídica', value: 'Jurídica' },
    ];

    // Nuevas opciones para facturación
    billingOptions = [
        { label: 'Cédula', value: 'idNumber' },
        { label: 'RUC', value: 'ruc' },
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
        // Detectar cambios en cédula para persona natural
        this.form
            .get('idNumber')
            ?.valueChanges.pipe(
                debounceTime(500),
                distinctUntilChanged(),
                filter(
                    (value) =>
                        this.isNaturalPerson &&
                        value &&
                        value.length === 10 &&
                        /^\d{10}$/.test(value)
                )
            )
            .subscribe((cedula: string) => {
                this.consultarCedula(cedula);
            });

        // Detectar cambios en RUC para persona natural
        this.form
            .get('rucNatural')
            ?.valueChanges.pipe(
                debounceTime(500),
                distinctUntilChanged(),
                filter(
                    (value) =>
                        this.isNaturalPerson &&
                        value &&
                        value.length === 13 &&
                        /^\d{13}$/.test(value)
                )
            )
            .subscribe((ruc: string) => {
                this.consultarRucNatural(ruc);
            });

        // Detectar cambios en RUC para persona jurídica (sin cambios)
        this.form
            .get('ruc')
            ?.valueChanges.pipe(
                debounceTime(500),
                distinctUntilChanged(),
                filter(
                    (value) =>
                        !this.isNaturalPerson &&
                        this.shouldConsultDocument(value)
                )
            )
            .subscribe((documentNumber: string) => {
                this.consultarCiudadanoJuridico(documentNumber);
            });

        // Resetear datos cuando cambien los documentos
        this.form.get('idNumber')?.valueChanges.subscribe(() => {
            this.nameFromConsult = false;
        });

        this.form.get('rucNatural')?.valueChanges.subscribe((value) => {
            // Si se borra el RUC, resetear preferencia de facturación
            if (!value) {
                this.form.get('billingPreference')?.setValue('cedula');
            }
        });

        // Actualizar validadores cuando cambie personType
        this.form.get('personType')?.valueChanges.subscribe((personType) => {
            this.updateValidators(personType);
        });
    }

    consultarCedula(cedula: string): void {
        this.consultingDocument = true;

        this.adminService.consultarIdentificacion(cedula).subscribe({
            next: (response: any) => {
                console.log('Respuesta cédula:', response);

                if (response.actaDefuncion === '1') {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Advertencia',
                        detail: 'Esta persona tiene una acta de defunción',
                    });
                    this.form.patchValue({ name: '', idNumber: '' });
                    this.consultingDocument = false;
                    return;
                }

                if (response && response.nombre) {
                    this.form.patchValue(
                        {
                            name: response.nombre,
                            statusMarital: response.estadoCivil,
                        },
                        { emitEvent: false }
                    );

                    this.nameFromConsult = true;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Información encontrada',
                        detail: 'Datos de cédula consultados correctamente',
                    });
                } else {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Sin resultados',
                        detail: 'No se encontró información para la cédula proporcionada',
                    });
                }

                this.consultingDocument = false;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error de consulta',
                    detail: `Error al consultar cédula: ${
                        error.message || 'Servicio no disponible'
                    }`,
                });
                this.consultingDocument = false;
            },
        });
    }

    // Nueva función para consultar RUC de persona natural
    consultarRucNatural(ruc: string): void {
        this.consultingRuc = true;

        this.adminService.consultarIdentificacion(ruc).subscribe({
            next: (response: any) => {
                console.log('Respuesta RUC natural:', response);

                if (response && response.razonSocial) {
                    // Para persona natural con RUC, la razón social suele ser el nombre
                    if (!this.nameFromConsult) {
                        this.form.patchValue(
                            {
                                name: response.razonSocial,
                            },
                            { emitEvent: false }
                        );
                        this.nameFromConsult = true;
                    }

                    // Completar otros datos
                    this.form.patchValue(
                        {
                            email:
                                response.email || this.form.get('email')?.value,
                            phone:
                                response.telefonoTrabajo ||
                                this.form.get('phone')?.value,
                            address:
                                response.direccionCorta ||
                                this.form.get('address')?.value,
                        },
                        { emitEvent: false }
                    );

                    // Actualizar bandera de datos obtenidos
                    for (const key in response) {
                        if (response[key]) {
                            this.dataFromConsult[key] = true;
                        }
                    }

                    // Establecer preferencia de facturación a RUC si no está definida
                    if (!this.form.get('billingPreference')?.value) {
                        this.form.get('billingPreference')?.setValue('ruc');
                    }

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Información encontrada',
                        detail: 'Datos de RUC consultados correctamente',
                    });
                } else {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Sin resultados',
                        detail: 'No se encontró información para el RUC proporcionado',
                    });
                }

                this.consultingRuc = false;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error de consulta',
                    detail: `Error al consultar RUC: ${
                        error.message || 'Servicio no disponible'
                    }`,
                });
                this.consultingRuc = false;
            },
        });
    }

    consultarCiudadanoJuridico(ruc: string): void {
        if (ruc.length !== 13) return;

        this.consultingDocument = true;

        this.adminService.consultarIdentificacion(ruc).subscribe({
            next: (response: any) => {
                console.log('Respuesta RUC:', response);

                if (response && response.razonSocial) {
                    // Autocompletar datos de empresa
                    this.form.patchValue(
                        {
                            companyName: response.razonSocial,
                            email: response.email || '',
                            phone: response.telefonoTrabajo || '',
                            address: response.direccionCorta || '',
                        },
                        { emitEvent: false }
                    );

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Información encontrada',
                        detail: 'Datos de RUC consultados correctamente',
                    });
                } else {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Sin resultados',
                        detail: 'No se encontró información para el RUC proporcionado',
                    });
                }

                this.consultingDocument = false;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error de consulta',
                    detail: `Error al consultar RUC: ${
                        error.message || 'Servicio no disponible'
                    }`,
                });
                this.consultingDocument = false;
            },
        });
    }

    shouldConsultDocument(documentNumber: string): boolean {
        if (!documentNumber || this.consultingDocument) return false;

        // Para persona natural: consultar cuando tenga exactamente 10 dígitos (cédula)
        // o más de 10 dígitos (RUC de persona natural)
        if (this.isNaturalPerson) {
            return /^\d{10,13}$/.test(documentNumber);
        }

        // Para persona jurídica: consultar RUC de 13 dígitos
        if (!this.isNaturalPerson) {
            return /^\d{13}$/.test(documentNumber);
        }

        return false;
    }

    nameFromConsult = false; // Bandera para saber si el nombre viene de consulta
    dataFromConsult: any = {}; // Datos de la empresa obtenidos de consulta
    consultarCiudadano(documentNumber: string): void {
        if (documentNumber.length < 10) return;

        this.consultingDocument = true;

        // Determinar si es cédula (10 dígitos) o RUC (más de 10)
        const documentType = documentNumber.length === 10 ? 'cédula' : 'RUC';

        this.adminService.consultarIdentificacion(documentNumber).subscribe({
            next: (response: any) => {
                console.log('Respuesta:', response);
                if (response.actaDefuncion === '1') {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Advertencia',
                        detail: 'Esta persona tiene una acta de defunción',
                    });
                    this.form.patchValue({
                        name: '',
                        ruc: '',
                        idNumber: '',
                    });
                    return;
                }
                if (documentType === 'RUC') {
                    if (response && response.razonSocial) {
                        // Autocompletar el nombre y marcarlo como readonly
                        this.form.patchValue(
                            {
                                personType: 'Jurídica',
                                companyName: response.razonSocial,
                                email: response.email,
                                phone: response.telefonoTrabajo,
                                ruc: response.numeroRuc,
                                address: response.direccionCorta,
                                idNumber: '',
                                name: '',
                            },
                            { emitEvent: false }
                        );
                        for (const key in response) {
                            if (response[key]) {
                                this.dataFromConsult[key] = true;
                            } else {
                                this.dataFromConsult[key] = false;
                            }
                        }

                        console.log(
                            'Datos de la empresa:',
                            this.dataFromConsult
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
                } else {
                    if (response && response.nombre) {
                        // Autocompletar el nombre y marcarlo como readonly
                        this.form.patchValue(
                            {
                                name: response.nombre,
                                statusMarital: response.estadoCivil,
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
            idNumber: [{ value: '', disabled: false }], // Solo cédula
            rucNatural: [{ value: '', disabled: false }], // RUC opcional para persona natural
            billingPreference: [{ value: 'idNumber', disabled: false }], // Preferencia de facturación

            // Persona Jurídica
            companyName: [{ value: '', disabled: false }],
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

            statusMarital: [{ value: 'SOLTERO', disabled: false }],

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
        if (!value) return null; // Si está vacío y es opcional, es válido

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
        const rucNaturalControl = this.form.get('rucNatural');
        const idNumberControl = this.form.get('idNumber');

        if (personType === 'Natural') {
            // Validadores para persona natural
            nameControl?.setValidators([Validators.required]);
            companyNameControl?.clearValidators();
            rucControl?.clearValidators();

            // Cédula es obligatoria, RUC es opcional
            idNumberControl?.setValidators([
                Validators.required,
                Validators.pattern(/^\d{10}$/),
            ]);
            rucNaturalControl?.setValidators([Validators.pattern(/^\d{13}$/)]);

            // Limpiar valores de persona jurídica
            companyNameControl?.setValue('');
            rucControl?.setValue('');
        } else {
            // Validadores para persona jurídica
            nameControl?.clearValidators();
            companyNameControl?.setValidators([Validators.required]);
            rucControl?.setValidators([
                Validators.required,
                Validators.pattern(/^\d{13}$/),
            ]);
            rucNaturalControl?.clearValidators();
            idNumberControl?.setValidators([Validators.pattern(/^\d{10}$/)]);

            // Limpiar valores de persona natural
            rucNaturalControl?.setValue('');
            this.form.get('billingPreference')?.setValue('cedula');

            if (this.nameFromConsult) {
                nameControl?.setValue('');
                this.nameFromConsult = false;
            }
        }

        // Actualizar estado de validación
        nameControl?.updateValueAndValidity();
        companyNameControl?.updateValueAndValidity();
        rucControl?.updateValueAndValidity();
        rucNaturalControl?.updateValueAndValidity();
        idNumberControl?.updateValueAndValidity();
    }

    loadIntroducer(): void {
        this.loading = true;
        this.introducerService.getById(this.introducerId!).subscribe({
            next: (response: any) => {
                console.log('Introducer:', response);
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
                        .filter((type: any) => type && (type._id || type.value))
                        .map((type: any) => type.value || type._id || type);
                }
                console.log('cattleTypeValues', cattleTypeValues);
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
                const id =
                    introducer?.data?.introducer?._id ?? introducer?.data?._id;

                if (!id) {
                    console.error(
                        'No se pudo determinar el ID del introductor'
                    );
                    return;
                }

                this.router.navigate(['/zoosanitario/introducers/view', id]);
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
        if (field.errors?.['pattern']) {
            if (fieldName === 'idNumber')
                return 'La cédula debe tener 10 dígitos';
            if (fieldName === 'rucNatural')
                return 'El RUC debe tener 13 dígitos';
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
