import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AgregarRecolectorComponent } from './agregar-recolector/agregar-recolector.component';
import { AgregarUbicacionRecolectoresComponent } from './agregar-ubicacion-recolectores/agregar-ubicacion-recolectores.component';
import { ListarRecolectoresComponent } from './listar-recolectores/listar-recolectores.component';
import { FormularioSocioeconomicoComponent } from './formulario-socioeconomico/formulario-socioeconomico.component';
@NgModule({
    imports: [
        RouterModule.forChild([
            { path: 'listar', component: ListarRecolectoresComponent },
            { path: 'map', component: AgregarUbicacionRecolectoresComponent },
            { path: 'map/:id', component: AgregarUbicacionRecolectoresComponent },
            { path: 'register', component: AgregarRecolectorComponent },
            {
                path: 'formulario',
                component: FormularioSocioeconomicoComponent,
            },
        ]),
    ],
    exports: [RouterModule],
})
export class RecolectoresMunicipioRoutingModule {}
