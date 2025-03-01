import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { AdminService } from 'src/app/demo/services/admin.service';
import { FilterService } from 'src/app/demo/services/filter.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';
import {
    Camera,
    CameraResultType,
    CameraSource,
    Photo,
} from '@capacitor/camera';
import { UpdateService } from 'src/app/demo/services/update.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-edit-incidentes-denuncia',
    templateUrl: './edit-incidentes-denuncia.component.html',
    styleUrl: './edit-incidentes-denuncia.component.scss',
})
export class EditIncidentesDenunciaComponent implements OnInit {
    incidencia: FormGroup;
    id: any;
    check: any = {};
    token = this.auth.token();
    load_form: boolean = false;

    categorias: any = [];
    subcategorias: any = [];
    id_user: any = this.auth.idUserToken();
    imagenesSeleccionadas: any = [];
    imagenModal: any = [];
    url = GLOBAL.url;
    upload: boolean = true;
    edit: boolean;

    responsiveOptions = [
        { breakpoint: '1024px', numVisible: 5 },
        { breakpoint: '768px', numVisible: 3 },
        { breakpoint: '560px', numVisible: 1 },
    ];

    constructor(
        private conf: DynamicDialogConfig,
        private helper: HelperService,
        private router: Router,
        private filter: FilterService,
        private fb: FormBuilder,
        private listService: ListService,
        private admin: AdminService,
        private messageService: MessageService,
        private update: UpdateService,
        private ref: DynamicDialogRef,
        private auth: AuthService
    ) {
        this.incidencia = this.fb.group({
            direccion_geo: [{ value: '', disabled: true }],
            ciudadano: [{ value: '', disabled: true }, Validators.required],
            estado: [{ value: '', disabled: true }, Validators.required],
            categoria: [{ value: '', disabled: true }, Validators.required],
            subcategoria: [{ value: '', disabled: true }, Validators.required],
            descripcion: [{ value: '', disabled: true }, Validators.required],
            encargado: [{ value: '', disabled: true }, Validators.required],
            respuesta: [{ value: '', disabled: true }, Validators.required],
            evidencia: [[]],
            view: true,
        });
    }
    onHide() {
        this.displayCustom = false;
    }
    responsiveimage(): string {
        return (window.innerWidth - 50).toString();
    }

    async ngOnInit() {
        this.helper.llamarspinner('edit incidente');
        const checkObservables = {
            EditIncidentesDenunciaComponent: this.auth.hasPermissionComponent(
                '/incidentes_denuncia/:id',
                'put'
            ),
            EditIncidenteAll: this.auth.hasPermissionComponent(
                '/incidentes_denuncia/:id',
                'put'
            ),
            ContestarIncidente: this.auth.hasPermissionComponent(
                '/incidentes_denuncia/:id',
                'put'
            ),
        };

        forkJoin(checkObservables).subscribe(async (check) => {
            this.check = check;
            try {
                this.load_form = false;
                if (!this.check.EditIncidentesDenunciaComponent) {
                    this.router.navigate(['/notfound']);
                    return;
                }

                if (this.conf) {
                    this.id = this.conf.data.id;
                    this.obtenerincidente();
                    this.listarCategorias();
                    this.listarEstados();
                }
            } catch (error) {
                console.error('Error en ngOnInit:', error);
                this.router.navigate(['/notfound']);
            } finally {
                this.helper.cerrarspinner('edit incidente');
            }
        });
    }

    obtenerincidente() {
        this.filter
            .obtenerIncidenteDenuncia(this.token, this.id)
            .subscribe((response) => {
                if (response.data) {
                    const incidente = response.data;
                    for (const key in incidente) {
                        if (
                            Object.prototype.hasOwnProperty.call(incidente, key)
                        ) {
                            const element = incidente[key];
                            const campo = this.incidencia.get(key);
                            if (campo) {
                                campo.setValue(element);
                                if (key == 'categoria') {
                                    this.selectcategoria(false, element._id);
                                }
                                if (
                                    (incidente.ciudadano._id != this.id_user ||
                                        this.check
                                            .EditIncidentesDenunciaComponent) &&
                                    key == 'estado'
                                ) {
                                    this.habilitarCampos(key);
                                }
                                if (
                                    incidente.ciudadano._id == this.id_user &&
                                    key == 'descripcion'
                                ) {
                                    this.habilitarCampos(key);
                                }
                            }
                        }
                    }
                    if (incidente.foto) {
                        this.imagenModal = incidente.foto;
                    }
                    this.load_form = true;
                }
            });
    }

