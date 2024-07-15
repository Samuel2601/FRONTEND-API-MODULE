import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ListService } from 'src/app/demo/services/list.service';
import { CreateService } from 'src/app/demo/services/create.service';
import { Router } from '@angular/router';
import { HelperService } from 'src/app/demo/services/helper.service';
import { MessageService } from 'primeng/api';
import { AuthService } from 'src/app/demo/services/auth.service';
@Component({
  selector: 'app-create-subcategoria',
  templateUrl: './create-subcategoria.component.html',
  styleUrl: './create-subcategoria.component.scss',
     providers: [MessageService]
})
export class CreateSubcategoriaComponent implements OnInit{
  categorias: any[] = [];
  subcategoriaForm:any={};
  constructor(private fb: FormBuilder,private listService: ListService, private createService:CreateService,private router: Router,private helper:HelperService,private messageService: MessageService,private auth:AuthService){
    this.subcategoriaForm = this.fb.group({
      categoria: ['', Validators.required],
      nombre: ['', Validators.required],
      descripcion: ['', Validators.required]
    });
  }
  check: any = {};
  ngOnInit() {
     this.check.CreateSubcategoriaComponent = this.helper.decryptData('CreateSubcategoriaComponent') || false;
        if (!this.check.CreateSubcategoriaComponent) {
            this.router.navigate(['/notfound']);
        }
    this.listarCategorias();
  }
  token=this.auth.token();
  listarCategorias() {
    this.listService.listarCategorias(this.token).subscribe(response => {
      this.categorias = response.data;
      //console.log(response);
    });
  }
  registrarSubcategoria() {
    if (this.subcategoriaForm.valid) {
      //console.log(this.subcategoriaForm);
    this.createService.registrarSubcategoria(this.token, this.subcategoriaForm.value).subscribe(response => {
        //console.log(response);
        if(response.data){
          this.messageService.add({severity: 'success', summary: 'Ingreso', detail: 'Correctamente'});
          setTimeout(() => {
            this.router.navigate(["/maps/categoria"]);
          }, 2000);
        }
        // Aquí puedes manejar la respuesta del servidor, como mostrar un mensaje de éxito o redirigir a otra página
      },error=>{
     this.messageService.add({severity: 'error', summary:  ('('+error.status+')').toString(), detail: error.error.message||'Sin conexión'});
    });
    } else {
      console.log(this.subcategoriaForm);
      this.messageService.add({severity: 'error', summary: 'Error' , detail: 'Algunos campos están Fallando'});
      // Aquí puedes mostrar un mensaje de error o realizar alguna otra acción si el formulario no es válido
    }
  }
}
