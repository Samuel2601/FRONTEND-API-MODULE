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
        cedula: [
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
        nombres: [
            { type: 'required', message: 'El nombre es requerido.' },
            {
                type: 'pattern',
                message: 'El nombre debe contener solo letras.',
            },
        ],
        telefono: [
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
        correo: [
            { type: 'invalido', message: 'Correo electronico ya registrado' },
            {
                type: 'required',
                message: 'El correo electrónico es requerido.',
            },
            { type: 'email', message: 'Ingrese un correo electrónico válido.' },
        ],
        password: [
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
            cedula: [
                '',
                [
                    Validators.minLength(10),
                    Validators.maxLength(10),
                    Validators.pattern('^[0-9]+$'),
                ],
            ],
            nombres: [
                '',
                [Validators.required, Validators.pattern('^[a-zA-Z ]+$')],
            ],
            telefono: [
                '',
                [
                    Validators.required,
                    Validators.minLength(10),
                    Validators.maxLength(10),
                    Validators.pattern('^[0-9]+$'),
                ],
            ],
            correo: ['', [Validators.required, this.customEmailValidator()]],
            password: ['', [Validators.required, Validators.minLength(4)]],
            checked: [false],
        });

        this.formulario.get('cedula')?.valueChanges.subscribe((value: any) => {
            if (this.formulario.get('cedula')?.valid) {
                this.consultar(value);
            }
        });
        // Eliminar espacios en blanco del correo electrónico
        this.formulario.get('correo').valueChanges.subscribe((value) => {
          const correoSinEspacios = value.replace(/\s/g, '');
          const correoMinusculas = correoSinEspacios.toLowerCase();
          this.formulario.patchValue(
              { correo: correoMinusculas },
              { emitEvent: false }
          );
      });
        this.formulario.get('correo')?.valueChanges.subscribe((value: any) => {
            if (this.formulario.get('correo')?.valid) {
                this.consultarcorreo(value);
            }
        });
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
        //console.log(this.formulario.get('checked'));
    }
    checked: boolean | null = null;
    visible: boolean = false;
    consultar(id: any) {
        this.visible = true;
        this.admin.getCiudadano(id).subscribe(
            (response) => {
                //console.log(response);
                setTimeout(() => {
                    this.visible = false;
                    if (response.nombres) {
                        this.formulario
                            .get('nombres')
                            ?.setValue(response.nombres);
                        //this.formulario.get('correo')?.setErrors({ 'status': "VALID" });
                        this.formulario.get('nombres')?.disable();
                    }
                }, 1000);
            },
            (error) => {
                this.visible = false;

                this.formulario.get('nombres')?.setValue('');
                this.formulario.get('nombres')?.enable();
                this.messageService.add({
                    severity: 'error',
                    summary: ('(' + error.status + ')').toString(),
                    detail:
                        error.error.message +
                            ': ' +
                            this.formulario.get('cedula')?.value ||
                        'Sin conexión',
                });
                this.formulario.get('cedula')?.setValue('');
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
    consultarcorreo(correo: any) {
        this.visible = true;
        this.admin.verificarCorreo(correo).subscribe((response) => {
            //console.log(response);
            if (response) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Invalido',
                    detail: 'Correo electronico ya existente',
                });
                this.formulario
                    .get('correo')
                    ?.setErrors({ invalido: true, type: 'duplicidad' });
                //console.log(this.formulario.get('correo'));
            }
            setTimeout(() => {
                this.visible = false;
            }, 1000);
        });
    }
    registrarse() {
        this.visible = true;
        if (this.formulario.valid) {
            this.formulario.get('nombres')?.enable();
            this.create.registrarUsuario(this.formulario.value).subscribe(
                (response) => {
                    //console.log(response);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Excelente',
                        detail: 'Registrado Correctamente',
                    });
                    setTimeout(() => {
                        // Redirigir a la página de inicio de sesión con los datos de correo y contraseña
                        this.router.navigate(['/auth/login'], {
                            queryParams: {
                                correo: this.formulario.get('correo').value,
                                password: this.formulario.get('password').value,
                            },
                        });
                    }, 1000);
                },
                (error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: ('(' + error.status + ')').toString(),
                        detail: error.error.message || 'Sin conexión',
                    });
                }
            );
            setTimeout(() => {
                this.visible = false;
            }, 1000);
        } else {
            //console.log(this.formulario.valid);
            //console.log(this.formulario);
            this.messageService.add({
                severity: 'error',
                summary: 'Invalido',
                detail: 'Rellene todos los campos',
            });
        }
    }

    isMobil() {
        return this.helper.isMobil();
    }
    selectedFiles: any;
    imagenesSeleccionadas: any;
    load_imagen: boolean = true;
    onFilesSelected(event: any): void {
        //console.log(event);
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
