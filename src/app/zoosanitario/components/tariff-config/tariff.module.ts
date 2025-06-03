import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// PrimeNG Modules (si no usas ImportsModule)
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { CalendarModule } from 'primeng/calendar';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { TabViewModule } from 'primeng/tabview';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { InputSwitchModule } from 'primeng/inputswitch';
import { SelectButtonModule } from 'primeng/selectbutton';
import { PanelModule } from 'primeng/panel';

// Angular Modules
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Componentes del sistema de tarifas
import { TARIFF_COMPONENTS } from './index';

// Rutas

import { TariffConfigService } from '../../services/tariff-config.service';
import { TariffDashboardComponent } from './dashboard/tariff-dashboard.component';
import { TariffConfigListComponent } from './list/tariff-config-list.component';
import { TariffConfigFormComponent } from './form/tariff-config-form.component';
import { TariffCalculatorComponent } from './calculator/tariff-calculator.component';
import { RbuManagementComponent } from './rbu/rbu-management.component';
import { tariffRoutes } from './tariff.route';

@NgModule({
    declarations: [
        // Si no usas standalone components, declara aquí
        // TariffDashboardComponent,
        // TariffConfigListComponent,
        // TariffConfigFormComponent,
        // TariffCalculatorComponent,
        // RbuManagementComponent
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        RouterModule.forChild(tariffRoutes),

        // Componentes standalone
        TARIFF_COMPONENTS[0], // TariffDashboardComponent,
        TARIFF_COMPONENTS[1], // TariffConfigListComponent,
        TARIFF_COMPONENTS[2], // TariffConfigFormComponent,
        TARIFF_COMPONENTS[3], // TariffCalculatorComponent,
        TARIFF_COMPONENTS[4], // RbuManagementComponent,
    ],
    providers: [TariffConfigService],
    exports: [
        // Exportar componentes si se van a usar en otros módulos
        TariffDashboardComponent,
        TariffConfigListComponent,
        TariffConfigFormComponent,
        TariffCalculatorComponent,
        RbuManagementComponent,
    ],
})
export class TariffModule {}

/**
 * Módulo alternativo si ya tienes ImportsModule configurado
 */
@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild(tariffRoutes),

        // Usa tu ImportsModule existente
        // ImportsModule,

        // Componentes standalone
        TariffDashboardComponent,
        TariffConfigListComponent,
        TariffConfigFormComponent,
        TariffCalculatorComponent,
        RbuManagementComponent,
    ],
    providers: [TariffConfigService],
    exports: [
        TariffDashboardComponent,
        TariffConfigListComponent,
        TariffConfigFormComponent,
        TariffCalculatorComponent,
        RbuManagementComponent,
    ],
})
export class TariffModuleSimple {}
