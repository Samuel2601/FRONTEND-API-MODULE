import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    Rate,
    ReferenceValue,
} from 'src/app/zoosanitario/interfaces/slaughter.interface';
import { RateService } from 'src/app/zoosanitario/services/rate.service';
import { ReferenceValueService } from 'src/app/zoosanitario/services/reference-value.service';

interface DashboardStats {
    totalRates: number;
    totalReferenceValues: number;
    totalRateDetails: number;
    inactiveRates: number;
}

interface EditForm {
    value: number;
}

@Component({
    selector: 'app-config-dashboard',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './config-dashboard.component.html',
    styleUrls: ['./config-dashboard.component.scss'],
})
export class ConfigDashboardComponent implements OnInit {
    // Estado del componente
    loading = false;
    saving = false;
    showEditDialog = false;

    // Datos del dashboard
    statsData: DashboardStats = {
        totalRates: 0,
        totalReferenceValues: 0,
        totalRateDetails: 0,
        inactiveRates: 0,
    };

    mainReferenceValues: ReferenceValue[] = [];
    recentRates: Rate[] = [];

    // Edición de valores de referencia
    selectedReferenceValue: ReferenceValue | null = null;
    editForm: EditForm = { value: 0 };

    constructor(
        private router: Router,
        private messageService: MessageService,
        private rateService: RateService,
        private referenceValueService: ReferenceValueService
    ) {}

    ngOnInit(): void {
        this.loadDashboardData();
    }

    /**
     * Carga todos los datos del dashboard
     */
    loadDashboardData(): void {
        this.loading = true;

        Promise.all([
            this.loadStats(),
            this.loadMainReferenceValues(),
            this.loadRecentRates(),
        ]).finally(() => {
            this.loading = false;
        });
    }

