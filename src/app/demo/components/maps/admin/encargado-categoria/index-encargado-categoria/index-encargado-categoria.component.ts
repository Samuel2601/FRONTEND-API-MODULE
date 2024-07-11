import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';
import { CreateEncargadoCategoriaComponent } from '../create-encargado-categoria/create-encargado-categoria.component';
import { App } from '@capacitor/app';
import { AuthService } from 'src/app/demo/services/auth.service';
@Component({
    selector: 'app-index-encargado-categoria',
    templateUrl: './index-encargado-categoria.component.html',
    styleUrl: './index-encargado-categoria.component.scss',
})
export class IndexEncargadoCategoriaComponent {
    encargadosCategoria: any = [];
    clonedProducts: { [s: string]: any } = {};

    constructor(
        private ref: DynamicDialogRef,
        private listService: ListService,
        private router: Router,
        private helper: HelperService,
        private dialogService: DialogService,
        private auth:AuthService
    ) {}

    ngOnInit(): void {
        this.listarCategorias();
    }
    token = this.auth.token();
    listarCategorias(): void {
        if (!this.token) {
            throw this.router.navigate(['/auth/login']);
        }
        this.listService.listarEncargadosCategorias(this.token).subscribe(
            (response) => {
                this.encargadosCategoria = response.data;
                console.log(response.data);
            },
            (error) => {
                console.error(error);
            }
        );
    }

    isMobil() {
        return this.helper.isMobil();
    }
    newencargado() {
        this.ref = this.dialogService.open(CreateEncargadoCategoriaComponent, {
            header: 'Nueva Encargado de Categoria',
            width: this.isMobil() ? '100%' : '40%',
        });
        App.addListener('backButton', (data) => {
            this.ref.close();
        });
        // Escuchar el evento de cierre del diálogo
        this.ref.onClose.subscribe(() => {
            this.listarCategorias();
        });
    }
    getNombreUsuario(idUsuario: string): string {
        const usuario = this.encargadosCategoria.encargado.find(
            (usuario: any) => usuario._id === idUsuario
        );
        return usuario ? usuario.nombres : '';
    }

    getNombreCategoria(idCategoria: string): string {
        const categoria = this.encargadosCategoria.categoria.find(
            (categoria: any) => categoria._id === idCategoria
        );
        return categoria ? categoria.nombre : '';
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
    }

    onRowEditCancel(categoria: any, rowIndex: number) {
        // Cancelar la edición de la categoría
        ////console.log('Cancelar edición de la categoría:', categoria);
    }

    verDetalles(categoria: any) {
        // Lógica para ver las subcategorías
    }

    confirmarEliminacion(categoria: any) {
        ////console.log('Eliminar la categoría:', categoria);
    }
}
