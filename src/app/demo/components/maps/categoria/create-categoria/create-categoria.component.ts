import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { AuthService } from 'src/app/demo/services/auth.service';
import { CreateService } from 'src/app/demo/services/create.service';
import { HelperService } from 'src/app/demo/services/helper.service';
@Component({
    selector: 'app-create-categoria',
    templateUrl: './create-categoria.component.html',
    styleUrl: './create-categoria.component.scss',
    providers: [MessageService],
})
export class CreateCategoriaComponent implements OnInit {
    categoriaForm: FormGroup;
    constructor(
        private fb: FormBuilder,
        private createService: CreateService,
        private router: Router,
        private helper: HelperService,
        private messageService: MessageService,
        private auth: AuthService
    ) {
        this.categoriaForm = this.fb.group({
            nombre: ['', Validators.required],
            icono: ['', Validators.required],
            descripcion: ['', Validators.required],
        });
    }
    check: any = {};
    async ngOnInit(): Promise<void> {
        const checkObservables = {
            CreateCategoriaComponent: await this.auth.hasPermissionComponent(
                '/categoria',
                'post'
            ),
        };
        forkJoin(checkObservables).subscribe(async (check) => {
            this.check = check;
           // console.log(check);
            if (!this.check.CreateCategoriaComponent) {
                this.router.navigate(['/notfound']);
            }
            try {
            } catch (error) {
                console.error('Error en ngOnInit:', error);
                this.router.navigate(['/notfound']);
            }
        });
    }
    registrarCategoria() {
        if (this.categoriaForm.valid) {
            const token = this.auth.token();
            const data = {
                nombre: this.categoriaForm.value.nombre,
                descripcion: this.categoriaForm.value.descripcion,
                icono: this.categoriaForm.value.icono,
            };
            this.createService
                .registrarCategoria(token, data)
                .subscribe((response) => {
                    ////console.log(response);
                    if (response.data) {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Listo',
                            detail: 'Ingresado correctamente',
                        });
                        setTimeout(() => {
                            this.router.navigate(['/maps/categoria']);
                        }, 2000);
                    }
                    // Aquí puedes manejar la respuesta del servidor, como mostrar un mensaje de éxito o redirigir a otra página
                });
        } else {
            //console.log(this.categoriaForm);
            // Aquí puedes mostrar un mensaje de error o realizar alguna otra acción si el formulario no es válido
        }
    }
}
