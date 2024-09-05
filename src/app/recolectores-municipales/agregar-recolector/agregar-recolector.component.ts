import { Component, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { UbicacionService } from '../service/ubicacion.service';
import { ListService } from 'src/app/demo/services/list.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { CreateService } from 'src/app/demo/services/create.service';
import { Router } from '@angular/router';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { filter } from 'rxjs';

@Component({
    selector: 'app-agregar-recolector',
    templateUrl: './agregar-recolector.component.html',
    styleUrl: './agregar-recolector.component.scss',
    providers: [DynamicDialogConfig],
})
export class AgregarRecolectorComponent {
    formulario: FormGroup;
    funcionarios: any[] = [];
    devices: any[] = [];
    selectedFuncionario: any;
    selectedDevice: any;

    isExterno = false; // Controla si se seleccionó Externo
    showExternoForm = false; // Controla la visibilidad del formulario de Externo
    externos:any[] = [];
    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private ubicar: UbicacionService,
        private list: ListService,
        private auth: AuthService,
        private helper: HelperService,
        private create: CreateService,
        private router: Router, // Inyecta Router para redirección
        @Optional() public ref: DynamicDialogRef // Inyecta DynamicDialogConfig para acceder a la configuración del diálogo
    ) {
        this.formulario = this.fb.group({
            funcionario: [null],
            externo: [null],
            isExterno: [false], // El valor por defecto es Funcionario
            deviceId: [null, Validators.required],
            externoName: [''],
            externoDni: [''],
            externoPhone: [''],
            externoAddress: [''],
        });
    }
    isMobil() {
        return this.helper.isMobil();
    }
    token = this.auth.token();
    async ngOnInit() {
        await this.fetchFuncionarios();
        await this.fetchDevices();
    }

    async fetchFuncionarios() {
        this.list
            .listarUsuarios(this.token, { role: '66bb7b1fcc9232a17ce931d9' }) //"65c505bc9c664a1238b47f1a" FUNCIONARIO
            .subscribe((response) => {
                //console.log(response);
                if (response.data) {
                    this.funcionarios = response.data.map((funcionario) => ({
                        ...funcionario,
                        fullName: `${funcionario.name} ${funcionario.last_name}`,
                    }));
                }
            });
    }

    async fetchDevices() {
        this.ubicar.obtenerDeviceGPS().subscribe(async (response) => {
            //console.log(response);
            this.devices = response.filter((e) => e.status == 'online');
            await this.checkExistingRegistrations();
        });
    }

    async checkExistingRegistrations() {
        const today = new Date();
        const dateOnly = `${today.getFullYear()}-${
            today.getMonth() + 1
        }-${today.getDate()}`;
        this.list
            .listarAsignacionRecolectores(this.token, { dateOnly }, false)
            .subscribe((response) => {
                // console.log(response);
                const data: any[] = response.data || [];
                if (data.length > 0) {
                    data.forEach((element_data) => {
                        this.funcionarios = this.funcionarios.filter(
                            (element) =>
                                element._id !== element_data.funcionario
                        );
                        this.devices = this.devices.filter(
                            (element) => element.id != element_data.deviceId
                        );
                        /* console.log(this.devices.filter(
                            (element) => element.id != element_data.deviceId
                        ));*/
                    });
                }
            });
    }

    onSubmit() {
        if (this.formulario.valid) {
            this.formulario
                .get('funcionario')
                .setValue(this.formulario.get('funcionario').value._id);
            this.formulario
                .get('deviceId')
                .setValue(this.formulario.get('deviceId').value.id);
            //console.log(this.formulario.value);
            this.create
                .registrarAsignacionReolectores(
                    this.token,
                    this.formulario.value
                )
                .subscribe((response) => {
                    //console.log(response);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Registro',
                        detail: 'Asignación Completada.',
                    });
                    if (!this.isMobil()) {
                        // Si es móvil, cierra el diálogo
                        this.ref.close(true); // Usa `ref` de DynamicDialogConfig
                    } else {
                        // Si no es móvil, redirige a /recolectores/listar
                        this.router.navigate(['/recolectores/listar']);
                    }
                });
        } else {
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario Inválido',
                detail: 'Por favor, completa todos los campos.',
            });
        }
    }
}
