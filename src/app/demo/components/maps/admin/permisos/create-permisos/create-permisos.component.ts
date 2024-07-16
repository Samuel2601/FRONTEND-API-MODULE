import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MessageService } from 'primeng/api';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { AuthService } from 'src/app/demo/services/auth.service';
import { CreateService } from 'src/app/demo/services/create.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';

@Component({
    selector: 'app-create-permisos',
    templateUrl: './create-permisos.component.html',
    styleUrl: './create-permisos.component.scss',
})
export class CreatePermisosComponent implements OnInit {
    componente: any;
    method_arr: string[] = [
        'get',
        'post',
        'put',
        'delete',
        'createBatch',
        'updateBatch',
    ];
    rol: any;
    roles: any;
    newpermiso: any = {};
    constructor(
        private auth: AuthService,
        private modalService: NgbModal,
        private listService: ListService,
        private createService: CreateService,
        private helper: HelperService,
        private messageService: MessageService,
        private ref: DynamicDialogRef
    ) {}
    ngOnInit(): void {}
    token = this.auth.token();
    enviar() {
        //console.log(this.newpermiso);
        this.createService
            .registrarPermiso(this.token, [this.newpermiso])
            .subscribe((response) => {
                console.log(response);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Ingresado',
                    detail: response.message,
                });
                setTimeout(() => {
                    this.ref.close(true);
                }, 500);
            });
    }
}
