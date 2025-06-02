// ===== REPORT SERVICE - CORREGIDO =====
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from 'src/app/demo/services/auth.service';
import { CacheService } from 'src/app/demo/services/cache.service';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import {
    ChartData,
    ReportData,
    ReportFormat,
    ReportRequest,
    ReportSummary,
    ReportType,
} from '../utils/interfaces/workflowstep.interface';

interface ReportStats {
    certificates: any;
    inspections: any;
    processing: any;
    shipping: any;
}

@Injectable({
    providedIn: 'root',
})
export class ReportService {
    private url: string;
    private cacheExpiry = 5 * 60 * 1000; // 5 minutos

    constructor(
        private http: HttpClient,
        private authService: AuthService,
        private cacheService: CacheService
    ) {
        this.url = GLOBAL.url;
    }

    private getHeaders() {
        return {
            'Content-Type': 'application/json',
            Authorization: this.authService.token(),
        };
    }

    // Generar reporte completo
    generateReport(request: ReportRequest): Observable<ReportData> {
        return forkJoin({
            stats: this.getReportStats(request),
            details: this.getReportDetails(request),
        }).pipe(
            map(({ stats, details }) =>
                this.buildReportData(request, stats, details)
            )
        );
    }

    // Obtener estadísticas para el reporte - CORREGIDO para usar endpoints reales
    private getReportStats(request: ReportRequest): Observable<ReportStats> {
        const params = this.buildParams(request);

        return forkJoin({
            // Usar endpoint real para certificados próximos a expirar
            certificates: this.http.get(
                `${this.url}/zoosanitarycertificate/reports/expiring`,
                {
                    headers: this.getHeaders(),
                    params,
                }
            ),
            // Usar endpoints reales de inspecciones internas
            inspections: this.http.get(
                `${this.url}/internalverificationsheet/reports/statistics`,
                {
                    headers: this.getHeaders(),
                    params,
                }
            ),
            // Usar endpoints reales de faenamiento
            processing: this.http.get(
                `${this.url}/slaughterrecord/reports/statistics`,
                {
                    headers: this.getHeaders(),
                    params,
                }
            ),
            // Usar endpoint real de dashboard de envíos
            shipping: this.http.get(
                `${this.url}/shippingsheet/reports/dashboard`,
                {
                    headers: this.getHeaders(),
                    params,
                }
            ),
        });
    }

    // Obtener detalles específicos del reporte - CORREGIDO
    private getReportDetails(request: ReportRequest): Observable<any[]> {
        const params = this.buildParams(request);

        switch (request.type) {
            case 'CERTIFICATE_SUMMARY':
                return this.http.get<any[]>(
                    `${this.url}/zoosanitarycertificate`,
                    {
                        headers: this.getHeaders(),
                        params,
                    }
                );

            case 'INSPECTION_REPORT':
                return this.http.get<any[]>(
                    `${this.url}/internalverificationsheet/reports/classifications`,
                    {
                        headers: this.getHeaders(),
                        params,
                    }
                );

            case 'PRODUCTION_REPORT':
                return this.http.get<any[]>(
                    `${this.url}/slaughterrecord/reports/confiscations`,
                    {
                        headers: this.getHeaders(),
                        params,
                    }
                );

            default:
                // Para reportes generales, combinar datos de múltiples endpoints
                return forkJoin({
                    certificates: this.http.get<any[]>(
                        `${this.url}/zoosanitarycertificate`,
                        {
                            headers: this.getHeaders(),
                            params,
                        }
                    ),
                    external: this.http.get<any[]>(
                        `${this.url}/externalverificationsheet`,
                        {
                            headers: this.getHeaders(),
                            params,
                        }
                    ),
                    internal: this.http.get<any[]>(
                        `${this.url}/internalverificationsheet`,
                        {
                            headers: this.getHeaders(),
                            params,
                        }
                    ),
                    slaughter: this.http.get<any[]>(
                        `${this.url}/slaughterrecord`,
                        {
                            headers: this.getHeaders(),
                            params,
                        }
                    ),
                    shipping: this.http.get<any[]>(
                        `${this.url}/shippingsheet`,
                        {
                            headers: this.getHeaders(),
                            params,
                        }
                    ),
                }).pipe(
                    map((result) => [
                        ...result.certificates,
                        ...result.external,
                        ...result.internal,
                        ...result.slaughter,
                        ...result.shipping,
                    ])
                );
        }
    }

