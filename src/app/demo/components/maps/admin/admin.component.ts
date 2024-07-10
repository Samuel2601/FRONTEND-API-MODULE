import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HelperService } from 'src/app/demo/services/helper.service';
@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit{
  selected:string='IndexUsuarioComponent';
  check:any={};
  constructor(private helperService: HelperService, private router: Router) { }
  async ngOnInit(): Promise<void> {
    this.helperService.llamarspinner();
    try {
      this.check.AdminComponent = this.helperService.decryptData('AdminComponent') || false;
      if (!this.check.AdminComponent) {
        this.router.navigate(['/notfound']);
      }
      this.check.IndexUsuarioComponent = this.helperService.decryptData('IndexUsuarioComponent')  || false;
      this.check.IndexRolUserComponent = this.helperService.decryptData('IndexRolUserComponent') || false;
      this.check.IndexEncargadoCategoriaComponent = this.helperService.decryptData('IndexEncargadoCategoriaComponent') || false;
      this.check.IndexPermisosComponent = this.helperService.decryptData('IndexPermisosComponent')  || false;
      ////console.log(this.check);
    } catch (error) {
      
      //console.error('Error al verificar permisos:', error);
      this.router.navigate(['/notfound']);
      
    }
    this.helperService.cerrarspinner();
    let found = false;
    for (const key in this.check) {
      if (this.check[key] && !found) {
        this.selected = key; // Assuming the keys are in the format 'IndexXxxComponent'
        ////console.log(this.selected);
        found = true;
      }
    }

  }

}