    /**
     * Carga las estadísticas del dashboard
     */
    private async loadStats(): Promise<void> {
        try {
            // Cargar tarifas para estadísticas
            let ratesResponse: any = await this.rateService
                .getAll()
                .toPromise();
            console.log(ratesResponse);
            ratesResponse = ratesResponse.data.rates;
            if (ratesResponse) {
                this.statsData.totalRates = ratesResponse.filter(
                    (rate: any) => rate.status == true
                ).length;
                this.statsData.inactiveRates = ratesResponse.filter(
                    (rate: any) => rate.status !== true
                ).length;
            }

            // Cargar valores de referencia
            const refValuesResponse = await this.referenceValueService
                .getActiveValues()
                .toPromise();

            console.log(refValuesResponse);
            if (refValuesResponse?.success && refValuesResponse.data) {
                this.statsData.totalReferenceValues =
                    refValuesResponse.data.length;
            }

            // Cargar detalles de tarifas (simulado - sería necesario implementar endpoint)
            this.statsData.totalRateDetails = this.statsData.totalRates * 2; // Promedio estimado
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    /**
     * Carga los valores de referencia principales
     */
    private async loadMainReferenceValues(): Promise<void> {
        try {
            const response = await this.referenceValueService
                .getActiveValues()
                .toPromise();
            if (response?.success && response.data) {
                // Filtrar valores principales (RBU, SBU, etc.)
                this.mainReferenceValues = response.data
                    .filter((value) =>
                        ['RBU', 'SBU', 'IVA', 'DESCUENTO_MAX'].includes(
                            value.code
                        )
                    )
                    .slice(0, 4);
            }
        } catch (error) {
            console.error('Error loading reference values:', error);
            this.showErrorMessage('Error al cargar valores de referencia');
        }
    }

    /**
     * Carga las tarifas más recientes
     */
    private async loadRecentRates(): Promise<void> {
        try {
            const response = await this.rateService.getAll().toPromise();
            if (response) {
                // Ordenar por fecha de creación y tomar las 5 más recientes
                this.recentRates = response
                    .sort(
                        (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime()
                    )
                    .slice(0, 5);
            }
        } catch (error) {
            console.error('Error loading recent rates:', error);
            this.showErrorMessage('Error al cargar tarifas recientes');
        }
    }

    /**
     * Refresca todos los datos del dashboard
     */
    refreshData(): void {
        this.loadDashboardData();
        this.showSuccessMessage('Datos actualizados correctamente');
    }

    /**
     * Formatea un valor de referencia para mostrar
     */
    formatReferenceValue(value: ReferenceValue): string {
        if (value.valueType === 'MONETARY') {
            const currency = value.currency || 'USD';
            return new Intl.NumberFormat('es-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
            }).format(value.value);
        } else if (value.valueType === 'PERCENTAGE') {
            return `${value.value}%`;
        } else {
            return value.value.toString();
        }
    }

    /**
     * Obtiene la severidad del tag para el estado de una tarifa
     */
    getRateStatusSeverity(
        status: string
    ): 'success' | 'warning' | 'danger' | 'info' {
        switch (status) {
            case 'ACTIVE':
                return 'success';
            case 'INACTIVE':
                return 'warning';
            case 'EXPIRED':
                return 'danger';
            default:
                return 'info';
        }
    }

    /**
     * Abre el diálogo de edición de valor de referencia
     */
    editReferenceValue(value: ReferenceValue): void {
        this.selectedReferenceValue = value;
        this.editForm.value = value.value;
        this.showEditDialog = true;
    }

    /**
     * Cancela la edición
     */
    cancelEdit(): void {
        this.showEditDialog = false;
        this.selectedReferenceValue = null;
        this.editForm = { value: 0 };
    }

    /**
     * Guarda el valor de referencia editado
     */
    async saveReferenceValue(): Promise<void> {
        if (!this.selectedReferenceValue) return;

        this.saving = true;
        try {
            const response = await this.referenceValueService
                .updateValueConfig(this.selectedReferenceValue.code, {
                    value: this.editForm.value,
                })
                .toPromise();

            if (response?.success) {
                this.showSuccessMessage(
                    'Valor de referencia actualizado correctamente'
                );
                this.showEditDialog = false;
                this.loadMainReferenceValues(); // Recargar valores
            } else {
                this.showErrorMessage(
                    'Error al actualizar el valor de referencia'
                );
            }
        } catch (error) {
            console.error('Error saving reference value:', error);
            this.showErrorMessage('Error al actualizar el valor de referencia');
        } finally {
            this.saving = false;
        }
    }

    /**
     * Ve los detalles de una tarifa
     */
    viewRate(rate: Rate): void {
        this.router.navigate(['/config/rates', rate._id]);
    }

    /**
     * Navega a la gestión de tarifas
     */
    navigateToRates(): void {
        this.router.navigate(['/config/rates']);
    }

    /**
     * Navega a la gestión de detalles de tarifas
     */
    navigateToRateDetails(): void {
        this.router.navigate(['/config/rate-details']);
    }

    /**
     * Navega a la gestión de valores de referencia
     */
    navigateToReferenceValues(): void {
        this.router.navigate(['/config/reference-values']);
    }

    /**
     * Configura las tarifas por defecto del sistema
     */
    async setupDefaultRates(): Promise<void> {
        try {
            this.loading = true;
            const response = await this.rateService
                .setupDefaultRates()
                .toPromise();

            if (response?.success) {
                this.showSuccessMessage(
                    'Configuración inicial completada correctamente'
                );
                this.loadDashboardData(); // Recargar datos
            } else {
                this.showErrorMessage(
                    'Error al configurar las tarifas por defecto'
                );
            }
        } catch (error) {
            console.error('Error setting up default rates:', error);
            this.showErrorMessage(
                'Error al configurar las tarifas por defecto'
            );
        } finally {
            this.loading = false;
        }
    }

    /**
     * Muestra mensaje de éxito
     */
    private showSuccessMessage(message: string): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: message,
            life: 3000,
        });
    }

    /**
     * Muestra mensaje de error
     */
    private showErrorMessage(message: string): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: message,
            life: 5000,
        });
    }
}