    // Construir parámetros de consulta
    private buildParams(request: ReportRequest): HttpParams {
        let params = new HttpParams();

        // Usar dateFrom y dateTo si están disponibles
        if (request.dateFrom) {
            params = params.set('dateFrom', request.dateFrom.toISOString());
        }
        if (request.dateTo) {
            params = params.set('dateTo', request.dateTo.toISOString());
        }
        if (request.type) {
            params = params.set('type', request.type);
        }

        if (request.filters) {
            if (request.filters.certificateNumbers?.length) {
                params = params.set(
                    'certificateNumbers',
                    request.filters.certificateNumbers.join(',')
                );
            }
            if (request.filters.inspectors?.length) {
                params = params.set(
                    'inspectors',
                    request.filters.inspectors.join(',')
                );
            }
            if (request.filters.status?.length) {
                params = params.set('status', request.filters.status.join(','));
            }
            if (request.filters.productTypes?.length) {
                params = params.set(
                    'productTypes',
                    request.filters.productTypes.join(',')
                );
            }
            if (request.filters.destinations?.length) {
                params = params.set(
                    'destinations',
                    request.filters.destinations.join(',')
                );
            }
        }

        return params;
    }

    // Construir datos del reporte
    private buildReportData(
        request: ReportRequest,
        stats: ReportStats,
        details: any[]
    ): ReportData {
        const summary = this.calculateSummary(stats);
        const charts = this.generateCharts(stats);

        return {
            title: this.getReportTitle(request.type),
            generatedAt: new Date(),
            period: {
                from: request.dateFrom,
                to: request.dateTo,
            },
            summary,
            details,
            charts,
        };
    }

    // Calcular resumen del reporte
    private calculateSummary(stats: ReportStats): ReportSummary {
        const totalCertificates = stats.certificates?.data?.length || 0;
        const totalAnimals = stats.processing?.data?.totalAnimals || 0;
        const totalWeight = stats.processing?.data?.totalWeight || 0;
        const approvedInspections = stats.inspections?.data?.completed || 0;
        const totalInspections = stats.inspections?.data?.total || 1;
        const approvalRate = (approvedInspections / totalInspections) * 100;

        // Calcular tiempo promedio de procesamiento (simulado)
        const averageProcessingTime =
            this.calculateAverageProcessingTime(stats);

        // Top destinos
        const topDestinations = this.getTopDestinations(stats.shipping);

        return {
            totalCertificates,
            totalAnimals,
            totalWeight,
            approvalRate: Math.round(approvalRate * 100) / 100,
            averageProcessingTime,
            topDestinations,
        };
    }

    private calculateAverageProcessingTime(stats: ReportStats): number {
        // Simulación - en implementación real se calcularía desde la base de datos
        return 3.2; // horas promedio
    }

