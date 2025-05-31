// ===== VETERINARY DASHBOARD COMPONENT TS =====
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, forkJoin, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ZoosanitaryCertificateService } from 'src/app/zoosanitario/services/ZoosanitaryCertificate.service';
import { ExternalVerificationSheetService } from 'src/app/zoosanitario/services/ExternalVerificationSheet.service';
import { SlaughterRecordService } from 'src/app/zoosanitario/services/SlaughterRecord.service';
import { InternalVerificationSheetService } from 'src/app/zoosanitario/services/InternalVerificationSheet.service';
import { ShippingSheetService } from 'src/app/zoosanitario/services/ShippingSheet.service';
import { WorkflowManagerService } from 'src/app/zoosanitario/services/WorkflowManager.service';
import { AuthService } from 'src/app/demo/services/auth.service';

// Servicios

// Interfaces

interface DashboardStats {
    certificates: {
        total: number;
        active: number;
        processed: number;
        expired: number;
    };
    inspections: {
        external: number;
        internal: number;
        pending: number;
        completed: number;
    };
    processing: {
        animals: number;
        weight: number;
        yield: number;
    };
    shipping: {
        inTransit: number;
        delivered: number;
        pending: number;
    };
}

interface QuickAction {
    label: string;
    icon: string;
    color: string;
    route?: string;
    action?: () => void;
    disabled?: boolean;
}

interface RecentActivity {
    id: string;
    type: 'certificate' | 'inspection' | 'slaughter' | 'shipping';
    title: string;
    description: string;
    timestamp: Date;
    status: string;
    user: string;
}

interface AlertItem {
    id: string;
    type: 'warning' | 'error' | 'info';
    title: string;
    message: string;
    timestamp: Date;
    priority: 'high' | 'medium' | 'low';
    read: boolean;
}

