import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecolectoresMunicipioRoutingModule } from './recolectores-municipales-routing.module';

import { ImportsModule } from 'src/app/demo/services/import';
import { ListarRecolectoresComponent } from './listar-recolectores/listar-recolectores.component';
import { AgregarRecolectorComponent } from './agregar-recolector/agregar-recolector.component';
import { AgregarUbicacionRecolectoresComponent } from './agregar-ubicacion-recolectores/agregar-ubicacion-recolectores.component';
import { FormularioSocioeconomicoComponent } from './formulario-socioeconomico/formulario-socioeconomico.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RecolectorEstadisticasComponent } from './recolector-estadisticas/recolector-estadisticas.component';

@NgModule({
    declarations: [
        ListarRecolectoresComponent,
        AgregarRecolectorComponent,
        AgregarUbicacionRecolectoresComponent,
        FormularioSocioeconomicoComponent,
        RecolectorEstadisticasComponent
    ],
    imports: [RecolectoresMunicipioRoutingModule, CommonModule, ImportsModule,FormsModule,ReactiveFormsModule],
})
export class RecolectoresMunicipalesModule {}