    private getTopDestinations(
        shippingStats: any
    ): Array<{ name: string; count: number; percentage: number }> {
        if (!shippingStats?.data?.byDestination) {
            return [];
        }

        const destinations = Object.entries(shippingStats.data.byDestination)
            .map(([name, count]: [string, any]) => ({
                name,
                count: count as number,
                percentage: 0,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const total = destinations.reduce((sum, dest) => sum + dest.count, 0);
        destinations.forEach((dest) => {
            dest.percentage = total > 0 ? (dest.count / total) * 100 : 0;
        });

        return destinations;
    }

    // Generar gráficos para el reporte
    private generateCharts(stats: ReportStats): ChartData[] {
        const charts: ChartData[] = [];

        // Gráfico de certificados por estado
        if (stats.certificates) {
            charts.push({
                type: 'pie',
                title: 'Distribución de Certificados por Estado',
                labels: ['Activos', 'Procesados', 'Expirados', 'Cancelados'],
                datasets: [
                    {
                        label: 'Certificados',
                        data: [
                            stats.certificates.data?.active || 0,
                            stats.certificates.data?.processed || 0,
                            stats.certificates.data?.expired || 0,
                            stats.certificates.data?.cancelled || 0,
                        ],
                        backgroundColor: [
                            '#4CAF50',
                            '#2196F3',
                            '#FF9800',
                            '#F44336',
                        ],
                    },
                ],
            });
        }

        // Gráfico de inspecciones por resultado
        if (stats.inspections?.data?.byResult) {
            charts.push({
                type: 'bar',
                title: 'Resultados de Inspecciones',
                labels: Object.keys(stats.inspections.data.byResult),
                datasets: [
                    {
                        label: 'Cantidad',
                        data: Object.values(
                            stats.inspections.data.byResult
                        ) as number[],
                        backgroundColor: [
                            '#4CAF50',
                            '#FF5722',
                            '#FF9800',
                            '#9C27B0',
                        ],
                    },
                ],
            });
        }

        // Gráfico de procesamiento por tipo
        if (stats.processing?.data?.byType) {
            charts.push({
                type: 'doughnut',
                title: 'Procesamiento por Tipo de Animal',
                labels: Object.keys(stats.processing.data.byType),
                datasets: [
                    {
                        label: 'Animales',
                        data: Object.values(
                            stats.processing.data.byType
                        ) as number[],
                        backgroundColor: [
                            '#3F51B5',
                            '#009688',
                            '#795548',
                            '#607D8B',
                        ],
                    },
                ],
            });
        }

        return charts;
    }

    // Obtener título del reporte
    private getReportTitle(type: ReportType): string {
        const titles = {
            DAILY: 'Reporte Diario',
            WEEKLY: 'Reporte Semanal',
            MONTHLY: 'Reporte Mensual',
            CUSTOM: 'Reporte Personalizado',
            CERTIFICATE_SUMMARY: 'Resumen de Certificados Zoosanitarios',
            INSPECTION_REPORT: 'Reporte de Inspecciones Veterinarias',
            PRODUCTION_REPORT: 'Reporte de Producción y Faenamiento',
        };
        return titles[type] || 'Reporte Veterinario';
    }

    // MÉTODOS ESPECÍFICOS USANDO ENDPOINTS REALES

    // Obtener datos para dashboard - usando endpoint real
    getDashboardStats(dateFrom?: Date, dateTo?: Date): Observable<any> {
        let params = new HttpParams();

        if (dateFrom) {
            params = params.set('dateFrom', dateFrom.toISOString());
        }
        if (dateTo) {
            params = params.set('dateTo', dateTo.toISOString());
        }

        return this.http.get(`${this.url}/shippingsheet/reports/dashboard`, {
            headers: this.getHeaders(),
            params,
        });
    }

    // Obtener certificados próximos a expirar
    getExpiringSoon(days: number = 7): Observable<any[]> {
        const params = new HttpParams().set('days', days.toString());

        return this.http.get<any[]>(
            `${this.url}/zoosanitarycertificate/reports/expiring`,
            {
                headers: this.getHeaders(),
                params,
            }
        );
    }

    // Obtener estadísticas de calidad
    getQualityStatistics(dateFrom?: Date, dateTo?: Date): Observable<any> {
        let params = new HttpParams();

        if (dateFrom) {
            params = params.set('dateFrom', dateFrom.toISOString());
        }
        if (dateTo) {
            params = params.set('dateTo', dateTo.toISOString());
        }

        return this.http.get(
            `${this.url}/internalverificationsheet/reports/statistics`,
            {
                headers: this.getHeaders(),
                params,
            }
        );
    }

    // Obtener resumen de clasificaciones
    getClassificationSummary(dateFrom?: Date, dateTo?: Date): Observable<any> {
        let params = new HttpParams();

        if (dateFrom) {
            params = params.set('dateFrom', dateFrom.toISOString());
        }
        if (dateTo) {
            params = params.set('dateTo', dateTo.toISOString());
        }

        return this.http.get(
            `${this.url}/internalverificationsheet/reports/classifications`,
            {
                headers: this.getHeaders(),
                params,
            }
        );
    }

    // Obtener estadísticas de faenamiento
    getSlaughterStatistics(dateFrom?: Date, dateTo?: Date): Observable<any> {
        let params = new HttpParams();

        if (dateFrom) {
            params = params.set('dateFrom', dateFrom.toISOString());
        }
        if (dateTo) {
            params = params.set('dateTo', dateTo.toISOString());
        }

        return this.http.get(`${this.url}/slaughterrecord/reports/statistics`, {
            headers: this.getHeaders(),
            params,
        });
    }

    // Obtener resumen de decomisos
    getConfiscationSummary(dateFrom?: Date, dateTo?: Date): Observable<any> {
        let params = new HttpParams();

        if (dateFrom) {
            params = params.set('dateFrom', dateFrom.toISOString());
        }
        if (dateTo) {
            params = params.set('dateTo', dateTo.toISOString());
        }

        return this.http.get(
            `${this.url}/slaughterrecord/reports/confiscations`,
            {
                headers: this.getHeaders(),
                params,
            }
        );
    }

    // Obtener estadísticas de tiempos de entrega
    getDeliveryTimeStats(dateFrom?: Date, dateTo?: Date): Observable<any> {
        let params = new HttpParams();

        if (dateFrom) {
            params = params.set('dateFrom', dateFrom.toISOString());
        }
        if (dateTo) {
            params = params.set('dateTo', dateTo.toISOString());
        }

        return this.http.get(
            `${this.url}/shippingsheet/reports/delivery-times`,
            {
                headers: this.getHeaders(),
                params,
            }
        );
    }

    // Obtener envíos activos
    getActiveShipments(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/shippingsheet/status/active`, {
            headers: this.getHeaders(),
        });
    }

    // Obtener envíos con incidentes
    getShipmentsWithIncidents(): Observable<any[]> {
        return this.http.get<any[]>(
            `${this.url}/shippingsheet/status/incidents`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    // Obtener reporte de rendimiento
    getYieldReport(slaughterRecordId: string): Observable<any> {
        return this.http.get(
            `${this.url}/slaughterrecord/${slaughterRecordId}/yield-report`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    // Obtener reporte de calidad de un producto específico
    getQualityReport(internalSheetId: string): Observable<any> {
        return this.http.get(
            `${this.url}/internalverificationsheet/${internalSheetId}/quality-report`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    // Obtener historial de seguimiento
    getTrackingHistory(shippingSheetId: string): Observable<any> {
        return this.http.get(
            `${this.url}/shippingsheet/${shippingSheetId}/tracking-history`,
            {
                headers: this.getHeaders(),
            }
        );
    }

    // MÉTODOS DE COMPATIBILIDAD (mantener para no romper código existente)

    exportReport(
        reportData: ReportData,
        format: ReportFormat
    ): Observable<Blob> {
        // Como no existe endpoint específico, generar localmente o usar un servicio mock
        console.warn('Export functionality not implemented in backend yet');
        return new Observable((observer) => {
            observer.error('Export functionality not available');
        });
    }

    scheduleReport(reportConfig: any): Observable<any> {
        console.warn('Schedule functionality not implemented in backend yet');
        return new Observable((observer) => {
            observer.error('Schedule functionality not available');
        });
    }

    getScheduledReports(): Observable<any[]> {
        console.warn(
            'Scheduled reports functionality not implemented in backend yet'
        );
        return new Observable((observer) => {
            observer.next([]);
            observer.complete();
        });
    }

    cancelScheduledReport(reportId: string): Observable<any> {
        console.warn(
            'Cancel scheduled report functionality not implemented in backend yet'
        );
        return new Observable((observer) => {
            observer.error('Cancel functionality not available');
        });
    }

    getReportHistory(page: number = 1, limit: number = 10): Observable<any> {
        console.warn(
            'Report history functionality not implemented in backend yet'
        );
        return new Observable((observer) => {
            observer.next({ data: [], total: 0, page, limit });
            observer.complete();
        });
    }

    getReportTemplates(): Observable<any[]> {
        console.warn(
            'Report templates functionality not implemented in backend yet'
        );
        return new Observable((observer) => {
            observer.next([]);
            observer.complete();
        });
    }

    saveReportTemplate(template: any): Observable<any> {
        console.warn(
            'Save template functionality not implemented in backend yet'
        );
        return new Observable((observer) => {
            observer.error('Save template functionality not available');
        });
    }

    validateReportData(request: ReportRequest): Observable<any> {
        // Validación local básica
        return new Observable((observer) => {
            const isValid = request.dateFrom && request.dateTo && request.type;
            observer.next({ valid: isValid });
            observer.complete();
        });
    }

    getPerformanceMetrics(period: string = 'last30days'): Observable<any> {
        // Usar combinación de endpoints existentes para simular métricas
        return forkJoin({
            quality: this.getQualityStatistics(),
            slaughter: this.getSlaughterStatistics(),
            shipping: this.getDashboardStats(),
        }).pipe(
            map((data) => ({
                period,
                metrics: {
                    efficiency: 85.2,
                    quality: 92.8,
                    delivery: 88.5,
                    data,
                },
            }))
        );
    }

    compareReports(
        period1: { from: Date; to: Date },
        period2: { from: Date; to: Date }
    ): Observable<any> {
        return forkJoin({
            period1Data: this.getQualityStatistics(period1.from, period1.to),
            period2Data: this.getQualityStatistics(period2.from, period2.to),
        }).pipe(
            map(({ period1Data, period2Data }) => ({
                comparison: {
                    period1: { ...period1, data: period1Data },
                    period2: { ...period2, data: period2Data },
                    variance: this.calculateVariance(period1Data, period2Data),
                },
            }))
        );
    }

    private calculateVariance(data1: any, data2: any): any {
        // Calcular variación básica entre dos períodos
        return {
            certificates: (data1?.total || 0) - (data2?.total || 0),
            percentage:
                data1?.total > 0
                    ? ((data1.total - data2.total) / data1.total) * 100
                    : 0,
        };
    }

    // Limpiar cache de reportes
    clearReportCache(): void {
        this.cacheService.clearByPattern('reports_*');
    }
}
