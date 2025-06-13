// src/app/components/slaughter-process-dashboard/slaughter-process-dashboard.component.ts
import { Component, OnInit, OnDestroy, Input, inject } from '@angular/core';
import { Subject, takeUntil, finalize, forkJoin } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    PerformanceMetrics,
    SlaughterProcessService,
    SlaughterProcessStatistics,
} from 'src/app/zoosanitario/services/slaughter-process.service';

interface DropdownOption {
    label: string;
    value: any;
}

interface ChartData {
    labels: string[];
    datasets: any[];
}

interface Alert {
    id: string;
    severity: 'success' | 'info' | 'warning' | 'danger';
    title: string;
    message: string;
    icon: string;
    timestamp: Date;
}

interface TopIntroducer {
    name: string;
    type: string;
    processCount: number;
    successRate: number;
    trend: number;
}

interface TimeAnalysis {
    name: string;
    avgTime: number;
    percentage: number;
}

interface DailyKPIs {
    processesPerDay: number;
    processesPerDayTrend: number;
    averageTime: number;
    averageTimeTrend: number;
    satisfaction: number;
    satisfactionTrend: number;
    efficiency: number;
    efficiencyTrend: number;
}

@Component({
    selector: 'app-slaughter-process-dashboard',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './slaughter-process-dashboard.component.html',
    styleUrls: ['./slaughter-process-dashboard.component.scss'],
})
export class SlaughterProcessDashboardComponent implements OnInit, OnDestroy {
    private readonly destroy$ = new Subject<void>();
    private readonly slaughterProcessService = inject(SlaughterProcessService);
    private readonly messageService = inject(MessageService);

    @Input() filters: any = {};

    // Estados del componente
    loading = false;
    statistics: SlaughterProcessStatistics | null = null;
    performanceMetrics: PerformanceMetrics | null = null;

    // Filtros
    dateRange: Date[] = [];
    selectedStates: string[] = [];
    selectedIntroducers: string[] = [];
    selectedGroupBy = 'month';

    // Opciones para filtros
    stateOptions: DropdownOption[] = [
        { label: 'Iniciado', value: 'Iniciado' },
        { label: 'Pre-Faenamiento', value: 'PreFaenamiento' },
        { label: 'Pagado', value: 'Pagado' },
        { label: 'En Proceso', value: 'EnProceso' },
        { label: 'Finalizado', value: 'Finalizado' },
        { label: 'Anulado', value: 'Anulado' },
    ];

    introducerOptions: DropdownOption[] = [];

    groupByOptions: DropdownOption[] = [
        { label: 'Por Día', value: 'day' },
        { label: 'Por Semana', value: 'week' },
        { label: 'Por Mes', value: 'month' },
        { label: 'Por Trimestre', value: 'quarter' },
    ];

    // Datos para gráficos
    stateChartData: ChartData = { labels: [], datasets: [] };
    timeSeriesData: ChartData = { labels: [], datasets: [] };
    introducerTypeData: ChartData = { labels: [], datasets: [] };
    monthlyPerformanceData: ChartData = { labels: [], datasets: [] };

    // Opciones para gráficos
    chartOptions: any = {};
    timeSeriesOptions: any = {};
    pieChartOptions: any = {};
    barChartOptions: any = {};

    // Datos de análisis
    topIntroducers: TopIntroducer[] = [];
    timeAnalysis: TimeAnalysis[] = [];
    alerts: Alert[] = [];
    dailyKPIs: DailyKPIs = {
        processesPerDay: 0,
        processesPerDayTrend: 0,
        averageTime: 0,
        averageTimeTrend: 0,
        satisfaction: 0,
        satisfactionTrend: 0,
        efficiency: 0,
        efficiencyTrend: 0,
    };

