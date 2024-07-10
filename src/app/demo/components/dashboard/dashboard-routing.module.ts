import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { ListIncidentesComponent } from './list-incidentes/list-incidentes.component';
import { ListFichaComponent } from './list-ficha/list-ficha.component';

@NgModule({
    imports: [RouterModule.forChild([
        { path: '', component: DashboardComponent },
        { path: 'incidente', component: ListIncidentesComponent },  
        { path: 'ficha', component: ListFichaComponent },  
    ])],
    exports: [RouterModule]
})
export class DashboardsRoutingModule { }

