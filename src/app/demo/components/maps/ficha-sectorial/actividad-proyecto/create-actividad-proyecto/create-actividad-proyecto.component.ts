import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthService } from 'src/app/demo/services/auth.service';
import { CreateService } from 'src/app/demo/services/create.service';
import { HelperService } from 'src/app/demo/services/helper.service';

@Component({
    standalone: false,
  selector: 'app-create-actividad-proyecto',
  templateUrl: './create-actividad-proyecto.component.html',
  styleUrl: './create-actividad-proyecto.component.scss',
  providers: [MessageService]
})
export class CreateActividadProyectoComponent implements OnInit{
  estadoIncidenteForm: FormGroup<any>;
  model: boolean=true;
  constructor(private auth:AuthService,private fb: FormBuilder,private createService:CreateService,private router: Router,private helper:HelperService,private messageService: MessageService,){
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
    isMobil() {
    return this.helper.isMobil();
  }
  token=this.auth.token();
  registrarActividadP() {
    if (this.estadoIncidenteForm.valid) {
        this.createService.registrarTipoActividadProyecto(this.token, this.estadoIncidenteForm.value).subscribe(response => {
            //console.log(response);
            if(response.data){
              this.messageService.add({severity: 'success', summary: 'Listo', detail: 'Ingresado correctamente'});
              setTimeout(() => {
                this.router.navigate(["/home"]);
              }, 2000);
            }
        }, error => {
            //console.error(error);
        });
    }
  }

}