    ngOnInit(): void {
        this.initializeFilters();
        this.setupChartOptions();
        this.loadDashboardData();
        this.generateAlerts();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ========================================
    // INICIALIZACIÓN
    // ========================================

    initializeFilters(): void {
        // Establecer rango de fechas por defecto (último mes)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        this.dateRange = [startDate, endDate];

        // Aplicar filtros externos si existen
        if (this.filters) {
            if (this.filters.estado) {
                this.selectedStates = Array.isArray(this.filters.estado)
                    ? this.filters.estado
                    : [this.filters.estado];
            }
            if (this.filters.introductor) {
                this.selectedIntroducers = Array.isArray(
                    this.filters.introductor
                )
                    ? this.filters.introductor
                    : [this.filters.introductor];
            }
        }
    }

    setupChartOptions(): void {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor =
            documentStyle.getPropertyValue('--text-color') || '#495057';
        const textColorSecondary =
            documentStyle.getPropertyValue('--text-color-secondary') ||
            '#6c757d';
        const surfaceBorder =
            documentStyle.getPropertyValue('--surface-border') || '#dee2e6';

        // Opciones generales
        this.chartOptions = {
            plugins: {
                legend: {
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                        font: {
                            weight: 500,
                        },
                    },
                },
            },
            responsive: true,
            maintainAspectRatio: false,
        };

        // Opciones para series temporales
        this.timeSeriesOptions = {
            plugins: {
                legend: {
                    labels: {
                        color: textColor,
                    },
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary,
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false,
                    },
                },
                y: {
                    ticks: {
                        color: textColorSecondary,
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false,
                    },
                },
            },
            responsive: true,
            maintainAspectRatio: false,
        };

