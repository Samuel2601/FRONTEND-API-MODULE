import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MessageService } from 'primeng/api';
import { FilterService } from 'src/app/demo/services/filter.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { UpdateService } from 'src/app/demo/services/update.service';
import {
    DialogService,
    DynamicDialogRef,
    DynamicDialogConfig,
} from 'primeng/dynamicdialog';
import { AuthService } from 'src/app/demo/services/auth.service';
@Component({
    selector: 'app-edit-actividad-proyecto',
    templateUrl: './edit-actividad-proyecto.component.html',
    styleUrl: './edit-actividad-proyecto.component.scss',
    providers: [MessageService],
})
export class EditActividadProyectoComponent {
    id: any;
    categoria: any;
    token = this.auth.token();
    constructor(
        private obtener: FilterService,
        private update: UpdateService,
        private helper: HelperService,
        private modalService: NgbModal,
        private messageService: MessageService,
        private config: DynamicDialogConfig,
        private auth:AuthService
    ) {}

    ngOnInit(): void {
        this.id = this.config.data.id;
        this.obtenerCategoria();
    }
    loadcategoria = false;
    obtenerCategoria() {
        this.loadcategoria = false;
        this.obtener
            .obtenerTipoActividadProyecto(this.token, this.id)
            .subscribe((response) => {
                this.categoria = response.data;
                //console.log(this.categoria);
            });
        setTimeout(() => {
            this.loadcategoria = true;
        }, 500);
    }
    cerrar() {
        this.modalService.dismissAll();
    }

    updateCate() {
        this.update
            .actualizarTipoActividadProyecto(this.token, this.id, this.categoria)
            .subscribe(
                (response) => {
                    if (response.data) {
                        let data = response.data;
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Actualizado',
                            detail: data.nombre,
                        });
                        setTimeout(() => {
                            this.modalService.dismissAll();
                        }, 1000);
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
}
