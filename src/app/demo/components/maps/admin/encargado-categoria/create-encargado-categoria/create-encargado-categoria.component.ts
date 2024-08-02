import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ListService } from 'src/app/demo/services/list.service';
import { CreateService } from 'src/app/demo/services/create.service';
import { Router } from '@angular/router';
import { HelperService } from 'src/app/demo/services/helper.service';
import { MessageService } from 'primeng/api';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { AuthService } from 'src/app/demo/services/auth.service';
@Component({
    selector: 'app-create-encargado-categoria',
    templateUrl: './create-encargado-categoria.component.html',
    styleUrl: './create-encargado-categoria.component.scss',
    providers: [MessageService],
})
export class CreateEncargadoCategoriaComponent implements OnInit {
    encargadosSeleccionados: any[] = [];
    categorias: any[] = [];
    categoriaselect: any;
    usuarios: any[] = [];
    subcategoriaForm: FormGroup;
    constructor(
        private fb: FormBuilder,
        private listService: ListService,
        private createService: CreateService,
        private router: Router,
        private helper: HelperService,
        private messageService: MessageService,
        private ref: DynamicDialogRef,
        private auth:AuthService
    ) {
        this.subcategoriaForm = this.fb.group({
            categoria: ['', Validators.required],
        });
    }
    ngOnInit(): void {
        this.listarCategorias();
        this.listarUsuarios();
    }
    token = this.auth.token();
    listarCategorias() {
        this.listService.listarCategorias(this.token).subscribe((response) => {
            this.categorias = response.data;
            ////console.log(response);
        });
    }
    roles: any[] = [];

    async listarUsuarios(): Promise<void> {
        this.listService
            .listarRolesUsuarios(this.token)
            .subscribe(async (response) => {
                if (response.data) {
                    this.roles = response.data;
                    //console.log(this.roles);
                     const list_user= await Promise.all(
                        this.roles.map(async (user: any) => {
                            if (user.orden == 3 || user.orden > 4) {
                                const listusuarios = await this.listService
                                    .listarUsuarios(
                                        this.token,
                                        'role.orden',
                                        user.orden
                                    )
                                    .toPromise();
                                return listusuarios;
                            }
                        })
                    );
                    list_user.forEach(element => {
                      if(element){
                        this.usuarios.push(...element.data);
                      }
                    });
                    
                    //console.log(this.usuarios);
                }
            });
    }
    eliminarEncargado(id: any): void {
        this.encargadosSeleccionados = this.encargadosSeleccionados.filter(
            (encargado: any) => encargado !== id
        );
    }

    agregarEncargado(target: any) {
        ////console.log(target.value);
        this.encargadosSeleccionados.push(target.value);
    }
    userfilter(id: any) {
        return this.usuarios.find((element: any) => element._id == id);
    }
    registrarEncargo() {
        if (this.encargadosSeleccionados.length > 0 && this.categoriaselect) {
            this.createService
                .registrarEncargadoCategoria(this.token, {
                    encargado: this.encargadosSeleccionados,
                    categoria: this.categoriaselect,
                })
                .subscribe(
                    (response) => {
                        //console.log(response)
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Ingresado',
                            detail: response.message,
                        });
                        this.ref.close();
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
}
