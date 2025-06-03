import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QrScannerService } from './services/QrScanner.service';
import { ImportsModule } from '../demo/services/import';
import { WorkflowGuard } from './guards/workflow.guard';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { TemperaturePipe } from './utils/pipes/temperature.pipe';
import { WeightPipe } from './utils/pipes/weight.pipe';
import { StatusPipe } from './utils/pipes/status.pipe';
import { WorkflowStatusPipe } from './utils/pipes/workflow-status.pipe';
import { AutoSaveDirective } from './utils/directives/auto-save.directive';
import { NumericOnlyDirective } from './utils/directives/numeric-only.directive';
import { UpperCaseDirective } from './utils/directives/upper-case.directive';
import { QrScannerModalComponent } from './components/qr-scanner/qr-scanner-modal.component';
import { ConfirmationService } from 'primeng/api';
import { SlaughterDashboardComponent } from './components/dashboard/dashboard.component';
import { ReceptionComponent } from './components/reception/reception.component';
import { ExternalInspectionComponent } from './components/external-inspection/external-inspection.component';
import { SlaughterComponent } from './components/slaughter/slaughter.component';

// Rutas del módulo
const routes: Routes = [
    {
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
    },
    //SlaughterComponent
    {
        path: 'slaughter',
        component: SlaughterComponent,
    },
];

@NgModule({
    declarations: [
        // Componentes principales
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
    providers: [QrScannerService, WorkflowGuard, ConfirmationService],
    exports: [
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
