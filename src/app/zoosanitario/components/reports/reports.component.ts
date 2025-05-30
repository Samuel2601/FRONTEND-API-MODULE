// ===== REPORTS COMPONENT TS =====
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import {
    ReportData,
    ReportFormat,
    ReportType,
} from '../../utils/interfaces/workflowstep.interface';
import { ZoosanitaryCertificateService } from '../../services/ZoosanitaryCertificate.service';
import { ExternalVerificationSheetService } from '../../services/ExternalVerificationSheet.service';
import { SlaughterRecordService } from '../../services/SlaughterRecord.service';
import { InternalVerificationSheetService } from '../../services/InternalVerificationSheet.service';
import { ShippingSheetService } from '../../services/ShippingSheet.service';

// Servicios

// Interfaces

interface ReportFilter {
    dateFrom: Date;
    dateTo: Date;
    certificateNumbers?: string[];
    inspectors?: string[];
    status?: string[];
    productTypes?: string[];
    destinations?: string[];
}

interface KPICard {
    title: string;
    value: number | string;
    unit?: string;
    icon: string;
    color: string;
    trend?: {
        value: number;
        direction: 'up' | 'down' | 'stable';
    };
}

@Component({
    selector: 'app-reports',
    templateUrl: './reports.component.html',
    styleUrls: ['./reports.component.scss'],
})
export class ReportsComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    // Formulario de filtros
    reportForm: FormGroup;
    isLoading = false;

    // Datos de reportes
    kpiCards: KPICard[] = [];
    chartData: any = {};
    chartOptions: any = {};

    // Gráficos específicos
    certificatesChart: any = {};
    inspectionChart: any = {};
    processingChart: any = {};
    destinationsChart: any = {};
    trendChart: any = {};

    // Opciones para filtros
    reportTypes: Array<{ label: string; value: ReportType }> = [
        { label: 'Reporte Diario', value: 'DAILY' },
        { label: 'Reporte Semanal', value: 'WEEKLY' },
        { label: 'Reporte Mensual', value: 'MONTHLY' },
        { label: 'Período Personalizado', value: 'CUSTOM' },
        { label: 'Resumen de Certificados', value: 'CERTIFICATE_SUMMARY' },
        { label: 'Reporte de Inspecciones', value: 'INSPECTION_REPORT' },
        { label: 'Reporte de Producción', value: 'PRODUCTION_REPORT' },
    ];

    reportFormats: Array<{ label: string; value: ReportFormat }> = [
        { label: 'PDF', value: 'PDF' },
        { label: 'Excel', value: 'EXCEL' },
        { label: 'JSON', value: 'JSON' },
    ];

    inspectorOptions = [
        { label: 'Dr. Juan Pérez', value: 'juan_perez' },
        { label: 'Dra. María González', value: 'maria_gonzalez' },
        { label: 'Dr. Carlos Ruiz', value: 'carlos_ruiz' },
        { label: 'Dra. Ana López', value: 'ana_lopez' },
    ];

    statusOptions = [
        { label: 'Activo', value: 'ACTIVE' },
        { label: 'Completado', value: 'COMPLETED' },
        { label: 'Procesado', value: 'PROCESSED' },
        { label: 'Entregado', value: 'DELIVERED' },
    ];

    productTypeOptions = [
        { label: 'Bovino', value: 'BOVINE' },
        { label: 'Porcino', value: 'PORK' },
        { label: 'Aviar', value: 'POULTRY' },
        { label: 'Ovino', value: 'SHEEP' },
        { label: 'Caprino', value: 'GOAT' },
    ];

    // Configuración de período predeterminado
    defaultPeriods = [
        { label: 'Hoy', value: 'today' },
        { label: 'Ayer', value: 'yesterday' },
        { label: 'Últimos 7 días', value: 'last7days' },
        { label: 'Últimos 30 días', value: 'last30days' },
        { label: 'Este mes', value: 'thismonth' },
        { label: 'Mes anterior', value: 'lastmonth' },
    ];

    // Estado de las pestañas
    activeTabIndex = 0;

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private certificateService: ZoosanitaryCertificateService,
        private externalVerificationService: ExternalVerificationSheetService,
        private slaughterService: SlaughterRecordService,
        private internalVerificationService: InternalVerificationSheetService,
        private shippingService: ShippingSheetService
    ) {
        this.initializeForm();
        this.initializeChartOptions();
    }

    ngOnInit() {
        this.setDefaultPeriod('last30days');
        this.generateReport();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private initializeForm() {
        this.reportForm = this.fb.group({
            reportType: ['CUSTOM', Validators.required],
            dateFrom: [new Date(), Validators.required],
            dateTo: [new Date(), Validators.required],
            format: ['PDF', Validators.required],
            certificateNumbers: [[]],
            inspectors: [[]],
            status: [[]],
            productTypes: [[]],
            destinations: [[]],
        });
    }

    private initializeChartOptions() {
        // Opciones comunes para gráficos
        this.chartOptions = {
            plugins: {
                legend: {
                    position: 'bottom',
                },
            },
            responsive: true,
            maintainAspectRatio: false,
        };
    }

    setDefaultPeriod(period: string) {
        const now = new Date();
        let dateFrom: Date;
        let dateTo: Date = new Date(now);

        switch (period) {
            case 'today':
                dateFrom = new Date(now);
                break;
            case 'yesterday':
                dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                dateTo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'last7days':
                dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'last30days':
                dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'thismonth':
                dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'lastmonth':
                const lastMonth = new Date(
                    now.getFullYear(),
                    now.getMonth() - 1,
                    1
                );
                dateFrom = lastMonth;
                dateTo = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            default:
                dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        this.reportForm.patchValue({
            dateFrom: dateFrom,
            dateTo: dateTo,
        });
    }

    generateReport() {
        if (this.reportForm.invalid) {
            this.markFormGroupTouched(this.reportForm);
            this.messageService.add({
                severity: 'error',
                summary: 'Error de Validación',
                detail: 'Por favor complete todos los campos requeridos',
            });
            return;
        }

        this.isLoading = true;

        // Simular carga de datos
        forkJoin({
            certificates: this.loadCertificateData(),
            inspections: this.loadInspectionData(),
            processing: this.loadProcessingData(),
            shipping: this.loadShippingData(),
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data) => {
                    this.processReportData(data);
                    this.updateKPIs(data);
                    this.updateCharts(data);
                    this.isLoading = false;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Reporte generado correctamente',
                    });
                },
                error: (error) => {
                    console.error('Error generating report:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al generar el reporte',
                    });
                    this.isLoading = false;
                },
            });
    }

    private loadCertificateData() {
        // Simular datos de certificados
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    total: 156,
                    active: 45,
                    processed: 89,
                    expired: 22,
                    byDay: [12, 8, 15, 22, 18, 25, 20, 14, 19, 16],
                    byStatus: { active: 45, processed: 89, expired: 22 },
                });
            }, 800);
        });
    }

    private loadInspectionData() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    external: 78,
                    internal: 65,
                    completed: 120,
                    pending: 23,
                    approvalRate: 85.5,
                    byInspector: {
                        'Dr. Juan Pérez': 35,
                        'Dra. María González': 28,
                        'Dr. Carlos Ruiz': 32,
                        'Dra. Ana López': 25,
                    },
                });
            }, 900);
        });
    }

    private loadProcessingData() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    animals: 234,
                    totalWeight: 15680.5,
                    averageYield: 68.4,
                    byType: {
                        Bovino: 128,
                        Porcino: 89,
                        Aviar: 67,
                        Ovino: 45,
                    },
                    dailyTrend: [18, 22, 19, 25, 21, 28, 24, 20, 23, 26],
                });
            }, 1000);
        });
    }

    private loadShippingData() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    total: 89,
                    delivered: 76,
                    inTransit: 8,
                    pending: 5,
                    byDestination: {
                        Quito: 25,
                        Guayaquil: 22,
                        Cuenca: 18,
                        Ambato: 15,
                        Otros: 9,
                    },
                });
            }, 700);
        });
    }

    private processReportData(data: any) {
        // Procesar datos para el reporte
        console.log('Processing report data:', data);
    }

    private updateKPIs(data: any) {
        this.kpiCards = [
            {
                title: 'Certificados Totales',
                value: data.certificates.total,
                icon: 'pi-file-o',
                color: '#3B82F6',
                trend: { value: 12, direction: 'up' },
            },
            {
                title: 'Inspecciones Completadas',
                value: data.inspections.completed,
                icon: 'pi-eye',
                color: '#10B981',
                trend: { value: 8, direction: 'up' },
            },
            {
                title: 'Animales Procesados',
                value: data.processing.animals,
                icon: 'pi-cog',
                color: '#F59E0B',
                trend: { value: 5, direction: 'down' },
            },
            {
                title: 'Tasa de Aprobación',
                value: data.inspections.approvalRate,
                unit: '%',
                icon: 'pi-check-circle',
                color: '#EF4444',
                trend: { value: 2.5, direction: 'up' },
            },
            {
                title: 'Peso Total Procesado',
                value: (data.processing.totalWeight / 1000).toFixed(1),
                unit: 'ton',
                icon: 'pi-chart-bar',
                color: '#8B5CF6',
                trend: { value: 15, direction: 'up' },
            },
            {
                title: 'Envíos Entregados',
                value: data.shipping.delivered,
                icon: 'pi-truck',
                color: '#06B6D4',
                trend: { value: 3, direction: 'stable' },
            },
        ];
    }

    private updateCharts(data: any) {
        // Gráfico de certificados por estado
        this.certificatesChart = {
            labels: ['Activos', 'Procesados', 'Expirados'],
            datasets: [
                {
                    data: [
                        data.certificates.active,
                        data.certificates.processed,
                        data.certificates.expired,
                    ],
                    backgroundColor: ['#10B981', '#3B82F6', '#EF4444'],
                },
            ],
        };

        // Gráfico de inspecciones por inspector
        this.inspectionChart = {
            labels: Object.keys(data.inspections.byInspector),
            datasets: [
                {
                    label: 'Inspecciones Realizadas',
                    data: Object.values(data.inspections.byInspector),
                    backgroundColor: [
                        '#3B82F6',
                        '#10B981',
                        '#F59E0B',
                        '#EF4444',
                    ],
                },
            ],
        };

        // Gráfico de procesamiento por tipo
        this.processingChart = {
            labels: Object.keys(data.processing.byType),
            datasets: [
                {
                    data: Object.values(data.processing.byType),
                    backgroundColor: [
                        '#8B5CF6',
                        '#06B6D4',
                        '#F59E0B',
                        '#EF4444',
                    ],
                },
            ],
        };

        // Gráfico de destinos
        this.destinationsChart = {
            labels: Object.keys(data.shipping.byDestination),
            datasets: [
                {
                    data: Object.values(data.shipping.byDestination),
                    backgroundColor: [
                        '#3B82F6',
                        '#10B981',
                        '#F59E0B',
                        '#EF4444',
                        '#8B5CF6',
                    ],
                },
            ],
        };

        // Gráfico de tendencia
        this.trendChart = {
            labels: this.getLast10Days(),
            datasets: [
                {
                    label: 'Certificados Emitidos',
                    data: data.certificates.byDay,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                },
                {
                    label: 'Animales Procesados',
                    data: data.processing.dailyTrend,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                },
            ],
        };
    }

    private getLast10Days(): string[] {
        const days = [];
        for (let i = 9; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(
                date.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                })
            );
        }
        return days;
    }

    exportReport() {
        const format = this.reportForm.get('format')?.value;
        const reportData = this.buildReportData();

        switch (format) {
            case 'PDF':
                this.exportToPDF(reportData);
                break;
            case 'EXCEL':
                this.exportToExcel(reportData);
                break;
            case 'JSON':
                this.exportToJSON(reportData);
                break;
        }
    }

    private buildReportData(): ReportData {
        const formValue = this.reportForm.value;

        return {
            title: `Reporte Veterinario - ${
                this.reportTypes.find((t) => t.value === formValue.reportType)
                    ?.label
            }`,
            generatedAt: new Date(),
            period: {
                from: formValue.dateFrom,
                to: formValue.dateTo,
            },
            summary: {
                totalCertificates: 156,
                totalAnimals: 234,
                totalWeight: 15680.5,
                approvalRate: 85.5,
                averageProcessingTime: 3.2,
                topDestinations: [
                    { name: 'Quito', count: 25, percentage: 28.1 },
                    { name: 'Guayaquil', count: 22, percentage: 24.7 },
                    { name: 'Cuenca', count: 18, percentage: 20.2 },
                ],
            },
            details: [],
            charts: [
                {
                    type: 'pie',
                    title: 'Certificados por Estado',
                    labels: this.certificatesChart.labels,
                    datasets: this.certificatesChart.datasets,
                },
                {
                    type: 'bar',
                    title: 'Inspecciones por Inspector',
                    labels: this.inspectionChart.labels,
                    datasets: this.inspectionChart.datasets,
                },
            ],
        };
    }

    private exportToPDF(data: ReportData) {
        // Implementar exportación a PDF
        console.log('Exporting to PDF:', data);
        this.messageService.add({
            severity: 'info',
            summary: 'Exportación',
            detail: 'Reporte exportado a PDF correctamente',
        });
    }

    private exportToExcel(data: ReportData) {
        // Implementar exportación a Excel
        console.log('Exporting to Excel:', data);
        this.messageService.add({
            severity: 'info',
            summary: 'Exportación',
            detail: 'Reporte exportado a Excel correctamente',
        });
    }

    private exportToJSON(data: ReportData) {
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_veterinario_${
            new Date().toISOString().split('T')[0]
        }.json`;
        link.click();

        URL.revokeObjectURL(url);

        this.messageService.add({
            severity: 'success',
            summary: 'Exportación',
            detail: 'Reporte exportado a JSON correctamente',
        });
    }

    scheduleReport() {
        this.messageService.add({
            severity: 'info',
            summary: 'Programar Reporte',
            detail: 'Funcionalidad de programación de reportes en desarrollo',
        });
    }

    resetFilters() {
        this.reportForm.reset({
            reportType: 'CUSTOM',
            format: 'PDF',
            certificateNumbers: [],
            inspectors: [],
            status: [],
            productTypes: [],
            destinations: [],
        });
        this.setDefaultPeriod('last30days');
    }

    private markFormGroupTouched(formGroup: FormGroup) {
        Object.keys(formGroup.controls).forEach((key) => {
            const control = formGroup.get(key);
            control?.markAsTouched();
        });
    }

    getTrendIcon(direction: string): string {
        switch (direction) {
            case 'up':
                return 'pi-arrow-up';
            case 'down':
                return 'pi-arrow-down';
            default:
                return 'pi-minus';
        }
    }

    getTrendColor(direction: string): string {
        switch (direction) {
            case 'up':
                return '#10B981';
            case 'down':
                return '#EF4444';
            default:
                return '#6B7280';
        }
    }

    onTabChange(event: any) {
        this.activeTabIndex = event.index;
    }
}
