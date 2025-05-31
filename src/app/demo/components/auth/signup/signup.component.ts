import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../services/admin.service';
import { MessageService } from 'primeng/api';
import {
    Camera,
    CameraResultType,
    CameraSource,
    Photo,
} from '@capacitor/camera';
import { HelperService } from 'src/app/demo/services/helper.service';
import { CreateService } from 'src/app/demo/services/create.service';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PoliticasComponent } from '../politicas/politicas.component';
import { App } from '@capacitor/app';
import { Router } from '@angular/router';
import {
    FormBuilder,
    FormGroup,
    Validators,
    AbstractControl,
    ValidationErrors,
    ValidatorFn,
} from '@angular/forms';
import { filter } from 'rxjs';
@Component({
    standalone: false,
    selector: 'app-signup',
    templateUrl: './signup.component.html',
    styleUrls: ['./signup.component.scss'],
})
export class SignupComponent {
    formRegister: any = {};
    active: number | undefined = 0;
    // Mensajes de error personalizados
    validationMessages = {
        dni: [
            { type: 'required', message: 'La cédula es requerida.' },
            {
                type: 'minlength',
                getMessage: () => {
                    const isCompany =
                        this.formRegister?.get('isCompany')?.value;
                    return `Debe tener ${isCompany ? 13 : 10} caracteres.`;
                },
            },
            {
                type: 'maxlength',
                getMessage: () => {
                    const isCompany =
                        this.formRegister?.get('isCompany')?.value;
                    return `Debe tener ${isCompany ? 13 : 10} caracteres.`;
                },
            },
            {
                type: 'pattern',
                message: 'La cédula debe contener solo números.',
            },
        ],
        date_exp: [
            {
                type: 'required',
                message: 'La fecha de expedición es requerida.',
            },
            {
                type: 'pattern',
                message: 'Ingrese una fecha válida en formato DD/MM/YYYY.',
            },
            {
                type: 'fechaIncorrecta',
                message:
                    'La fecha de expedición debe ser igual a la de la persona.',
            },
        ],
        name: [
            { type: 'required', message: 'El nombre es requerido.' },
            {
                type: 'pattern',
                message: 'El nombre debe contener solo letras.',
            },
        ],
        last_name: [
            { type: 'required', message: 'El nombre es requerido.' },
            {
                type: 'pattern',
                message: 'El nombre debe contener solo letras.',
            },
        ],
        telf: [
            { type: 'required', message: 'El teléfono es requerido.' },
            {
                type: 'minlength',
                message: 'El teléfono debe tener 10 caracteres.',
            },
            {
                type: 'maxlength',
                message: 'El teléfono debe tener 10 caracteres.',
            },
            {
                type: 'pattern',
                message: 'El teléfono debe contener solo números.',
            },
        ],
        email: [
            { type: 'invalido', message: 'Correo electronico ya registrado' },
            {
                type: 'required',
                message: 'El email electrónico es requerido.',
            },
            { type: 'email', message: 'Ingrese un email electrónico válido.' },
        ],
        password: [
            { type: 'required', message: 'La contraseña es requerida.' },
            {
                type: 'minlength',
                message: 'La contraseña debe tener al menos 4 caracteres.',
            },
        ],
        passwordConfirmation: [
            { type: 'required', message: 'La contraseña es requerida.' },
            {
                type: 'minlength',
                message: 'La contraseña debe tener al menos 4 caracteres.',
            },
        ],
    };

    fechaExpedicionReal: string | null = null; // Almacena la fecha correcta

