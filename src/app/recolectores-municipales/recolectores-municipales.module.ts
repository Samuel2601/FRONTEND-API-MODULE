import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecolectoresMunicipioRoutingModule } from './recolectores-municipales-routing.module';

import { ImportsModule } from 'src/app/demo/services/import';
import { ListarRecolectoresComponent } from './listar-recolectores/listar-recolectores.component';
import { AgregarRecolectorComponent } from './agregar-recolector/agregar-recolector.component';
import { AgregarUbicacionRecolectoresComponent } from './agregar-ubicacion-recolectores/agregar-ubicacion-recolectores.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RecolectorEstadisticasComponent } from './recolector-estadisticas/recolector-estadisticas.component';
import { HerramientaRecolectorComponent } from './maps/herramienta-recolector.component.ts/herramienta-recolector.component';
import { ListaAsignacionesComponent } from './maps/lista-asignaciones/lista-asignaciones.component';
import { DetalleRutaComponent } from './maps/detalle-ruta/detalle-ruta.component';

@NgModule({
    declarations: [
        ListarRecolectoresComponent,
        AgregarRecolectorComponent,
        AgregarUbicacionRecolectoresComponent,
        RecolectorEstadisticasComponent,
        HerramientaRecolectorComponent,
        ListaAsignacionesComponent,
        DetalleRutaComponent,
    ],
    imports: [
        RecolectoresMunicipioRoutingModule,
        CommonModule,
        ImportsModule,
        FormsModule,
        ReactiveFormsModule,
    ],
})
export class RecolectoresMunicipalesModule {}
