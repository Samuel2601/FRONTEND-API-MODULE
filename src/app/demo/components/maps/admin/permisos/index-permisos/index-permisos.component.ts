import { Component } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ListService } from 'src/app/demo/services/list.service';
import { CreatePermisosComponent } from '../create-permisos/create-permisos.component';
import { UpdateService } from 'src/app/demo/services/update.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { MessageService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { App } from '@capacitor/app';
import { AuthService } from 'src/app/demo/services/auth.service';

@Component({
    selector: 'app-index-permisos',
    templateUrl: './index-permisos.component.html',
    styleUrl: './index-permisos.component.scss',
    providers: [MessageService],
})
export class IndexPermisosComponent {
    permisos: any = [];
    clonedProducts: { [s: string]: any } = {};
    roles: any;
    rolselect: string[] = [];

    constructor(
        private auth: AuthService,
        private ref: DynamicDialogRef,
        private listService: ListService,
        private modalService: NgbModal,
        private updateServices: UpdateService,
        private helper: HelperService,
        private messageService: MessageService,
        private dialogService: DialogService
    ) {}

    ngOnInit(): void {
        this.listarpermisos();
        this.listarrol();
    }
    token = this.auth.token();
    listarpermisos(): void {
        this.listService.ListarPermisos(this.token).subscribe(
            (response) => {
                this.permisos = response.data;
                ////console.log(response.data);
            },
            (error) => {
                //console.log(error);
            }
        );
    }
    toggleRol(permiso: any, rol: any) {
        if (this.checklist(permiso, rol._id)) {
            this.deleterol(permiso, rol._id);
        } else {
            this.addrol(permiso, rol);
        }
    }
    checklist(permiso: any, id: any): boolean {
        return (
            permiso.rolesPermitidos.find(
                (element: any) => element._id === id
            ) !== undefined
        );
    }

    addrol(permiso: any, rol: any) {
        permiso.rolesPermitidos.push(rol);
        ////console.log(permiso);
    }

    deleterol(permiso: any, rolId: any) {
        const index = permiso.rolesPermitidos.findIndex(
            (rol: any) => rol._id === rolId
        );
        if (index !== -1) {
            permiso.rolesPermitidos.splice(index, 1);
        }
        ////console.log(permiso);
    }
    listarrol() {
        this.listService
            .listarRolesUsuarios(this.token)
            .subscribe((response) => {
                this.roles = response.data;
            });
    }
    isMobil() {
        return this.helper.isMobil();
    }
    newpermiso() {
        this.ref = this.dialogService.open(CreatePermisosComponent, {
            header: 'Crear nuevo Permiso',
            width: this.isMobil() ? '100%' : '40%',
        });

        App.addListener('backButton', (data) => {
            this.ref.close();
        });
        this.ref.onClose.subscribe((data) => {
            if (data) {
                this.listarpermisos();
            }
        });
    }

    editCategoriaId: any | null = null;
    onRowEditInit(categoria: any) {
        this.clonedProducts[categoria._id as string] = { ...categoria };
        // Iniciar la edición de la categoría
        ////console.log('Iniciar edición de la categoría:', categoria);
    }

    onRowEditSave(categoria: any) {
        // Guardar los cambios de la categoría
        ////console.log('Guardar cambios de la categoría:', categoria);
        // Agregar roles seleccionados al permiso
        this.updateServices
            .actualizarPermisos(this.token, categoria._id, categoria)
            .subscribe((response) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Ingresado',
                    detail: response.message,
                });
            });
    }

    onRowEditCancel(categoria: any, rowIndex: number) {
        // Cancelar la edición de la categoría
        ////console.log('Cancelar edición de la categoría:', categoria);
    }

    verSubcategorias(categoria: any) {
        // Lógica para ver las subcategorías
    }

    confirmarEliminacion(categoria: any) {
        //console.log('Eliminar la categoría:', categoria);
    }
    verDetalles(permiso: any) {
        // Implementa aquí la lógica para mostrar los detalles del permiso
        //console.log('Detalles del permiso:', permiso);
    }
}
