import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CreateService } from 'src/app/demo/services/create.service';
import { ListService } from 'src/app/demo/services/list.service';
import { AdminService } from 'src/app/demo/services/admin.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Capacitor } from '@capacitor/core';
import { HelperService } from 'src/app/demo/services/helper.service';
import { MessageService } from 'primeng/api';
import {
    Camera,
    CameraResultType,
    CameraSource,
    Photo,
} from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { GalleriaModule } from 'primeng/galleria';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { AuthService } from 'src/app/demo/services/auth.service';
@Component({
    selector: 'app-create-ficha-sectorial',
    templateUrl: './create-ficha-sectorial.component.html',
    styleUrl: './create-ficha-sectorial.component.scss',
    providers: [MessageService],
})
export class CreateFichaSectorialComponent implements OnInit {
    fichaSectorialForm: FormGroup<any>;
    estadosActividadProyecto: any = [];
    actividadesProyecto: any = [];
    model: boolean = true;
    data: any;
    constructor(
        private modalService: NgbModal,
        private config: DynamicDialogConfig,
        private fb: FormBuilder,
        private createService: CreateService,
        private router: Router,
        private listarService: ListService,
        private adminservice: AdminService,
        private helper: HelperService,
        private messageService: MessageService,
        private ref: DynamicDialogRef,
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
    ngOnInit(): void {
        if (this.config && this.config.data && this.config.data.data) {
            this.data = this.config.data.data;
        }

        if (this.data) {
            const direccionGeoControl =
                this.fichaSectorialForm.get('direccion_geo');
            if (direccionGeoControl) {
                direccionGeoControl.setValue(this.data.properties.nombre);
            } else {
                //console.error('El control "direccion_geo" no está definido en el formulario.');
            }
        } else {
            this.router.navigate(['/home']);
        }
        const ident = this.auth.idUserToken();
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
    listartEstados() {
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
    DimissModal() {
        this.modalService.dismissAll();
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
        //this.load_carrusel = false;
        const files: FileList = event.files;
        this.upload = true;
        for (let file of event.files) {
            this.selectedFiles.push(file);
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

        //console.log(this.selectedFiles,this.imagenesSeleccionadas );
        setTimeout(() => {
            this.load_carrusel = true;
        }, 1000);

        
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
       // this.load_carrusel = false;
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

    registrarFichaSectorial() {
        this.load_form = false;
        //console.log("fichaSectorialForm",this.fichaSectorialForm);
        if (this.fichaSectorialForm?.valid) {
            if (this.fichaSectorialForm.value) {
                this.createService
                    .registrarActividadProyecto(
                        this.token,
                        this.fichaSectorialForm.value,
                        this.selectedFiles
                    )
                    .subscribe(
                        (response) => {
                            //console.log(response);
                            if (response.data) {
                                this.messageService.add({
                                    severity: 'success',
                                    summary: 'Listo',
                                    detail: 'Ingresado correctamente',
                                });
                                this.ref.close();
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
            }
        } else {
            //console.log(this.fichaSectorialForm);
        }
    }
    responsiveimage(): string {
        return (window.innerWidth - 50).toString();
    }

    async tomarFotoYEnviar(event: any) {
        //this.load_carrusel = false;
        this.upload = true;
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source: CameraSource.Prompt,
            promptLabelPhoto: 'Seleccionar de la galería',
            promptLabelPicture: 'Tomar foto',
        });
        if (image && image.base64String && this.selectedFiles.length <= 5) {
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
            if (this.selectedFiles.length == 5) {
                this.upload = false;
            }
        } else {
            this.messageService.add({
                severity: 'warning',
                summary: 'MAX img',
                detail: 'Solo puede enviar 5 imangenes',
            });
            //console.error('Error al obtener la cadena base64 de la imagen.');
        }
    }
    displayCustom: boolean | undefined;

    activeIndex: number = 0;

    images: any[] | undefined;
    imageClick(index: number) {
        this.activeIndex = index;
        this.displayCustom = true;
    }
}
