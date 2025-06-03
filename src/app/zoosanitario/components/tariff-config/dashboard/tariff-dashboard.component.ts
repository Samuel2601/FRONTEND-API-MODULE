import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    TariffConfig,
    TariffConfigService,
} from 'src/app/zoosanitario/services/tariff-config.service';
import { TariffConfigListComponent } from '../list/tariff-config-list.component';
import { TariffCalculatorComponent } from '../calculator/tariff-calculator.component';
import { RbuManagementComponent } from '../rbu/rbu-management.component';

@Component({
    selector: 'app-tariff-dashboard',
    standalone: true,
    imports: [
        ImportsModule,
        TariffConfigListComponent,
        TariffCalculatorComponent,
        RbuManagementComponent,
    ],
    templateUrl: './tariff-dashboard.component.html',
    styleUrls: ['./tariff-dashboard.component.scss'],
    providers: [MessageService],
})
export class TariffDashboardComponent implements OnInit {
    activeTabIndex = 0;
    loading = false;
    currentRBU = 470;

    // Estadísticas del dashboard
    stats = {
        totalTariffs: 0,
        activeTariffs: 0,
        inactiveTariffs: 0,
        lastUpdated: new Date(),
    };

    // Tarifas por tipo para el resumen
    tariffsByType = {
        INSCRIPTION: 0,
        SLAUGHTER_FEE: 0,
        ADDITIONAL_SERVICE: 0,
        PROLONGED_USE: 0,
        EXTERNAL_PRODUCTS: 0,
        POULTRY: 0,
        PRIVATE_ESTABLISHMENT: 0,
        FINE_CLANDESTINE: 0,
        FINE_UNAUTHORIZED_ACCESS: 0,
    };

    // Pestañas de navegación
    tabs = [
        {
            label: 'Dashboard',
            icon: 'pi pi-chart-line',
            tooltip: 'Resumen general del sistema',
        },
        {
            label: 'Configuración',
            icon: 'pi pi-cog',
            tooltip: 'Gestionar configuraciones de tarifas',
        },
        {
            label: 'Calculadora',
            icon: 'pi pi-calculator',
            tooltip: 'Calcular tarifas específicas',
        },
        {
            label: 'RBU',
            icon: 'pi pi-dollar',
            tooltip: 'Gestionar Remuneración Básica Unificada',
        },
    ];

    // Tarifas recientes para mostrar en el dashboard
    recentTariffs: TariffConfig[] = [];

    // Tipos de tarifa con información
    tariffTypes = [
        {
            key: 'INSCRIPTION',
            label: 'Inscripción',
            icon: 'pi pi-id-card',
            color: 'blue',
            description: 'Inscripciones anuales de introductores',
        },
        {
            key: 'SLAUGHTER_FEE',
            label: 'Faenamiento',
            icon: 'pi pi-home',
            color: 'green',
            description: 'Tarifas por servicios de faenamiento',
        },
        {
            key: 'ADDITIONAL_SERVICE',
            label: 'Servicios Adicionales',
            icon: 'pi pi-plus-circle',
            color: 'purple',
            description: 'Servicios complementarios (5%-12%)',
        },
        {
            key: 'PROLONGED_USE',
            label: 'Uso Prolongado',
            icon: 'pi pi-clock',
            color: 'orange',
            description: 'Cargos por uso prolongado de corrales',
        },
        {
            key: 'FINE_CLANDESTINE',
            label: 'Multa Clandestino',
            icon: 'pi pi-exclamation-triangle',
            color: 'red',
            description: 'Multas por faenamiento clandestino',
        },
        {
            key: 'FINE_UNAUTHORIZED_ACCESS',
            label: 'Multa Acceso',
            icon: 'pi pi-ban',
            color: 'red',
            description: 'Multas por acceso no autorizado',
        },
    ];

    constructor(
        private tariffService: TariffConfigService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        this.loadDashboardData();
    }

