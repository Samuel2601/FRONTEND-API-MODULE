import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { HelperService } from 'src/app/demo/services/helper.service';
import { LayoutService } from 'src/app/layout/service/app.layout.service';
import { CookieService } from 'ngx-cookie-service';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { Howl } from 'howler';
import { NativeBiometric } from 'capacitor-native-biometric';
import { AuthService } from 'src/app/demo/services/auth.service';
import { Plugins } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
const { App } = Plugins;
@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    providers: [MessageService, DynamicDialogRef, ConfirmationService],
})
export class LoginComponent implements OnInit {
    sound = new Howl({ src: ['../../../../../assets/audio/audio_login.mpeg'] });
    loginForm: FormGroup;
    showPassword = false;
    height = 700;
    save = false;
    url = GLOBAL.url;
    nombreUsuario: string;
    fotoUsuario: string;
    visible = false;
    codevalid: any;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private formBuilder: FormBuilder,
        private authService: AuthService,
        private helper: HelperService,
        private messageService: MessageService,
        private layoutService: LayoutService,
        private cookieService: CookieService,
        private auth: AuthService,
        private confirmationService: ConfirmationService
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
    IsMobil() {
        return this.helper.isMobil();
    }

    async ngOnInit(): Promise<void> {
        //this.helper.llamarspinner('login');
        await this.biometricocredential();
        this.handleQueryParams();
        this.playIntroAudio();
        this.setHeight();
        window.addEventListener('resize', this.setHeight.bind(this));

        if (this.auth.token()) {
            setTimeout(() => {
                this.router.navigate(['/home']);
            }, 2000);
        } else {
            this.loadUserData();
        }
        this.helper.cerrarspinner('login');
    }
    statusbiometrico: boolean = false;
    async biometricocredential() {
        if (!this.IsMobil()) return;
        try {
            const credentials = await NativeBiometric.getCredentials({
                server: 'ec.gob.esmeraldas.labella',
            })
                .then(() => {
                    return true;
                })
                .catch((err) => {
                    return false;
                });
            this.statusbiometrico = credentials;
        } catch (error) {
            console.error('Error obteniendo credenciales:', error);
            this.statusbiometrico = false;
        }
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

    private handleQueryParams() {
        this.route.queryParams.subscribe(async (params) => {
            const token = params['token'];
            await this.verificToken(token);
            if (params['correo'] && params['password']) {
                this.loginForm.setValue({
                    correo: params['correo'],
                    pass: params['password'],
                });
            }
        });
    }
    private async verificToken(token: any) {
        if (token) {
            await this.guardarToken(token);
            this.storeUserData(this.auth.authToken(token));
            this.rederict();
        }
    }
    private setHeight(): void {
        this.height = window.innerHeight;
    }

    private loadUserData(): void {
        this.nombreUsuario = this.helper.decryptDataLogin(
            this.helper.isMobil()
                ? localStorage.getItem('nombreUsuario')
                : this.cookieService.get('nombreUsuario')
        );
        this.fotoUsuario = this.helper.decryptDataLogin(
            this.helper.isMobil()
                ? localStorage.getItem('fotoUsuario')
                : this.cookieService.get('fotoUsuario')
        );
        this.callBiometrico();
    }

    async callBiometrico(): Promise<void> {
        if (!this.IsMobil()) return;
        if (!this.statusbiometrico) return;
        try {
            // Verifica si la autenticación biométrica está disponible
            const result = await NativeBiometric.isAvailable();
            if (!result.isAvailable) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'No disponible',
                    detail: 'La autenticación biométrica no está disponible en este dispositivo.',
                });
                return;
            }

            // Realiza la verificación biométrica
            const verified = await NativeBiometric.verifyIdentity({
                reason: 'Para un fácil inicio de sesión',
                title: 'Inicio de Sesión',
                subtitle: 'Coloque su dedo en el sensor.',
                description: 'Se requiere Touch ID o Face ID',
                useFallback: true,
                fallbackTitle: 'Usar Código',
                maxAttempts: 5,
            })
                .then(() => true)
                .catch(() => false);

