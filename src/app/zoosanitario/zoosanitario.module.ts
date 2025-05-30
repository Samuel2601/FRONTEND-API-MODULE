import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowMainComponent } from './components/workflow/workflow-main.component';
import { WorkflowManagerService } from './services/WorkflowManager.service';
import { QrScannerService } from './services/QrScanner.service';
import { ImportsModule } from '../demo/services/import';
import { ReceptionComponent } from './components/reception/reception.component';
import { ZoosanitaryCertificateService } from './services/ZoosanitaryCertificate.service';
import { ExternalVerificationComponent } from './components/external/external-verification.component';
import { ExternalVerificationSheetService } from './services/ExternalVerificationSheet.service';
import { SlaughterRecordComponent } from './components/slaughter/slaughter-record.component';
import { SlaughterRecordService } from './services/SlaughterRecord.service';
import { InternalVerificationComponent } from './components/internal/internal-verification.component';
import { InternalVerificationSheetService } from './services/InternalVerificationSheet.service';
import { ShippingComponent } from './components/shipping/shipping.component';
import { ShippingSheetService } from './services/ShippingSheet.service';
import { WorkflowGuard } from './guards/workflow.guard';
import { WorkflowResolver } from './utils/resolvers/workflow.resolver';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { VeterinaryDashboardComponent } from './components/veterinary/dashboard/veterinary-dashboard.component';
import { TemperaturePipe } from './utils/pipes/temperature.pipe';
import { WeightPipe } from './utils/pipes/weight.pipe';
import { StatusPipe } from './utils/pipes/status.pipe';
import { WorkflowStatusPipe } from './utils/pipes/workflow-status.pipe';
import { AutoSaveDirective } from './utils/directives/auto-save.directive';
import { NumericOnlyDirective } from './utils/directives/numeric-only.directive';
import { UpperCaseDirective } from './utils/directives/upper-case.directive';
import { CertificateListComponent } from './components/certificate/certificate-list.component';
import { ReportsComponent } from './components/reports/reports.component';
import { QrScannerModalComponent } from './components/qr-scanner/qr-scanner-modal.component';
import { ReportService } from './services/Report.service';
import { ConfirmationService } from 'primeng/api';

// Rutas del módulo
const routes: Routes = [
    {
        path: '',
        component: VeterinaryDashboardComponent,
        data: { title: 'Dashboard Veterinario' },
    },
    {
        path: 'dashboard',
        component: VeterinaryDashboardComponent,
        data: { title: 'Dashboard Veterinario' },
    },
    {
        path: 'certificates',
        component: CertificateListComponent,
        data: { title: 'Certificados Zoosanitarios' },
    },
    {
        path: 'workflow',
        component: WorkflowMainComponent,
        canActivate: [WorkflowGuard],
        resolve: { workflowData: WorkflowResolver },
        data: { title: 'Flujo de Trabajo' },
        children: [
            {
                path: '',
                redirectTo: 'reception',
                pathMatch: 'full' as const,
            },
            {
                path: 'reception',
                component: ReceptionComponent,
                data: { step: 'reception', title: 'Recepción' },
            },
            {
                path: 'external',
                component: ExternalVerificationComponent,
                data: { step: 'external', title: 'Verificación Externa' },
            },
            {
                path: 'slaughter',
                component: SlaughterRecordComponent,
                data: { step: 'slaughter', title: 'Faenamiento' },
            },
            {
                path: 'internal',
                component: InternalVerificationComponent,
                data: { step: 'internal', title: 'Verificación Interna' },
            },
            {
                path: 'shipping',
                component: ShippingComponent,
                data: { step: 'shipping', title: 'Despacho' },
            },
        ],
    },
    {
        path: 'reports',
        component: ReportsComponent,
        data: { title: 'Reportes y Estadísticas' },
    },
];

@NgModule({
    declarations: [
        // Componentes principales
        WorkflowMainComponent,
        ReceptionComponent,
        ExternalVerificationComponent,
        SlaughterRecordComponent,
        InternalVerificationComponent,
        ShippingComponent,
        VeterinaryDashboardComponent,
        CertificateListComponent,
        ReportsComponent,
        QrScannerModalComponent,

        // Pipes personalizados
        TemperaturePipe,
        WeightPipe,
        StatusPipe,
        WorkflowStatusPipe,

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
    ],
    providers: [
        // Servicios del módulo
        ZoosanitaryCertificateService,
        ExternalVerificationSheetService,
        SlaughterRecordService,
        InternalVerificationSheetService,
        ShippingSheetService,
        WorkflowManagerService,
        QrScannerService,
        ReportService,

        WorkflowGuard,
        WorkflowResolver,

        ConfirmationService,
    ],
    exports: [
        // Exportar componentes que podrían usarse en otros módulos
        WorkflowMainComponent,
        QrScannerModalComponent,

        // Exportar pipes para uso en otros módulos
        TemperaturePipe,
        WeightPipe,
        StatusPipe,
        WorkflowStatusPipe,

        // Exportar directivas
        AutoSaveDirective,
        NumericOnlyDirective,
        UpperCaseDirective,
    ],
})
export class ZooSanitarioModule {}