    enviar() {
        //console.log(this.incidencia);
        if (
            this.incidencia.get('ciudadano').value?._id != this.id_user ||
            this.edit
        ) {
            this.incidencia.get('encargado').enable();
            this.incidencia.get('encargado').setValue(this.id_user);
        }

        this.update
            .actualizarIncidenteDenuncia(
                this.token,
                this.id,
                this.incidencia.value
            )
            .subscribe(
                (response) => {
                    //console.log(response);
                    if (response.data) {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Actualizado',
                            detail: 'Correctamente',
                        });
                        setTimeout(() => {
                            this.ref.close(true);
                        }, 500);
                    }
                },
                (error) => {
                    console.error(error);
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
    }

    selectcategoria(control: boolean, event?: any) {
        if (!event) {
            event = this.incidencia.get('categoria').value?._id;
        }

        if (event) {
            const id = event;
            this.listService
                .listarSubcategorias(this.token, { categoria: id })
                .subscribe(
                    (response) => {
                        ////console.log(response)
                        this.subcategorias = response.data;
                        if (control) {
                            this.incidencia.get('subcategoria').setValue('');
                        }
                    },
                    (error) => {
                        ////console.log(error);
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
        }
    }

    async listarCategorias() {
        this.listService.listarCategorias(this.token).subscribe(
            (response) => {
                this.categorias = response.data;
            },
            (error) => {
                ////console.log(error);
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
    }
    estados: any = [];
    listarEstados() {
        this.listService.listarEstadosIncidentes(this.token).subscribe(
            (response) => {
                this.estados = response.data;
            },
            (error) => {
                if (error.error.message == 'InvalidToken') {
                    this.router.navigate(['/auth/login']);
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: `(${error.status})`,
                        detail: error.error.message || 'Sin conexión',
                    });
                }
            }
        );
    }
    isMobil() {
        return this.helper.isMobil();
    }
    load_imagen: boolean = false;
    newstatus() {
        if (this.incidencia.get('estado').value?.orden > 1) {
            this.habilitarCampos('respuesta');
            this.load_imagen = true;
        } else {
            this.deshabilitarCampo('respuesta');
            this.load_imagen = false;
        }
    }
    deshabilitarCampo(campo: any) {
        this.incidencia.get(campo)?.disable();
    }
    habilitarCampos(campo?: any) {
        this.incidencia.get(campo)?.enable();
    }
    mostrargale: any;
    file: any;
    selectedFiles: any = [];
    load_carrusel: boolean = false;
    async tomarFotoYEnviar(event: any) {
        //this.load_carrusel = false;
        this.upload = true;
        this.mostrargale = false;
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source: CameraSource.Prompt,
            promptLabelPhoto: 'Seleccionar de la galería',
            promptLabelPicture: 'Tomar foto',
        });
        if (image && image.base64String && this.selectedFiles.length < 3) {
            const byteCharacters = atob(image.base64String);
            const byteNumbers = new Array(byteCharacters.length);

            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' }); // Puedes ajustar el tipo según el formato de tu imagen
            let im = new File([blob], 'prueba', { type: 'image/jpeg' });
            this.selectedFiles.push(im);

            const currentValue = this.incidencia.get('evidencia').value || [];
            this.incidencia.get('evidencia').setValue([...currentValue, im]);

            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.imagenesSeleccionadas.push({
                    itemImageSrc: e.target.result,
                });
            };
            setTimeout(() => {
                this.mostrargale = true;
            }, 1000);
            reader.readAsDataURL(im);
            this.load_carrusel = true;

            if (this.selectedFiles.length == 5) {
                this.upload = false;
            }
        } else {
            this.messageService.add({
                severity: 'warning',
                summary: 'MAX img',
                detail: 'Solo puede enviar 3 imangenes',
            });
            this.load_carrusel = true;
            ////console.error('Error al obtener la cadena base64 de la imagen.');
        }
    }
    onFilesSelected(event: any): void {
        this.mostrargale = false;
        ////console.log(event);
        //this.load_carrusel = false;
        const files: FileList = event.files;

        for (let file of event.files) {
            this.selectedFiles.push(file);
            const currentValue = this.incidencia.get('evidencia').value || [];
            this.incidencia.get('evidencia').setValue([...currentValue, file]);

            const objectURL = URL.createObjectURL(file);
            this.imagenesSeleccionadas.push({ itemImageSrc: objectURL });
            if (this.selectedFiles.length == 5) {
                this.upload = false;
            }
        }

        this.messageService.add({
            severity: 'info',
            summary: 'Excelente',
            detail: this.selectedFiles.length + 'Imagenes subidas',
        });
        this.mostrargale = true;
        this.load_carrusel = true;
    }
    displayCustom: boolean | undefined;

    activeIndex: number = 0;

    images: any[] | undefined;
    imageClick(index: number) {
        this.activeIndex = index;
        this.displayCustom = true;
    }
}
