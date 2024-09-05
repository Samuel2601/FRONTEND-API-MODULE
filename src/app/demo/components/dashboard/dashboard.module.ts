import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardComponent } from './dashboard.component';
import { ChartModule } from 'primeng/chart';
import { MenuModule } from 'primeng/menu';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { StyleClassModule } from 'primeng/styleclass';
import { PanelMenuModule } from 'primeng/panelmenu';
import { DashboardsRoutingModule } from './dashboard-routing.module';
import { StackBarriosComponent } from './stack-barrios/stack-barrios.component';
import { StackFichasComponent } from './stack-fichas/stack-fichas.component';
import { StackIncidentesComponent } from './stack-incidentes/stack-incidentes.component';
import { StackbarriofichaComponent } from './stackbarrioficha/stackbarrioficha.component';
import { SplitterModule } from 'primeng/splitter';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { BadgeModule } from 'primeng/badge';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { ListFichaComponent } from './list-ficha/list-ficha.component';
import { ListIncidentesComponent } from './list-incidentes/list-incidentes.component';

import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { GalleriaModule } from 'primeng/galleria';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CalendarModule } from 'primeng/calendar';
import { MultiSelectModule } from 'primeng/multiselect';
import { MessageService } from 'primeng/api';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessagesModule } from 'primeng/messages';
import { MapaMostrarFichasComponent } from '../static-page/mapa-mostrar-fichas/mapa-mostrar-fichas.component';
@NgModule({
    imports: [
        MapaMostrarFichasComponent,
        CommonModule,
        FormsModule,
        ChartModule,
        MenuModule,
        TableModule,
        StyleClassModule,
        PanelMenuModule,
        ButtonModule,
        DashboardsRoutingModule,
        SplitterModule,
        ScrollPanelModule,
        TagModule,
        InputTextModule,
        BadgeModule,
        AvatarGroupModule,
        AvatarModule,
        DialogModule,
        ToastModule,
        GalleriaModule,
        CalendarModule,
        MultiSelectModule,
        ReactiveFormsModule,
        SelectButtonModule,
        MessagesModule
    ],
    declarations: [DashboardComponent,
        StackBarriosComponent,
        StackFichasComponent,
        StackIncidentesComponent,
        StackbarriofichaComponent,
        ListFichaComponent,
        ListIncidentesComponent
    ],
    exports: [
        StackFichasComponent,
        StackIncidentesComponent,
        ListIncidentesComponent,
        ListFichaComponent
    ],
    providers: [DialogService,DynamicDialogRef,MessageService],
})
export class DashboardModule { }
