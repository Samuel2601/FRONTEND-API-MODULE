import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AgregarRecolectorComponent } from './agregar-recolector/agregar-recolector.component';
import { AgregarUbicacionRecolectoresComponent } from './agregar-ubicacion-recolectores/agregar-ubicacion-recolectores.component';
import { ListarRecolectoresComponent } from './listar-recolectores/listar-recolectores.component';
import { RecolectorEstadisticasComponent } from './recolector-estadisticas/recolector-estadisticas.component';
import { ListaAsignacionesComponent } from './maps/lista-asignaciones/lista-asignaciones.component';
import { DetalleRutaComponent } from './maps/detalle-ruta/detalle-ruta.component';
import { HerramientaRecolectorComponent } from './maps/herramienta-recolector.component.ts/herramienta-recolector.component';
@NgModule({
    imports: [
        RouterModule.forChild([
            { path: 'listar', component: ListarRecolectoresComponent },
            //{ path: 'map', component: AgregarUbicacionRecolectoresComponent },
            {
                path: 'map/:id',
                component: AgregarUbicacionRecolectoresComponent,
            },
            //listar-recolectores-asignacion
            {
                path: 'listar-asignacion',
                component: ListaAsignacionesComponent,
            },
            //detalle-ruta
            { path: 'detalle-ruta/:id', component: DetalleRutaComponent },
            //herramienta-recolector
            {
                path: 'map',
                component: HerramientaRecolectorComponent,
            },
            { path: 'register', component: AgregarRecolectorComponent },
            {
                path: 'status',
                component: RecolectorEstadisticasComponent,
            },
        ]),
    ],
    exports: [RouterModule],
})
export class RecolectoresMunicipioRoutingModule {}
