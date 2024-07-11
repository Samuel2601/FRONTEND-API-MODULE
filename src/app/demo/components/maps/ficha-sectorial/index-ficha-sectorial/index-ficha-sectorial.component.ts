import {
    AfterViewInit,
    Component,
    EventEmitter,
    HostListener,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges,
    TemplateRef,
    ViewChild,
} from '@angular/core';
import { ListService } from 'src/app/demo/services/list.service';
import { IndexEstadoActividadProyectoComponent } from '../estado-actividad-proyecto/index-estado-actividad-proyecto/index-estado-actividad-proyecto.component';
import { IndexActividadProyectoComponent } from '../actividad-proyecto/index-actividad-proyecto/index-actividad-proyecto.component';
import { HelperService } from 'src/app/demo/services/helper.service';
import { Router } from '@angular/router';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { Capacitor } from '@capacitor/core';
import { Table } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { App } from '@capacitor/app';
import { AdminService } from 'src/app/demo/services/admin.service';
import { EditFichaSectorialComponent } from '../edit-ficha-sectorial/edit-ficha-sectorial.component';
import { DeleteService } from 'src/app/demo/services/delete.service';
import { UpdateService } from 'src/app/demo/services/update.service';
import { AuthService } from 'src/app/demo/services/auth.service';
@Component({
    selector: 'app-index-ficha-sectorial',
    templateUrl: './index-ficha-sectorial.component.html',
    styleUrl: './index-ficha-sectorial.component.scss',
    providers: [MessageService],
})
export class IndexFichaSectorialComponent implements OnInit, OnChanges {
    public url = GLOBAL.url;
    @Input() filtro: string | undefined;
    @Input() valor: any | undefined;
    @Input() modal: boolean = false;
    @ViewChild('contentimage') modalContent: TemplateRef<any> | undefined;
    clear(table: Table) {
        table.clear();
    }
    getSeverity(
        status: string
    ): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
        switch (status.toLowerCase()) {
            case 'suspendido':
                return 'danger';

            case 'finalizado':
                return 'success';

            case 'en proceso':
                return 'info';

            case 'pendiente':
                return 'warning';

            case 'planificada':
                return 'info';

            default:
                return 'secondary'; // Asegúrate de retornar un valor válido por defecto
        }
    }
    deshabilitarMapaDesdeIndexFichaSectorial(event: MouseEvent) {
        this.stopPropagation(event);
        this.helperservice.deshabilitarMapa();
    }
    load_lista = true;
    fichasectorial: any = [];
    constructor(
        private ref: DynamicDialogRef,
        private router: Router,
        private listService: ListService,
        private helperservice: HelperService,
        private messageService: MessageService,
        private dialogService: DialogService,
        private admin: AdminService,
        private deleteService: DeleteService,
        private updateService: UpdateService,
        private auth:AuthService
    ) {}
    ngOnChanges(changes: SimpleChanges): void {
        if (changes['filtro'] || changes['valor']) {
            this.listarficha();
            this.height = 300;
        }
    }
    get vermodal(): boolean {
        if (this.modal) {
            return this.modal;
        } else {
            return false;
        }
    }
    set vermodal(val: boolean) {
        this.helperservice.cerrarficha();
    }
    check: any = {};
    visible: boolean = false;
    option: any;
    token = this.auth.token();
    id = this.admin.identity(this.token);
    rol = this.admin.roluser(this.token);
    async ngOnInit(): Promise<void> {
        //console.log(this.rol);
        if (!this.modal) this.helperservice.llamarspinner();
        if (!this.token) {
            this.router.navigate(['/auth/login']);
            if (!this.modal) this.helperservice.cerrarspinner();
            throw new Error('Token no encontrado');
        }
        try {
            this.check.IndexFichaSectorialComponent =
                this.helperservice.decryptData(
                    'IndexFichaSectorialComponent'
                ) || false;
            if (!this.check.IndexFichaSectorialComponent) {
                this.router.navigate(['/notfound']);
            }
            this.check.EditFichaSectorialComponent =
                this.helperservice.decryptData('EditFichaSectorialComponent') ||
                false;
            this.check.IndexEstadoActividadProyectoComponent =
                this.helperservice.decryptData(
                    'IndexEstadoActividadProyectoComponent'
                ) || false;
            this.check.IndexActividadProyectoComponent =
                this.helperservice.decryptData(
                    'IndexActividadProyectoComponent'
                ) || false;
            this.check.TotalFilter =
                this.helperservice.decryptData('TotalFilter') || false;
            this.check.FichaLimitada =
                this.helperservice.decryptData('FichaLimitada') || false;

            //console.log(this.check);
        } catch (error) {
            //console.error('Error al verificar permisos:', error);
            this.router.navigate(['/notfound']);
        }

        this.listarficha();
        if (!this.modal) this.helperservice.cerrarspinner();
    }

    isMobil() {
        return this.helperservice.isMobil();
    }
    isJSONString(str:string) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }
    parseJSON(str: string): any {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.error("Error parsing JSON string:", e);
            return null;
        }
    }

    listarficha() {
        if (!this.modal) {
            this.helperservice.llamarspinner();
        }
        this.load_lista = true;
        if (!this.token) {
            throw this.router.navigate(['/auth/login']);
        }

        let filtroServicio = '';
        let valorServicio: any;

        if (this.filtro && this.valor) {
            filtroServicio = this.filtro;
            valorServicio = this.valor;
        }

        if (!this.check.TotalFilter) {
            filtroServicio = 'encargado';
            valorServicio = this.id;
        }

        this.listService
            .listarFichaSectorial(this.token, filtroServicio, valorServicio)
            .subscribe(
                (response) => {
                    if (response.data) {
                        this.fichasectorial = response.data;
                        if (
                            this.filtro &&
                            this.valor &&
                            !this.check.TotalFilter
                        ) {
                            // Si hay filtro y valor, y TotalFilter es falso, filtrar manualmente
                            this.fichasectorial = this.fichasectorial.filter(
                                (ficha: any) => ficha[this.filtro] == this.valor
                            );
                        }
                        if (this.rol.nombre != 'Administrador') {
                            this.fichasectorial = this.fichasectorial.filter(
                                (ficha: any) => ficha.view
                            );
                        }
                        this.load_lista = false;
                    }
                    console.log(this.fichasectorial);
                },
                (error) => {
                    this.load_lista = false;
                    if (error.error.message == 'InvalidToken') {
                        this.router.navigate(['/auth/login']);
                    } else {
                        this.messageService.add({
                            severity: 'error',
                            summary: ('(' + error.status + ')').toString(),
                            detail: error.error.message || 'Sin conexión',
                        });
                    }
                }
            );

        if (!this.modal) {
            this.helperservice.cerrarspinner();
        }
    }

    llamarmodal2() {
        this.ref = this.dialogService.open(IndexActividadProyectoComponent, {
            header: '',
            width: this.isMobil() ? '100%' : '70%',
        });
        App.addListener('backButton', (data) => {
            this.ref.close();
        });
    }

    llamarmodal() {
        this.ref = this.dialogService.open(
            IndexEstadoActividadProyectoComponent,
            {
                header: '',
                width: this.isMobil() ? '100%' : '70%',
            }
        );
        App.addListener('backButton', (data) => {
            this.ref.close();
        });
    }

    stopPropagation(event: MouseEvent) {
        event.stopPropagation();
    }

    width = 200; // Ancho inicial de la componente
    height = 200; // Altura inicial de la componente
    isResizing = false; // Indicador de si se está redimensionando

    startResize(event: MouseEvent | TouchEvent): void {
        let initialY = 0;
        if (event instanceof MouseEvent) {
            initialY = (event as MouseEvent).clientY;
        } else if (event instanceof TouchEvent) {
            initialY = (event as TouchEvent).touches[0].clientY;
        }

        const mouseMoveListener = (moveEvent: MouseEvent | TouchEvent) => {
            let currentY = 0;
            if (moveEvent instanceof MouseEvent) {
                currentY = (moveEvent as MouseEvent).clientY;
            } else if (moveEvent instanceof TouchEvent) {
                currentY = (moveEvent as TouchEvent).touches[0].clientY;
            }

            this.height += initialY - currentY;
            initialY = currentY;
        };

        const mouseUpListener = () => {
            document.removeEventListener('mousemove', mouseMoveListener);
            document.removeEventListener('touchmove', mouseMoveListener);
            document.removeEventListener('mouseup', mouseUpListener);
            document.removeEventListener('touchend', mouseUpListener);
        };

        document.addEventListener('mousemove', mouseMoveListener);
        document.addEventListener('touchmove', mouseMoveListener);
        document.addEventListener('mouseup', mouseUpListener);
        document.addEventListener('touchend', mouseUpListener);
    }

    cerrarmodal() {}
    private initialTouchY: number = 0;
    private isDragging: boolean = false;

    onTouchStart(event: TouchEvent) {
        this.initialTouchY = event.touches[0].clientY;
        this.isDragging = true;
    }

    onTouchMove(event: TouchEvent) {
        if (!this.isDragging) {
            return;
        }

        // Calcula la distancia vertical del arrastre
        const deltaY = event.touches[0].clientY - this.initialTouchY;

        // Realiza acciones según la distancia vertical
        // Por ejemplo, cambiar la altura del elemento
        // o realizar alguna otra acción de acuerdo a tu necesidad
    }

    onTouchEnd() {
        this.isDragging = false;
    }

    imagenModal: any[] = [];

    openModalimagen(url: any) {
        this.imagenModal = url;
        //console.log('imagenModal',this.imagenModal);
        this.imagenAMostrar = this.imagenModal[0];
        //const this.ref = this.dialogService.open(this.modalContent, { size: 'lg' });
    }
    @Output() imagenModalChange: EventEmitter<any> = new EventEmitter<any>();
    updateImagenModal(value: any) {
        this.imagenModal = value;
        //console.log('imagenModal',this.imagenModal);
        this.imagenModalChange.emit(this.imagenModal);
    }
    openimagen(url: any) {
        this.imagenModal = url;
        this.imagenAMostrar = this.imagenModal[0];
        //const this.ref = this.dialogService.open(this.modalContent, { size: 'lg' });
    }
    imagenAMostrar: any;
    mostrarImagen(index: number) {
        this.imagenAMostrar = this.imagenModal[index];
        // Aquí agregamos la lógica para cambiar el índice activo del carrusel
        document.querySelectorAll('.carousel-item').forEach((el, i) => {
            if (i === index) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }
    displayBasic: boolean = false;

    responsiveOptions: any[] = [
        {
            breakpoint: '1500px',
            numVisible: 5,
        },
        {
            breakpoint: '1024px',
            numVisible: 3,
        },
        {
            breakpoint: '768px',
            numVisible: 2,
        },
        {
            breakpoint: '560px',
            numVisible: 1,
        },
    ];
    editingrow(id: any) {
        this.ref = this.dialogService.open(EditFichaSectorialComponent, {
            header: 'Editar Ficha Sectorial',
            width: this.isMobil() ? '100%' : '70%',
            data: { id: id },
        });
        App.addListener('backButton', (data) => {
            this.ref.close();
        });
    }
    iddelete: any = '';
    visibledelete = false;
    eliminarModal(row: any) {
        this.iddelete = row;
        this.visibledelete = true;
    }
    eliminarIncidente() {
        if (this.rol.nombre == 'Administrador') {
            this.deleteService
                .eliminarActividadProyecto(this.token, this.iddelete._id)
                .subscribe(
                    (response) => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Eliminado',
                            detail: response.message,
                        });
                        setTimeout(() => {
                            this.ref.close();
                            this.listarficha();
                            this.visible = false;
                            this.option = undefined;
                        }, 1000);
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
            this.iddelete.view = false;
            this.iddelete.view_id = this.id;
            this.iddelete.view_date = new Date();
            this.updateService
                .actualizarActividadProyecto(
                    this.token,
                    this.iddelete._id,
                    this.iddelete
                )
                .subscribe(
                    (response) => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Eliminado',
                            detail: response.message,
                        });
                        setTimeout(() => {
                            this.ref.close();
                            this.listarficha();
                            this.visible = false;
                            this.option = undefined;
                        }, 1000);
                    },
                    (error) => {
                        console.error(error);
                        this.messageService.add({
                            severity: 'error',
                            summary: ('(' + error.status + ')').toString(),
                            detail: error.error.message || 'Sin conexión',
                        });
                    }
                );
        }
    }
    showdialog(incidente: any) {
        if (!this.check.FichaLimitada) {
            this.visible = true;
            this.option = incidente;
        }
    }
}
