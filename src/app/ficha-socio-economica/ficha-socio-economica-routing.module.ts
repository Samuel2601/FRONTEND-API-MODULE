import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormularioSocioeconomicoComponent } from './formulario-socioeconomico/formulario-socioeconomico.component';
import { RegistolistSocioeconomicoComponent } from './registolist-socioeconomico/registolist-socioeconomico.component';
import { DashboardComponent } from './dashboard/dashboard.component';

const routes: Routes = [
    {
        path: 'formulario',
        component: FormularioSocioeconomicoComponent,
    },
    {
        path: 'registros',
        component: RegistolistSocioeconomicoComponent,
    },
    {
        path: 'dashboard',
        component: DashboardComponent,
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class FichaSocioEconomicaRoutingModule {}
