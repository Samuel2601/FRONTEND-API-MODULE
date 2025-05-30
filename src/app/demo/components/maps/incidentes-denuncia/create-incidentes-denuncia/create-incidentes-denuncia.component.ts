import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CreateService } from 'src/app/demo/services/create.service';
import { ListService } from 'src/app/demo/services/list.service';
import { AdminService } from 'src/app/demo/services/admin.service';
import { Router } from '@angular/router';
import {
    Camera,
    CameraResultType,
    CameraSource,
    Photo,
} from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { HelperService } from 'src/app/demo/services/helper.service';
import { MessageService } from 'primeng/api';
import {
    Geolocation,
    PermissionStatus,
    Position,
} from '@capacitor/geolocation';

import { GalleriaModule } from 'primeng/galleria';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { AuthService } from 'src/app/demo/services/auth.service';
@Component({
    selector: 'app-create-incidentes-denuncia',
    templateUrl: './create-incidentes-denuncia.component.html',
    styleUrl: './create-incidentes-denuncia.component.scss',
    providers: [MessageService],
})
export class CreateIncidentesDenunciaComponent implements OnInit {
    nuevoIncidenteDenuncia: FormGroup;
    categorias: any[] = [];
    subcategorias: any[] = [];
    model: boolean = true;
    constructor(
        private fb: FormBuilder,
        private createService: CreateService,
        private router: Router,
        private listService: ListService,
        private adminservice: AdminService,
        private helper: HelperService,
        private messageService: MessageService,
        private config: DynamicDialogConfig,
        private ref: DynamicDialogRef,
        private auth: AuthService
    ) {
        this.nuevoIncidenteDenuncia = this.fb.group({
            categoria: ['', Validators.required],
            subcategoria: ['', Validators.required],
            descripcion: ['', Validators.required],
            direccion_geo: [{}, Validators.required],
            ciudadano: ['', Validators.required],
            estado: ['', Validators.required],
        });
    }
    data: any;
    direccion: any;
    geolocation: any;
    mostrar: boolean = false;

    async tomarFoto() {
        const image: any = await Camera.getPhoto({
            quality: 100,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source: CameraSource.Prompt,
            promptLabelPhoto: 'Tomar foto',
            promptLabelPicture: 'Seleccionar de la galería',
        });

        this.imagenesSeleccionadas.push({
            itemImageSrc: `data:image/jpeg;base64,${image.base64String}`,
        });
        this.file.push(this.base64ToFile(image.base64String, 'imagen.jpg'));
    }

