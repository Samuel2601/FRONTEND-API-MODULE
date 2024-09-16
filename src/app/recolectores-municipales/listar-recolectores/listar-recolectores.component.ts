import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { AuthService } from 'src/app/demo/services/auth.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';
import { AgregarRecolectorComponent } from '../agregar-recolector/agregar-recolector.component';
import { App } from '@capacitor/app';
import { UbicacionService } from '../service/ubicacion.service';
import { AgregarUbicacionRecolectoresComponent } from '../agregar-ubicacion-recolectores/agregar-ubicacion-recolectores.component';
import { DeleteService } from 'src/app/demo/services/delete.service';
import { GLOBAL } from '../../demo/services/GLOBAL';
import { FilterService } from 'src/app/demo/services/filter.service';

@Component({
    selector: 'app-listar-recolectores',
    templateUrl: './listar-recolectores.component.html',
    styleUrl: './listar-recolectores.component.scss',
    providers: [
        ConfirmationService,
        MessageService,
        DynamicDialogRef,
        DialogService,
    ],
})
export class ListarRecolectoresComponent implements OnInit {
    token = this.auth.token();
    public url: string;
    constructor(
        private list: ListService,
        private auth: AuthService,
        private helper: HelperService,
        private router: Router,
        private ref: DynamicDialogRef,
        private dialogService: DialogService,
        private ubicar: UbicacionService,
        private deleteservice: DeleteService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private filterservice: FilterService
    ) {
        this.auth.permissions$.subscribe((permissions) => {
            if (permissions.length > 0) {
                this.permisos_arr = permissions;
            }
            this.loadPermissions(); // Llama a loadPermissions cuando hay cambios en los permisos
        });
        this.url = GLOBAL.url;
    }
    permisos_arr: any[] = [];
    async boolPermiss(permission: any, method: any) {
        const hasPermissionBOL =
            this.permisos_arr.length > 0
                ? this.permisos_arr.some(
                      (e) => e.name === permission && e.method === method
                  )
                : false;
        return hasPermissionBOL;
    }
    check_create: boolean = false;
    deleteRegister: boolean = false;

    async loadPermissions() {
        this.check_create =
            (await this.boolPermiss('/recolector/:id', 'get')) || false;
        this.deleteRegister =
            (await this.boolPermiss('/recolector/:id', 'delete')) || false;
    }

