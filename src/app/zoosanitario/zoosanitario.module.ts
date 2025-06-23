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
import { RateFormComponent } from './components/config/rate/form/rate-form.component';
import { ReferenceValueFormComponent } from './components/config/reference-values/form/reference-value-form.component';
import { IntroducerListComponent } from './components/introducer/list/introducer-list.component';
import { IntroducerFormComponent } from './components/introducer/form/introducer-form.component';
import { IntroducerDetailComponent } from './components/introducer/detail/introducer-detail.component';
import { ReceptionComponent } from './components/reception/reception.component';
import { ReceptionListComponent } from './components/reception/list/reception-list.component';
import { ExternalInspectionListComponent } from './components/external-inspection/external-inspection-list.component';
import { SlaughterProcessListComponent } from './components/slaughter/list/slaughter-process-list.component';
//import { SlaughterProcessFormComponent } from './components/slaughter/form/slaughter-process-form.component';
import { RateListComponent } from './components/config/rate/list/rate-list.component';
import { InvoiceListComponent } from './components/invoice/list/invoice-list.component';
import { InvoiceFormComponent } from './components/invoice/form/invoice-form.component';
import { InvoiceDetailComponent } from './components/invoice/detail/invoice-detail.component';
import { FileSizePipe } from './utils/pipes/filesize.pipe';
import { SlaughterDashboardComponent } from './components/dashboard/dashboard.component';

// Rutas del módulo
const routes: Routes = [
    {
        path: '',
        component: SlaughterDashboardComponent,
        data: { title: 'Dashboard Veterinario' },
    },
    /*
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
                path: 'listar-reception',
                component: ReceptionListComponent,
                data: { title: 'Recepción Listado' },
            },

            // === RUTAS PARA INSPECCIONES EXTERNAS ===

            // Ruta genérica (por defecto recepción)
            {
                path: 'external-inspection',
                redirectTo: 'external-inspection/recepcion',
                pathMatch: 'full',
            },

            // Rutas específicas por fase
            {
                path: 'external-inspection/recepcion',
                component: ExternalInspectionListComponent,
                data: {
                    title: 'Inspecciones de Recepción',
                    phase: 'recepcion',
                },
            },
            {
                path: 'external-inspection/ante-mortem',
                component: ExternalInspectionListComponent,
                data: {
                    title: 'Exámenes Ante Mortem',
                    phase: 'anteMortem',
                },
            },

            // Rutas con ID específico por fase
            {
                path: 'external-inspection/recepcion/:receptionId',
                component: ExternalInspectionListComponent,
                data: {
                    title: 'Inspecciones de Recepción',
                    phase: 'recepcion',
                },
            },
            {
                path: 'external-inspection/ante-mortem/:processId',
                component: ExternalInspectionListComponent,
                data: {
                    title: 'Exámenes Ante Mortem',
                    phase: 'anteMortem',
                },
            },

            // Búsqueda por número de inspección (mantiene compatibilidad)
            {
                path: 'external-inspection/:phase/:inspectionNumber',
                component: ExternalInspectionListComponent,
                data: { title: 'Inspección Específica' },
            },

            // === OTRAS RUTAS ===
            {
                path: 'slaughter-process',
                component: SlaughterProcessListComponent,
                data: { title: 'Procesos de Faenamiento' },
            },
        ],
    },
    {
        path: 'invoices',
        children: [
            {
                path: '',
                component: InvoiceListComponent,
                data: { title: 'Facturas' },
            },
            {
                path: 'new',
                component: InvoiceFormComponent,
            },
            {
                path: 'edit/:id',
                component: InvoiceFormComponent,
            },
            {
                path: 'view/:id',
                component: InvoiceDetailComponent,
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
                component: RateListComponent,
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
                        component: RateListComponent,
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