        // Opciones para gráfico de torta
        this.pieChartOptions = {
            plugins: {
                legend: {
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                    },
                },
            },
            responsive: true,
            maintainAspectRatio: false,
        };

        // Opciones para gráfico de barras
        this.barChartOptions = {
            plugins: {
                legend: {
                    labels: {
                        color: textColor,
                    },
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary,
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false,
                    },
                },
                y: {
                    ticks: {
                        color: textColorSecondary,
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false,
                    },
                },
            },
            responsive: true,
            maintainAspectRatio: false,
        };
    }

    // ========================================
    // CARGA DE DATOS
    // ========================================

    loadDashboardData(): void {
        this.loading = true;

        const filters = this.buildCurrentFilters();
        const performanceParams = {
            dateFrom: this.dateRange[0]?.toISOString(),
            dateTo: this.dateRange[1]?.toISOString(),
            groupBy: this.selectedGroupBy,
        };

        // Cargar solo estadísticas por ahora (métricas de rendimiento en desarrollo)
        this.slaughterProcessService
            .getStatistics(filters)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (statistics: SlaughterProcessStatistics) => {
                    console.log('Estadísticas cargadas:', statistics);
                    this.statistics = statistics;
                    this.processDataForCharts();
                    this.generateAnalysisData();
                    this.calculateKPIs();
                },
                error: (error) => {
                    console.error('Error loading dashboard data:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cargar los datos del dashboard',
                    });
                },
            });
    }

    processDataForCharts(): void {
        if (!this.statistics) return;

        this.generateStateChart();
        this.generateTimeSeriesChart();
        this.generateIntroducerTypeChart();
        this.generateMonthlyPerformanceChart();
    }

    generateStateChart(): void {
        if (!this.statistics) return;

        const stateData = this.statistics.stateBreakdown;

        this.stateChartData = {
            labels: [
                'Iniciado',
                'Pre-Faenamiento',
                'Pagado',
                'En Proceso',
                'Finalizado',
                'Anulado',
            ],
            datasets: [
                {
                    data: [
                        stateData.iniciado,
                        stateData.preFaenamiento,
                        stateData.pagado,
                        stateData.enProceso,
                        stateData.finalizado,
                        stateData.anulado,
                    ],
                    backgroundColor: [
                        '#3B82F6', // blue-500
                        '#F59E0B', // yellow-500
                        '#10B981', // green-500
                        '#F97316', // orange-500
                        '#06B6D4', // cyan-500
                        '#EF4444', // red-500
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                },
            ],
        };
    }

    generateTimeSeriesChart(): void {
        // Datos simulados para series temporales
        const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
        const processesData = [25, 32, 28, 41, 35, 38];
        const completedData = [20, 28, 24, 35, 30, 34];

        this.timeSeriesData = {
            labels: labels,
            datasets: [
                {
                    label: 'Procesos Iniciados',
                    data: processesData,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                },
                {
                    label: 'Procesos Finalizados',
                    data: completedData,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                },
            ],
        };
    }

    generateIntroducerTypeChart(): void {
        if (!this.statistics) return;

        const typeData = this.statistics.introducerTypeBreakdown;

        this.introducerTypeData = {
            labels: ['Persona Natural', 'Persona Jurídica'],
            datasets: [
                {
                    data: [typeData.natural, typeData.juridica],
                    backgroundColor: ['#8B5CF6', '#EC4899'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                },
            ],
        };
    }

    generateMonthlyPerformanceChart(): void {
        // Datos simulados para rendimiento mensual
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
        const completionRates = [85, 88, 92, 87, 91, 89];
        const averageTimes = [12.5, 11.8, 10.2, 11.5, 10.8, 11.1];

        this.monthlyPerformanceData = {
            labels: months,
            datasets: [
                {
                    type: 'bar',
                    label: 'Tasa de Finalización (%)',
                    data: completionRates,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    yAxisID: 'y',
                },
                {
                    type: 'line',
                    label: 'Tiempo Promedio (días)',
                    data: averageTimes,
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4,
                },
            ],
        };

        // Actualizar opciones para doble eje Y
        this.barChartOptions = {
            ...this.barChartOptions,
            scales: {
                ...this.barChartOptions.scales,
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    ticks: {
                        color: this.barChartOptions.scales.y.ticks.color,
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                },
            },
        };
    }

    generateAnalysisData(): void {
        this.generateTopIntroducers();
        this.generateTimeAnalysis();
    }

    generateTopIntroducers(): void {
        // Datos simulados para top introductores
        this.topIntroducers = [
            {
                name: 'Ganadera San José S.A.',
                type: 'Jurídica',
                processCount: 45,
                successRate: 94.2,
                trend: 5.3,
            },
            {
                name: 'Juan Carlos Pérez',
                type: 'Natural',
                processCount: 32,
                successRate: 87.5,
                trend: -2.1,
            },
            {
                name: 'Frigorífico Norte',
                type: 'Jurídica',
                processCount: 28,
                successRate: 91.8,
                trend: 8.7,
            },
            {
                name: 'María González',
                type: 'Natural',
                processCount: 22,
                successRate: 86.4,
                trend: 1.2,
            },
            {
                name: 'Cooperativa Ganadera',
                type: 'Jurídica',
                processCount: 19,
                successRate: 89.5,
                trend: -0.8,
            },
        ];
    }

    generateTimeAnalysis(): void {
        this.timeAnalysis = [
            {
                name: 'Iniciado → Pre-Faenamiento',
                avgTime: 2.3,
                percentage: 18.7,
            },
            {
                name: 'Pre-Faenamiento → Pagado',
                avgTime: 1.8,
                percentage: 14.6,
            },
            {
                name: 'Pagado → En Proceso',
                avgTime: 3.2,
                percentage: 26.0,
            },
            {
                name: 'En Proceso → Finalizado',
                avgTime: 5.0,
                percentage: 40.7,
            },
        ];
    }

    calculateKPIs(): void {
        if (!this.statistics) return;

        // Calcular KPIs con datos reales de las estadísticas
        const total = this.statistics.total;
        const daysInPeriod = this.calculateDaysInPeriod();

        this.dailyKPIs = {
            processesPerDay: total / daysInPeriod,
            processesPerDayTrend: 5.2, // Simulado - necesitaría datos históricos
            averageTime: 12.3, // Simulado - calculado desde tiempo promedio
            averageTimeTrend: -1.8, // Simulado
            satisfaction: 8.7, // Simulado - basado en tasa de finalización
            satisfactionTrend: 2.3, // Simulado
            efficiency: this.statistics.completionRate,
            efficiencyTrend: 3.1, // Simulado
        };
    }

    generateAlerts(): void {
        // Generar alertas basadas en datos reales
        this.alerts = [];

        if (this.statistics) {
            // Alerta de procesos pendientes
            const procesosEnProceso = this.statistics.stateBreakdown.enProceso;
            if (procesosEnProceso > 10) {
                this.alerts.push({
                    id: '1',
                    severity: 'warning',
                    title: 'Procesos Pendientes',
                    message: `Hay ${procesosEnProceso} procesos en estado "En Proceso"`,
                    icon: 'pi pi-exclamation-triangle',
                    timestamp: new Date(),
                });
            }

            // Alerta de tasa de pago baja
            if (this.statistics.paymentRate < 50) {
                this.alerts.push({
                    id: '2',
                    severity: 'danger',
                    title: 'Tasa de Pago Baja',
                    message: `La tasa de pago es solo del ${this.statistics.paymentRate.toFixed(
                        1
                    )}%`,
                    icon: 'pi pi-exclamation-triangle',
                    timestamp: new Date(),
                });
            }

            // Alerta de alta tasa de finalización
            if (this.statistics.completionRate > 80) {
                this.alerts.push({
                    id: '3',
                    severity: 'success',
                    title: 'Excelente Rendimiento',
                    message: `Tasa de finalización del ${this.statistics.completionRate.toFixed(
                        1
                    )}%`,
                    icon: 'pi pi-check-circle',
                    timestamp: new Date(),
                });
            }
        }

        // Alerta informativa si no hay datos
        if (!this.statistics || this.statistics.total === 0) {
            this.alerts.push({
                id: '4',
                severity: 'info',
                title: 'Sin Datos',
                message:
                    'No hay procesos registrados en el período seleccionado',
                icon: 'pi pi-info-circle',
                timestamp: new Date(),
            });
        }
    }

    // ========================================
    // MANEJO DE EVENTOS
    // ========================================

    onDateRangeChange(): void {
        if (
            this.dateRange &&
            this.dateRange.length === 2 &&
            this.dateRange[1]
        ) {
            this.onFiltersChange();
        }
    }

    onFiltersChange(): void {
        this.loadDashboardData();
        this.generateAlerts();
    }

    refreshDashboard(): void {
        this.loadDashboardData();
        this.generateAlerts();
    }

    exportDashboard(): void {
        this.messageService.add({
            severity: 'info',
            summary: 'Exportación',
            detail: 'Funcionalidad de exportación en desarrollo',
        });
    }

    dismissAlert(alert: Alert): void {
        this.alerts = this.alerts.filter((a) => a.id !== alert.id);
    }

    // ========================================
    // MÉTODOS AUXILIARES
    // ========================================

    buildCurrentFilters(): any {
        const filters: any = {};

        if (this.selectedStates.length > 0) {
            filters.estado = { $in: this.selectedStates };
        }

        if (this.selectedIntroducers.length > 0) {
            filters.introductor = { $in: this.selectedIntroducers };
        }

        if (
            this.dateRange &&
            this.dateRange.length === 2 &&
            this.dateRange[1]
        ) {
            filters.createdAt = {
                $gte: this.dateRange[0],
                $lte: this.dateRange[1],
            };
        }

        return filters;
    }

    calculateDaysInPeriod(): number {
        if (
            !this.dateRange ||
            this.dateRange.length !== 2 ||
            !this.dateRange[1]
        ) {
            return 30; // Default
        }

        const diffTime = Math.abs(
            this.dateRange[1].getTime() - this.dateRange[0].getTime()
        );
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    }

    getStateColor(state: string): string {
        const colors: { [key: string]: string } = {
            Iniciado: '#3B82F6',
            PreFaenamiento: '#F59E0B',
            Pagado: '#10B981',
            EnProceso: '#F97316',
            Finalizado: '#06B6D4',
            Anulado: '#EF4444',
        };
        return colors[state] || '#6B7280';
    }

    formatNumber(value: number, decimals: number = 0): string {
        return new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(value);
    }

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    }

    formatPercentage(value: number, decimals: number = 1): string {
        return new Intl.NumberFormat('es-ES', {
            style: 'percent',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(value / 100);
    }

    // Getter para acceso seguro a las estadísticas en el template
    get safeStatistics() {
        if (!this.statistics) {
            return {
                total: 0,
                withInvoice: 0,
                paidInvoices: 0,
                stateBreakdown: {
                    iniciado: 0,
                    preFaenamiento: 0,
                    pagado: 0,
                    enProceso: 0,
                    finalizado: 0,
                    anulado: 0,
                },
                introducerTypeBreakdown: {
                    natural: 0,
                    juridica: 0,
                },
                averages: {
                    inspections: 0,
                    slaughterings: 0,
                    dispatches: 0,
                },
                totalInvoiceAmount: 0,
                completionRate: 0,
                paymentRate: 0,
            };
        }
        return this.statistics;
    }
}
