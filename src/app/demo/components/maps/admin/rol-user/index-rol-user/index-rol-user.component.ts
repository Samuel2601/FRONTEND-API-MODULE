import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';
import { DialogService, DynamicDialogRef, DynamicDialogConfig, DynamicDialogComponent  } from 'primeng/dynamicdialog';
import { Router } from '@angular/router';
import { CreateRolUserComponent } from '../create-rol-user/create-rol-user.component';
import { App } from '@capacitor/app';
import { AuthService } from 'src/app/demo/services/auth.service';
import { UpdateService } from 'src/app/demo/services/update.service';
import { PermisosDemo } from './permisos.component';
@Component({
    selector: 'app-index-rol-user',
    templateUrl: './index-rol-user.component.html',
    styleUrl: './index-rol-user.component.scss',
    providers: [DialogService]
})
export class IndexRolUserComponent implements OnInit {
    roles: any[] = [];
    clonedRoles: { [s: string]: any } = {};
    permisos: any[] = []; // Array para almacenar los permisos disponibles

    constructor(
        private listService: ListService,
        private helper: HelperService,
        private router: Router,
        private ref: DynamicDialogRef,
        private dialogService: DialogService,
        private authService: AuthService,
        private updateServices: UpdateService,
    ) {}

    ngOnInit(): void {
        this.listarRolesUsuarios();
    }

    listarRolesUsuarios(): void {
        const token = this.authService.token();
        this.listService
            .listarRolesUsuarios(token, { populate: 'permisos' }, false)
            .subscribe(
                (response) => {
                    this.roles = response.data;
                    //console.log(response.data);
                },
                (error) => {
                    console.error(error);
                }
            );
    }

    isMobile(): boolean {
        return this.helper.isMobil();
    }

    newRol(): void {
        this.ref = this.dialogService.open(CreateRolUserComponent, {
            header: 'Nuevo Rol',
            width: this.isMobile() ? '100%' : '30%',
            modal: false,
        });

        this.ref.onClose.subscribe(() => {
            this.listarRolesUsuarios();
        });
    }

    onRowEditInit(rol: any): void {
        this.clonedRoles[rol._id] = { ...rol };
    }

    onRowEditSave(rol: any): void {
        const token = this.authService.token();
        this.updateServices.actualizarRolUsuario(token, rol._id, rol).subscribe(
            (response) => {
                console.log('Rol actualizado:', response);
                // Aquí podrías manejar algún mensaje de éxito si lo deseas
            },
            (error) => {
                console.error('Error al actualizar el rol:', error);
                // Aquí podrías manejar el error y mostrar un mensaje de error al usuario
            }
        );
    }

    onRowEditCancel(rol: any, index: number): void {
        // Restaura el rol original usando el índice proporcionado
        this.roles[index] = { ...this.clonedRoles[rol._id] };
        delete this.clonedRoles[rol._id];
    }

    addPermission(rol: any): void {
        rol.permissions.push(''); // Agrega un nuevo permiso vacío al rol
    }

    removePermission(rol: any, index: number): void {
        rol.permissions.splice(index, 1); // Elimina el permiso en el índice especificado del rol
    }

    cancelEdit() {
        throw new Error('Method not implemented.');
    }
    saveRoles() {
        throw new Error('Method not implemented.');
    }

    rolSeleccionado: any;
    dialogRef: DynamicDialogRef | undefined;

    mostrarSubtablaPermisos(role: any) {
      this.rolSeleccionado = role;
      this.dialogRef = this.dialogService.open(PermisosDemo, {
        header: `Permisos del Rol: ${role.name}`,
        width: !this.isMobile()?'70vw':'100%',
        data: {
          role: role
        }
      });
      this.dialogRef.onClose.subscribe(() => {
        this.listarRolesUsuarios();
    });
    }


}
