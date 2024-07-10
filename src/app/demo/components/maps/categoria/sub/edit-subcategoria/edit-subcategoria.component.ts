import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MessageService } from 'primeng/api';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { FilterService } from 'src/app/demo/services/filter.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';
import { UpdateService } from 'src/app/demo/services/update.service';

interface AutoCompleteCompleteEvent {
  originalEvent: Event;
  query: string;
}

@Component({
  selector: 'app-edit-subcategoria',
  templateUrl: './edit-subcategoria.component.html',
  styleUrl: './edit-subcategoria.component.scss',
   providers: [MessageService]
})
export class EditSubcategoriaComponent implements OnInit {
  id:any;
  subcategoria:any;
  token=this.helper.token();
  constructor(private obtener:FilterService,private update:UpdateService,private helper:HelperService,private modalService: NgbModal, private listar:ListService,private messageService: MessageService,private config: DynamicDialogConfig){

  }
  async ngOnInit() {
    //console.log(this.id);
     this.id = this.config.data.id;
    this.loadcategoria=false;
    try{

      await this.obtenerCategoria();
      await this.listarcategoria();
    }catch{
      this.modalService.dismissAll();
    } 
    finally{
      setTimeout(() => {
        this.loadcategoria=true;
      }, 500);
    }
  }
  loadcategoria=false;
  arrayCategoria:any[]=[];
  async listarcategoria(){
    this.listar.listarCategorias(this.token).subscribe(response=>{
      if(response.data){
        this.arrayCategoria=response.data;
      }
    });
  }
  filteredItems!: any[] ;
  filterItems(event: AutoCompleteCompleteEvent) {
    //in a real application, make a request to a remote url with the query and return filtered results, for demo we filter at client side
    let filtered: any[] = [];
    let query = event.query;

    for (let i = 0; i < (this.arrayCategoria as any[]).length; i++) {
        let item = (this.arrayCategoria as any[])[i];
        if (item.nombre.toLowerCase().indexOf(query.toLowerCase()) == 0) {
            filtered.push(item);
        }
    }

    this.filteredItems = filtered;
  }
  async obtenerCategoria(){
    this.obtener.obtenerSubcategoria(this.token,this.id).subscribe(response=>{
      this.subcategoria=response.data;
      //console.log(this.subcategoria);
    });
   
  }
  cerrar(){
    this.modalService.dismissAll();
  }

  updateCate(){
    this.update.actualizarSubcategoria(this.token,this.id,this.subcategoria).subscribe(response=>{
      if(response.data){
        let data=response.data;
        //console.log(data);
         this.messageService.add({severity: 'success', summary: 'Ingreso', detail: 'Bienvenido'});
        setTimeout(() => {          
          this.modalService.dismissAll();
        }, 1000);
      }
    },error=>{
     this.messageService.add({severity: 'error', summary:  ('('+error.status+')').toString(), detail: error.error.message||'Sin conexión'});
    });
  }
}
