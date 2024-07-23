import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import {
    DialogService,
    DynamicDialogConfig,
    DynamicDialogRef,
} from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { AuthService } from 'src/app/demo/services/auth.service';
import { ListService } from 'src/app/demo/services/list.service';
import { DragDropModule } from 'primeng/dragdrop';
import { CommonModule } from '@angular/common';
import { HelperService } from 'src/app/demo/services/helper.service';
import { UpdateService } from 'src/app/demo/services/update.service';

@Component({
    providers: [DialogService],
    standalone: true,
    imports: [CommonModule, TableModule, ButtonModule, DragDropModule], // Importa el módulo de DragDrop
    template: `
        <div class="card flex flex-wrap gap-3">
            <div class="p-2 border-1 surface-border border-round" [style.width]="isMobile()?'100%':'49%'">
                <p class="text-center surface-border border-bottom-1">
                    Permisos Disponibles ({{permisosDisponibles.length}})
                </p>
                <ul class="list-none flex flex-column gap-2 p-0 m-0">
                    <li
                        *ngFor="let permiso of permisosDisponibles"
                        class="p-2 border-round shadow-1 flex align-items-center justify-content-between"
                        pDraggable
                        (onDragStart)="dragStart(permiso)"
                        (onDragEnd)="dragEnd()"
                    >
                        <p-button
                            [label]="permiso.method.toUpperCase()"
                            [raised]="true"
                            [severity]="getSeverity(permiso.method)"
                        ></p-button>
                        {{ permiso.name }}
                        <button
                            pButton
                            type="button"
                            class="pi pi-plus"
                            (click)="dragStart(permiso); drop(); dragEnd()"
                            severity="success"
                            [text]="true"
                            [raised]="true"
                        ></button>
                    </li>
                </ul>
            </div>
            <div
                class="p-2 border-1 surface-border border-round"
                pDroppable
                (onDrop)="drop()"
                [style.width]="isMobile()?'100%':'49%'"
            >
                <p class="text-center surface-border border-bottom-1">
                    Permisos Asignados ({{permisosAsignados.length}})
                </p>
                <ul class="list-none flex flex-column gap-2 p-0 m-0">
                    <li
                        *ngFor="let permiso of permisosAsignados"
                        class="p-2 border-round shadow-1 flex align-items-center justify-content-between"
                    >
                        <p-button
                            [label]="permiso.method.toUpperCase()"
                            [raised]="true"
                            [severity]="getSeverity(permiso.method)"
                        ></p-button>

                        {{ permiso.name }}
                        <button
                            pButton
                            type="button"
                            class="pi pi-times"
                            (click)="eliminarPermiso(permiso)"
                            severity="danger"
                            [text]="true"
                            [raised]="true"
                        ></button>
                    </li>
                </ul>
            </div>
        </div>
    `,
})
export class PermisosDemo implements OnInit {
    permisosDisponibles: any[] = [];
    permisosAsignados: any[] = [];
    role: any;
    draggedPermiso: any;

    constructor(
        private authService: AuthService,
        private listService: ListService,
        private dialogService: DialogService,
        private ref: DynamicDialogRef,
        private config: DynamicDialogConfig,
        private helper:HelperService,
        private update:UpdateService
    ) {}
    getSeverity(method: string): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast'  {
        switch (method.toUpperCase()) {
            case 'POST':
                return "success";
            case 'GET':
                return "info";
            case 'PUT':
                return "warning";
            case 'DELETE':
                return "danger";
            default:
                return "contrast";
        }
    }
    isMobile(): boolean {
        return this.helper.isMobil();
    }

    ngOnInit() {
        if (this.config.data.role) {
            this.role = this.config.data.role;
            this.permisosAsignados = this.role.permisos;
            this.listarPermisosDisponibles();
        }
    }
    token = this.authService.token();
    listarPermisosDisponibles(): void {
        
        this.listService.ListarPermisos(this.token).subscribe(
            (response) => {
                // Filtrar los permisos disponibles que no estén ya asignados al rol
                this.permisosDisponibles = response.data.filter(
                    (permiso: any) =>
                        !this.permisosAsignados.some(
                            (p: any) => p._id === permiso._id
                        )
                );
            },
            (error) => {
                console.error('Error al listar permisos:', error);
            }
        );
       // console.log("Lista de permisos:",this.permisosAsignados, this.permisosDisponibles);
    }

    dragStart(permiso: any) {
        this.draggedPermiso = permiso;
    }

    dragEnd() {
        this.draggedPermiso = null;
    }

    drop() {
        if (this.draggedPermiso) {
            this.permisosAsignados.push(this.draggedPermiso);
            this.permisosDisponibles = this.permisosDisponibles.filter(
                (permiso: any) => permiso !== this.draggedPermiso
            );
            this.draggedPermiso = null;
            this.actualizarRoles(); // Actualizar la tabla de roles después de asignar el permiso
        }
    }

    eliminarPermiso(permiso: any) {
        if (this.role) {
            this.permisosAsignados = this.permisosAsignados.filter(
                (element: any) => element !== permiso
            );
            this.permisosDisponibles.push(permiso);
            this.actualizarRoles(); // Actualizar la tabla de roles después de eliminar el permiso
        }
    }

    editarPermiso(role: any, permiso: any) {
        // Lógica para editar el permiso
    }

    actualizarRoles() {
        if (this.role) {
            this.role.permisos = this.permisosAsignados.map(permiso => permiso._id);
        }
        //console.log(this.role);
        this.update.actualizarRolUsuario(this.token,this.role._id,this.role).subscribe(response=>{
          //  console.log(response);
        })
    }
}
