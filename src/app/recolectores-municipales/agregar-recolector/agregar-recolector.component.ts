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
import { FilterService } from '../../demo/services/filter.service';
import { DeleteService } from 'src/app/demo/services/delete.service';

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
    externos: any[] = [];
    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private ubicar: UbicacionService,
        private list: ListService,
        private auth: AuthService,
        private helper: HelperService,
        private create: CreateService,
        private router: Router, // Inyecta Router para redirección,
        private filterser: FilterService,
        private deleteser: DeleteService,
        @Optional() public ref: DynamicDialogRef // Inyecta DynamicDialogConfig para acceder a la configuración del diálogo
    ) {
        this.formulario = this.fb.group({
            funcionario: [null],
            externo: [null],
            isExterno: [false], // El valor por defecto es Funcionario
            deviceId: [null, Validators.required],
            externo_register: this.fb.group({
                name: [''],
                dni: [''],
                phone: [''],
                address: [''],
            }),
        });
    }
    isMobil() {
        return this.helper.isMobil();
    }
    token = this.auth.token();
    async ngOnInit() {
        await this.fetchFuncionarios();
        await this.fetchDevices();
        await this.listarExterno();
    }
    getCiudadano() {
        this.filterser
            .getciudadano(this.formulario.get('externo_register').value.dni)
            .subscribe(
                (response: any) => {
                    console.log(response);
                    if (response.nombres) {
                        this.formulario
                            .get('externo_register')
                            .get('name')
                            .setValue(response.nombres);
                    }
                },
                (error) => {
                    console.error(error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Algo salio mal',
                        detail: 'Parece no estar en nuestros registros',
                    });
                }
            );
    }
    async listarExterno() {
        this.list.listarRecolectorExterno(this.token).subscribe((response) => {
            console.log(response);
            this.externos = response.data;
        });
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
            .listarAsignacionRecolectores(
                this.token,
                { dateOnly, populate: 'externo' },
                false
            )
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
                            (element) => element.id != element_data.deviceId
                        );
                        if (element_data.externo) {
                            this.externos = this.externos.filter(
                                (e) => e.dni != element_data.externo.dni
                            );
                        }
                        /* console.log(this.devices.filter(
                            (element) => element.id != element_data.deviceId
                        ));*/
                    });
                }
            });
    }
    ondeleteExterno(id: string) {
        this.deleteser
            .RemoveRecolectoresExterno(this.token, id)
            .subscribe((response) => {
                console.log(response);
            });
    }

    onSubmit() {
        if (this.formulario.valid) {
            console.log(this.formulario.get('funcionario').value);
            if (this.formulario.get('funcionario').value) {
                this.formulario
                    .get('funcionario')
                    .setValue(this.formulario.get('funcionario').value._id);
            }

            this.formulario
                .get('deviceId')
                .setValue(this.formulario.get('deviceId').value.id);

            if (this.formulario.get('isExterno').value) {
                console.log(this.formulario.get('externo_register').value);
                this.create
                    .registrarRecolectorExterno(
                        this.token,
                        this.formulario.get('externo_register').value
                    )
                    .subscribe(
                        (response) => {
                            console.log(response);
                            this.formulario
                                .get('externo')
                                .setValue(response.data._id);
                            this.registrar_asignacion();
                        },
                        (error) => {
                            console.error(error);
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Algo salio mal',
                                detail: 'No se pudo crear al chofer externo',
                            });
                        }
                    );
            } else {
                this.registrar_asignacion();
            }
        } else {
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario Inválido',
                detail: 'Por favor, completa todos los campos.',
            });
        }
    }
    registrar_asignacion() {
        this.create
            .registrarAsignacionReolectores(this.token, this.formulario.value)
            .subscribe(
                (response) => {
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
                },
                (error) => {
                    console.error(error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Algo salio mal',
                        detail: 'No se pudo crear al chofer externo',
                    });
                }
            );
    }
}
