import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
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
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-edit-ficha-sectorial',
    templateUrl: './edit-ficha-sectorial.component.html',
    styleUrl: './edit-ficha-sectorial.component.scss',
})
export class EditFichaSectorialComponent implements OnInit {
    fichaSectorialForm: FormGroup;
    estadosActividadProyecto: any = [];
    actividadesProyecto: any = [];
    model = true;
    editingF = true;
    mostrar = false;
    id: any;
    check: any = {};
    ficha: any = {};
    token = this.auth.token();
    hover = false;
    nombreArchivo: any;
    archivoSeleccionado: File | any;
    imagenesSeleccionadas: Array<any> = [];
    load_carrusel = false;
    selectedFiles: File[] = [];
    upload = true;
    responsiveOptions = [
      { breakpoint: '1024px', numVisible: 5 },
      { breakpoint: '768px', numVisible: 3 },
      { breakpoint: '560px', numVisible: 1 }
    ];
    load_form = true;
  
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
      private auth: AuthService
    ) {
        this.fichaSectorialForm = this.fb.group({
            direccion_geo: ['', Validators.required],
            actividad: ['', Validators.required],
            fecha_evento: ['', Validators.required],
            estado: ['', Validators.required],
            es_articulo: [false],
            descripcion: ['Texto inicial de la descripción', Validators.required],
            observacion: [''],
            mostrar_en_mapa: [false],
            title_marcador: [''],
            icono_marcador: ['']
          });
          
    }
  
    async ngOnInit(): Promise<void> {
      this.load_form = false;

      const checkObservables = {
        EditFichaSectorialComponent: await this.auth.hasPermissionComponent('/ficha_sectorial/:id', 'put')
      };
  
      forkJoin(checkObservables).subscribe(async (check) => {
        this.check = check;
        console.log(check);
        try {
          if (!this.check.EditFichaSectorialComponent) {
            this.router.navigate(['/notfound']);
            return;
          }
          if (this.config?.data?.id) {
            this.id = this.config.data.id;
            await this.obtenerficha();
          }
  
          const ident = this.adminservice.identity(this.token);
          if (ident) {
            this.fichaSectorialForm.get('encargado')?.setValue(ident);
          } else {
            this.router.navigate(['/auth/login']);
            return;
          }
  
          this.router.events.subscribe((val) => {
            this.model = this.router.url === '/create-ficha-sectorial' ? false : true;
          });
          this.listartEstados();
          this.listarActividadProyecto();
        } catch (error) {
          console.error('Error en ngOnInit:', error);
          this.router.navigate(['/notfound']);
        } finally {
          this.load_form = true;
        }
      });
    }
  
    async formatear() {
      this.fichaSectorialForm = this.fb.group({
        descripcion: new FormControl(this.ficha.descripcion||'', []),
        encargado: [this.ficha.encargado || '', Validators.required],
        direccion_geo: [this.ficha.direccion_geo || '', Validators.required],
        estado: [this.ficha.estado || undefined, Validators.required],
        actividad: [this.ficha.actividad || undefined, Validators.required],
        fecha_evento: [this.ficha.fecha_evento || ''],
        observacion: [this.ficha.observacion || ''],
        es_articulo: [this.ficha.es_articulo || false],
        view: [this.ficha.view || false],
        view_id: [this.ficha.view_id || ''],
        mostrar_en_mapa: [this.ficha.mostrar_en_mapa || false],
        title_marcador: [this.ficha.title_marcador || ''],
        icono_marcador: [this.ficha.icono_marcador || '', Validators.pattern('https?://.+')]
      });
      console.log(this.fichaSectorialForm.value);
    }
  
    async obtenerficha() {
      this.filter.obtenerActividadProyecto(this.token, this.id).subscribe(async (response) => {
        if (response.data) {
          this.ficha = response.data;
          await this.formatear();
          Object.keys(this.ficha).forEach(key => {
            const element = this.ficha[key];
            const campo = this.fichaSectorialForm.get(key);
            if (campo) {
              campo.setValue(element);
              if (!this.check.EditFichaAll && ['descripcion', 'observacion', 'estado', 'mostrar_en_mapa', 'icono_marcador', 'es_articulo'].indexOf(key) === -1) {
                this.deshabilitarCampo(key);
              }
            }
          });
          if (this.adminservice.roluser(this.token)?.nombre === 'Administrador') {
            this.habilitarCampo('direccion_geo');
          }
        }
      });
    }
  
    deshabilitarCampo(campo: string) {
      this.fichaSectorialForm.get(campo)?.disable();
    }
  
    habilitarCampo(campo: string) {
      this.fichaSectorialForm.get(campo)?.enable();
    }
  
    listartEstados() {
      this.listarService.listarEstadosActividadesProyecto(this.token).subscribe(
        (response) => {
          if (response.data.length > 0) {
            this.estadosActividadProyecto = response.data;
          }
        },
        (error) => {
          if (error.error.message === 'InvalidToken') {
            this.router.navigate(['/auth/login']);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: `(${error.status})`,
              detail: error.error.message || 'Sin conexión'
            });
          }
        }
      );
    }
  
    listarActividadProyecto() {
      this.listarService.listarTiposActividadesProyecto(this.token).subscribe(
        (response) => {
          if (response.data.length > 0) {
            this.actividadesProyecto = response.data;
            this.mostrar = true;
          }
        },
        (error) => {
          if (error.error.message === 'InvalidToken') {
            this.router.navigate(['/auth/login']);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: `(${error.status})`,
              detail: error.error.message || 'Sin conexión'
            });
          }
        }
      );
    }
  
    abrirModal() {
      this.model = true;
    }
  
    cerrarModal() {
      this.model = false;
    }
  
    activarHover() {
      this.hover = true;
    }
  
    desactivarHover() {
      this.hover = false;
    }
  
    isMobil() {
      return this.helper.isMobil();
    }
  
    onFilesSelected(event: any): void {
      this.load_carrusel = false;
      this.upload = true;
      for (let file of event.files) {
        this.selectedFiles.push(file);
        const objectURL = URL.createObjectURL(file);
        this.imagenesSeleccionadas.push({ itemImageSrc: objectURL });
      }
  
      this.messageService.add({
        severity: 'info',
        summary: 'File Uploaded',
        detail: `${this.selectedFiles.length} Imagenes subidas`
      });
  
      setTimeout(() => {
        this.load_carrusel = true;
      }, 1000);
  
      this.upload = false;
    }
  
    eliminarImagen(index: number) {
      this.load_carrusel = false;
      this.upload = true;
      this.imagenesSeleccionadas.splice(index, 1);
      this.selectedFiles.splice(index, 1);
      setTimeout(() => {
        this.load_carrusel = true;
      }, 500);
    }
  
    editarFichaSectorial() {
      this.load_form = false;
      if (this.fichaSectorialForm?.valid) {
        this.updateService.actualizarActividadProyecto(this.token, this.id, this.fichaSectorialForm.value).subscribe(
          (response) => {
            if (response.data) {
              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Ficha Sectorial Actualizado'
              });
              this.ref.close();
              location.reload();
            }
          },
          (error) => {
            console.error(error);
            if (error.error.message === 'InvalidToken') {
              this.router.navigate(['/auth/login']);
            } else {
              this.messageService.add({
                severity: 'error',
                summary: `(${error.status})`,
                detail: error.error.message || 'Sin conexión'
              });
            }
            this.load_form = true;
          }
        );
      }
    }
  }
