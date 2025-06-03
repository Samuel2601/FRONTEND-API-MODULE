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
    form: FormGroup;
    loading = false;
    isEditMode = false;
    introducerId: string | null = null;

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
        private introducerService: IntroducerService,
        private route: ActivatedRoute,
        private router: Router,
        private messageService: MessageService
    ) {
        this.form = this.createForm();
    }

    ngOnInit() {
        this.introducerId = this.route.snapshot.paramMap.get('id');
        this.isEditMode = !!this.introducerId;

        if (this.isEditMode) {
            this.loadIntroducer();
        }

        this.setupFormValidation();
    }

    private createForm(): FormGroup {
        return this.fb.group({
            type: ['NATURAL', Validators.required],
            firstName: [''],
            lastName: [''],
            companyName: [''],
            legalRepresentative: [''],
            idNumber: ['', Validators.required],
            ruc: [''],
            phone: [''],
            email: ['', Validators.email],
            address: [''],
            introducerType: ['BOVINE_MAJOR', Validators.required],
            notes: [''],
        });
    }

    private setupFormValidation() {
        // Validación condicional basada en el tipo
        this.form.get('type')?.valueChanges.subscribe((type) => {
            this.updateValidationByType(type);
        });

        // Trigger inicial
        this.updateValidationByType(this.form.get('type')?.value);
    }

    private updateValidationByType(type: string) {
        const firstNameControl = this.form.get('firstName');
        const lastNameControl = this.form.get('lastName');
        const companyNameControl = this.form.get('companyName');
        const legalRepresentativeControl = this.form.get('legalRepresentative');

        if (type === 'NATURAL') {
            firstNameControl?.setValidators([Validators.required]);
            lastNameControl?.setValidators([Validators.required]);
            companyNameControl?.clearValidators();
            legalRepresentativeControl?.clearValidators();
        } else {
            firstNameControl?.clearValidators();
            lastNameControl?.clearValidators();
            companyNameControl?.setValidators([Validators.required]);
            legalRepresentativeControl?.setValidators([Validators.required]);
        }

        firstNameControl?.updateValueAndValidity();
        lastNameControl?.updateValueAndValidity();
        companyNameControl?.updateValueAndValidity();
        legalRepresentativeControl?.updateValueAndValidity();
    }

    private loadIntroducer() {
        if (!this.introducerId) return;

        this.loading = true;
        this.introducerService.getIntroducerById(this.introducerId).subscribe({
            next: (introducer) => {
                this.form.patchValue({
                    type: introducer.type,
                    firstName: introducer.firstName || '',
                    lastName: introducer.lastName || '',
                    companyName: introducer.companyName || '',
                    legalRepresentative: introducer.legalRepresentative || '',
                    idNumber: introducer.idNumber,
                    ruc: introducer.ruc || '',
                    phone: introducer.phone || '',
                    email: introducer.email || '',
                    address: introducer.address || '',
                    introducerType: introducer.introducerType,
                    notes: introducer.notes || '',
                });
                this.loading = false;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar introductor: ' + error.message,
                });
                this.loading = false;
                this.router.navigate(['/introducers']);
            },
        });
    }

    onSubmit() {
        if (this.form.invalid) {
            this.markFormGroupTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario Inválido',
                detail: 'Por favor complete todos los campos requeridos',
            });
            return;
        }

        this.loading = true;
        const formData = this.form.value;

        // Limpiar campos no utilizados según el tipo
        if (formData.type === 'NATURAL') {
            delete formData.companyName;
            delete formData.legalRepresentative;
        } else {
            delete formData.firstName;
            delete formData.lastName;
        }

        const operation = this.isEditMode
            ? this.introducerService.updateIntroducer(
                  this.introducerId!,
                  formData
              )
            : this.introducerService.createIntroducer(formData);

        operation.subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: `Introductor ${
                        this.isEditMode ? 'actualizado' : 'creado'
                    } correctamente`,
                });
                this.router.navigate(['/introducers']);
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail:
                        `Error al ${
                            this.isEditMode ? 'actualizar' : 'crear'
                        } introductor: ` + error.message,
                });
                this.loading = false;
            },
        });
    }

    onCancel() {
        this.router.navigate(['/introducers']);
    }

    private markFormGroupTouched() {
        Object.keys(this.form.controls).forEach((key) => {
            const control = this.form.get(key);
            control?.markAsTouched();
        });
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.form.get(fieldName);
        return !!(field?.invalid && (field?.dirty || field?.touched));
    }

    getFieldError(fieldName: string): string {
        const field = this.form.get(fieldName);
        if (!field?.errors) return '';

        if (field.errors['required'])
            return `${this.getFieldLabel(fieldName)} es requerido`;
        if (field.errors['email']) return 'Email inválido';

        return 'Campo inválido';
    }

    private getFieldLabel(fieldName: string): string {
        const labels: { [key: string]: string } = {
            type: 'Tipo',
            firstName: 'Nombres',
            lastName: 'Apellidos',
            companyName: 'Nombre de empresa',
            legalRepresentative: 'Representante legal',
            idNumber: 'Número de documento',
            ruc: 'RUC',
            phone: 'Teléfono',
            email: 'Email',
            address: 'Dirección',
            introducerType: 'Tipo de introductor',
            notes: 'Notas',
        };
        return labels[fieldName] || fieldName;
    }

    get isNaturalPerson(): boolean {
        return this.form.get('type')?.value === 'NATURAL';
    }

    get isJuridicalPerson(): boolean {
        return this.form.get('type')?.value === 'JURIDICAL';
    }
}
