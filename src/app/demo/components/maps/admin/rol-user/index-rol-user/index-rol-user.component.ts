import { Component } from '@angular/core';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Router } from '@angular/router';
import { CreateRolUserComponent } from '../create-rol-user/create-rol-user.component';
import { App } from '@capacitor/app';
import { AuthService } from 'src/app/demo/services/auth.service';
@Component({
    selector: 'app-index-rol-user',
    templateUrl: './index-rol-user.component.html',
    styleUrl: './index-rol-user.component.scss',
})
export class IndexRolUserComponent {
    roles = [];
    clonedProducts: { [s: string]: any } = {};

    constructor(
        private listService: ListService,
        private helper: HelperService,
        private router: Router,
        private ref: DynamicDialogRef,
        private dialogService: DialogService,
        private auth:AuthService
    ) {}

    ngOnInit(): void {
        this.listarCategorias();
    }
    token = this.auth.token();
    listarCategorias(): void {
        this.listService.listarRolesUsuarios(this.token).subscribe(
            (response) => {
                this.roles = response.data;
                console.log(response.data);
            },
            (error) => {
                //console.log(error);
            }
        );
    }
    isMobil() {
        return this.helper.isMobil();
    }
    newRol() {
        if (!this.token) {
            this.router.navigate(['/auth/login']);
        } else {
            this.ref = this.dialogService.open(CreateRolUserComponent, {
                header: 'Nuevo Rol',
                width: this.isMobil() ? '100%' : '30%',
                modal:false,
            });
            App.addListener('backButton', (data) => {
                this.ref.destroy();
            });
            this.ref.onClose.subscribe((response: any) => {
              this.listarCategorias();
          });
        }
    }
}
