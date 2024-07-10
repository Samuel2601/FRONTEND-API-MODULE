import { Component } from '@angular/core';
import { ListService } from 'src/app/demo/services/list.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UpdateService } from 'src/app/demo/services/update.service';
import { HelperService } from 'src/app/demo/services/helper.service';
@Component({
    selector: 'app-index-subcategoria',
    templateUrl: './index-subcategoria.component.html',
    styleUrl: './index-subcategoria.component.scss',
})
export class IndexSubcategoriaComponent {
    subcategorias: any[] = [];
    load_lista: boolean = true;
    id: any = '';
    clonedProducts: { [s: string]: any } = {};
    constructor(
        private listService: ListService,
        private route: ActivatedRoute,
        private router: Router,
        private updateservice: UpdateService,
        private helperservice: HelperService
    ) {
        this.id = this.route.snapshot.queryParamMap.get('id');
    }
    check: any = {};
    ngOnInit(): void {
        //this.helperservice.llamarspinner();
        if (!this.token) {
            this.router.navigate(['/auth/login']);
            //this.helperservice.cerrarspinner();
            throw new Error('Token no encontrado');
        }
        this.check.IndexSubcategoriaComponent =
            this.helperservice.decryptData('IndexSubcategoriaComponent') ||
            false;
        if (!this.check.IndexSubcategoriaComponent) {
            this.router.navigate(['/notfound']);
        }
        this.listarSubcategorias();
    }
    token = this.helperservice.token();
    listarSubcategorias(): void {
        this.load_lista = true;
        if (!this.token) {
            throw this.router.navigate(['/auth/login']);
        }
        this.listService
            .listarSubcategorias(this.token, 'categoria', this.id)
            .subscribe(
                (response) => {
                    this.subcategorias = response.data;
                    this.load_lista = false;
                },
                (error) => {
                    //console.log(error);
                }
            );
        this.helperservice.cerrarspinner();
    }
    onRowEditInit(subcategoria: any) {
        this.clonedProducts[subcategoria._id as string] = { ...subcategoria };
        // Iniciar la edición de la categoría
        //console.log('Iniciar edición de la categoría:', subcategoria);
    }

    onRowEditSave(subcategoria: any) {
        // Guardar los cambios de la categoría
        //console.log('Guardar cambios de la categoría:', subcategoria);
        this.updateservice
            .actualizarSubcategoria(this.token, subcategoria._id, subcategoria)
            .subscribe((response) => {
                //console.log(response)},error=>{
                //console.log(error);
            });
    }

    onRowEditCancel(subcategoria: any, rowIndex: number) {
        // Cancelar la edición de la categoría
        this.subcategorias[rowIndex] = this.clonedProducts[subcategoria._id];
        //console.log('Cancelar edición de la categoría:', subcategoria, this.subcategorias[rowIndex]);
    }

    verSubcategorias(id: any) {
        this.router.navigate(['/subcategorias'], { queryParams: { id: id } });
    }

    confirmarEliminacion(categoria: any) {
        //console.log('Eliminar la categoría:', categoria);
    }
}
