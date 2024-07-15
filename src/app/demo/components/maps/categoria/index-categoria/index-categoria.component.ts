import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService, TreeNode } from 'primeng/api';
import { Table } from 'primeng/table';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';
import { UpdateService } from 'src/app/demo/services/update.service';
import { CreateCategoriaComponent } from '../create-categoria/create-categoria.component';
import { CreateSubcategoriaComponent } from '../sub/create-subcategoria/create-subcategoria.component';
import { EditCategoriaComponent } from '../edit-categoria/edit-categoria.component';
import { EditSubcategoriaComponent } from '../sub/edit-subcategoria/edit-subcategoria.component';
import { DeleteService } from 'src/app/demo/services/delete.service';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { App } from '@capacitor/app';
import { AuthService } from 'src/app/demo/services/auth.service';
import { forkJoin } from 'rxjs';
interface Column {
    field: string;
    header: string;
}
@Component({
    selector: 'app-index-categoria',
    templateUrl: './index-categoria.component.html',
    styleUrl: './index-categoria.component.scss',
    providers: [MessageService],
})
export class IndexCategoriaComponent implements OnInit {
    categorias!: TreeNode[];
    constcategorias = [];
    clonedProducts: { [s: string]: any } = {};
    token = this.auth.token();
    constructor(
        private ref: DynamicDialogRef,
        private listService: ListService,
        private router: Router,
        private updateservice: UpdateService,
        private helperservice: HelperService,
        private deleteService: DeleteService,
        private messageService: MessageService,
        private dialogService: DialogService,
        private auth: AuthService
    ) {}
    cols!: Column[];
    check: any = {};    
    async ngOnInit() {
        const checkObservables = {
            IndexCategoriaComponent: await this.auth.hasPermissionComponent(
                '/categoria',
                'get'
            ),
            EditCategoriaComponent: await this.auth.hasPermissionComponent(
                '/categoria',
                'put'
            ),
            EditSubcategoriaComponent: await this.auth.hasPermissionComponent(
                '/subcategoria',
                'put'
            ),
            CreateCategoriaComponent: await this.auth.hasPermissionComponent(
                '/categoria',
                'post'
            ),
            CreateSubcategoriaComponent: await this.auth.hasPermissionComponent(
                '/subcategoria',
                'post'
            ),
        };
        forkJoin(checkObservables).subscribe(async (check) => {
            this.check = check;
            console.log(check);
            try {
                // Verificar permiso de vista de categoría
                if (!this.check.IndexCategoriaComponent) {
                    // this.router.navigate(['/notfound']);
                    return console.log('ERROR');
                }

                // Cargar categorías y subcategorías
                await this.listarCategorias();

                this.cols = [
                    { field: 'nombre', header: 'Nombre' },
                    { field: 'descripcion', header: 'Descripción' },
                    { field: '', header: '' },
                ];

                const aux = await this.listService
                    .listarSubcategorias(this.token)
                    .toPromise();
                if (aux && aux.data) {
                    this.listadosubcategoria = aux.data;
                }
            } catch (error) {
                console.error('Error en ngOnInit:', error);
                this.router.navigate(['/notfound']);
            } finally {
                this.loading = true;
            }
        });
    }

    clear(table: Table) {
        table.clear();
    }
    opcion = false;
    loading = false;

