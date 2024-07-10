import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MessageService } from 'primeng/api';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { CreateService } from 'src/app/demo/services/create.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';

@Component({
  selector: 'app-create-permisos',
  templateUrl: './create-permisos.component.html',
  styleUrl: './create-permisos.component.scss'
})
export class CreatePermisosComponent implements OnInit{
  componente:any;
  componentes: string[] = [
    'ReporteIncidenteView',
    'ReporteFichaView',
    'BorrarIncidente',
    'ContestarIncidente',
    'ViewIncidente',
    'FichaLimitada',
    'EditFichaAll',
    'TotalFilterIncidente',
    'TotalFilter',
    'DashboardComponent',
    'CreateCategoriaComponent',
    'IndexCategoriaComponent',
    'EditCategoriaComponent',
    'CreateSubcategoriaComponent',
    'IndexSubcategoriaComponent',
    'EditSubcategoriaComponent',
    'ErrorComponent',
    'IndexUsuarioComponent',
    'EditUsuarioComponent',
    'CreateUsuarioComponent',
    'CreateFichaSectorialComponent',
    'IndexFichaSectorialComponent',
    'EditFichaSectorialComponent',
    'IndexIncidentesDenunciaComponent',
    'CreateIncidentesDenunciaComponent',
    'EditIncidentesDenunciaComponent',
    'IndexEncargadoCategoriaComponent',
    'CreateEncargadoCategoriaComponent',
    'EditEncargadoCategoriaComponent',
    'IndexRolUserComponent',
    'EditRolUserComponent',
    'CreateRolUserComponent',
    'IndexEstadoIncidenteComponent',
    'EditEstadoIncidenteComponent',
    'CreateEstadoIncidenteComponent',
    'IndexEstadoActividadProyectoComponent',
    'EditEstadoActividadProyectoComponent',
    'CreateEstadoActividadProyectoComponent',
    'IndexActividadProyectoComponent',
    'EditActividadProyectoComponent',
    'CreateActividadProyectoComponent',
    'IndexDireccionGeoComponent',
    'EditDireccionGeoComponent',
    'CreateDireccionGeoComponent',
    'IndexPermisosComponent',
    'EditPermisosComponent',
    'CreatePermisosComponent',
    'AdminComponent',
  ];
  rol:any;
  roles:any;
  newpermiso: any={};
  constructor(private modalService: NgbModal, private listService:ListService,private createService:CreateService,private helper:HelperService,private messageService: MessageService,private ref: DynamicDialogRef){

  }
  ngOnInit(): void {
    this.listarrol();
  }
  token = this.helper.token();
  listarrol(){
    this.listService.listarRolesUsuarios(this.token).subscribe(response=>{
      this.roles=response.data;
    });
  }
  addrol(id:any){
    ////console.log(id,this.rol);
    this.newpermiso.rolesPermitidos.push(this.rol);
  }
  enviar(){
    //console.log(this.newpermiso);
    this.createService.registrarPermiso(this.token,this.newpermiso).subscribe(response=>{
      //console.log(response);
      this.messageService.add({ severity: 'success', summary: 'Ingresado', detail: response.message });
      setTimeout(() => {
        this.ref.close(true);
      }, 500);
    });
  }
}
