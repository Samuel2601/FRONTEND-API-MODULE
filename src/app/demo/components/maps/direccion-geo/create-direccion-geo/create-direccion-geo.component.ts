import { AfterViewInit, Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CreateService } from 'src/app/demo/services/create.service';
import { ListService } from 'src/app/demo/services/list.service';
import { AdminService } from 'src/app/demo/services/admin.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { HelperService } from 'src/app/demo/services/helper.service';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { AuthService } from 'src/app/demo/services/auth.service';
@Component({
  selector: 'app-create-direccion-geo',
  templateUrl: './create-direccion-geo.component.html',
  styleUrl: './create-direccion-geo.component.scss'
})
export class CreateDireccionGeoComponent implements OnInit, AfterViewInit {
  valor: any | undefined;
  modal: any =true;
  fichaSectorialForm: FormGroup<any>;
  estadosActividadProyecto:any=[];
  actividadesProyecto:any=[];
  url=GLOBAL.url;
  constructor(private modalService: NgbModal,private fb: FormBuilder,private createService:CreateService,private router: Router,private listarService:ListService,private adminservice:AdminService,private helper:HelperService,private auth:AuthService,
    private config: DynamicDialogConfig){
    this.fichaSectorialForm = this.fb.group({
      direccion_geo: ['', Validators.required],
    });
  }
  ngAfterViewInit(): void {
    this.router.events.subscribe((val) => {
      // Verificar la ruta actual y ajustar el valor de modal
      if (this.router.url === '/create-direccion-geo') {
        this.modal = false; // Si la ruta es /create-estado-incidente, modal es false
      } else {
        this.modal = true; // En cualquier otra ruta, modal es true
      }
    });
  }
  token=this.auth.token();
  ngOnInit(): void {
    if(!this.token){
      throw this.router.navigate(["/auth/login"]);
    }
    if (this.config && this.config.data && this.config.data.feature) {
      this.valor = this.config.data.feature;
    }
    
    if (this.valor) {
      const direccionGeoControl = this.fichaSectorialForm.get('direccion_geo');
      if (direccionGeoControl) {
        direccionGeoControl.setValue(this.valor.properties.nombre);
      } else {
        //console.error('El control "direccion_geo" no está definido en el formulario.');
      }
    } else {
     // this.router.navigate(['/home']);
    }


  }

  DimissModal(){
    this.modalService.dismissAll();
  }

  abrirModal() {
    this.modal = true; // Cambia modal a true cuando se abre el modal
  }

  cerrarModal() {
    this.modal = false; // Cambia modal a false cuando se cierra el modal
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
  onFilesSelected(event: any): void {
    const files: FileList = event.files;
   
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
          this.nombreArchivo=e.target.result;
        };
        reader.readAsDataURL(file);
        //console.log(file)
        this.archivoSeleccionado=file;        
      }
    }
  }

  registrarFichaSectorial() {
    if (this.fichaSectorialForm?.valid) {
      if (this.token && this.fichaSectorialForm.value) {
        this.createService.registrarDireccionGeo(this.token, this.valor.id,this.archivoSeleccionado).subscribe(response => {
          //console.log(response);
          if(response.data){
            /*iziToast.success({
              title:'Listo',
              message:'Ingresado correctamente'
            });*/
            setTimeout(() => {
             location.reload();
            }, 1000);
          }
        }, error => {
          //console.error(error);
          if(error.error.message=='InvalidToken'){
            this.router.navigate(["/auth/login"]);
          }else{
            /*iziToast.error({
              title: ('('+error.status+')').toString(),
              position: 'bottomRight',
              message: error.error.message,
            });*/
          } 
        });
      }else{
        if(!this.token){
          throw this.router.navigate(["/auth/login"]);
        }
      }
    }else{
      //console.log(this.fichaSectorialForm.valid);
    }
  }
}
