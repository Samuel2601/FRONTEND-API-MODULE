import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FilterService } from 'src/app/demo/services/filter.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from 'src/app/demo/services/admin.service';
import { UpdateService } from 'src/app/demo/services/update.service';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { Capacitor } from '@capacitor/core';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';
import { Message, MessageService } from 'primeng/api';
import { DynamicDialogConfig, DialogService } from 'primeng/dynamicdialog';
import { NativeBiometric } from 'capacitor-native-biometric';
import { AuthService } from 'src/app/demo/services/auth.service';
@Component({
    selector: 'app-edit-usuario',
    templateUrl: './edit-usuario.component.html',
    styleUrl: './edit-usuario.component.scss',
    providers: [MessageService, DialogService],
})
export class EditUsuarioComponent implements OnInit, AfterViewInit {
    datauser: any;
    modal: boolean = true;
    editing: boolean = true;
    url = GLOBAL.url;
    constructor(
        private _route: ActivatedRoute,
        private router: Router,
        private _filterservice: FilterService,
        private adminservice: AdminService,
        private updateservice: UpdateService,
        private helper: HelperService,
        private list: ListService,
        private messageService: MessageService,
        private config: DynamicDialogConfig,
        private dialogService: DialogService,
        private auth:AuthService
    ) {}

    ngAfterViewInit(): void {}

    token: any = this.auth.token();
    id: any;
    ngOnInit(): void {
        if (this.config && this.config.data && this.config.data.id) {
            this.id = this.config.data.id;
            this.modal = true; // Si config.data.id está definido, se trata de un dialog
        } else {
            this.router.events.subscribe((val) => {
                // Verificar la ruta actual y ajustar el valor de modal
                if (this.router.url == '/maps/edit-user') {
                    this.modal = false; // Si la ruta es /maps/edit-user, modal es false
                } else {
                    this.modal = true; // En cualquier otra ruta, modal es true
                }
            });
            if (!this.token) {
                this.router.navigate(['/home']);
            }
        }

        if (!this.id) {
            this.id = this.adminservice.identity(this.token);
            this.editing = true;
        } else {
            this.editing = this.id == this.adminservice.identity(this.token);
            //console.log(this.editing,this.id, this.adminservice.identity(this.token));
        }

        this.listarRol();
        this.obteneruser(this.id);
    }

    listrol!: any[];
    listarRol() {
        this.list.listarRolesUsuarios(this.token).subscribe((response) => {
            if (response.data) {
                this.listrol = response.data;
            }
        });
    }
    isMobil() {
        return this.helper.isMobil();
    }
    messages: Message[] | undefined;
    obteneruser(id: any) {
        this._filterservice.obtenerUsuario(this.token, id).subscribe(
            (response) => {
                this.datauser = response.data;
                this.datauser.password = '';
                //console.log(this.datauser);
                if (this.datauser.password_temp != 'undefined') {
                    this.messages = [
                        {
                            severity: 'error',
                            detail: 'Por favor de cambiar su contraseña y guardar',
                        },
                    ];
                }
            },
            (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: ('(' + error.status + ')').toString(),
                    detail: error.error.message || 'Sin conexión',
                });
            }
        );
    }
    updateUser() {
        if (this.datauser.password_temp) {
            this.datauser.password_temp = undefined;
        }
        this.updateservice
            .actualizarUsuario(
                this.token,
                this.id,
                this.datauser,
                this.archivoSeleccionado
            )
            .subscribe(
                async (response) => {
                    //console.log(response);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Actualizado',
                        detail: response.message,
                    });
                    const correoCookiepass = localStorage.getItem('pass');
                    if (
                        this.helper.isMobil() &&
                        (!correoCookiepass ||
                            this.datauser.password !=
                                this.helper.decryptDataLogin(correoCookiepass))
                    ) {
                        // Realizar autenticación biométrica
                        const result = await NativeBiometric.isAvailable();
                        if (result.isAvailable) {
                            const verified =
                                await NativeBiometric.verifyIdentity({
                                    reason: 'Para un facil inicio de sesión',
                                    title: 'Inicio de Sesión',
                                    subtitle: 'Coloque su dedo en el sensor.',
                                    description:
                                        'Se requiere Touch ID o Face ID',
                                })
                                    .then(() => true)
                                    .catch(() => false);

                            if (!verified) {
                                this.messageService.add({
                                    severity: 'error',
                                    summary: '(fallo)',
                                    detail: 'Sin biometria',
                                });
                                // Si la autenticación biométrica falla, muestra un mensaje al usuario o realiza alguna acción adecuada
                                //return;
                            } else {
                                localStorage.setItem(
                                    'pass',
                                    this.helper.encryptDataLogin(
                                        this.datauser.password,
                                        'buzon'
                                    )
                                );
                            }
                        }
                    }
                    setTimeout(() => {
                        this.router.navigate(['/home']);
                    }, 500);
                },
                (error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: ('(' + error.status + ')').toString(),
                        detail: error.error.message || 'Sin conexión',
                    });
                }
            );
    }

    hover = false;
    nombreArchivo: any;
    archivoSeleccionado: File | any;

    activarHover() {
        this.hover = true;
    }

    desactivarHover() {
        this.hover = false;
    }
    load_form: boolean = false;
    onFilesSelected2(event: any): void {
        this.load_form = true;
        const files: FileList = event.target.files;
        ////console.log(files);
        if (files && files.length > 0) {
            for (let i = 0; i < Math.min(files.length, 3); i++) {
                const file = files[i];
                if (!file.type.startsWith('image/')) {
                    alert('Por favor, seleccione archivos de imagen.');
                    return;
                }
                if (file.size > 4 * 1024 * 1024) {
                    alert(
                        'Por favor, seleccione archivos de imagen que sean menores a 4MB.'
                    );
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e: any) => {
                    this.nombreArchivo = e.target.result;
                };
                reader.readAsDataURL(file);
                //console.log(file, this.nombreArchivo);
                this.archivoSeleccionado = file;
            }
        }
        setTimeout(() => {
            this.load_form = false;
        }, 1500);
    }
    onFilesSelected(event: any): void {
        this.load_form = true;
        const files: FileList = event.files;
        this.nombreArchivo = URL.createObjectURL(files[0]);
        //console.log(files);
        this.archivoSeleccionado = files[0];
        setTimeout(() => {
            this.load_form = false;
        }, 1500);
    }
}
