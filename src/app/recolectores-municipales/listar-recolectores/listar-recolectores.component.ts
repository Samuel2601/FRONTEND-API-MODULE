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
        private confirmationService: ConfirmationService
    ) {}
    async ngOnInit(): Promise<void> {
        await this.fetchDevices();
    }
    devices: any[] = [];
    async fetchDevices() {
        this.ubicar.obtenerDeviceGPS().subscribe((response) => {
            //console.log(response);
            this.devices = response;
            this.listar_asignacion();
        });
    }
    getDeviceGPS(id: string) {
        let nameDevice = '';
        if (this.devices.length > 0) {
            let aux = this.devices.find(
                (element) => element.id === parseInt(id)
            );
            nameDevice = aux ? aux.name : 'No encontrado';
        }
        return nameDevice;
    }
    arr_asignacion: any[] = [];
    listar_asignacion() {
        this.list
            .listarAsignacionRecolectores(this.token, {}, true)
            .subscribe((response) => {
                if (response.data) {
                    this.arr_asignacion = response.data;
                    console.log(this.arr_asignacion);
                }
            });
    }
    llamar_asignacion_Form() {
        if (this.helper.isMobil()) {
            this.router.navigate(['/recolectores/register']);
        } else {
            this.ref = this.dialogService.open(AgregarRecolectorComponent, {
                header: 'Asignación de Recolectores',
                width: '50%',
            });
            App.addListener('backButton', (data) => {
                this.ref.close();
            });
            this.ref.onClose.subscribe(() => {
                this.listar_asignacion();
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
                        register.funcionario.name +
                        ' ' +
                        register.funcionario.last_name,
                    width: '90vw',
                    data: { id: register._id },
                }
            );
            App.addListener('backButton', (data) => {
                this.ref.close();
            });
            this.ref.onClose.subscribe(() => {
                this.listar_asignacion();
            });
        }
    }
    confirm(event: Event, register: any) {
        this.confirmationService.confirm({
            target: event.target as EventTarget,
            header: 'Eliminación de registro',
            message:
                'Confirma la eliminación: ' +
                register.dateOnly +
                '/' +
                this.getDeviceGPS(register.deviceId) +
                '/' +
                register.funcionario.name +
                ' ' +
                register.funcionario.last_name,
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
                    detail: 'Se cancelo la eliminación.',
                    life: 3000,
                });
            },
        });
    }

    removeRegister(register: any) {
        this.deleteservice
            .RemoveRecolectores(this.token, register._id)
            .subscribe(
                (response) => {
                    console.log(response);
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
        this.register=regi.puntos_recoleccion.filter(e => e.retorno === true);
    }
    isMobil(){
        return this.helper.isMobil();
    }
}
