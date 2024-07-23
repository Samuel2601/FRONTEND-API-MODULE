import { AfterViewInit, Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Message, MessageService } from 'primeng/api';
import { DynamicDialogConfig, DialogService } from 'primeng/dynamicdialog';
import { NativeBiometric } from 'capacitor-native-biometric';
import { AuthService } from 'src/app/demo/services/auth.service';
import { UpdateService } from 'src/app/demo/services/update.service';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { HelperService } from 'src/app/demo/services/helper.service';
import { FilterService } from 'src/app/demo/services/filter.service';
import { ListService } from 'src/app/demo/services/list.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from 'src/app/demo/services/admin.service';

@Component({
    selector: 'app-edit-usuario',
    templateUrl: './edit-usuario.component.html',
    styleUrls: ['./edit-usuario.component.scss'],
    providers: [MessageService, DialogService],
})
export class EditUsuarioComponent implements OnInit {
    datauser: any;
    modal: boolean = true;
    editing: boolean = true;
    url = GLOBAL.url;
    token: any;
    id: any;
    messages: Message[] = [];
    archivoSeleccionado: File | null = null;
    load_form: boolean = false;
    nombreArchivo: any;

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
        private auth: AuthService,
        private http: HttpClient
    ) {}

    ngOnInit(): void {
        // Obtener el token de autenticación
        this.token = this.auth.token();

        // Verificar si se recibe un ID a través de la configuración del diálogo
        if (this.config && this.config.data && this.config.data.id) {
            this.id = this.config.data.id;
            this.modal = true; // Si config.data.id está definido, se trata de un dialog
        } else {
            // Suscribirse a los cambios de la ruta para determinar si es un modal o no
            this.router.events.subscribe((val) => {
                this.modal = this.router.url !== '/maps/edit-user';
            });
        }

        // Si no se ha definido un ID, obtenerlo del servicio adminservice
        if (!this.id) {
            this.id = this.adminservice.identity(this.token);
            this.editing = true;
        } else {
            this.editing = this.id == this.adminservice.identity(this.token);
        }

        // Obtener la lista de roles disponibles
        this.listarRol();

        // Obtener los detalles del usuario para editar
        this.obteneruser(this.id);
    }
    listrol: any;
    listarRol(): void {
        this.list.listarRolesUsuarios(this.token).subscribe((response) => {
            if (response.data) {
                this.listrol = response.data;
            }
        });
    }

    obteneruser(id: any): void {
        this._filterservice.obtenerUsuario(this.token, id).subscribe(
            (response) => {
                this.datauser = response.data;
                //console.log(this.datauser);
                this.datauser.password = ''; // Limpiar la contraseña temporal si existe
                if (this.datauser.password_temp) {
                    this.messages = [
                        {
                            severity: 'error',
                            detail: 'Por favor cambie su contraseña y guarde.',
                        },
                    ];
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
    /*        // Construir FormData con los datos del usuario
        const formData = new FormData();
        console.log(this.datauser);

        for (const key in this.datauser) {
            if (Object.prototype.hasOwnProperty.call(this.datauser, key)) {
                const element = this.datauser[key];
                if (element == undefined || element == null || element == '') {
                    delete this.datauser[key];
                }
            }
        }

         */
    updateUser(): void {
        // Limpiar la contraseña temporal si existe
        if (this.datauser.password_temp) {
            this.datauser.password_temp = '';
        }
        this.datauser.role = this.datauser.role._id;
        if (this.datauser.password === '' || this.datauser.password === undefined || this.datauser.password === null) {
            delete this.datauser.password;
        }
        
        // Realizar la solicitud de actualización utilizando el servicio de actualización
        this.updateservice
            .actualizarUsuario(
                this.token,
                this.id,
                this.datauser,
                this.archivoSeleccionado
            )
            .subscribe(
                async (response) => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Actualizado',
                        detail: response.message,
                    });

                    // Si es dispositivo móvil y la contraseña cambió, realizar autenticación biométrica
                    const correoCookiepass = localStorage.getItem('pass');
                    if (
                        this.helper.isMobil() &&
                        (!correoCookiepass ||
                            this.datauser.password !==
                                this.helper.decryptDataLogin(correoCookiepass))
                    ) {
                        const result = await NativeBiometric.isAvailable();
                        if (result.isAvailable) {
                            const verified =
                                await NativeBiometric.verifyIdentity({
                                    reason: 'Para un fácil inicio de sesión',
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
                                    detail: 'Sin biometría',
                                });
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
                    const currentUrl = this.router.url;
                    // Redirigir a la página de inicio después de actualizar
                    setTimeout(() => {
                        // Si no estamos en /maps/administracion, redirigir a /home
                        if (!currentUrl.startsWith('/maps/administracion')) {
                            this.router.navigate(['/home']);
                        }
                    }, 500);
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
    }

    onFilesSelected(event: any): void {
        this.load_form = true;
        const files: FileList = event.files;
        this.nombreArchivo = URL.createObjectURL(files[0]);
        this.archivoSeleccionado = files[0];
        setTimeout(() => {
            this.load_form = false;
        }, 1500);
    }
}