    constructor(
        private router: Router,
        private formBuilder: FormBuilder,
        private admin: AdminService,
        private messageService: MessageService,
        private helper: HelperService,
        private create: CreateService,
        private dialogService: DialogService,
        private ref: DynamicDialogRef
    ) {
        this.formRegister = this.formBuilder.group(
            {
                isCompany: [false],
                dni: [
                    '',
                    [Validators.required, Validators.pattern('^[0-9]+$')],
                ],
                date_exp: [
                    '',
                    [
                        //Validators.required,
                        Validators.pattern(/^\d{2}\/\d{2}\/\d{4}$/),
                    ],
                ],
                name: [
                    '',
                    [
                        Validators.required,
                        Validators.pattern('^[a-zA-ZáéíóúÑñ ]+$'),
                    ],
                ],
                last_name: [
                    '',
                    [
                        Validators.required,
                        Validators.pattern('^[a-zA-ZáéíóúÑñ ]+$'),
                    ],
                ],
                telf: [
                    '',
                    [
                        Validators.required,
                        Validators.minLength(10),
                        Validators.maxLength(10),
                        Validators.pattern('^[0-9]+$'),
                    ],
                ],
                email: ['', [Validators.required, this.customEmailValidator()]],
                password: ['', [Validators.required, Validators.minLength(4)]],
                passwordConfirmation: [
                    '',
                    [Validators.required, Validators.minLength(4)],
                ],
                acceptTerms: [false],
            },
            {
                validators: this.passwordMatchValidator,
            }
        );

        // Escuchar cambios en isCompany para actualizar validaciones de dni
        this.formRegister
            .get('isCompany')
            ?.valueChanges.subscribe((isCompany) => {
                const dniControl = this.formRegister.get('dni');
                if (dniControl) {
                    dniControl.setValidators([
                        Validators.required,
                        Validators.pattern('^[0-9]+$'),
                        Validators.minLength(isCompany ? 13 : 10),
                        Validators.maxLength(isCompany ? 13 : 10),
                    ]);
                    dniControl.updateValueAndValidity(); // Aplicar los nuevos validadores
                }
            });

        // Detectar cambios en el DNI
        this.formRegister
            .get('dni')
            ?.valueChanges.pipe(
                filter(
                    () =>
                        this.formRegister.get('dni')?.valid &&
                        !this.formRegister.get('isCompany')?.value &&
                        this.formRegister.get('dni')?.value.length === 10
                )
            )
            .subscribe((dni: any) => {
                this.consultar(dni);
            });
        // Eliminar espacios en blanco del email electrónico
        this.formRegister.get('email').valueChanges.subscribe((value) => {
            const correoSinEspacios = value.replace(/\s/g, '');
            const correoMinusculas = correoSinEspacios.toLowerCase();
            this.formRegister.patchValue(
                { email: correoMinusculas },
                { emitEvent: false }
            );
        });
        /* this.formRegister.get('email')?.valueChanges.subscribe((value: any) => {
            if (this.formRegister.get('email')?.valid) {
                this.consultarcorreo(value);
            }
        });*/
    }

    passwordMatchValidator(form: FormGroup) {
        const password = form.get('password');
        const confirmPassword = form.get('passwordConfirmation');

        if (
            password &&
            confirmPassword &&
            password.value !== confirmPassword.value
        ) {
            confirmPassword.setErrors({ passwordMismatch: true });
        } else {
            confirmPassword.setErrors(null);
        }
    }

    customEmailValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const email = control.value;
            const emailPattern =
                /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            return emailPattern.test(email) ? null : { invalidEmail: true };
        };
    }
    showTermsModal() {
        this.visible = true;
    }

    getErrorMessage(fieldName: string): string {
        const field = this.formRegister.get(fieldName);
        if (!field || !field.errors) return '';

        const errors = [];
        for (const errorType in field.errors) {
            if (field.errors.hasOwnProperty(errorType)) {
                const error = this.validationMessages[fieldName].find(
                    (msg: any) => msg.type === errorType
                );
                if (error) {
                    errors.push(error.message);
                }
            }
        }

        return errors.join('\n');
    }

    checked: boolean | null = null;
    visible: boolean = false;
    loading: boolean = false;
    consultar(id: any) {
        this.visible = true;
        this.admin.getCiudadanoInfo(id).subscribe(
            (response) => {
                console.log(response);
                if (response.nombre) {
                    const fullName = response.nombre.trim().split(/\s+/); // Dividir por espacios y eliminar excesos

                    let lastName = fullName.slice(0, 2).join(' '); // Tomar las dos primeras palabras como apellido
                    let name = fullName.slice(2).join(' '); // El resto es el nombre

                    // Si hay 5 palabras y la primera o segunda es "DE", extender el apellido
                    if (
                        fullName.length === 5 &&
                        (fullName[0].toUpperCase() === 'DE' ||
                            fullName[1].toUpperCase() === 'DE')
                    ) {
                        lastName = fullName.slice(0, 3).join(' '); // Tomar 3 palabras como apellido
                        name = fullName.slice(3).join(' '); // El resto es el nombre
                    }

                    // Asignar valores a los campos del formulario
                    this.formRegister.get('last_name')?.setValue(lastName);
                    this.formRegister.get('last_name')?.disable();
                    this.formRegister.get('name')?.setValue(name);
                    this.formRegister.get('name')?.disable();
                }
                setTimeout(() => {
                    this.visible = false;
                }, 1000);
            },
            (error) => {
                this.visible = false;

                this.formRegister.get('name')?.setValue('');
                this.formRegister.get('name')?.enable();
                this.messageService.add({
                    severity: 'error',
                    summary: ('(' + error.status + ')').toString(),
                    detail:
                        error.error.message +
                            ': ' +
                            this.formRegister.get('dni')?.value ||
                        'Sin conexión',
                });
                this.formRegister.get('dni')?.setValue('');
            }
        );
    }
    llamarmodal() {
        this.ref = this.dialogService.open(PoliticasComponent, {
            header: 'Politicas y Privacidad de Esmeraldas la Bella',
            dismissableMask: true,
            width: this.isMobil() ? '100%' : '70%',
        });
        App.addListener('backButton', (data) => {
            this.ref.close();
        });
    }
    consultarcorreo(email: any) {
        this.visible = true;
        this.admin.verificarCorreo(email).subscribe((response) => {
            ////console.log(response);
            if (response) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Invalido',
                    detail: 'Correo electronico ya existente',
                });
                this.formRegister
                    .get('email')
                    ?.setErrors({ invalido: true, type: 'duplicidad' });
                ////console.log(this.formRegister.get('email'));
            }
            setTimeout(() => {
                this.visible = false;
            }, 1000);
        });
    }
    async onSubmit() {
        this.visible = true;

        // Revalidar el campo date_exp
        if (!this.formRegister.valid) {
            this.messageService.add({
                severity: 'error',
                summary: 'Inválido',
                detail: 'Rellene todos los campos correctamente',
            });
            this.visible = false;
            return;
        }

        try {
            if (this.formRegister.get('isCompany')?.value == false) {
                // Verificar la fecha de expedición antes de continuar
                const response = await this.admin
                    .getCiudadanoFechaExpedicion(
                        this.formRegister.value.dni,
                        this.formRegister.value.date_exp
                    )
                    .toPromise();

                if (!response.success) {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: response.mensaje,
                    });
                    this.visible = false;
                    return; // DETENER EL PROCESO SI NO COINCIDE LA FECHA
                }
            }
            // Si la fecha de expedición es correcta, proceder con el registro

            this.formRegister.get('last_name')?.enable();
            this.formRegister.get('name')?.enable();

            const data = this.formRegister.value;

            this.formRegister.get('last_name')?.disable();
            this.formRegister.get('name')?.disable();

            this.create.registrarUsuario(data).subscribe(
                (response: any) => {
                    console.log(response);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Excelente',
                        detail: 'Registrado Correctamente',
                    });

                    setTimeout(() => {
                        this.router.navigate(['/auth/login']); // Redirigir al login
                    }, 1000);
                },
                (error) => {
                    console.error(error);
                    this.messageService.add({
                        severity: 'error',
                        summary: `(${error.status})`,
                        detail: error.error.message || 'Sin conexión',
                    });
                }
            );
        } catch (error) {
            console.error(
                'Error en la validación de fecha de expedición:',
                error
            );
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo validar la fecha de expedición',
            });
        }

        setTimeout(() => {
            this.visible = false;
        }, 1000);
    }

    isMobil() {
        return this.helper.isMobil();
    }
    selectedFiles: any;
    imagenesSeleccionadas: any;
    load_imagen: boolean = true;
    onFilesSelected(event: any): void {
        ////console.log(event);
        if (event.files.length > 0) {
            const file = event.files[0];
            const objectURL = URL.createObjectURL(file);
            this.imagenesSeleccionadas = objectURL;
            this.load_imagen = false;
            this.messageService.add({
                severity: 'info',
                summary: 'File Uploaded',
                detail: 'Imagen subida',
            });
        }
    }

    async tomarFotoYEnviar(event: any) {
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source: CameraSource.Prompt,
            promptLabelPhoto: 'Seleccionar de la galería',
            promptLabelPicture: 'Tomar foto',
        });
        if (image && image.base64String) {
            const byteCharacters = atob(image.base64String);
            const byteNumbers = new Array(byteCharacters.length);

            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' }); // Puedes ajustar el tipo según el formato de tu imagen
            let im = new File([blob], 'prueba', { type: 'image/jpeg' });
            this.selectedFiles = im;

            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.imagenesSeleccionadas = e.target.result;
            };
            reader.readAsDataURL(im);
        } else {
            this.messageService.add({
                severity: 'warn',
                summary: 'MAX img',
                detail: 'Solo puede enviar 3 imangenes',
            });
            ////console.error('Error al obtener la cadena base64 de la imagen.');
        }
    }
}