    base64ToFile(dataURI: string, fileName: string): File {
        const byteString = atob(dataURI.split(',')[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const int8Array = new Uint8Array(arrayBuffer);

        for (let i = 0; i < byteString.length; i++) {
            int8Array[i] = byteString.charCodeAt(i);
        }

        const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
        return new File([blob], fileName, { type: 'image/jpeg' });
    }
    async obtenerDireccion(latitud: any, longitud: any) {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitud}&lon=${longitud}&format=json`;
        //console.log("URL",url);
        fetch(url)
            .then((response) => response.json())
            .then((data) => {
                this.geolocation = data;
                //console.log('Dirección:', this.geolocation);
                return data;
            })
            .catch((error) => {
                console.error('Error al realizar la solicitud:', error);
            });
    }
    listartEstados() {
        this.listService.listarEstadosIncidentes(this.token).subscribe(
            (response) => {
                if (response.data && response.data.length > 0) {
                    const aux = response.data.find(
                        (elemnent) => elemnent.orden == 1
                    );
                    this.nuevoIncidenteDenuncia.get('estado').setValue(aux._id);
                    //console.log(this.nuevoIncidenteDenuncia.get('estado').value);
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

    tipocat: any;
    tiposucat: any;
    async ngOnInit() {
        if (this.config && this.config.data && this.config.data.data) {
            this.data = this.config.data.data;
        }
        if (this.config && this.config.data && this.config.data.direccion) {
            this.direccion = this.config.data.direccion;
        }
        if (this.config && this.config.data && this.config.data.tipo) {
            this.tipocat = this.config.data.tipo;
        }
        if (this.config && this.config.data && this.config.data.subtipo) {
            this.tiposucat = this.config.data.subtipo;
        }
        this.load_form = false;
        if (this.data) {
            this.nuevoIncidenteDenuncia.get('direccion_geo').setValue({
                nombre: this.data?.properties?.nombre
                    ? this.data.properties.nombre
                    : 'Barrio sin nombre',
                latitud: this.direccion.latitud,
                longitud: this.direccion.longitud,
            });
        } else {
            this.router.navigate(['/maps']); // Corregido: navigate espera un array como argumento
        }
        this.router.events.subscribe((val) => {
            // Verificar la ruta actual y ajustar el valor de model
            if (this.router.url === '/create-incidentes-denuncia') {
                this.model = false; // Si la ruta es /create-estado-incidente, model es false
            } else {
                this.model = true; // En cualquier otra ruta, model es true
            }
        });
        try {
            //this.getLocation();
            //console.log(this.data);
            //console.log(this.direccion);
            await Promise.all([
                await this.obtenerDireccion(
                    this.direccion.latitud,
                    this.direccion.longitud
                ),
                this.listarCategorias(),
                this.listartEstados(),
            ]);
        } finally {
            setTimeout(() => {
                this.load_form = true;
            }, 1500);
        }
    }

    getLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    alert(
                        'Latitude: ' +
                            position.coords.latitude +
                            ', Longitude: ' +
                            position.coords.longitude
                    );
                },
                (error) => {
                    //console.error('Error getting location: ' + error.message);
                }
            );
        } else {
            //console.error('Geolocation is not supported by this browser.');
        }
    }
    token = this.auth.token();
    selectcategoria() {
        if (this.nuevoIncidenteDenuncia.get('categoria')) {
            const id = this.nuevoIncidenteDenuncia.get('categoria')?.value._id;
            this.listService
                .listarSubcategorias(this.token, { categoria: id }, false)
                .subscribe(
                    (response) => {
                        //console.log(response)
                        this.subcategorias = response.data;
                        //console.log(this.tiposucat);
                        if (this.tiposucat) {
                            const subcategoriaEncontrada =
                                this.subcategorias.find(
                                    (subcategoria) =>
                                        subcategoria.nombre == this.tiposucat
                                );
                            if (subcategoriaEncontrada) {
                                this.nuevoIncidenteDenuncia
                                    .get('subcategoria')
                                    ?.setValue(subcategoriaEncontrada);
                                this.nuevoIncidenteDenuncia
                                    .get('subcategoria')
                                    ?.disable();
                            }
                        }
                    },
                    (error) => {
                        //console.log(error);
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
                //console.log(this.categorias, this.tipocat);
                if (this.tipocat) {
                    const categoriaEncontrada = this.categorias.find(
                        (categoria) => categoria.nombre === this.tipocat
                    );
                    if (categoriaEncontrada) {
                        this.nuevoIncidenteDenuncia
                            .get('categoria')
                            ?.setValue(categoriaEncontrada);
                        this.nuevoIncidenteDenuncia.get('categoria')?.disable();
                        //console.log(this.nuevoIncidenteDenuncia.value);
                        this.selectcategoria();
                    }
                }
                this.mostrar = true;
            },
            (error) => {
                //console.log(error);
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

    isMobil() {
        return this.helper.isMobil();
    }

    imagenesSeleccionadas: any[] = [];
    load_carrusel = false;
    upload: boolean = true;
    public file: Array<any> = [];

    onFileSelected(event: any): void {
        this.upload = true;
        const file: File = event.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Por favor, seleccione un archivo de imagen.');
                return;
            }
            if (file.size > 4 * 1024 * 1024) {
                alert(
                    'Por favor, seleccione un archivo de imagen que sea menor a 4MB.'
                );
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                this.imagenesSeleccionadas.push(reader.result);
            };
            setTimeout(() => {
                this.upload = false;
                this.mostrargale = true;
            }, 1000);
            reader.readAsDataURL(file);
            this.file.push(file);
        }
    }
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
    responsiveimage(): string {
        return (window.innerWidth - 70).toString();
    }

    mostrargale = false;
    onFilesSelected(event: any): void {
        //console.log(event);
        this.load_carrusel = false;
        const files: FileList = event.files;

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
        this.mostrargale = true;
    }

    selectedFiles: File[] = [];

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
                detail: 'Solo puede enviar 5 imangenes',
            });
            this.load_carrusel = true;
            //console.error('Error al obtener la cadena base64 de la imagen.');
        }
    }

    eliminarImagen(index: number) {
        this.load_carrusel = false;
        this.imagenesSeleccionadas.splice(index, 1);
        // Eliminar la imagen del arreglo selectedFiles
        this.selectedFiles.splice(index, 1);
        //console.log(this.selectedFiles,this.imagenesSeleccionadas);
        setTimeout(() => {
            this.load_carrusel = true;
        }, 500);
    }
    onHide() {
        this.displayCustom = false;
    }

    load_form: boolean = false;
    crearIncidenteDenuncia(): void {
        //console.log(this.nuevoIncidenteDenuncia.value);
        const token = this.auth.token();

        // Verificamos que el datatoken sea de tipo string
        if (!token || typeof token !== 'string') {
            console.error('Token inválido o no encontrado.');
            return;
        }
        this.nuevoIncidenteDenuncia
            .get('ciudadano')
            ?.setValue(this.auth.idUserToken(token));

        if (this.nuevoIncidenteDenuncia.valid) {
            this.nuevoIncidenteDenuncia.enable();
            this.load_form = false;
            // console.log(this.nuevoIncidenteDenuncia.value);
            this.createService
                .registrarIncidenteDenuncia(
                    this.token,
                    this.nuevoIncidenteDenuncia.value,
                    this.selectedFiles
                )
                .subscribe(
                    (response) => {
                        // Manejar la respuesta del servidor
                        //console.log(response);
                        if (response.data) {
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Ingresado',
                                detail: 'Correctamente',
                            });
                            //this.modalService.dismissAll();
                            this.ref.close();
                        }
                    },
                    (error) => {
                        // Manejar errores
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
        } else {
            this.messageService.add({
                severity: 'error',
                summary: 'ERROR',
                detail: 'Complete todo el formulario',
            });
        }
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
    getTextareaCols(): number {
        // Obtener el tamaño del contenedor
        const containerWidth =
            document.getElementById('descripcion').clientWidth;

        // Calcular el número aproximado de columnas basado en el ancho del contenedor y el tamaño promedio de un carácter
        const averageCharWidth = 8; // Puedes ajustar este valor según el tipo de fuente y tamaño
        const cols = Math.floor(containerWidth / averageCharWidth);

        return cols;
    }
    displayCustom: boolean | undefined;

    activeIndex: number = 0;

    images: any[] | undefined;
    imageClick(index: number) {
        this.activeIndex = index;
        this.displayCustom = true;
    }
}
