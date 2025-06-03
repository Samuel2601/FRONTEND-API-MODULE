import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import { IntroducerService } from 'src/app/zoosanitario/services/introducer.service';

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

    typeOptions = [
        { label: 'Persona Natural', value: 'NATURAL' },
        { label: 'Persona Jurídica', value: 'JURIDICAL' },
    ];

    introducerTypeOptions = [
        { label: 'Bovino Mayor', value: 'BOVINE_MAJOR' },
        { label: 'Porcino Menor', value: 'PORCINE_MINOR' },
        { label: 'Mixto', value: 'MIXED' },
    ];

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private introducerService: IntroducerService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.initForm();

        this.introducerId = this.route.snapshot.paramMap.get('id') || undefined;
        if (this.introducerId) {
            this.isEditMode = true;
            this.loadIntroducer();
        }
    }

    initForm(): void {
        this.form = this.fb.group({
            type: ['NATURAL', Validators.required],

            // Persona Natural
            firstName: [''],
            lastName: [''],

            // Persona Jurídica
            companyName: [''],
            legalRepresentative: [''],

            // Documentos
            idNumber: [
                '',
                [Validators.required, Validators.pattern(/^\d{10}$/)],
            ],
            ruc: [''],

            // Contacto
            phone: ['', Validators.pattern(/^\d{10}$/)],
            email: ['', Validators.email],
            address: [''],

            // Tipo de introductor
            introducerType: ['', Validators.required],

            // Notas
            notes: [''],
        });

        // Suscribirse a cambios de tipo
        this.form.get('type')?.valueChanges.subscribe((type) => {
            this.updateValidators(type);
        });
    }

    updateValidators(type: string): void {
        const firstNameControl = this.form.get('firstName');
        const lastNameControl = this.form.get('lastName');
        const companyNameControl = this.form.get('companyName');
        const legalRepControl = this.form.get('legalRepresentative');
        const rucControl = this.form.get('ruc');

        if (type === 'NATURAL') {
            // Validadores para persona natural
            firstNameControl?.setValidators([Validators.required]);
            lastNameControl?.setValidators([Validators.required]);
            companyNameControl?.clearValidators();
            legalRepControl?.clearValidators();
            rucControl?.clearValidators();

            // Limpiar valores de persona jurídica
            companyNameControl?.setValue('');
            legalRepControl?.setValue('');
            rucControl?.setValue('');
        } else {
            // Validadores para persona jurídica
            firstNameControl?.clearValidators();
            lastNameControl?.clearValidators();
            companyNameControl?.setValidators([Validators.required]);
            legalRepControl?.setValidators([Validators.required]);
            rucControl?.setValidators([
                Validators.required,
                Validators.pattern(/^\d{13}$/),
            ]);

            // Limpiar valores de persona natural
            firstNameControl?.setValue('');
            lastNameControl?.setValue('');
        }

        // Actualizar estado de validación
        firstNameControl?.updateValueAndValidity();
        lastNameControl?.updateValueAndValidity();
        companyNameControl?.updateValueAndValidity();
        legalRepControl?.updateValueAndValidity();
        rucControl?.updateValueAndValidity();
    }

    loadIntroducer(): void {
        this.loading = true;
        this.introducerService.getIntroducerById(this.introducerId!).subscribe({
            next: (introducer) => {
                this.form.patchValue(introducer);
                this.loading = false;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar introductor: ' + error.message,
                });
                this.loading = false;
                this.router.navigate(['/zoosanitario/introducers']);
            },
        });
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.markFormGroupTouched(this.form);
            return;
        }

        this.submitting = true;
        const formValue = this.form.value;

        const operation = this.isEditMode
            ? this.introducerService.updateIntroducer(
                  this.introducerId!,
                  formValue
              )
            : this.introducerService.createIntroducer(formValue);

        operation.subscribe({
            next: (introducer) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: `Introductor ${
                        this.isEditMode ? 'actualizado' : 'creado'
                    } correctamente`,
                });
                this.router.navigate([
                    '/zoosanitario/introducers/view',
                    introducer._id,
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
        return this.form.get('type')?.value === 'NATURAL';
    }

    getFieldError(fieldName: string): string {
        const field = this.form.get(fieldName);
        if (!field || !field.invalid || !field.touched) return '';

        if (field.errors?.['required']) return 'Este campo es requerido';
        if (field.errors?.['email']) return 'Email inválido';
        if (field.errors?.['pattern']) {
            if (fieldName === 'idNumber')
                return 'La cédula debe tener 10 dígitos';
            if (fieldName === 'ruc') return 'El RUC debe tener 13 dígitos';
            if (fieldName === 'phone')
                return 'El teléfono debe tener 10 dígitos';
        }
        return '';
    }
}