@Component({
    selector: 'app-veterinary-dashboard',
    templateUrl: './veterinary-dashboard.component.html',
    styleUrls: ['./veterinary-dashboard.component.scss'],
})
export class VeterinaryDashboardComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    // Datos del dashboard
    stats: DashboardStats = {
        certificates: { total: 0, active: 0, processed: 0, expired: 0 },
        inspections: { external: 0, internal: 0, pending: 0, completed: 0 },
        processing: { animals: 0, weight: 0, yield: 0 },
        shipping: { inTransit: 0, delivered: 0, pending: 0 },
    };

    quickActions: QuickAction[] = [
        {
            label: 'Nuevo Flujo',
            icon: 'pi-plus-circle',
            color: 'primary',
            route: '/zoosanitario/workflow/reception',
        },
        {
            label: 'Escanear QR',
            icon: 'pi-qrcode',
            color: 'info',
            action: () => this.openQRScanner(),
        },
        {
            label: 'Certificados',
            icon: 'pi-file-o',
            color: 'secondary',
            route: '/zoosanitario/certificates',
        },
        {
            label: 'Reportes',
            icon: 'pi-chart-bar',
            color: 'warning',
            route: '/zoosanitario/reports',
        },
    ];

    recentActivity: RecentActivity[] = [];
    alerts: AlertItem[] = [];

    // Gráficos
    chartData: any = {};
    chartOptions: any = {};
    processingChartData: any = {};
    processingChartOptions: any = {};

    // Estado del componente
    isLoading = false;
    refreshInterval = 30000; // 30 segundos
    currentUser: any;

    // Widgets expandidos
    expandedWidgets = {
        stats: true,
        charts: true,
        activity: true,
        alerts: true,
    };

    constructor(
        private router: Router,
        private messageService: MessageService,
        private certificateService: ZoosanitaryCertificateService,
        private externalVerificationService: ExternalVerificationSheetService,
        private slaughterService: SlaughterRecordService,
        private internalVerificationService: InternalVerificationSheetService,
        private shippingService: ShippingSheetService,
        private workflowManager: WorkflowManagerService,
        private authService: AuthService
    ) {}

    ngOnInit() {
        this.currentUser = this.authService.token();
        this.initializeCharts();
        this.loadDashboardData();
        this.startAutoRefresh();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private initializeCharts() {
        // Configuración del gráfico de certificados
        this.chartOptions = {
            plugins: {
                legend: {
                    position: 'bottom',
                },
            },
            responsive: true,
            maintainAspectRatio: false,
        };

        // Configuración del gráfico de procesamiento
        this.processingChartOptions = {
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
            },
            responsive: true,
            maintainAspectRatio: false,
        };
    }

    private startAutoRefresh() {
        interval(this.refreshInterval)
            .pipe(
                switchMap(() => this.loadDashboardData()),
                takeUntil(this.destroy$)
            )
            .subscribe();
    }

    async loadDashboardData() {
        this.isLoading = true;

        return forkJoin({
            certificates: this.loadCertificateStats(),
            inspections: this.loadInspectionStats(),
            processing: this.loadProcessingStats(),
            shipping: this.loadShippingStats(),
            activity: this.loadRecentActivity(),
            alerts: this.loadAlerts(),
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data) => {
                    this.updateStats(data);
                    this.updateCharts();
                    this.isLoading = false;
                },
                error: (error) => {
                    console.error('Error loading dashboard data:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cargar los datos del dashboard',
                    });
                    this.isLoading = false;
                },
            });
    }

    private loadCertificateStats() {
        // Simular carga de estadísticas de certificados
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    total: 156,
                    active: 45,
                    processed: 89,
                    expired: 22,
                });
            }, 500);
        });
    }

    private loadInspectionStats() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    external: 78,
                    internal: 65,
                    pending: 23,
                    completed: 120,
                });
            }, 600);
        });
    }

    private loadProcessingStats() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    animals: 234,
                    weight: 15680.5,
                    yield: 68.4,
                });
            }, 700);
        });
    }

    private loadShippingStats() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    inTransit: 12,
                    delivered: 156,
                    pending: 8,
                });
            }, 800);
        });
    }

    private loadRecentActivity() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        id: '1',
                        type: 'certificate',
                        title: 'Certificado ZOO-2024-001234',
                        description:
                            'Certificado zoosanitario registrado correctamente',
                        timestamp: new Date(Date.now() - 15 * 60 * 1000),
                        status: 'completed',
                        user: 'Dr. Juan Pérez',
                    },
                    {
                        id: '2',
                        type: 'inspection',
                        title: 'Inspección Externa EXT-20241201',
                        description:
                            '45 animales evaluados, 42 aptos para faenamiento',
                        timestamp: new Date(Date.now() - 30 * 60 * 1000),
                        status: 'completed',
                        user: 'Dra. María González',
                    },
                    {
                        id: '3',
                        type: 'slaughter',
                        title: 'Registro de Faenamiento SLA-20241201',
                        description: 'Procesamiento de 38 animales completado',
                        timestamp: new Date(Date.now() - 45 * 60 * 1000),
                        status: 'completed',
                        user: 'Ing. Carlos Ruiz',
                    },
                    {
                        id: '4',
                        type: 'shipping',
                        title: 'Guía de Envío GDE-20241201',
                        description: 'Envío a Cliente ABC en tránsito',
                        timestamp: new Date(Date.now() - 60 * 60 * 1000),
                        status: 'in_progress',
                        user: 'Operador Luis M.',
                    },
                ]);
            }, 400);
        });
    }

    private loadAlerts() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        id: '1',
                        type: 'warning',
                        title: 'Certificados por Expirar',
                        message:
                            '3 certificados expiran en las próximas 24 horas',
                        timestamp: new Date(Date.now() - 10 * 60 * 1000),
                        priority: 'high',
                        read: false,
                    },
                    {
                        id: '2',
                        type: 'info',
                        title: 'Mantenimiento Programado',
                        message: 'Mantenimiento del sistema el próximo domingo',
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                        priority: 'medium',
                        read: false,
                    },
                    {
                        id: '3',
                        type: 'error',
                        title: 'Falla en Sensor de Temperatura',
                        message:
                            'Sensor del vehículo PLA-123 requiere revisión',
                        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
                        priority: 'high',
                        read: true,
                    },
                ]);
            }, 300);
        });
    }

    private updateStats(data: any) {
        this.stats.certificates = data.certificates;
        this.stats.inspections = data.inspections;
        this.stats.processing = data.processing;
        this.stats.shipping = data.shipping;
        this.recentActivity = data.activity;
        this.alerts = data.alerts;
    }

    private updateCharts() {
        // Gráfico de certificados
        this.chartData = {
            labels: ['Activos', 'Procesados', 'Expirados'],
            datasets: [
                {
                    data: [
                        this.stats.certificates.active,
                        this.stats.certificates.processed,
                        this.stats.certificates.expired,
                    ],
                    backgroundColor: ['#4CAF50', '#2196F3', '#FF9800'],
                },
            ],
        };

        // Gráfico de procesamiento
        const last7Days = this.getLast7Days();
        this.processingChartData = {
            labels: last7Days.map((date) =>
                date.toLocaleDateString('es-ES', { weekday: 'short' })
            ),
            datasets: [
                {
                    label: 'Animales Procesados',
                    data: [32, 45, 28, 56, 42, 38, 48],
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                },
                {
                    label: 'Peso Procesado (toneladas)',
                    data: [2.1, 2.8, 1.9, 3.2, 2.7, 2.5, 3.1],
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.4,
                },
            ],
        };
    }

    private getLast7Days(): Date[] {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date);
        }
        return days;
    }

    // Acciones del dashboard
    navigateTo(route: string) {
        this.router.navigate([route]);
    }

    executeAction(action: () => void) {
        action();
    }

    openQRScanner() {
        // Aquí se abriría el modal del scanner QR
        this.messageService.add({
            severity: 'info',
            summary: 'Scanner QR',
            detail: 'Funcionalidad de scanner QR próximamente',
        });
    }

    startNewWorkflow() {
        this.workflowManager.setCurrentWorkflow(null);
        this.router.navigate(['/zoosanitario/workflow/reception']);
    }

    toggleWidget(widget: string) {
        this.expandedWidgets[widget] = !this.expandedWidgets[widget];
    }

    getActivityIcon(type: string): string {
        const icons = {
            certificate: 'pi-file-o',
            inspection: 'pi-eye',
            slaughter: 'pi-cog',
            shipping: 'pi-truck',
        };
        return icons[type] || 'pi-circle';
    }

    getActivityColor(status: string): string {
        const colors = {
            completed: '#4CAF50',
            in_progress: '#FF9800',
            pending: '#9E9E9E',
            error: '#F44336',
        };
        return colors[status] || '#9E9E9E';
    }

    getAlertSeverity(
        type: string
    ): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
        const severities = {
            error: 'danger',
            warning: 'warn',
            info: 'info',
        };
        return severities[type] || 'info';
    }

    markAlertAsRead(alertId: string) {
        const alert = this.alerts.find((a) => a.id === alertId);
        if (alert) {
            alert.read = true;
        }
    }

    dismissAlert(alertId: string) {
        this.alerts = this.alerts.filter((a) => a.id !== alertId);
    }

    refreshData() {
        this.loadDashboardData();
        this.messageService.add({
            severity: 'success',
            summary: 'Actualizado',
            detail: 'Datos del dashboard actualizados',
        });
    }

    exportDashboard() {
        const dashboardData = {
            timestamp: new Date(),
            stats: this.stats,
            recentActivity: this.recentActivity,
            alerts: this.alerts.filter((a) => !a.read),
        };

        const dataStr = JSON.stringify(dashboardData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `dashboard_veterinario_${
            new Date().toISOString().split('T')[0]
        }.json`;
        link.click();

        URL.revokeObjectURL(url);

        this.messageService.add({
            severity: 'info',
            summary: 'Exportado',
            detail: 'Dashboard exportado correctamente',
        });
    }

    getGreeting(): string {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buenos días';
        if (hour < 18) return 'Buenas tardes';
        return 'Buenas noches';
    }

    getUnreadAlertsCount(): number {
        return this.alerts.filter((alert) => !alert.read).length;
    }

    getPendingTasksCount(): number {
        return this.stats.inspections.pending + this.stats.shipping.pending;
    }
}
