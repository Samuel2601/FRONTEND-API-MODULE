import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PoliticasComponent } from './politicas.component';

@NgModule({
    imports: [RouterModule.forChild([
        { path: '', component: PoliticasComponent }
    ])],
    exports: [RouterModule]
})
export class PoliticasRoutingModule { }
