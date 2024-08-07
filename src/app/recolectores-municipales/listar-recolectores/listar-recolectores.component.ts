import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { AuthService } from 'src/app/demo/services/auth.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';
import { AgregarRecolectorComponent } from '../agregar-recolector/agregar-recolector.component';
import { App } from '@capacitor/app';
import { UbicacionService } from '../service/ubicacion.service';
import { AgregarUbicacionRecolectoresComponent } from '../agregar-ubicacion-recolectores/agregar-ubicacion-recolectores.component';

@Component({
    selector: 'app-listar-recolectores',
    templateUrl: './listar-recolectores.component.html',
    styleUrl: './listar-recolectores.component.scss',
    providers: [MessageService, DynamicDialogRef],
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
        private ubicar: UbicacionService
    ) {}
    async ngOnInit(): Promise<void> {
        await this.fetchDevices();
    }
    devices: any[] = [];
    async fetchDevices() {
        this.ubicar.obtenerDeviceGPS().subscribe((response) => {
            console.log(response);
            this.devices = response;
            this.listar_asignacion();
        });
    }
    getDeviceGPS(id: string) {
        let nameDevice = '';
        if (this.devices.length > 0) {
            let aux = this.devices.find((element) => element.id === parseInt(id) );
            nameDevice = aux?aux.name:'No encontrado';
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
    verRuta(id:any){
        if (this.helper.isMobil()) {
            this.router.navigate(['/recolectores/register'+id]);
        } else {
            this.ref = this.dialogService.open(AgregarUbicacionRecolectoresComponent, {
                header: 'Seguimiento de ruta',
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
}