    async ngOnInit(): Promise<void> {
        await this.fetchDevices();
        this.listar_asignacion();
    }
    devices: any[] = [];
    async fetchDevices() {
        this.ubicar.obtenerDeviceGPS().subscribe((response) => {
            const aux = response.map((e) => {
                return { id: e.id, name: e.name, plate: e.plate, capacidad: 0 };
            });
            this.devices = response;
        });
    }
    getDeviceGPS(id: string) {
        let nameDevice = '';
        if (this.devices.length > 0) {
            let aux = this.devices.find(
                (element) => element.id === parseInt(id)
            );
            nameDevice = aux ? aux.name : 'No encontrado';
        } else {
            nameDevice = id;
        }
        return nameDevice;
    }
    arr_asignacion: any[] = [];
    load_list: boolean = true;
    listar_asignacion() {
        this.load_list = true;
        this.list
            .listarAsignacionRecolectores(this.token, {}, true)
            .subscribe((response) => {
                if (response.data) {
                    this.arr_asignacion = response.data;
                }
                console.log(this.arr_asignacion);
                this.load_list = false;
            });
    }
    calculateTimeDifference(startTime: Date, endTime: Date): string {
        // Obtener la diferencia en milisegundos
        const difference =
            new Date(endTime).getTime() - new Date(startTime).getTime();

        // Convertir la diferencia a horas, minutos y segundos
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor(
            (difference % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        // Formatear en HH:mm:ss
        const formattedHours = hours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');
        //const formattedSeconds = seconds.toString().padStart(2, '0');

        return `${formattedHours}H:${formattedMinutes}`;
    }
    llamar_asignacion_Form() {
        if (this.helper.isMobil()) {
            this.router.navigate(['/recolectores/register']);
        } else {
            this.ref = this.dialogService.open(AgregarRecolectorComponent, {
                header: 'Asignación de Recolectores',
                width: '30%',
            });
            App.addListener('backButton', (data) => {
                this.ref.close();
            });
            this.ref.onClose.subscribe((result: any) => {
                if (result) {
                    this.listar_asignacion();
                }
            });
        }
    }
    verRuta(register: any) {
        if (this.helper.isMobil()) {
            this.router.navigate(['/recolectores/map/' + register._id]);
        } else {
            this.ref = this.dialogService.open(
                AgregarUbicacionRecolectoresComponent,
                {
                    header:
                        'Seguimiento de ruta del vehiculo: ' +
                        this.getDeviceGPS(register.deviceId) +
                        ' a cargo de: ' +
                        (register.externo
                            ? register.externo.name
                            : register.funcionario.name +
                              ' ' +
                              register.funcionario.last_name),
                    width: '90vw',
                    data: { id: register._id },
                }
            );
            App.addListener('backButton', (data) => {
                this.ref.close();
            });
            /*this.ref.onClose.subscribe(() => {
                this.listar_asignacion();
            });*/
        }
    }
    confirm(event: Event, register: any) {
        this.filterservice
            .obtenerRutaRecolector(this.token, register._id)
            .subscribe((response) => {
                // Verificar si han pasado más de 30 minutos desde la creación del registro
                const now = new Date();
                const createdAt = new Date(response.data.createdAt); // Asumiendo que 'register.date' es la fecha de creación
                const diffInMinutes =
                    (now.getTime() - createdAt.getTime()) / 60000;

                if (diffInMinutes > 30) {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Error',
                        detail: 'No se puede eliminar. Han pasado más de 30 minutos desde la creación.',
                        life: 3000,
                    });
                    return; // Cancelamos la eliminación si han pasado más de 30 minutos
                }

                const puntosRecoleccion = response.data.puntos_recoleccion;

                // Verificar que 'puntos_recoleccion.length' no sea mayor a 0
                if (puntosRecoleccion.length > 0) {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Error',
                        detail: 'No se puede eliminar. Hay puntos de recolección registrados.',
                        life: 3000,
                    });
                    return; // Cancelamos la eliminación si hay puntos de recolección
                }

                // Si las dos condiciones se cumplen, mostramos el diálogo de confirmación
                this.confirmationService.confirm({
                    target: event.target as EventTarget,
                    header: 'Eliminación de registro',
                    message:
                        'Confirma la eliminación: ' +
                        register.dateOnly +
                        '/' +
                        this.getDeviceGPS(register.deviceId) +
                        '/' +
                        (register.externo
                            ? register.externo.name
                            : register.funcionario.name +
                              ' ' +
                              register.funcionario.last_name),
                    icon: 'pi pi-exclamation-circle',
                    acceptIcon: 'pi pi-check mr-1',
                    rejectIcon: 'pi pi-times mr-1',
                    acceptLabel: 'Aceptar',
                    rejectLabel: 'Cancelar',
                    rejectButtonStyleClass: 'p-button-outlined p-button-sm',
                    acceptButtonStyleClass: 'p-button-sm',
                    accept: () => {
                        this.removeRegister(register);
                    },
                    reject: () => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Cancelación',
                            detail: 'Se canceló la eliminación.',
                            life: 3000,
                        });
                    },
                });
            });
    }

    removeRegister(register: any) {
        this.deleteservice
            .RemoveRecolectores(this.token, register._id)
            .subscribe(
                (response) => {
                    if (response.data) {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Eliminación',
                            detail:
                                'Asignación: ' +
                                register.dateOnly +
                                ' eliminada.',
                        });
                        this.listar_asignacion();
                    }
                },
                (erro) => {
                    console.error(erro);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'ERROR',
                        detail: 'Ocurrio algo malo al eliminar el registro.',
                    });
                }
            );
    }

    register: any;
    capacidadOpciones = [
        { label: 'Lleno', value: 'Lleno' },
        { label: 'Medio', value: 'Medio' },
        { label: 'Vacío', value: 'Vacío' },
    ];

    showoverlay(regi: any) {
        regi.puntos_recoleccion = regi.puntos_recoleccion.filter(
            (e) => e.retorno === true
        );
        this.register = regi;
    }
    isMobil() {
        return this.helper.isMobil();
    }
    updateCapacidad(register: any) {
        /*register.capacidad_retorno = register.capacidad_retorno.map(
            (element: any) => element.value
        );*/
        const token = this.auth.token();

        // Verificamos que el datatoken sea de tipo string
        if (!token || typeof token !== 'string') {
            console.error('Token inválido o no encontrado.');
            return;
        }

        this.ubicar
            .updateRutaRecolector(token, register._id, {
                capacidad_retorno: register.capacidad_retorno,
            })
            .subscribe(
                (response) => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Actualización',
                        detail: 'Retorno Actualizado',
                    });
                    //console.log(response);
                },
                (error) => {
                    console.error(error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'ERROR',
                        detail: 'Ocurrio algo malo al eliminar el registro.',
                    });
                }
            );
    }
    visible: boolean = false;
    viewregister: any;

    getBadgeValue(product: any): number | null {
        const arr_capcidad =
            product.capacidad_retorno.filter((e: any) => e.value) || [];
        const capacidadRetornoLength = arr_capcidad.length || 0;
        const puntos_retornos =
            product.puntos_recoleccion.filter((e: any) => e.retorno === true) ||
            [];
        const puntosRecoleccionLength = puntos_retornos.length || 0;
        const difference = puntosRecoleccionLength - capacidadRetornoLength;

        return difference > 0 ? difference : null;
    }

    displayBasic: boolean = false;
    imagenModal: any;
    responsiveOptions: any[] = [
        {
            breakpoint: '1500px',
            numVisible: 5,
        },
        {
            breakpoint: '1024px',
            numVisible: 3,
        },
        {
            breakpoint: '768px',
            numVisible: 2,
        },
        {
            breakpoint: '560px',
            numVisible: 1,
        },
    ];
    onAvatarClick(event: Event, photo: string | undefined): void {
        // Detener la propagación del evento click
        event.stopPropagation();

        // Tu lógica para abrir el modal y asignar la imagen
        this.displayBasic = true;
        this.imagenModal = [this.url + 'obtener_imagen/usuario/' + photo];
    }
}
