import { Component, OnInit, OnDestroy } from '@angular/core';
import { ImportsModule } from 'src/app/demo/services/import';
import { SlaughterProcessService } from '../../services/slaughter-process.service';
import { InvoiceService } from '../../services/invoice.service';
import { IntroducerService } from '../../services/introducer.service';
import { ExternalInspectionService } from '../../services/external-inspection.service';
import { RateService } from '../../services/rate.service';
import { ReceptionService } from '../../services/reception.service';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface DashboardData {
    total: number;
    withInvoice: number;
    paidInvoices: number;
    stateBreakdown: {
        iniciado: number;
        preFaenamiento: number;
        pagado: number;
        enProceso: number;
        finalizado: number;
        anulado: number;
    };
    introducerTypeBreakdown: {
        natural: number;
        juridica: number;
    };
    averages: {
        inspections: number;
        slaughterings: number;
        dispatches: number;
    };
    totalInvoiceAmount: number;
    completionRate: number;
    paymentRate: number;
}

interface FinancialSummary {
    data: {
        totalInvoices: number;
        statusBreakdown: {
            [key: string]: {
                count: number;
                amount: number;
                avgAmount: number;
            };
        };
        totalAmount: number;
        avgAmount: number;
        minAmount: number;
        maxAmount: number;
    };
    filters: {
        dateField: string;
    };
}

interface IntroducerStats {
    success: boolean;
    message: string;
    data: {
        total: number;
        totalInvoices: number;
        totalProcesses: number;
        personTypeBreakdown: {
            natural: number;
            juridica: number;
        };
        statusBreakdown: {
            active: number;
            pending: number;
            suspended: number;
            expired: number;
        };
        avgInvoicesPerIntroducer: number;
        avgProcessesPerIntroducer: number;
    };
    timestamp: string;
}

interface InspectionStats {
    success: boolean;
    message: string;
    data: {
        _id: any;
        total: number;
        recepcionStats: {
            total: number;
            resultBreakdown: {
                apto: number;
                devolucion: number;
                cuarentena: number;
                comision: number;
            };
        };
        anteMortemStats: {
            total: number;
            resultBreakdown: {
                apto: number;
                devolucion: number;
                cuarentena: number;
                comision: number;
            };
        };
        averages: {
            age: number;
            weight: number;
            temperature: number;
        };
        sexBreakdown: {
            macho: number;
            hembra: number;
        };
    };
    timestamp: string;
}

interface ReceptionStats {
    success: boolean;
    message: string;
    data: {
        total: number;
        stateBreakdown: {
            pendiente: number;
            procesando: number;
            completado: number;
            rechazado: number;
        };
        transportAverages: {
            temperature: number;
            humidity: number;
        };
        hygienicConditionsBreakdown: {
            optimas: number;
            aceptables: number;
            deficientes: number;
        };
        avgPriority: number;
    };
    timestamp: string;
}

interface RecentActivity {
    id: string;
    title: string;
    description: string;
    timestamp: Date;
    user: string;
    icon: string;
    color: string;
}

interface SystemAlert {
    id: string;
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: Date;
    read: boolean;
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

    // Data properties
    loading = false;
    dashboardData: DashboardData | null = null;
    statistics: DashboardData | null = null;
    financialSummary: FinancialSummary | null = null;
    introducerStats: IntroducerStats | null = null;
    inspectionStats: InspectionStats | null = null;
    receptionStats: ReceptionStats | null = null;

    // Chart data
    processStatesChartData: any;
    hygienicConditionsChartData: any;
    financialStatusChartData: any;
    chartOptions: any;
    barChartOptions: any;
    financialChartOptions: any;

    // Activity and alerts
    recentActivities: RecentActivity[] = [];
    systemAlerts: SystemAlert[] = [];

    constructor(
        private slaughterService: SlaughterProcessService,
        private invoiceService: InvoiceService,
        private introducerService: IntroducerService,
        private inspectionService: ExternalInspectionService,
        private receptionService: ReceptionService,
        private rateService: RateService
    ) {
        this.initializeChartOptions();
    }

    ngOnInit(): void {
        this.loadDashboardData();
        this.loadRecentActivity();
        this.loadSystemAlerts();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    async loadDashboardData(): Promise<void> {
        this.loading = true;

        forkJoin({
            dashboardData: this.slaughterService.getStatistics(),
            statistics: this.slaughterService.getStatistics(),
            financialSummary: this.invoiceService.getStatistics(),
            introducerStats: this.introducerService.getStatistics(),
            inspectionStats: this.inspectionService.getStatistics(),
            receptionStats: this.receptionService.getStatistics(),
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (results: any) => {
                    console.log('Resultados cargados:', results);

                    this.dashboardData = results.dashboardData;
                    this.statistics = results.statistics;
                    this.financialSummary = results.financialSummary;
                    this.introducerStats = results.introducerStats;
                    this.inspectionStats = results.inspectionStats;
                    this.receptionStats = results.receptionStats;

                    this.updateChartData();
                    this.loading = false;
                },
                error: (err) => {
                    console.error('Error cargando dashboard:', err);
                    this.loading = false;

                    // Crear alerta de error
                    this.addSystemAlert({
                        id: Date.now().toString(),
                        title: 'Error al cargar datos',
                        message:
                            'No se pudieron cargar las estadísticas del dashboard. Intente nuevamente.',
                        severity: 'high',
                        timestamp: new Date(),
                        read: false,
                    });
                },
            });
    }

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

        this.barChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
            plugins: {
                legend: {
                    display: false,
                },
            },
        };