    loadDashboardData() {
        this.loading = true;

        // Cargar todas las tarifas para estadísticas
        this.tariffService.getAllTariffs().subscribe({
            next: (tariffs: any) => {
                this.processStatistics(tariffs.data);
                this.recentTariffs = tariffs.data
                    .sort(
                        (a, b) =>
                            new Date(
                                b.updatedAt || b.createdAt || 0
                            ).getTime() -
                            new Date(a.updatedAt || a.createdAt || 0).getTime()
                    )
                    .slice(0, 5);
                this.loading = false;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron cargar los datos del dashboard',
                });
                this.loading = false;
            },
        });

        // Cargar RBU actual
        this.loadCurrentRBU();
    }

    loadCurrentRBU() {
        this.tariffService.getCurrentRBU().subscribe({
            next: (result) => {
                this.currentRBU = result.currentRBU;
            },
            error: (error) => {
                console.error('Error al cargar RBU:', error);
            },
        });
    }

    processStatistics(tariffs: TariffConfig[]) {
        console.log('Procesando estadísticas de tarifas:', tariffs);
        this.stats.totalTariffs = tariffs.length;
        this.stats.activeTariffs = tariffs.filter((t) => t.isActive).length;
        this.stats.inactiveTariffs = tariffs.filter((t) => !t.isActive).length;
        this.stats.lastUpdated = new Date();

        // Resetear contadores
        Object.keys(this.tariffsByType).forEach((key) => {
            this.tariffsByType[key as keyof typeof this.tariffsByType] = 0;
        });

        // Contar por tipo
        tariffs.forEach((tariff) => {
            if (tariff.type in this.tariffsByType) {
                this.tariffsByType[
                    tariff.type as keyof typeof this.tariffsByType
                ]++;
            }
        });
    }

    onTabChange(event: any) {
        this.activeTabIndex = event.index;
    }

    refreshDashboard() {
        this.loadDashboardData();
        this.messageService.add({
            severity: 'success',
            summary: 'Actualizado',
            detail: 'Datos del dashboard actualizados',
        });
    }

    getTariffTypeInfo(type: string) {
        return (
            this.tariffTypes.find((t) => t.key === type) || {
                key: type,
                label: type,
                icon: 'pi pi-question',
                color: 'gray',
                description: 'Tipo de tarifa',
            }
        );
    }

    getActivePercentage(): number {
        if (this.stats.totalTariffs === 0) return 0;
        return Math.round(
            (this.stats.activeTariffs / this.stats.totalTariffs) * 100
        );
    }

    getMostUsedTariffType(): string {
        let maxCount = 0;
        let mostUsedType = '';

        Object.entries(this.tariffsByType).forEach(([type, count]) => {
            if (count > maxCount) {
                maxCount = count;
                mostUsedType = type;
            }
        });

        return mostUsedType
            ? this.getTariffTypeInfo(mostUsedType).label
            : 'N/A';
    }

    getChartData() {
        const activeData = Object.entries(this.tariffsByType)
            .filter(([_, count]) => count > 0)
            .map(([type, count]) => ({
                label: this.getTariffTypeInfo(type).label,
                value: count,
                color: this.getTypeColor(type),
            }));

        return {
            labels: activeData.map((d) => d.label),
            datasets: [
                {
                    data: activeData.map((d) => d.value),
                    backgroundColor: activeData.map((d) => d.color),
                    borderWidth: 2,
                    borderColor: 'var(--surface-border)',
                },
            ],
        };
    }

    getTypeColor(type: string): string {
        const typeInfo = this.getTariffTypeInfo(type);
        const colorMap: { [key: string]: string } = {
            blue: '#3B82F6',
            green: '#10B981',
            purple: '#8B5CF6',
            orange: '#F59E0B',
            red: '#EF4444',
            gray: '#6B7280',
        };
        return colorMap[typeInfo.color] || colorMap['gray'];
    }

    getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'var(--text-color)',
                        font: {
                            size: 12,
                        },
                    },
                },
            },
        };
    }
}
