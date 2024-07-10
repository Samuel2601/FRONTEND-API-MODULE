import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CreateService } from 'src/app/demo/services/create.service';
import { Router } from '@angular/router';
import { HelperService } from 'src/app/demo/services/helper.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-create-estado-actividad-proyecto',
  templateUrl: './create-estado-actividad-proyecto.component.html',
  styleUrl: './create-estado-actividad-proyecto.component.scss',
  providers: [MessageService]
})
export class CreateEstadoActividadProyectoComponent implements OnInit {
  estadoIncidenteForm: FormGroup<any>;
  model: boolean=true;
  constructor(private fb: FormBuilder,private createService:CreateService,private router: Router,private helper:HelperService,private messageService: MessageService,){
    this.estadoIncidenteForm = this.fb.group({
      nombre: ['', Validators.required]
    });
  }
  ngOnInit(): void {
    this.router.events.subscribe((val) => {
      // Verificar la ruta actual y ajustar el valor de model
      if (this.router.url === '/create-estado-incidente') {
        this.model = false; // Si la ruta es /create-estado-incidente, model es false
      } else {
        this.model = true; // En cualquier otra ruta, model es true
      }
    });
  }
  abrirModal() {
    this.model = true; // Cambia model a true cuando se abre el modal
  }

  cerrarModal() {
    this.model = false; // Cambia model a false cuando se cierra el modal
  }
   isMobil() {
    return this.helper.isMobil();
  }
  token = this.helper.token();
  registrarEstadoActividadP() {
    if(this.estadoIncidenteForm.valid){
      if(!this.token){
        throw this.router.navigate(["/auth/login"]);
      }
      this.createService.registrarEstadoActividadProyecto(this.token,this.estadoIncidenteForm.value).subscribe(response=>{
        //console.log(response);
        if(response.data){
          this.messageService.add({severity: 'success', summary: 'Ingresado', detail: 'Correcto'});
          setTimeout(() => {
            this.router.navigate(["/home"]);
          }, 2000);
        }
      },error=>{
        //console.error(error);
      });
    }
  }
}
