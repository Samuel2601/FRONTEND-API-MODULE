import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';
import { EditUsuarioComponent } from '../edit-usuario/edit-usuario.component';
import { Capacitor } from '@capacitor/core';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { App } from '@capacitor/app';
@Component({
  selector: 'app-index-usuario',
  templateUrl: './index-usuario.component.html',
  styleUrl: './index-usuario.component.scss'
})
export class IndexUsuarioComponent implements OnInit{
  url=GLOBAL.url;
  load_lista:boolean=true;
  usuarios:any[]=[];
  usuariosconst:any[]=[];
  token=this.helperservice.token();
  categoria:any;
  valor: any;
  opciones=[
      { label: 'Nombre', value: 'nombres' },
      { label: 'Correo', value: 'correo' },
      { label: 'Teléfono', value: 'telefono' },
      { label: 'Cédula', value: 'cedula' },
      { label: 'Rol', value: 'rol_user' }
  ]
  constructor(private ref: DynamicDialogRef,private router: Router,private listService:ListService,private helperservice:HelperService,private dialogService: DialogService){
  
  }
  ngOnInit() {  
    this.listusers();
  }

  listusers(){
    this.load_lista=true;
    this.listService.listarUsuarios(this.token).subscribe(response=>{
      if(response){
        this.usuarios=response.data;
        this.usuariosconst=response.data;
        this.ordenaryfiltrar('rol_user',undefined,this.orden);
        ////console.log(this.usuarios);
        this.load_lista=false; 
      }
    },error=>{
      //console.log(error);
    });
  }
  orden:any='asc';
  ordenaryfiltrar(categoria?: any, valor?: any, orden?: 'asc' | 'desc') {
    ////console.log(categoria, valor, orden);
    if (categoria && valor) {
        // Filtrar por categoría y valor
        if (categoria == 'rol_user') {
            this.usuarios = this.usuariosconst.filter(usuario => {
                return usuario[categoria].orden == valor || usuario[categoria].nombre.includes(valor);
            });
        } else {
          this.usuarios = this.usuariosconst.filter(usuario => {
            return usuario[categoria].toString().includes(valor);
        });
        }
        // Aplicar orden si se proporciona una dirección de ordenamiento
        if (orden) {
          this.usuarios = this.usuarios.sort((a, b) => {
              const compareValue = (a: any, b: any) => {
                  if (a < b) {
                      return -1;
                  } else if (a > b) {
                      return 1;
                  } else {
                      return 0;
                  }
              };
                const comparison = compareValue(a[categoria], b[categoria]);
                return orden === 'desc' ? comparison * -1 : comparison;
            });
        }
    } else if (categoria) {
        if (categoria === 'rol_user' && !valor) {
            // Ordenar por rol_user.orden si la categoría es rol_user y no se proporciona un valor
            this.usuarios = this.usuariosconst.sort((a, b) => {
                const compareValue = (a: any, b: any) => {
                    if (a < b) {
                        return -1;
                    } else if (a > b) {
                        return 1;
                    } else {
                        return 0;
                    }
                };
                const comparison = compareValue(a[categoria].orden, b[categoria].orden);
                return orden === 'desc' ? comparison * -1 : comparison;
            });
        } else {
            // Ordenar por la categoría proporcionada y la dirección indicada
            this.usuarios = this.usuariosconst.sort((a, b) => {
                const compareValue = (a: any, b: any) => {
                    if (a < b) {
                        return -1;
                    } else if (a > b) {
                        return 1;
                    } else {
                        return 0;
                    }
                };
                const comparison = compareValue(a[categoria], b[categoria]);
                return orden === 'desc' ? comparison * -1 : comparison;
            });
        }
      } else {
          // Restaurar la lista original
          this.usuarios = this.usuariosconst;
      }
  }

  
  isMobil() {
    return this.helperservice.isMobil();
  }
  editrow(id:any){
    this.ref = this.dialogService.open(EditUsuarioComponent, {
      header: 'Editar Usuario',
      width: this.isMobil()? '100%':'70%',
      data: { id: id },
    });
     App.addListener('backButton', data => {
       this.ref.close();
      });
  }
  openModal(content: any) {
    this.dialogService.open(content, { ariaLabelledBy: 'modal-basic-title' });
  }
  stopPropagation(event: MouseEvent) {
    event.stopPropagation();
  }
}
