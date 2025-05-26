import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

import { PoliticasRoutingModule } from './politicas-routing.module';
import { PoliticasComponent } from './politicas.component';

import { FieldsetModule } from 'primeng/fieldset';
import { DividerModule } from 'primeng/divider';
import { ImportsModule } from 'src/app/demo/services/import';
@NgModule({
    imports: [
        CommonModule,
        PoliticasRoutingModule,
        ButtonModule,
        FieldsetModule,
        DividerModule,
        ImportsModule,
    ],
    declarations: [PoliticasComponent],
})
export class PoliticasModule {}