        this.financialChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: (context: any) => {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const percentage = (
                                (value /
                                    this.financialSummary?.data?.totalAmount ||
                                    0) * 100
                            ).toFixed(1);
                            return `${label}: ${value.toFixed(
                                2
                            )} (${percentage}%)`;
                        },
                    },
                },
            },
        };
    }

    private updateChartData(): void {
        // Gráfico de estados de procesos
        if (this.dashboardData?.stateBreakdown) {
            const stateBreakdown = this.dashboardData.stateBreakdown;
            this.processStatesChartData = {
                labels: [
                    'Iniciado',
                    'Pre-Faenamiento',
                    'En Proceso',
                    'Finalizado',
                    'Pagado',
                    'Anulado',
                ],
                datasets: [
                    {
                        data: [
                            stateBreakdown.iniciado,
                            stateBreakdown.preFaenamiento,
                            stateBreakdown.enProceso,
                            stateBreakdown.finalizado,
                            stateBreakdown.pagado,
                            stateBreakdown.anulado,
                        ],
                        backgroundColor: [
                            '#007bff',
                            '#ffc107',
                            '#17a2b8',
                            '#28a745',
                            '#20c997',
                            '#dc3545',
                        ],
                        borderWidth: 2,
                        borderColor: '#ffffff',
                    },
                ],
            };
        }

        // Gráfico de condiciones higiénicas
        if (this.receptionStats?.data?.hygienicConditionsBreakdown) {
            const hygienicConditions =
                this.receptionStats.data.hygienicConditionsBreakdown;
            this.hygienicConditionsChartData = {
                labels: ['Óptimas', 'Aceptables', 'Deficientes'],
                datasets: [
                    {
                        label: 'Condiciones Higiénicas',
                        data: [
                            hygienicConditions.optimas,
                            hygienicConditions.aceptables,
                            hygienicConditions.deficientes,
                        ],
                        backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                        borderColor: ['#1e7e34', '#e0a800', '#c82333'],
                        borderWidth: 2,
                    },
                ],
            };
        }

        // Gráfico de estados financieros
        if (this.financialSummary?.data?.statusBreakdown) {
            const statusArray = this.getFinancialStatusArray();
            this.financialStatusChartData = {
                labels: statusArray.map((item) =>
                    this.getStatusLabel(item.key)
                ),
                datasets: [
                    {
                        data: statusArray.map((item) => item.value.amount),
                        backgroundColor: statusArray.map((item) =>
                            this.getStatusColor(item.key)
                        ),
                        borderWidth: 2,
                        borderColor: '#ffffff',
                    },
                ],
            };
        }
    }

    loadRecentActivity(): void {
        // Simulamos actividad reciente basada en los datos
        this.recentActivities = [
            {
                id: '1',
                title: 'Nuevo proceso iniciado',
                description: `Se ha iniciado un nuevo proceso de faenamiento`,
                timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutos atrás
                user: 'Sistema',
                icon: 'pi pi-plus-circle',
                color: '#007bff',
            },
            {
                id: '2',
                title: 'Inspección completada',
                description: `Se completó la inspección de recepción`,
                timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hora atrás
                user: 'Inspector',
                icon: 'pi pi-check-circle',
                color: '#28a745',
            },
            {
                id: '3',
                title: 'Recepción registrada',
                description: `Se registró una nueva recepción de ganado`,
                timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 horas atrás
                user: 'Operador',
                icon: 'pi pi-truck',
                color: '#17a2b8',
            },
        ];
    }

    private loadSystemAlerts(): void {
        this.systemAlerts = [];

        // Generar alertas basadas en los datos
        if (this.receptionStats?.data?.stateBreakdown?.pendiente > 0) {
            this.addSystemAlert({
                id: 'pending-receptions',
                title: 'Recepciones pendientes',
                message: `Hay ${this.receptionStats.data.stateBreakdown.pendiente} recepciones pendientes de procesamiento`,
                severity: 'medium',
                timestamp: new Date(),
                read: false,
            });
        }

        if (this.inspectionStats?.data?.averages?.temperature > 38) {
            this.addSystemAlert({
                id: 'high-temperature',
                title: 'Temperatura elevada detectada',
                message: `La temperatura promedio está en ${this.inspectionStats.data.averages.temperature}°C, superior al rango normal`,
                severity: 'high',
                timestamp: new Date(),
                read: false,
            });
        }

        if (this.dashboardData?.completionRate < 50) {
            this.addSystemAlert({
                id: 'low-completion',
                title: 'Baja tasa de completación',
                message: `La tasa de completación de procesos es del ${this.dashboardData.completionRate}%`,
                severity: 'medium',
                timestamp: new Date(),
                read: false,
            });
        }
    }

    private addSystemAlert(alert: SystemAlert): void {
        // Evitar duplicados
        if (!this.systemAlerts.find((a) => a.id === alert.id)) {
            this.systemAlerts.unshift(alert);
        }
    }

    markAlertAsRead(alert: SystemAlert): void {
        alert.read = true;
    }

    dismissAlert(alert: SystemAlert): void {
        const index = this.systemAlerts.findIndex((a) => a.id === alert.id);
        if (index > -1) {
            this.systemAlerts.splice(index, 1);
        }
    }

    getBadgeSeverity(
        severity: 'low' | 'medium' | 'high'
    ): 'info' | 'warning' | 'danger' {
        switch (severity) {
            case 'low':
                return 'info';
            case 'medium':
                return 'warning';
            case 'high':
                return 'danger';
            default:
                return 'info';
        }
    }

    // Métodos de utilidad para formateo
    getCompletionPercentage(): number {
        if (!this.dashboardData || this.dashboardData.total === 0) return 0;
        return (
            (this.dashboardData.stateBreakdown.finalizado /
                this.dashboardData.total) *
            100
        );
    }

    getPaymentPercentage(): number {
        if (!this.financialSummary?.data?.statusBreakdown) return 0;

        const statusBreakdown = this.financialSummary.data.statusBreakdown;
        const paidAmount = statusBreakdown['Paid']?.amount || 0;
        const totalAmount = this.financialSummary.data.totalAmount || 0;

        return totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    }

    getPaymentRate(): number {
        if (!this.financialSummary?.data?.statusBreakdown) return 0;

        const statusBreakdown = this.financialSummary.data.statusBreakdown;
        const paidCount = statusBreakdown['Paid']?.count || 0;
        const totalInvoices = this.financialSummary.data.totalInvoices || 0;

        return totalInvoices > 0 ? (paidCount / totalInvoices) * 100 : 0;
    }

    getFinancialStatusArray(): Array<{ key: string; value: any }> {
        if (!this.financialSummary?.data?.statusBreakdown) return [];

        return Object.entries(this.financialSummary.data.statusBreakdown)
            .map(([key, value]) => ({ key, value }))
            .sort((a, b) => b.value.amount - a.value.amount); // Ordenar por monto descendente
    }

    getStatusLabel(status: string): string {
        const statusLabels: { [key: string]: string } = {
            Issued: 'Emitidas',
            Paid: 'Pagadas',
            Pending: 'Pendientes',
            Cancelled: 'Canceladas',
            Overdue: 'Vencidas',
        };
        return statusLabels[status] || status;
    }

    getStatusIcon(status: string): string {
        const statusIcons: { [key: string]: string } = {
            Issued: 'pi pi-file',
            Paid: 'pi pi-check-circle',
            Pending: 'pi pi-clock',
            Cancelled: 'pi pi-times-circle',
            Overdue: 'pi pi-exclamation-triangle',
        };
        return statusIcons[status] || 'pi pi-circle';
    }

    getStatusColor(status: string): string {
        const statusColors: { [key: string]: string } = {
            Issued: '#17a2b8',
            Paid: '#28a745',
            Pending: '#ffc107',
            Cancelled: '#6c757d',
            Overdue: '#dc3545',
        };
        return statusColors[status] || '#007bff';
    }

    getStatusPercentage(amount: number): number {
        const totalAmount = this.financialSummary?.data?.totalAmount || 0;
        return totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
    }

    getTotalAnimalsInspected(): number {
        return this.inspectionStats?.data?.total || 0;
    }

    getAverageWeight(): number {
        return this.inspectionStats?.data?.averages?.weight || 0;
    }

    getAverageTemperature(): number {
        return this.inspectionStats?.data?.averages?.temperature || 0;
    }

    // Método para refrescar datos específicos
    refreshData(section?: string): void {
        if (section) {
            // Refrescar sección específica
            switch (section) {
                case 'financial':
                    this.invoiceService
                        .getStatistics()
                        .subscribe((data: any) => {
                            this.financialSummary = data;
                            this.updateChartData(); // Actualizar gráficos financieros
                        });
                    break;
                case 'processes':
                    this.slaughterService.getStatistics().subscribe((data) => {
                        this.dashboardData = data;
                        this.updateChartData();
                    });
                    break;
                default:
                    this.loadDashboardData();
            }
        } else {
            this.loadDashboardData();
        }
    }

    onMouseEnter(event: MouseEvent) {
        const element = event.target as HTMLElement;
        element.style.transform = 'translateY(-2px)';
        element.style.boxShadow = '0 8px 15px rgba(0,0,0,0.15)';
    }

    onMouseLeave(event: MouseEvent) {
        const element = event.target as HTMLElement;
        element.style.transform = 'translateY(0)';
        element.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07)';
    }
}
