import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CreateActividadProyectoComponent } from '../create-actividad-proyecto/create-actividad-proyecto.component';
import { ListService } from 'src/app/demo/services/list.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { App } from '@capacitor/app';
import { EditActividadProyectoComponent } from '../edit-actividad-proyecto/edit-actividad-proyecto.component';
import { MessageService } from 'primeng/api';
import { AuthService } from 'src/app/demo/services/auth.service';
import { forkJoin } from 'rxjs';
@Component({
    selector: 'app-index-actividad-proyecto',
    templateUrl: './index-actividad-proyecto.component.html',
    styleUrl: './index-actividad-proyecto.component.scss',
    providers: [MessageService],
})
export class IndexActividadProyectoComponent implements OnInit {
    model: boolean = true;
    actividadPro: any = [];

    constructor(
        private auth: AuthService,
        private ref: DynamicDialogRef,
        private modalService: NgbModal,
        private router: Router,
        private listService: ListService,
        private helper: HelperService,
        private dialogService: DialogService,
        private messageService: MessageService
    ) {}
    cerrarModal() {
        this.modalService.dismissAll();
    }
    check: any = {};
    async ngOnInit(): Promise<void> {
        this.helper.llamarspinner('subcategoria');
        const checkObservables = {
            CreateActividadProyectoComponent:
                await this.auth.hasPermissionComponent('/actividad_proyecto', 'post'),
            EditActividadProyectoComponent:
                await this.auth.hasPermissionComponent('/actividad_proyecto', 'put'),
        };
        forkJoin(checkObservables).subscribe(async (check) => {
            this.check = check;
            console.log(check);
            try {
                this.router.events.subscribe((val) => {
                    // Verificar la ruta actual y ajustar el valor de model
                    if (this.router.url === '/create-estado-incidente') {
                        this.model = false; // Si la ruta es /create-estado-incidente, model es false
                    } else {
                        this.model = true; // En cualquier otra ruta, model es true
                    }
                });
                this.listarActividadProyecto();
            } catch (error) {
                console.error('Error en ngOnInit:', error);
                this.router.navigate(['/notfound']);
            } finally {
                this.helper.cerrarspinner('subcategoria');
            }
        });
    }
    token = this.auth.token();
    listarActividadProyecto() {
        this.listService
            .listarTiposActividadesProyecto(this.token)
            .subscribe((response) => {
                //console.log(response);
                if (response.data) {
                    this.actividadPro = response.data;
                }
            });
    }
    isMobil() {
        return this.helper.isMobil();
    }
    abrirModal() {
        this.ref = this.dialogService.open(CreateActividadProyectoComponent, {
            header: 'Nueva Actividad',
            width: this.isMobil() ? '100%' : '50%',
        });
        App.addListener('backButton', (data) => {
            this.ref.close();
        });
    }
    editRow(product: any) {
        //console.log(id);
        if (this.check.EditActividadProyectoComponent) {
            this.ref = this.dialogService.open(EditActividadProyectoComponent, {
                header: 'Editar Actividad de Ficha: ' + product.nombre,
                width: this.isMobil() ? '100%' : '50%',
                height: '300px',
                data: { id: product._id },
            });
            App.addListener('backButton', (data) => {
                this.ref.close();
            });
        } else {
            this.messageService.add({
                severity: 'error',
                summary: 'Lo sentimos',
                detail: 'No tiene permisos para esto',
            });
        }
    }
}
