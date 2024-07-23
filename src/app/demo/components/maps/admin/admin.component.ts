import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from 'src/app/demo/services/auth.service';
import { HelperService } from 'src/app/demo/services/helper.service';
@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit{
  selected:string='IndexUsuarioComponent';
  check:any={};
  constructor(private helperService: HelperService, private router: Router, private auth: AuthService) { }
  async ngOnInit(): Promise<void> {
    this.helperService.llamarspinner('admin componente');
    const checkObservables = {
      IndexUsuarioComponent: await this.auth.hasPermissionComponent('/obteneruserporcriterio', 'post'),
      IndexRolUserComponent: await this.auth.hasPermissionComponent('/obtenerrolesporcriterio', 'post'),
      IndexEncargadoCategoriaComponent: await this.auth.hasPermissionComponent('/encargado_categoria', 'get'),
      IndexPermisosComponent: await this.auth.hasPermissionComponent('/obtenerpermisosporcriterio', 'get'),
    };
    forkJoin(checkObservables).subscribe(async (check) => {
      this.check = check;
      //console.log(check);
      try {
        if (!this.check.IndexUsuarioComponent) {
          this.router.navigate(['/notfound']);
        }
         
    let found = false;
    for (const key in this.check) {
      if (this.check[key] && !found) {
        this.selected = key; // Assuming the keys are in the format 'IndexXxxComponent'
        ////console.log(this.selected);
        found = true;
      }
    }
      } catch (error) {
          console.error('Error en ngOnInit:', error);
          this.router.navigate(['/notfound']);
      } finally {
        this.helperService.cerrarspinner('admin componente');
      }
  });   

  }

}
