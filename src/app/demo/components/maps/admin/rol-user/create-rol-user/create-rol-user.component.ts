﻿import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { AuthService } from 'src/app/demo/services/auth.service';
import { CreateService } from 'src/app/demo/services/create.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';

@Component({
    standalone: false,
    selector: 'app-create-rol-user',
    templateUrl: './create-rol-user.component.html',
    styleUrl: './create-rol-user.component.scss',
    providers: [MessageService],
})
export class CreateRolUserComponent implements OnInit {
    Form: FormGroup<any>;
    token = this.auth.token();

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
        this.Form = this.fb.group({
            name: ['', Validators.required],
            orden:[0]
        });
    }

    ngOnInit(): void {
        this.listarCategorias();
    }
    roles: any[] = [];
    listarCategorias(): void {
        this.listService.listarRolesUsuarios(this.token).subscribe(
            (response) => {
                this.roles = response.data;
               // console.log(response.data);
            },
            (error) => {
                console.error(error);
            }
        );
    }

    registrar() {
        if (this.Form?.valid) {
            this.Form.get('orden').setValue(this.roles.length+1);
            if (this.Form.value) {
                this.createService
                    .registrarRolUsuario(this.token, [this.Form.value])
                    .subscribe(
                        (response) => {
                            //console.log(response);
                            if (response.data) {
                                this.messageService.add({
                                    severity: 'success',
                                    summary: 'Ingreso',
                                    detail: 'Correcto',
                                });
                                this.ref.close();
                            }
                        },
                        (error) => {
                            // Manejar errores
                            console.error(error);
                        }
                    );
            }
        }
    }
}

