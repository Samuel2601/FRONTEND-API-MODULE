import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ListService } from 'src/app/demo/services/list.service';
import { AdminService } from 'src/app/demo/services/admin.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { MessageService } from 'primeng/api';
import {
    Camera,
    CameraResultType,
    CameraSource,
    Photo,
} from '@capacitor/camera';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FilterService } from '../../../../services/filter.service';
import { UpdateService } from 'src/app/demo/services/update.service';
import { AuthService } from 'src/app/demo/services/auth.service';

@Component({
    selector: 'app-edit-ficha-sectorial',
    templateUrl: './edit-ficha-sectorial.component.html',
    styleUrl: './edit-ficha-sectorial.component.scss',
})
export class EditFichaSectorialComponent implements OnInit {
    fichaSectorialForm: FormGroup<any>;
    estadosActividadProyecto: any = [];
    actividadesProyecto: any = [];
    model: boolean = true;
    editingF: boolean = true;
    constructor(
        private config: DynamicDialogConfig,
        private fb: FormBuilder,
        private updateService: UpdateService,
        private router: Router,
        private listarService: ListService,
        private adminservice: AdminService,
        private helper: HelperService,
        private messageService: MessageService,
        private ref: DynamicDialogRef,
        private filter: FilterService,
        private auth:AuthService
    ) {
        this.fichaSectorialForm = this.fb.group({
            descripcion: ['', Validators.required],
            encargado: ['', Validators.required],
            direccion_geo: ['', Validators.required],
            estado: [undefined, Validators.required],
            actividad: [undefined, Validators.required],
            fecha_evento: [''],
            observacion: [''],
        });
    }
    token = this.auth.token();
    mostrar: boolean = false;
    id: any;
    check: any = {};
    ngOnInit(): void {
        this.check.EditFichaSectorialComponent =
            this.helper.decryptData('EditFichaSectorialComponent') || false;
        this.check.EditFichaAll =
            this.helper.decryptData('EditFichaAll') || false;
        if (!this.check.EditFichaSectorialComponent) {
            this.router.navigate(['/notfound']);
        }
        if (!this.token) {
            throw this.router.navigate(['/auth/login']);
        }

        if (this.config && this.config.data && this.config.data.id) {
            this.id = this.config.data.id;
            this.obtenerficha();
        }
        //console.log(this.id);

        const ident = this.adminservice.identity(this.token);
        if (ident) {
            const indentr = this.fichaSectorialForm.get('encargado');
            if (indentr) {
                indentr.setValue(ident);
            } else {
                //console.error('El control "direccion_geo" no está definido en el formulario.');
            }
        } else {
            this.router.navigate(['/auth/login']);
        }

        this.router.events.subscribe((val) => {
            // Verificar la ruta actual y ajustar el valor de model
            if (this.router.url === '/create-ficha-sectorial') {
                this.model = false; // Si la ruta es /create-estado-incidente, model es false
            } else {
                this.model = true; // En cualquier otra ruta, model es true
            }
        });
        this.listartEstados();
        this.listarActividadProyecto();
    }
    isJSONString(str: string) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }

    obtenerficha() {
        this.filter
            .obtenerActividadProyecto(this.token, this.id)
            .subscribe((response) => {
                if (response.data) {
                    const ficha = response.data;
                    for (const key in ficha) {
                        if (Object.prototype.hasOwnProperty.call(ficha, key)) {
                            const element = ficha[key];
                            const campo = this.fichaSectorialForm.get(key);
                            if (campo) {
                                campo.setValue(element);
                                if (
                                    key != 'observacion' &&
                                    key != 'estado' &&
                                    !this.check.EditFichaAll
                                ) {
                                    this.deshabilitarCampo(key);
                                }
                            }
                        }
                    }
                    if (
                        this.adminservice.roluser(this.token) &&
                        this.adminservice.roluser(this.token).nombre == 'Administrador'
                    ) {
                        this.habilitarCampo('direccion_geo');
                    }
                }
            });
       
    }
    deshabilitarCampo(campo: any) {
        this.fichaSectorialForm.get(campo)?.disable();
    }
    habilitarCampo(campo: any) {
        this.fichaSectorialForm.get(campo)?.enable();
    }
    listartEstados() {
        if (!this.token) {
            throw this.router.navigate(['/auth/login']);
        }
        this.listarService
            .listarEstadosActividadesProyecto(this.token)
            .subscribe(
                (response) => {
                    //console.log(response);
                    if (response.data.length > 0) {
                        this.estadosActividadProyecto = response.data;
                    }
                },
                (error) => {
                    //console.error(error);
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

    listarActividadProyecto() {
        if (!this.token) {
            throw this.router.navigate(['/auth/login']);
        }
        this.listarService.listarTiposActividadesProyecto(this.token).subscribe(
            (response) => {
                //console.log(response);
                if (response.data.length > 0) {
                    this.actividadesProyecto = response.data;
                    this.mostrar = true;
                }
            },
            (error) => {
                //console.error(error);
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

    abrirModal() {
        this.model = true; // Cambia model a true cuando se abre el modal
    }

    cerrarModal() {
        this.model = false; // Cambia model a false cuando se cierra el modal
    }
    hover = false;
    nombreArchivo: any;
    archivoSeleccionado: File | any;

    activarHover() {
        this.hover = true;
    }

    desactivarHover() {
        this.hover = false;
    }
    isMobil() {
        return this.helper.isMobil();
    }

    imagenesSeleccionadas: Array<any> = [];
    load_carrusel = false;
    public file: Array<any> = [];
    selectedFiles: File[] = [];
    upload = true;
    responsiveOptions = [
        {
            breakpoint: '1024px',
            numVisible: 5,
        },
        {
            breakpoint: '768px',
            numVisible: 3,
        },
        {
            breakpoint: '560px',
            numVisible: 1,
        },
    ];
    onFilesSelected(event: any): void {
        this.load_carrusel = false;
        const files: FileList = event.files;
        this.upload = true;
        for (let file of event.files) {
            this.selectedFiles.push(file);
            const objectURL = URL.createObjectURL(file);
            this.imagenesSeleccionadas.push({ itemImageSrc: objectURL });
        }

        this.messageService.add({
            severity: 'info',
            summary: 'File Uploaded',
            detail: this.selectedFiles.length + 'Imagenes subidas',
        });

        //console.log(this.selectedFiles,this.imagenesSeleccionadas );
        setTimeout(() => {
            this.load_carrusel = true;
        }, 1000);

        this.upload = false;
        /*
    const files: FileList = event.target.files;
    //console.log(files);
    if(!this.isMobil()){
      this.imagenesSeleccionadas=[];
      this.selectedFiles=[];
    }
    if (files && files.length > 0) {
      for (let i = 0; i < Math.min(files.length, 3); i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          alert('Por favor, seleccione archivos de imagen.');
          return;
        }
        if (file.size > 4 * 1024 * 1024) {
          alert('Por favor, seleccione archivos de imagen que sean menores a 4MB.');
          return;
        }
  
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagenesSeleccionadas.push(e.target.result);
        };
        reader.readAsDataURL(file);
        this.selectedFiles.push(file);        
      }
      setTimeout(() => {        
        this.load_carrusel = true;
      }, 500);
    }*/
    }

    eliminarImagen(index: number) {
        this.load_carrusel = false;
        this.upload = true;
        this.imagenesSeleccionadas.splice(index, 1);
        // Eliminar la imagen del arreglo selectedFiles
        this.selectedFiles.splice(index, 1);
        //console.log(this.selectedFiles,this.imagenesSeleccionadas);
        setTimeout(() => {
            this.load_carrusel = true;
        }, 500);
    }
    load_form = true;

    editarFichaSectorial() {
        this.load_form = false;
        //console.log("fichaSectorialForm", this.fichaSectorialForm, this.fichaSectorialForm.value);
        if (this.fichaSectorialForm?.valid) {
            if (this.token && this.fichaSectorialForm.value) {
                this.updateService
                    .actualizarActividadProyecto(
                        this.token,
                        this.id,
                        this.fichaSectorialForm.value
                    )
                    .subscribe(
                        (response) => {
                            //console.log(response);
                            if (response.data) {
                                this.messageService.add({
                                    severity: 'success',
                                    summary: 'Éxito',
                                    detail: 'Ficha Sectorial Actualizado',
                                });
                                this.ref.close();
                                location.reload();
                            }
                        },
                        (error) => {
                            //console.error(error);
                            if (error.error.message == 'InvalidToken') {
                                this.router.navigate(['/auth/login']);
                            } else {
                                this.messageService.add({
                                    severity: 'error',
                                    summary: (
                                        '(' +
                                        error.status +
                                        ')'
                                    ).toString(),
                                    detail:
                                        error.error.message || 'Sin conexión',
                                });
                            }
                        }
                    );
            } else {
                if (!this.token) {
                    throw this.router.navigate(['/auth/login']);
                }
            }
        } else {
            //console.log(this.fichaSectorialForm);
        }
    }
    responsiveimage(): string {
        return (window.innerWidth - 50).toString();
    }

    async tomarFotoYEnviar(event: any) {
        this.load_carrusel = false;
        this.upload = true;
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

            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.imagenesSeleccionadas.push({
                    itemImageSrc: e.target.result,
                });
            };
            reader.readAsDataURL(im);
            setTimeout(() => {
                this.load_carrusel = true;
            }, 1000);
            this.upload = false;
            if (this.selectedFiles.length == 2) {
                this.messageService.add({
                    severity: 'info',
                    summary: 'MAX img',
                    detail: 'Solo puede enviar 1 imangenes más',
                });
            }
        } else {
            this.messageService.add({
                severity: 'warning',
                summary: 'MAX img',
                detail: 'Solo puede enviar 3 imangenes',
            });
            //console.error('Error al obtener la cadena base64 de la imagen.');
        }
    }
}
