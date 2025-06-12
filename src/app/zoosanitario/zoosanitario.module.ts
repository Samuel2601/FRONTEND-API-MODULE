import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QrScannerService } from './utils/QR/QrScanner.service';
import { ImportsModule } from '../demo/services/import';
import { WorkflowGuard } from './guards/workflow.guard';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { AutoSaveDirective } from './utils/directives/auto-save.directive';
import { NumericOnlyDirective } from './utils/directives/numeric-only.directive';
import { UpperCaseDirective } from './utils/directives/upper-case.directive';
import { ConfirmationService } from 'primeng/api';
//import { SlaughterDashboardComponent } from './components/dashboard/dashboard.component';
//import { ReceptionComponent } from './components/reception/reception.component';
//import { ExternalInspectionComponent } from './components/external-inspection/external-inspection.component';
//import { SlaughterComponent } from './components/slaughter/slaughter.component';
//import { InvoiceListComponent } from './components/invoice/list/invoice-list.component';
//import { InvoiceFormComponent } from './components/invoice/form/invoice-form.component';
//import { IntroducerListComponent } from './components/introducer/list/introducer-list.component';
//import { IntroducerFormComponent } from './components/introducer/form/introducer-form.component';
//import { IntroducerDetailComponent } from './components/introducer/detail/introducer-detail.component';
import { ReferenceValuesComponent } from './components/config/reference-values/list/reference-values.component';
import { RatesComponent } from './components/config/rate/list/rates.component';
import { RateFormComponent } from './components/config/rate/form/rate-form.component';
import { ReferenceValueFormComponent } from './components/config/reference-values/form/reference-value-form.component';
import { ConfigDashboardComponent } from './components/config/dashboard/config-dashboard.component';
import { RateDetailsComponent } from './components/config/rate-details/list/rate-details.component';
import { RateDetailFormComponent } from './components/config/rate-details/form/rate-detail-form.component';
import { IntroducerListComponent } from './components/introducer/list/introducer-list.component';
import { IntroducerFormComponent } from './components/introducer/form/introducer-form.component';
import { IntroducerDetailComponent } from './components/introducer/detail/introducer-detail.component';
import { ReceptionComponent } from './components/reception/reception.component';
import { ReceptionListComponent } from './components/reception/list/reception-list.component';
import { ExternalInspectionListComponent } from './components/external-inspection/external-inspection-list.component';

// Rutas del módulo
const routes: Routes = [
    /*{
        path: '',
        component: SlaughterDashboardComponent,
        data: { title: 'Dashboard Veterinario' },
    },
    {
        path: 'dashboard',
        component: SlaughterDashboardComponent,
        data: { title: 'Dashboard Veterinario' },
    },
    {
        path: 'reception',
        component: ReceptionComponent,
        data: { title: 'Recepción' },
    },
    {
        path: 'external-inspection',
        component: ExternalInspectionComponent,
        data: { title: 'Inspección Externa' },
    },
    //SlaughterComponent
    {
        path: 'external-inspection/:id',
        component: ExternalInspectionComponent,
        data: { title: 'Inspección Externa' },
    },*/
    {
        path: 'workflow',
        children: [
            {
                path: '',
                component: ReceptionComponent,
                data: { title: 'Recepción' },
            },
            {
                path: 'reception',
                component: ReceptionComponent,
                data: { title: 'Recepción' },
            },
            {
                path: 'list-reception',
                component: ReceptionListComponent,
                data: { title: 'Recepción Listado' },
            },
            {
                path: 'external-inspection',
                component: ExternalInspectionListComponent,
                data: { title: 'Inspecciones Externas' },
            },
            {
                path: 'external-inspection/:inspectionNumber',
                component: ExternalInspectionListComponent,
                data: { title: 'Inspecciones Externas' },
            },
        ],
    },
    {
        path: 'introducers',
        children: [
            {
                path: '',
                component: IntroducerListComponent,
                data: { title: 'Introducer' },
            },
            {
                path: 'new',
                component: IntroducerFormComponent,
                data: { title: 'Introducer' },
            },
            {
                path: 'edit/:id',
                component: IntroducerFormComponent,
                data: { title: 'Introducer' },
            },
            {
                path: 'view/:id',
                component: IntroducerDetailComponent,
                data: { title: 'Introducer' },
            },
        ],
    },

    {
        path: 'config',
        children: [
            {
                path: '',
                component: ConfigDashboardComponent,
            },
            {
                path: 'reference-values',
                children: [
                    {
                        path: '',
                        component: ReferenceValuesComponent,
                    },
                    {
                        path: 'new',
                        component: ReferenceValueFormComponent,
                    },
                    {
                        path: 'edit/:id',
                        component: ReferenceValueFormComponent,
                    },
                    {
                        path: 'view/:id',
                        component: ReferenceValueFormComponent,
                    },
                ],
            },
            {
                path: 'rate',
                children: [
                    {
                        path: '',
                        component: RatesComponent,
                    },
                    {
                        path: 'new',
                        component: RateFormComponent,
                    },
                    {
                        path: 'edit/:id',
                        component: RateFormComponent,
                    },
                    {
                        path: 'view/:id',
                        component: RateFormComponent,
                    },
                ],
            },
            {
                path: 'rates-details',
                children: [
                    {
                        path: '',
                        component: RateDetailsComponent,
                    },
                    {
                        path: 'new',
                        component: RateDetailFormComponent,
                    },
                    {
                        path: 'edit/:id',
                        component: RateDetailFormComponent,
                    },
                    {
                        path: 'view/:id',
                        component: RateDetailsComponent,
                    },
                ],
            },
        ],
    },
];

@NgModule({
    declarations: [
        // Componentes principales

        // Directivas personalizadas
        AutoSaveDirective,
        NumericOnlyDirective,
        UpperCaseDirective,
    ],
    imports: [
        CommonModule,
        ImportsModule,
        RouterModule.forChild(routes),
        IonicModule,
        //TariffModuleSimple,
    ],
    providers: [QrScannerService, WorkflowGuard, ConfirmationService],
    exports: [
        // Exportar directivas
        AutoSaveDirective,
        NumericOnlyDirective,
        UpperCaseDirective,
    ],
})
export class ZooSanitarioModule {}
