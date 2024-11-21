import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FichaSocioEconomicaRoutingModule } from './ficha-socio-economica-routing.module';
import { ImportsModule } from '../demo/services/import';
import { FormularioSocioeconomicoComponent } from './formulario-socioeconomico/formulario-socioeconomico.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        FichaSocioEconomicaRoutingModule,
        FormularioSocioeconomicoComponent,
        ImportsModule,
        FormsModule,
        ReactiveFormsModule,
    ],
})
export class FichaSocioEconomicaModule {}
