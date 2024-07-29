import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AgregarRecolectorComponent } from './agregar-recolector/agregar-recolector.component';
import { AgregarUbicacionRecolectoresComponent } from './agregar-ubicacion-recolectores/agregar-ubicacion-recolectores.component';
import { ListarRecolectoresComponent } from './listar-recolectores/listar-recolectores.component';

@NgModule({
    imports: [RouterModule.forChild([
        { path: 'map', component: AgregarUbicacionRecolectoresComponent },
    ])],
    exports: [RouterModule]
})
export class RecolectoresMunicipioRoutingModule { }
