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
        private auth:AuthService
    ) {
        this.loginForm = this.formBuilder.group({
            correo: ['', [
                Validators.required,
                Validators.pattern('[a-z0-9._%+-]+@[a-z0-9.-]+.[a-z]{2,3}$'),
                Validators.maxLength(50),
            ]],
            pass: ['', [
                Validators.required,
                Validators.minLength(8),
                Validators.maxLength(30),
            ]],
            save: [true],
        });

        this.removeWhitespaceFromEmail();
    }
    IsMobil(){
        return this.helper.isMobil();
    }

    ngOnInit(): void {
        this.helper.llamarspinner('login');
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

    private removeWhitespaceFromEmail(): void {
        this.loginForm.get('correo').valueChanges.subscribe(value => {
            const correoSinEspacios = value.replace(/\s/g, '').toLowerCase();
            this.loginForm.patchValue({ correo: correoSinEspacios }, { emitEvent: false });
        });
    }

    private async playIntroAudio(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.sound.on('end', () => {
                resolve();
            });
            this.sound.play();
        });
    }

    private handleQueryParams() {
        this.route.queryParams.subscribe(async params => {
            const token = params['token'];
            if (token) {
                await this.guardarToken(token);
                this.storeUserData(this.auth.authToken(token));
                this.rederict();
                console.log("envio home");
            }
            if (params['correo'] && params['password']) {
                this.loginForm.setValue({ correo: params['correo'], pass: params['password'] });
            }
        });
    }

    private setHeight(): void {
        this.height = window.innerHeight;
    }

    private loadUserData(): void {
        this.nombreUsuario = this.helper.decryptDataLogin(this.helper.isMobil()
            ? localStorage.getItem('nombreUsuario')
            : this.cookieService.get('nombreUsuario')
        );
        this.fotoUsuario = this.helper.decryptDataLogin(this.helper.isMobil()
            ? localStorage.getItem('fotoUsuario')
            : this.cookieService.get('fotoUsuario')
        );
        this.callBiometrico();
    }

    async callBiometrico(): Promise<void> {
        const correoCookieuser = this.getCookieOrLocalStorage('correo');
        const correoCookiepass = this.getCookieOrLocalStorage('pass');

        if (correoCookieuser) {
            try {
                const correoDesencriptado = this.helper.decryptDataLogin(correoCookieuser);
                this.loginForm.get('correo').setValue(correoDesencriptado);

                if (this.helper.isMobil() && correoCookiepass) {
                    const result = await NativeBiometric.isAvailable();
                    if (result.isAvailable) {
                        const verified = await NativeBiometric.verifyIdentity({
                            reason: 'Para un fácil inicio de sesión',
                            title: 'Inicio de Sesión',
                            subtitle: 'Coloque su dedo en el sensor.',
                            description: 'Se requiere Touch ID o Face ID',
                        }).catch(() => false);

                        if (verified) {
                            const passDesencriptado = this.helper.decryptDataLogin(correoCookiepass);
                            this.loginForm.get('pass').setValue(passDesencriptado);
                            this.postLogin();
                        }
                    }
                }
            } catch (error) {
                console.error('Error al desencriptar el correo:', error);
            }
        }
    }

    private getCookieOrLocalStorage(key: string): string {
        return this.helper.isMobil() ? localStorage.getItem(key) : this.cookieService.get(key);
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
                    this.storeUserData(this.auth.authToken(response.data.token));
                    this.navigateAfterLogin(response.data.passwordChange);
                    this.rederict();
                } else if (response.message) {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Verificación',
                        detail: response.message,
                    });
                    setTimeout(() => this.visible = true, 500);
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
            this.storeEncryptedData('nombreUsuario', data.nombres?data.nombres:data.name+' '+data.last_name);
            this.storeEncryptedData('fotoUsuario', data.foto?data.foto:data.photo);
            this.storeEncryptedData('correo', data.email);
        }
    }

    private storeEncryptedData(key: string, value: string): void {
        const encryptedValue = this.helper.encryptDataLogin(value, 'labella');
        if (this.helper.isMobil()) {
            localStorage.setItem(key, encryptedValue);
        } else {
            this.cookieService.set(key, encryptedValue);
        }
    }

    private async navigateAfterLogin(hasPassword: boolean): Promise<void> {
        this.messageService.add({
            severity: 'success',
            summary: 'Ingreso',
            detail: 'Bienvenido',
        });

        const pass = this.loginForm.get('pass').value;
        const storedPass = this.helper.decryptDataLogin(this.getCookieOrLocalStorage('pass'));
        
        if (this.helper.isMobil() && pass !== storedPass) {
            const result = await NativeBiometric.isAvailable();
            if (result.isAvailable) {
                const verified = await NativeBiometric.verifyIdentity({
                    reason: 'Para un fácil inicio de sesión',
                    title: 'Inicio de Sesión',
                    subtitle: 'Coloque su dedo en el sensor.',
                    description: 'Se requiere Touch ID o Face ID',
                }).catch(() => false);

                if (verified) {
                    localStorage.setItem('pass', this.helper.encryptDataLogin(pass, 'buzon'));
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Falló',
                        detail: 'Sin biometría',
                    });
                }
            }
        }  
        this.rederict(hasPassword);     
    }
    private rederict(hasPassword?:boolean){
        this.auth.inicialityPermiss();

        setTimeout(() => {
            this.router.navigate([hasPassword ? '/maps/edit-user' : '/home']);
        }, 3000);
    }

    private handleLoginError(error: any): void {
        this.messageService.add({
            severity: 'error',
            summary: `(${error.status})`,
            detail: error.error.message || 'Sin conexión',
        });
    }

    verifiCode(): void {
        this.authService.validcode({
            email: this.loginForm.get('correo').value,
            codigo: this.codevalid,
        }).subscribe(
            async response => {
                console.log(response);
                if (response.message === 'Bienvenido.') {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Verificación',
                        detail: response.message,
                    });
                    await this.guardarToken(response.data.token);
                    this.storeUserData(this.auth.authToken(response.data.token));
                    setTimeout(() => this.visible = false, 500);
                    this.rederict();
                }
            },
            error => {
                this.messageService.add({
                    severity: 'error',
                    summary: `(${error.status})`,
                    detail: error.error.message || 'Sin conexión',
                });
            }
        );
    }

    async guardarToken(token: string) {
        const storage = this.loginForm.get('save').value ? localStorage : sessionStorage;        
        storage.setItem('token', token);

        const idUser=this.auth.idUserToken(token);
        storage.setItem('idUser', idUser);
    }

    guardarFoto(foto: string): void {
        if (foto) {
            const storage = this.loginForm.get('save').value ? localStorage : sessionStorage;
            storage.setItem('foto', foto);
        }
    }

    guardarNombreUsuario(nombre: string): void {
        if (nombre) {
            const storage = this.loginForm.get('save').value ? localStorage : sessionStorage;
            storage.setItem('nombreUsuario', nombre);
        }
    }

    loginWithGoogle() {
        this.authService.loginWithGoogle();
    }
}