            // Si la verificación biométrica es exitosa, intenta obtener las credenciales
            if (verified) {
                try {
                    const credentials = await NativeBiometric.getCredentials({
                        server: 'ec.gob.esmeraldas.labella',
                    });

                    if (credentials) {
                        // Establece las credenciales obtenidas en el formulario de inicio de sesión
                        this.loginForm
                            .get('correo')
                            .setValue(credentials.username);
                        this.loginForm
                            .get('pass')
                            .setValue(credentials.password);

                        // Llama a la función de postLogin para iniciar sesión
                        this.postLogin();
                    } else {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Falló',
                            detail: 'No se encontraron credenciales almacenadas.',
                        });
                    }
                } catch (getCredentialsError) {
                    // Maneja el error al intentar obtener las credenciales
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudieron recuperar las credenciales.',
                    });
                    console.error(
                        'Error al obtener credenciales:',
                        getCredentialsError
                    );
                }
            } else {
                // Si la verificación biométrica falla
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falló',
                    detail: 'La autenticación biométrica falló.',
                });
            }
        } catch (error) {
            // Maneja cualquier otro error
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Hubo un problema con la autenticación biométrica.',
            });
            console.error('Error en callBiometrico:', error);
        }
    }

    private getCookieOrLocalStorage(key: string): string {
        return this.IsMobil()
            ? localStorage.getItem(key)
            : this.cookieService.get(key);
    }

    get formControls() {
        return this.loginForm.controls;
    }

    async postLogin(): Promise<void> {
        if (this.loginForm.valid) {
            const user = {
                email: this.loginForm.get('correo').value,
                password: this.loginForm.get('pass').value,
                time: this.loginForm.get('save').value ? 60 : 3,
                tipo: this.loginForm.get('save').value ? 'days' : 'hours',
            };

            try {
                const response = await this.authService.login(user).toPromise();
                if (response.data) {
                    await this.guardarToken(response.data.token);
                    await this.navigateAfterLogin();
                    this.storeUserData(
                        this.auth.authToken(response.data.token)
                    );
                    //await this.navigateAfterLogin(response.data.passwordChange?true:false);
                    this.rederict();
                } else if (response.message) {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Verificación',
                        detail: response.message,
                    });
                    setTimeout(() => (this.visible = true), 500);
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
                    this.authService
                        .login_externo(user)
                        .subscribe(async (response) => {
                            //console.log(response);
                            const storage = this.loginForm.get('save').value
                                ? localStorage
                                : sessionStorage;
                            storage.setItem('token', response.token);
                            this.router.navigate(['/recolectores/map']);
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

    private storeUserData(data: any): void {
        if (data) {
            this.storeEncryptedData(
                'nombreUsuario',
                data.nombres ? data.nombres : data.name + ' ' + data.last_name
            );
            this.storeEncryptedData(
                'fotoUsuario',
                data.foto ? data.foto : data.photo
            );
            this.storeEncryptedData('correo', data.email);
            this.guardarNombreUsuario(
                data.nombres ? data.nombres : data.name + ' ' + data.last_name
            );
            this.guardarFoto(data.foto ? data.foto : data.photo);
        }
    }

    private storeEncryptedData(key: string, value: string): void {
        const encryptedValue = this.helper.encryptDataLogin(value, 'labella');
        if (this.IsMobil()) {
            localStorage.setItem(key, encryptedValue);
        } else {
            this.cookieService.set(key, encryptedValue);
        }
    }

    async navigateAfterLogin(): Promise<void> {
        if (!this.IsMobil()) return;

        if (this.loginForm.get('save').value) {
            const currentUsername = this.loginForm.get('correo').value;
            const currentPassword = this.loginForm.get('pass').value;

            try {
                // Verificar disponibilidad del biométrico
                const result = await NativeBiometric.isAvailable();
                if (!result.isAvailable) return;

                // Intentar obtener credenciales almacenadas
                const storedCredentials = await NativeBiometric.getCredentials({
                    server: 'ec.gob.esmeraldas.labella',
                }).catch((error) => {
                    console.error('Error al obtener las credenciales:', error);
                    return null;
                });

                // Comparar las credenciales almacenadas con las actuales
                if (
                    storedCredentials &&
                    storedCredentials.username === currentUsername &&
                    storedCredentials.password === currentPassword
                ) {
                    //console.log(             'Las credenciales ya están guardadas y son las mismas.'  );
                    return;
                }

                // Reintentar la verificación biométrica hasta que sea exitosa o el usuario cancele
                let verified = false;
                while (!verified) {
                    const verificationResult =
                        await NativeBiometric.verifyIdentity({
                            reason: 'Por favor, autentícate para guardar las credenciales de tu cuenta',
                            title: 'Inicio de Sesión',
                            subtitle: 'Coloque su dedo en el sensor.',
                            description: 'Se requiere Touch ID o Face ID',
                            useFallback: true,
                            fallbackTitle: 'Usar Código',
                            maxAttempts: 5,
                        })
                            .then((state) => {
                                //console.log();
                                return true;
                            })
                            .catch((err) => {
                                console.error(
                                    'Error al verificar la identidad biométrica:',
                                    err
                                );
                                return false;
                            });

                    if (verificationResult) {
                        // Guardar las nuevas credenciales si la verificación fue exitosa
                        const confir = await NativeBiometric.setCredentials({
                            username: currentUsername,
                            password: currentPassword,
                            server: 'ec.gob.esmeraldas.labella',
                        })
                            .then(() => true)
                            .catch((err) => {
                                console.error(
                                    'Error al guardar las credenciales:',
                                    err
                                );
                                return false;
                            });

                        if (confir) {
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Éxito',
                                detail: 'Se guardaron las credenciales',
                            });
                            verified = true;
                        } else {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Falló',
                                detail: 'El biométrico falló al guardar las credenciales',
                            });
                        }
                    } else {
                        const retry = confirm(
                            'La verificación biométrica falló. ¿Desea intentarlo de nuevo?'
                        );
                        if (!retry) {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Falló',
                                detail: 'El biométrico no fue verificado',
                            });
                            return;
                        }
                    }
                }
            } catch (error) {
                console.error(
                    'Error al verificar la disponibilidad biométrica:',
                    error
                );
                this.messageService.add({
                    severity: 'error',
                    summary: 'Falló',
                    detail: 'El biométrico falló',
                });
            }
        }
    }

    async deletecredential(event: Event): Promise<void> {
        this.confirmationService.confirm({
            target: event.target as EventTarget,
            message:
                '¿Tienes problemas con las credenciales? ¿Deseas eliminarlas?',
            header: 'Error de Biométrico',
            icon: 'pi pi-exclamation-triangle',
            acceptIcon: 'none',
            rejectIcon: 'none',
            rejectButtonStyleClass: 'p-button-text',
            accept: async () => {
                try {
                    await NativeBiometric.deleteCredentials({
                        server: 'ec.gob.esmeraldas.labella',
                    });
                    this.messageService.add({
                        severity: 'info',
                        summary: 'Confirmado',
                        detail: 'Las credenciales han sido eliminadas',
                    });
                } catch (error) {
                    console.error('Error al eliminar las credenciales:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Hubo un problema al eliminar las credenciales',
                    });
                }
            },
            reject: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Rechazado',
                    detail: 'Has rechazado la eliminación de credenciales',
                    life: 3000,
                });
            },
        });
    }

    private async rederict(hasPassword?: boolean) {
        this.messageService.add({
            severity: 'success',
            summary: 'Ingreso',
            detail: 'Bienvenido',
        });
        await this.auth.inicializadorSocket();
        await this.auth.inicialityPermiss();

        setTimeout(() => {
            this.router.navigate([hasPassword ? '/maps/edit-user' : '/home']);
        }, 1000);
    }

    private handleLoginError(error: any): void {
        this.messageService.add({
            severity: 'error',
            summary: `(${error.status})`,
            detail: error.error.message || 'Sin conexión',
        });
    }

    verifiCode(): void {
        this.authService
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
                        await this.navigateAfterLogin();
                        await this.guardarToken(response.data.token);
                        this.storeUserData(
                            this.auth.authToken(response.data.token)
                        );
                        setTimeout(() => (this.visible = false), 500);
                        this.rederict();
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

    async guardarToken(token: string) {
        const storage = this.loginForm.get('save').value
            ? localStorage
            : sessionStorage;
        storage.setItem('token', token);

        const idUser = this.auth.idUserToken(token);
        storage.setItem('idUser', idUser);
    }

    guardarFoto(foto: string): void {
        if (foto) {
            const storage = this.loginForm.get('save').value
                ? localStorage
                : sessionStorage;
            storage.setItem('fotoUsuario', foto);
        }
    }

    guardarNombreUsuario(nombre: string): void {
        if (nombre) {
            const storage = this.loginForm.get('save').value
                ? localStorage
                : sessionStorage;
            storage.setItem('nombreUsuario', nombre);
        }
    }
    async initializeGoogleOneTap() {
        try {
            GoogleAuth.initialize({
                clientId:
                    '489368244321-c2vr1nvlg7qlfo85ttd75poi1c1h0365.apps.googleusercontent.com',
                scopes: ['profile', 'email'],
                grantOfflineAccess: true,
            });
        } catch (error) {
            console.error(
                'Google One Tap initialization failed:',
                JSON.stringify(error)
            );
        }
    }

    async loginWithGoogle() {
        if (this.IsMobil()) {
            try {
                await this.authService
                    .initializeGoogleOneTap()
                    .then(async () => {
                        const googleUser =
                            await this.authService.signInWithGoogle();
                        const response: any =
                            await this.authService.sendUserToBackend(
                                googleUser
                            );
                        if (response.token) {
                            await this.guardarToken(response.token);
                            this.storeUserData(
                                this.auth.authToken(response.token)
                            );
                            this.rederict();
                        } else {
                            console.warn(
                                'Login failed',
                                JSON.stringify(response, null, 4)
                            );
                            this.messageService.add({
                                severity: 'error',
                                summary: `(500)`,
                                detail: response.message || 'Sin conexión',
                            });
                        }
                    });

                // Maneja el usuario autenticado (por ejemplo, envíalo a tu backend)
            } catch (err) {
                console.error('Login failed', JSON.stringify(err, null, 4));
                this.messageService.add({
                    severity: 'error',
                    summary: `(500)`,
                    detail: 'Algo salio mal',
                });
            }
        } else {
            this.authService.loginWithGoogle();
        }
    }
    private async playIntroAudio(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.sound.on('end', () => {
                resolve();
            });
            this.sound.play();
        });
    }
}
