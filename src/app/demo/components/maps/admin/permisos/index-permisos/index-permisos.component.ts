import { Component, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ListService } from 'src/app/demo/services/list.service';
import { CreatePermisosComponent } from '../create-permisos/create-permisos.component';
import { UpdateService } from 'src/app/demo/services/update.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { MessageService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { App } from '@capacitor/app';
import { AuthService } from 'src/app/demo/services/auth.service';
import { MultiSelect } from 'primeng/multiselect';

@Component({
    selector: 'app-index-permisos',
    templateUrl: './index-permisos.component.html',
    styleUrl: './index-permisos.component.scss',
    providers: [MessageService],
})
export class IndexPermisosComponent {
    permisos: any = [];
    clonedProducts: { [s: string]: any } = {};
    users: any;
    rolselect: string[] = [];

    constructor(
        private auth: AuthService,
        private ref: DynamicDialogRef,
        private listService: ListService,
        private updateServices: UpdateService,
        private helper: HelperService,
        private messageService: MessageService,
        private dialogService: DialogService
    ) {}

    async ngOnInit() {
        await this.listarpermisos();
        await this.listarrol();
    }
    token = this.auth.token();
    async listarpermisos() {
        this.listService
            .ListarPermisos(this.token, { populate: 'user' }, false)
            .subscribe(
                (response) => {
                    this.permisos = response.data;
                    //  console.log(this.permisos);
                },
                (error) => {
                    //console.log(error);
                }
            );
    }
    selectAll: boolean = false;
    @ViewChild('ms') ms: MultiSelect;
    onSelectAllChange(event: any, index: any) {
        if (event.checked) {
            const selectedUsers = this.ms
                .visibleOptions()
                .filter(
                    (user: any) =>
                        !this.permisos[index].user.some(
                            (u: any) => u._id === user._id
                        )
                );
            //console.log(selectedUsers, this.permisos[index].user);
            this.permisos[index].user = [
                ...this.permisos[index].user,
                ...selectedUsers,
            ];
        } else {
            this.permisos[index].user = [];
        }
        this.selectAll = event.checked;
    }
    onModelChange(event: any, index: any) {
        this.permisos[index].user = event.filter(
            (user: any, index: number, self: any[]) =>
                index === self.findIndex((u: any) => u._id === user._id)
        );
    }

    toggleUser(permiso: any, user: any) {
        if (this.checklist(permiso, user._id)) {
            this.deleterol(permiso, user._id);
        } else {
            this.addrol(permiso, user);
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
    async listarrol() {
        this.listService.listarUsuarios(this.token).subscribe((response) => {
            this.users = response.data;
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
    displayUserDialog: { [key: string]: boolean } = {};
    showAllUsersDialog(permiso: any) {
        this.displayUserDialog[permiso._id] = true;
    }

    onRowEditSave(categoria: any) {
        // Guardar los cambios de la categoría
        ////console.log('Guardar cambios de la categoría:', categoria);
        // Agregar roles seleccionados al permiso
        const token = this.auth.token();

        // Verificamos que el datatoken sea de tipo string
        if (!token || typeof token !== 'string') {
            console.error('Token inválido o no encontrado.');
            return;
        }
        categoria.user = categoria.user.map((u: any) => u._id);
        this.updateServices
            .actualizarPermisos(token, categoria._id, categoria)
            .subscribe((response) => {
                const indexToUpdate = this.permisos.findIndex(
                    (element: any) => element._id === categoria._id
                );
                if (indexToUpdate !== -1) {
                    this.permisos[indexToUpdate] = response.data;
                }
                this.messageService.add({
                    severity: 'success',
                    summary: 'Ingresado',
                    detail: response.message,
                });
            });
    }

    onRowEditCancel(categoria: any, rowIndex: number) {
        // Cancelar la edición de la categoría
        // console.log('Cancelar edición de la categoría:', categoria);
        // Restaurar la categoría a su estado original
        this.permisos[rowIndex] = this.clonedProducts[categoria._id as string];
        delete this.clonedProducts[categoria._id as string];
        //console.log('Cancelar edición de la categoría:', categoria);
    }
    imprimir(dato: any) {
        //  console.log(dato);
    }
}
