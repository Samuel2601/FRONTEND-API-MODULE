import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
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
    providers: [MessageService, DynamicDialogRef],
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
        private auth: AuthService
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
                    Validators.minLength(8),
                    Validators.maxLength(30),
                ],
            ],
            save: [true],
        });

        this.removeWhitespaceFromEmail();
    }
    IsMobil() {
        return this.helper.isMobil();
    }

    async ngOnInit(): Promise<void> {
        this.helper.llamarspinner('login');
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
    statusbiometrico:boolean=false;
    async biometricocredential () {
        try {
            const credentials = await NativeBiometric.getCredentials({
                server: 'ec.gob.esmeraldas.labella',
            });
            this.statusbiometrico=!!credentials;
        } catch (error) {
            console.error('Error obteniendo credenciales:', error);
            this.statusbiometrico=false;
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
            this.messageService.add({
                severity: 'error',
                summary: 'Aviso',
                detail: 'Completa los datos',
            });
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
        if (this.IsMobil() && this.loginForm.get('save').value) {
            try {
                const result = await NativeBiometric.isAvailable();
                if (!result.isAvailable) return;
                // Obtener las credenciales almacenadas previamente
                const storedCredentials = await NativeBiometric.getCredentials({
                    server: 'ec.gob.esmeraldas.labella',
                }).catch(() => null);

                const currentUsername = this.loginForm.get('correo').value;
                const currentPassword = this.loginForm.get('pass').value;
                if (
                    storedCredentials &&
                    storedCredentials.username === currentUsername &&
                    storedCredentials.password === currentPassword
                ) {
                    console.log(
                        'Las credenciales ya están guardadas y son las mismas.'
                    );
                    return;
                }

                const verified = await NativeBiometric.verifyIdentity({
                    reason: 'Para un fácil inicio de sesión',
                    title: 'Inicio de Sesión',
                    subtitle: 'Coloque su dedo en el sensor.',
                    description: 'Se requiere Touch ID o Face ID',
                })
                    .then(() => true)
                    .catch(() => false);

                if (verified) {
                    // Save user's credentials
                    NativeBiometric.setCredentials({
                        username: this.loginForm.get('correo').value,
                        password: this.loginForm.get('pass').value,
                        server: 'ec.gob.esmeraldas.labella',
                    }).then();
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Falló',
                        detail: 'El biométrico',
                    });
                }
            } catch (error) {
                console.error('Error checking biometric availability:', error);
            }
        }
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
                    //console.log(response);
                    if (response.message === 'Bienvenido.') {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Verificación',
                            detail: response.message,
                        });
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
