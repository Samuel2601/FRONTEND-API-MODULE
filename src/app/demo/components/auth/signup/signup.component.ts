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
@Component({
    selector: 'app-signup',
    templateUrl: './signup.component.html',
    styleUrls: ['./signup.component.scss'],
})
export class SignupComponent {
    // Mensajes de error personalizados
    validationMessages = {
        dni: [
            { type: 'required', message: 'La cédula es requerida.' },
            {
                type: 'minlength',
                message: 'La cédula debe tener 10 caracteres.',
            },
            {
                type: 'maxlength',
                message: 'La cédula debe tener 10 caracteres.',
            },
            {
                type: 'pattern',
                message: 'La cédula debe contener solo números.',
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
        this.formulario = this.formBuilder.group({
            /*dni: [
                '',
                [
                    Validators.minLength(10),
                    Validators.maxLength(10),
                    Validators.pattern('^[0-9]+$'),
                ],
            ],*/
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
            checked: [false],
        });

        this.formulario.get('dni')?.valueChanges.subscribe((value: any) => {
            if (this.formulario.get('dni')?.valid) {
                this.consultar(value);
            }
        });
        // Eliminar espacios en blanco del email electrónico
        this.formulario.get('email').valueChanges.subscribe((value) => {
            const correoSinEspacios = value.replace(/\s/g, '');
            const correoMinusculas = correoSinEspacios.toLowerCase();
            this.formulario.patchValue(
                { email: correoMinusculas },
                { emitEvent: false }
            );
        });
        /* this.formulario.get('email')?.valueChanges.subscribe((value: any) => {
            if (this.formulario.get('email')?.valid) {
                this.consultarcorreo(value);
            }
        });*/
    }
    customEmailValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const email = control.value;
            const emailPattern =
                /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            return emailPattern.test(email) ? null : { invalidEmail: true };
        };
    }
    getErrorMessage(fieldName: string): string {
        const field = this.formulario.get(fieldName);
        if (!field || !field.errors) return '';

        const errors = [];
        for (const errorType in field.errors) {
            if (field.errors.hasOwnProperty(errorType)) {
                const error = this.validationMessages[fieldName].find(
                    (msg) => msg.type === errorType
                );
                if (error) {
                    errors.push(error.message);
                }
            }
        }

        return errors.join('\n');
    }

    ver() {
        ////console.log(this.formulario.get('checked'));
    }
    checked: boolean | null = null;
    visible: boolean = false;
    consultar(id: any) {
        this.visible = true;
        this.admin.getCiudadano(id).subscribe(
            (response) => {
                ////console.log(response);
                setTimeout(() => {
                    this.visible = false;
                    if (response.name) {
                        this.formulario.get('name')?.setValue(response.name);
                        //this.formulario.get('email')?.setErrors({ 'status': "VALID" });
                        this.formulario.get('name')?.disable();
                    }
                }, 1000);
            },
            (error) => {
                this.visible = false;

                this.formulario.get('name')?.setValue('');
                this.formulario.get('name')?.enable();
                this.messageService.add({
                    severity: 'error',
                    summary: ('(' + error.status + ')').toString(),
                    detail:
                        error.error.message +
                            ': ' +
                            this.formulario.get('dni')?.value || 'Sin conexión',
                });
                this.formulario.get('dni')?.setValue('');
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
                this.formulario
                    .get('email')
                    ?.setErrors({ invalido: true, type: 'duplicidad' });
                ////console.log(this.formulario.get('email'));
            }
            setTimeout(() => {
                this.visible = false;
            }, 1000);
        });
    }
    registrarse() {
        this.visible = true;
        if (this.formulario.valid) {
            this.formulario.get('name')?.enable();
            this.create.registrarUsuario(this.formulario.value).subscribe(
                (response) => {
                    //console.log(response);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Excelente',
                        detail: 'Registrado Correctamente',
                    });
                    setTimeout(() => {
                        // Redirigir a la página de inicio de sesión con los datos de email y contraseña
                        this.router.navigate(['/auth/login'], {
                            queryParams: {
                                correo: this.formulario.get('email').value,
                                password: this.formulario.get('password').value,
                            },
                        });
                    }, 1000);
                },
                (error) => {
                    console.error(error);
                    this.messageService.add({
                        severity: 'error',
                        summary: ('(' + error.status + ')').toString(),
                        detail: error.error.message || 'Sin conexión',
                    });
                }
            );
        } else {
            ////console.log(this.formulario.valid);
            ////console.log(this.formulario);
            this.messageService.add({
                severity: 'error',
                summary: 'Invalido',
                detail: 'Rellene todos los campos',
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
                severity: 'warning',
                summary: 'MAX img',
                detail: 'Solo puede enviar 3 imangenes',
            });
            ////console.error('Error al obtener la cadena base64 de la imagen.');
        }
    }
    formulario: any = {};
    active: number | undefined = 0;
}
