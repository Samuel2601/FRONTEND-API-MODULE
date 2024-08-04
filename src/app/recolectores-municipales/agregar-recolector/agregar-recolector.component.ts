import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { UbicacionService } from '../service/ubicacion.service';
import { ListService } from 'src/app/demo/services/list.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { HelperService } from 'src/app/demo/services/helper.service';

@Component({
    selector: 'app-agregar-recolector',
    templateUrl: './agregar-recolector.component.html',
    styleUrl: './agregar-recolector.component.scss',
})
export class AgregarRecolectorComponent {
    formulario: FormGroup;
    funcionarios: any[] = [];
    devices: any[] = [];
    selectedFuncionario: any;
    selectedDevice: any;

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private ubicar: UbicacionService,
        private list: ListService,
        private auth: AuthService,
        private helper: HelperService
    ) {
        this.formulario = this.fb.group({
            funcionario: [null, Validators.required],
            deviceId: [null, Validators.required],
        });
    }
    isMobil(){
        return this.helper.isMobil();
    }
    token = this.auth.token();
    ngOnInit(): void {
        this.fetchFuncionarios();
        this.fetchDevices();
       // this.checkExistingRegistrations();
    }

    fetchFuncionarios() {
        this.list
            .listarUsuarios(this.token,{role:"65c505bc9c664a1238b47f1a"})
            .subscribe((response) => {
                console.log(response);
                if (response.data) {
                    this.funcionarios = response.data.map(funcionario => ({
                      ...funcionario,
                      fullName: `${funcionario.name} ${funcionario.last_name}`
                  }));
                }
            });
    }

    fetchDevices() {
        this.ubicar.obtenerDeviceGPS().subscribe((response) => {
            console.log(response);
            this.devices = response;
        });
    }

    checkExistingRegistrations() {
        const today = new Date();
        const dateOnly = `${today.getFullYear()}-${
            today.getMonth() + 1
        }-${today.getDate()}`;
        this.list
            .listarAsignacionRecolectores(this.token, { dateOnly }, false)
            .subscribe((response) => {
                console.log(response);
                const data: any[] = response.data || [];
                if (data.length > 0) {
                    data.forEach((element_data) => {
                        this.funcionarios = this.funcionarios.filter(
                            (element) =>
                                element._id !== element_data.funcionario
                        );
                        this.devices = this.devices.filter(
                            (element) => element.id !== element_data.deviceId
                        );
                    });
                }
            });
    }

    onSubmit() {
        if (this.formulario.valid) {
        } else {
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario Inválido',
                detail: 'Por favor, completa todos los campos.',
            });
        }
    }
}
