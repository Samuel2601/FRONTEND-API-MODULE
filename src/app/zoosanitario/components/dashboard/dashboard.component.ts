import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    SlaughterProcess,
    SlaughterProcessDashboard,
    SlaughterProcessService,
    SlaughterStatistics,
} from 'src/app/zoosanitario/services/slaughter-process.service';
import {
    InvoiceFinancialSummary,
    InvoiceService,
} from 'src/app/zoosanitario/services/invoice.service';
import {
    IntroducerService,
    IntroducerStatistics,
} from 'src/app/zoosanitario/services/introducer.service';

interface DashboardCard {
    title: string;
    value: number;
    icon: string;
    color: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    route?: string;
}

interface AlertNotification {
    severity: 'error' | 'warn' | 'info';
    title: string;
    message: string;
    count: number;
    action?: string;
    route?: string;
}

@Component({
    selector: 'app-slaughter-dashboard',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
})
export class SlaughterDashboardComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    // Estados de carga
    loading = true;
    dashboardLoading = true;
    statisticsLoading = true;
    financialLoading = true;
    introducerLoading = true;

    // Datos del dashboard
    dashboardData: SlaughterProcessDashboard | null = null;
    statistics: SlaughterStatistics | null = null;
    financialSummary: InvoiceFinancialSummary | null = null;
    introducerStats: IntroducerStatistics | null = null;

    // Procesos recientes
    recentProcesses: SlaughterProcess[] = [];
    recentProcessesLoading = true;

    // Tarjetas principales
    mainCards: DashboardCard[] = [];

    // Tarjetas de estado
    statusCards: DashboardCard[] = [];

    // Alertas y notificaciones
    alerts: AlertNotification[] = [];

    // Datos para gráficos
    processStatusChartData: any;
    revenueChartData: any;
    animalSpeciesChartData: any;
    chartOptions: any;

    // Configuración de colores
    private colors = {
        primary: '#3B82F6',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#06B6D4',
        secondary: '#6B7280',
    };

    constructor(
        public slaughterService: SlaughterProcessService,
        private invoiceService: InvoiceService,
        private introducerService: IntroducerService,
        private messageService: MessageService,
        private router: Router
    ) {
        this.initializeChartOptions();
    }

    ngOnInit(): void {
        this.loadDashboardData();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Cargar todos los datos del dashboard
     */
    private loadDashboardData(): void {
        this.loading = true;

        // Cargar datos principales en paralelo
        Promise.all([
            this.loadSlaughterDashboard(),
            this.loadStatistics(),
            this.loadFinancialSummary(),
            this.loadIntroducerStatistics(),
            this.loadRecentProcesses(),
        ]).finally(() => {
            this.loading = false;
            this.buildDashboardCards();
            this.buildCharts();
            this.buildAlerts();
        });
    }

    /**
     * Cargar dashboard de procesos de faenamiento
     */
    private loadSlaughterDashboard(): Promise<void> {
        return new Promise((resolve) => {
            this.dashboardLoading = true;
            this.slaughterService
                .getDashboard()
                .pipe(
                    takeUntil(this.destroy$),
                    finalize(() => {
                        this.dashboardLoading = false;
                        resolve();
                    })
                )
                .subscribe({
                    next: (data) => {
                        this.dashboardData = data;
                    },
                    error: (error) => {
                        console.error('Error cargando dashboard:', error);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'No se pudo cargar los datos del dashboard',
                        });
                    },
                });
        });
    }

    /**
     * Cargar estadísticas
     */
    private loadStatistics(): Promise<void> {
        return new Promise((resolve) => {
            this.statisticsLoading = true;
            this.slaughterService
                .getStatistics()
                .pipe(
                    takeUntil(this.destroy$),
                    finalize(() => {
                        this.statisticsLoading = false;
                        resolve();
                    })
                )
                .subscribe({
                    next: (data) => {
                        this.statistics = data;
                    },
                    error: (error) => {
                        console.error('Error cargando estadísticas:', error);
                    },
                });
        });
    }

    /**
     * Cargar resumen financiero
     */
    private loadFinancialSummary(): Promise<void> {
        return new Promise((resolve) => {
            this.financialLoading = true;
            const endDate = new Date();
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);

            this.invoiceService
                .getFinancialSummary({ startDate, endDate })
                .pipe(
                    takeUntil(this.destroy$),
                    finalize(() => {
                        this.financialLoading = false;
                        resolve();
                    })
                )
                .subscribe({
                    next: (data) => {
                        this.financialSummary = data;
                    },
                    error: (error) => {
                        console.error(
                            'Error cargando resumen financiero:',
                            error
                        );
                    },
                });
        });
    }

    /**
     * Cargar estadísticas de introductores
     */
    private loadIntroducerStatistics(): Promise<void> {
        return new Promise((resolve) => {
            this.introducerLoading = true;
            this.introducerService
                .getStatistics()
                .pipe(
                    takeUntil(this.destroy$),
                    finalize(() => {
                        this.introducerLoading = false;
                        resolve();
                    })
                )
                .subscribe({
                    next: (data) => {
                        this.introducerStats = data;
                    },
                    error: (error) => {
                        console.error(
                            'Error cargando estadísticas de introductores:',
                            error
                        );
                    },
                });
        });
    }

    /**
     * Cargar procesos recientes
     */
    private loadRecentProcesses(): Promise<void> {
        return new Promise((resolve) => {
            this.recentProcessesLoading = true;
            this.slaughterService
                .getAllProcesses({ limit: 5 })
                .pipe(
                    takeUntil(this.destroy$),
                    finalize(() => {
                        this.recentProcessesLoading = false;
                        resolve();
                    })
                )
                .subscribe({
                    next: (response) => {
                        this.recentProcesses = response.processes;
                    },
                    error: (error) => {
                        console.error(
                            'Error cargando procesos recientes:',
                            error
                        );
                    },
                });
        });
    }

    /**
     * Construir tarjetas del dashboard
     */
    private buildDashboardCards(): void {
        if (!this.dashboardData || !this.financialSummary) return;

        this.mainCards = [
            {
                title: 'Procesos Totales',
                value: this.dashboardData.totalProcesses,
                icon: 'pi pi-list',
                color: this.colors.primary,
                route: '/faenamiento/procesos',
            },
            {
                title: 'Procesos Hoy',
                value: this.dashboardData.todayProcesses,
                icon: 'pi pi-calendar',
                color: this.colors.success,
                route: '/faenamiento/procesos',
            },
            {
                title: 'Ingresos del Mes',
                value: this.financialSummary.totalAmount,
                icon: 'pi pi-dollar',
                color: this.colors.warning,
                route: '/faenamiento/facturas',
            },
            {
                title: 'Tiempo Promedio',
                value: Math.round(this.dashboardData.avgProcessingTime),
                icon: 'pi pi-clock',
                color: this.colors.info,
                route: '/faenamiento/estadisticas',
            },
        ];

        this.statusCards = [
            {
                title: 'En Recepción',
                value: this.dashboardData.processesByStatus.reception,
                icon: 'pi pi-inbox',
                color: this.colors.secondary,
            },
            {
                title: 'Verificando Pagos',
                value: this.dashboardData.processesByStatus.paymentVerification,
                icon: 'pi pi-credit-card',
                color: this.colors.warning,
            },
            {
                title: 'Inspección Externa',
                value: this.dashboardData.processesByStatus.externalInspection,
                icon: 'pi pi-search',
                color: this.colors.info,
            },
            {
                title: 'En Faenamiento',
                value: this.dashboardData.processesByStatus.slaughter,
                icon: 'pi pi-cog',
                color: this.colors.primary,
            },
            {
                title: 'Inspección Interna',
                value: this.dashboardData.processesByStatus.internalInspection,
                icon: 'pi pi-shield',
                color: this.colors.info,
            },
            {
                title: 'Para Despacho',
                value: this.dashboardData.processesByStatus.dispatch,
                icon: 'pi pi-send',
                color: this.colors.success,
            },
        ];
    }

    /**
     * Construir alertas y notificaciones
     */
    private buildAlerts(): void {
        this.alerts = [];

        if (this.dashboardData?.alertsAndNotifications) {
            const { alertsAndNotifications } = this.dashboardData;

            if (alertsAndNotifications.pendingPayments > 0) {
                this.alerts.push({
                    severity: 'warn',
                    title: 'Pagos Pendientes',
                    message:
                        'Hay procesos con pagos pendientes de verificación',
                    count: alertsAndNotifications.pendingPayments,
                    action: 'Ver Detalles',
                    route: '/faenamiento/pagos-pendientes',
                });
            }

            if (alertsAndNotifications.overdueProcesses > 0) {
                this.alerts.push({
                    severity: 'error',
                    title: 'Procesos Vencidos',
                    message: 'Procesos que exceden el tiempo estimado',
                    count: alertsAndNotifications.overdueProcesses,
                    action: 'Revisar',
                    route: '/faenamiento/procesos?status=overdue',
                });
            }

            if (alertsAndNotifications.suspendedProcesses > 0) {
                this.alerts.push({
                    severity: 'error',
                    title: 'Procesos Suspendidos',
                    message: 'Procesos que requieren atención inmediata',
                    count: alertsAndNotifications.suspendedProcesses,
                    action: 'Ver Detalles',
                    route: '/faenamiento/procesos?status=suspended',
                });
            }
        }
    }

    /**
     * Construir gráficos
     */
    private buildCharts(): void {
        this.buildProcessStatusChart();
        this.buildRevenueChart();
        this.buildAnimalSpeciesChart();
    }

    /**
     * Gráfico de estado de procesos
     */
    private buildProcessStatusChart(): void {
        if (!this.dashboardData) return;

        const { processesByStatus } = this.dashboardData;

        this.processStatusChartData = {
            labels: [
                'Recepción',
                'Verificación',
                'Inspección Ext.',
                'Faenamiento',
                'Inspección Int.',
                'Despacho',
                'Completados',
            ],
            datasets: [
                {
                    data: [
                        processesByStatus.reception,
                        processesByStatus.paymentVerification,
                        processesByStatus.externalInspection,
                        processesByStatus.slaughter,
                        processesByStatus.internalInspection,
                        processesByStatus.dispatch,
                        processesByStatus.completed,
                    ],
                    backgroundColor: [
                        this.colors.secondary,
                        this.colors.warning,
                        this.colors.info,
                        this.colors.primary,
                        this.colors.info,
                        this.colors.success,
                        this.colors.success,
                    ],
                },
            ],
        };
    }

    /**
     * Gráfico de ingresos
     */
    private buildRevenueChart(): void {
        if (!this.statistics) return;

        this.revenueChartData = {
            labels: this.statistics.revenueByMonth.map((item) => item.month),
            datasets: [
                {
                    label: 'Ingresos',
                    data: this.statistics.revenueByMonth.map(
                        (item) => item.revenue
                    ),
                    borderColor: this.colors.primary,
                    backgroundColor: this.colors.primary + '20',
                    tension: 0.4,
                },
            ],
        };
    }

    /**
     * Gráfico de especies de animales
     */
    private buildAnimalSpeciesChart(): void {
        if (!this.statistics) return;

        this.animalSpeciesChartData = {
            labels: ['Bovinos', 'Porcinos'],
            datasets: [
                {
                    data: [
                        this.statistics.animalsBySpecies.bovine,
                        this.statistics.animalsBySpecies.porcine,
                    ],
                    backgroundColor: [this.colors.primary, this.colors.success],
                },
            ],
        };
    }

    /**
     * Inicializar opciones de gráficos
     */
    private initializeChartOptions(): void {
        this.chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
            },
        };
    }

    /**
     * Navegar a una ruta específica
     */
    navigateTo(route: string): void {
        if (route) {
            this.router.navigate([route]);
        }
    }

    /**
     * Manejar acción de alerta
     */
    handleAlertAction(alert: AlertNotification): void {
        if (alert.route) {
            this.navigateTo(alert.route);
        }
    }

    /**
     * Refrescar datos del dashboard
     */
    refreshDashboard(): void {
        this.loadDashboardData();
        this.messageService.add({
            severity: 'success',
            summary: 'Actualizado',
            detail: 'Dashboard actualizado correctamente',
        });
    }

    /**
     * Obtener clase de severidad para chips
     */
    getSeverityClass(status: string): string {
        const severityMap: { [key: string]: string } = {
            RECEPTION: 'p-tag-secondary',
            PAYMENT_VERIFICATION: 'p-tag-warning',
            EXTERNAL_INSPECTION: 'p-tag-info',
            SLAUGHTER: 'p-tag-primary',
            INTERNAL_INSPECTION: 'p-tag-info',
            DISPATCH: 'p-tag-success',
            COMPLETED: 'p-tag-success',
            CANCELLED: 'p-tag-danger',
            SUSPENDED: 'p-tag-danger',
        };
        return severityMap[status] || 'p-tag-secondary';
    }

    /**
     * Formatear números para mostrar
     */
    formatNumber(value: number): string {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        }
        return value.toString();
    }

    /**
     * Formatear moneda
     */
    formatCurrency(value: number): string {
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    }
}
