import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AuthService } from 'src/app/demo/services/auth.service';
import { ImportsModule } from 'src/app/demo/services/import';

@Component({
    selector: 'app-login-modal',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss',
})
export class LoginComponent {
    @Input() visible: boolean = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    // Método para cerrar el modal
    close() {
        this.visible = false;
        this.visibleChange.emit(this.visible);
    }

    // Método para abrir el modal
    open() {
        this.visible = true;
        this.visibleChange.emit(this.visible);
    }
    loginForm: FormGroup;
    constructor(
        private formBuilder: FormBuilder,
        private auth: AuthService,
        private messageService: MessageService
    ) {
        this.loginForm = this.formBuilder.group({
            correo: [
                '',
                [
                    Validators.required,
                    Validators.pattern(
                        '[a-z0-9._%+-]+@[a-z0-9.-]+.[a-z]{2,3}$'
                    ),
                    Validators.maxLength(50),
                ],
            ],
            pass: [
                '',
                [
                    Validators.required,
                    Validators.minLength(4),
                    Validators.maxLength(100),
                ],
            ],
            save: [true],
            verificar: [true],
        });

        this.removeWhitespaceFromEmail();
    }
    private removeWhitespaceFromEmail(): void {
        this.loginForm.get('correo').valueChanges.subscribe((value) => {
            const correoSinEspacios = value.replace(/\s/g, '').toLowerCase();
            this.loginForm.patchValue(
                { correo: correoSinEspacios },
                { emitEvent: false }
            );
        });
    }
    visible2: boolean = false;
    codevalid: any;
    async postLogin(): Promise<void> {
        console.log('postLogin: ', this.loginForm.value);
        if (this.loginForm.valid) {
            const user = {
                email: this.loginForm.get('correo').value,
                password: this.loginForm.get('pass').value,
                time: this.loginForm.get('save').value ? 60 : 3,
                tipo: this.loginForm.get('save').value ? 'days' : 'hours',
            };

            try {
                const response = await this.auth.login(user).toPromise();
                console.log('response: ', response);
                if (response.data) {
                    await this.guardarToken(response.data.token);
                    this.messageService.add({
                        severity: 'success',
                        summary: response.message,
                        //detail: response.message,
                    });
                } else if (response.message) {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Verificación',
                        detail: response.message,
                    });
                    setTimeout(() => (this.visible2 = true), 500);
                }
            } catch (error) {
                this.handleLoginError(error);
            }
        } else {
            //console.log(this.loginForm.value);
            if (this.loginForm.value.correo && this.loginForm.value.pass) {
                const correo = this.loginForm.value.correo;

                if (/^\d{10}$/.test(correo)) {
                    // Si es una cadena numérica
                    //console.log('Correo es numérico:', correo);
                    const user = {
                        email: this.loginForm.get('correo').value,
                        password: this.loginForm.get('pass').value,
                        time: this.loginForm.get('save').value ? 60 : 3,
                        tipo: this.loginForm.get('save').value
                            ? 'days'
                            : 'hours',
                    };
                    this.auth
                        .login_externo(user)
                        .subscribe(async (response) => {
                            //console.log(response);
                            const storage = this.loginForm.get('save').value
                                ? localStorage
                                : sessionStorage;
                            storage.setItem('token', response.token);
                        });
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Aviso',
                        detail: 'Datos erroneos',
                    });
                }
            } else {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Aviso',
                    detail: 'Completa los datos',
                });
            }
        }
    }

    async guardarToken(token: string) {
        const storage = this.loginForm.get('save').value
            ? localStorage
            : sessionStorage;
        storage.setItem('token', token);

        const idUser = this.auth.idUserToken(token);
        storage.setItem('idUser', idUser);
        this.close();
    }

    private handleLoginError(error: any): void {
        this.messageService.add({
            severity: 'error',
            summary: `(${error.status})`,
            detail: error.error.message || 'Sin conexión',
        });
    }

    verifiCode(): void {
        this.auth
            .validcode({
                email: this.loginForm.get('correo').value,
                codigo: this.codevalid,
                time: this.loginForm.get('save').value ? 60 : 3,
                tipo: this.loginForm.get('save').value ? 'days' : 'hours',
            })
            .subscribe(
                async (response) => {
                    ////console.log(response);
                    if (response.message === 'Bienvenido.') {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Verificación',
                            detail: response.message,
                        });
                        await this.guardarToken(response.data.token);
                        this.visible2 = false;
                        this.visible = false;
                    }
                },
                (error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: `(${error.status})`,
                        detail: error.error.message || 'Sin conexión',
                    });
                }
            );
    }
}