    listadocategoria!: any[];
    listadosubcategoria!: any[];
    async listarCategorias(): Promise<void> {
        this.loading = true;
        this.opcion = false;
        try {
            const categoriasResponse = await this.listService
                .listarCategorias(this.token)
                .toPromise();
            console.log(categoriasResponse);
            if (categoriasResponse.data) {
                this.listadocategoria = categoriasResponse.data;

                const categorias = await Promise.all(
                    this.listadocategoria.map(async (categoria: any) => {
                        const subcategoriaResponse = await this.listService
                            .listarSubcategorias(
                                this.token,
                                {'categoria':
                                categoria._id}
                            )
                            .toPromise();
                        const children = subcategoriaResponse.data.map(
                            (subcategoria: any) => ({
                                data: {
                                    nombre: subcategoria.nombre,
                                    descripcion: subcategoria.descripcion,
                                    _id: subcategoria._id,
                                    cat: false,
                                },
                            })
                        );
                        //console.log('categoria',categoria.nombre,'children',children);
                        return {
                            data: {
                                nombre: categoria.nombre,
                                descripcion: categoria.descripcion,
                                _id: categoria._id,
                                cat: true,
                            },
                            children: children,
                        };
                    })
                );
                this.categorias = categorias;

                //console.log(this.categorias);
            } else {
                throw new Error('No se pudo obtener la lista de categorías');
            }
        } catch (error) {
            //console.error('Error al listar categorías y subcategorías', error);
        } finally {
            this.loading = false;
        }
    }
    isMobil() {
        return this.helperservice.isMobil();
    }
    editRow(id: any, cat: boolean) {
        //console.log(id);
        if (cat) {
            if (this.check.EditCategoriaComponent) {
                this.ref = this.dialogService.open(EditCategoriaComponent, {
                    header: 'Editar Categoría',
                    width: this.isMobil() ? '100%' : '70%',
                    data: { id: id },
                });
                App.addListener('backButton', (data) => {
                    this.ref.close();
                });
            } else {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Lo sentimos',
                    detail: 'No tiene permisos para esto',
                });
            }
        } else {
            if (this.check.EditCategoriaComponent) {
                this.ref = this.dialogService.open(EditSubcategoriaComponent, {
                    header: 'Editar Subcategoría',
                    width: this.isMobil() ? '100%' : '70%',
                    data: { id: id },
                });
                App.addListener('backButton', (data) => {
                    this.ref.close();
                });
            } else {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Lo sentimos',
                    detail: 'No tiene permisos para esto',
                });
            }
        }
    }
    responsemodal: any;
    iddelete: any;
    @ViewChild('Confirmar') Confirmar!: TemplateRef<any>;
    load_btn_delte = true;
    visibledelete = false;
    async remoRow(row: any, cat: boolean) {
        this.iddelete = undefined;
        //console.log(row);
        if (cat) {
            this.responsemodal = await this.deleteService
                .verificarCategoria(this.token, row._id)
                .toPromise();
        } else {
            this.responsemodal = await this.deleteService
                .verificarSubCategoria(this.token, row._id)
                .toPromise();
            //console.log(this.responsemodal);
        }
        setTimeout(() => {
            this.iddelete = row;
            setTimeout(() => {
                this.visibledelete = true;
            }, 200);
        }, 200);

        //const this.ref = this.dialogService.open(this.Confirmar, { centered: true,size: 'lg'  });
    }
    respaldo!: any;
    eliminarCategoria() {
        //console.log(this.respaldo, this.iddelete);
        if (this.iddelete) {
            const data: any = {}; // Corrección: usa const en lugar de let para data
            if (this.respaldo) {
                data.eliminarSubcategorias = false;
                data.nuevaCategoria = this.respaldo._id;
            } else {
                data.eliminarSubcategorias = true;
            }
            if (this.iddelete.cat) {
                this.deleteService
                    .eliminarCategoria(this.token, this.iddelete._id, data)
                    .subscribe(
                        (response) => {
                            //console.log(response.data);
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Eliminación',
                                detail: 'completado',
                            });
                            this.ngOnInit();
                        },
                        (error) => {
                            this.messageService.add({
                                severity: 'error',
                                summary: ('(' + error.status + ')').toString(),
                                detail: error.error.message || 'Sin conexión',
                            });
                        }
                    );
            } else {
                this.deleteService
                    .eliminarSubcategoria(this.token, this.iddelete._id, data)
                    .subscribe(
                        (response) => {
                            //console.log(response.data);
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Eliminación',
                                detail: 'completado',
                            });
                            this.ngOnInit();
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

    editCategoriaId: any | null = null;
    onRowEditInit(categoria: any) {
        this.clonedProducts[categoria._id as string] = { ...categoria };
        // Iniciar la edición de la categoría
        //console.log('Iniciar edición de la categoría:', categoria);
    }

    onRowEditSave(categoria: any) {
        // Guardar los cambios de la categoría
        //console.log('Guardar cambios de la categoría:', categoria);
        this.updateservice
            .actualizarCategoria(this.token, categoria._id, categoria)
            .subscribe(
                (response) => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Actualización',
                        detail: 'completado',
                    });
                    //console.log(response);
                    this.ngOnInit();
                },
                (error) => {
                    //console.log(error);
                    this.messageService.add({
                        severity: 'error',
                        summary: ('(' + error.status + ')').toString(),
                        detail: error.error.message || 'Sin conexión',
                    });
                }
            );
    }

    onRowEditCancel(categoria: any, rowIndex: number) {
        // Cancelar la edición de la categoría
        this.categorias[rowIndex] = this.clonedProducts[categoria._id];
        //console.log('Cancelar edición de la categoría:', categoria);
    }

    verSubcategorias(id: any) {
        this.router.navigate(['/subcategorias'], { queryParams: { id: id } });
    }

    confirmarEliminacion(categoria: any) {
        //console.log('Eliminar la categoría:', categoria);
    }

    get options(): any[] {
        return this.responsemodal.cantidadSubcategorias
            ? this.listadocategoria.filter(
                  (item) => item.nombre !== this.iddelete.nombre
              )
            : this.listadosubcategoria.filter(
                  (item) => item.nombre !== this.iddelete.nombre
              );
    }
    exportToCSV() {
        //console.log(this.categorias);
        const csvData = this.convertToCSV(this.categorias, this.cols);
        let header: any;
        const selectedColumns = [
            { field: 'Categoria', header: 'Categoria' },
            { field: 'Descripcion_cat', header: 'Descripcion_cat' },
            { field: 'Subategoria', header: 'Subategoria' },
            { field: 'Descripcion_sub', header: 'Descripcion_sub' },
        ];
        header = selectedColumns
            .map((col) => col.header ?? col.field)
            .join(';');
        // Construir las filas del CSV
        let csv: any[] = [];
        this.categorias.map((row) => {
            const resul = row.children.map((element: any) => {
                const categoria = row.data.nombre;
                const subategoria = element.data.nombre;
                const descripcion_cat = row.data.descripcion;
                const descripcion_sub = element.data.descripcion;
                return [
                    categoria,
                    descripcion_cat,
                    subategoria,
                    descripcion_sub,
                ].join(';');
            });
            console.log(resul);
            csv.push(...resul);
        });
        console.log(csv);
        csv.map((value: any) => {
            if (typeof value === 'string') {
                return '"' + value.replace(/"/g, '""') + '"';
            }
            return value;
        }).join(';');

        //console.log(csv);

        csv.unshift(header);
        const csvContent = '\uFEFF' + csv.join('\n'); // UTF-8 BOM
        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        let ext = '.csv';
        a.download = 'Categorias' + ext;
        a.click();
        URL.revokeObjectURL(url);
    }

    convertToCSV(data: any[], columns: any[]): string {
        const header = columns.map((col) => col.header).join(',');
        const rows = data.map((row) =>
            columns.map((col) => row[col.field]).join(',')
        );
        return [header, ...rows].join('\r\n');
    }
}
