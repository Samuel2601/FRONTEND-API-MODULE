import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { AuthService } from 'src/app/demo/services/auth.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';
import { AgregarRecolectorComponent } from '../agregar-recolector/agregar-recolector.component';
import { App } from '@capacitor/app';

@Component({
    selector: 'app-listar-recolectores',
    templateUrl: './listar-recolectores.component.html',
    styleUrl: './listar-recolectores.component.scss',
    providers: [MessageService,DynamicDialogRef],
})
export class ListarRecolectoresComponent implements OnInit {
    token = this.auth.token();
    constructor(
        private list: ListService,
        private auth: AuthService,
        private helper: HelperService,
        private router: Router,
        private ref: DynamicDialogRef,
        private dialogService: DialogService
    ) {}
    ngOnInit(): void {
        this.listar_asignacion();
    }
    arr_asignacion: any[] = [];
    listar_asignacion() {
        this.list
            .listarAsignacionRecolectores(this.token, {}, false)
            .subscribe((response) => {
                if (response.data) {
                    this.arr_asignacion = response.data;
                }
            });
    }
    llamar_asignacion_Form() {
        if (this.helper.isMobil()) {
            this.router.navigate(['/register']);
        } else {
            this.ref = this.dialogService.open(AgregarRecolectorComponent, {
                header: 'Asignación de Recolectores',
                width: '50%',
            });
            App.addListener('backButton', (data) => {
                this.ref.close();
            });
        }
    }
}
