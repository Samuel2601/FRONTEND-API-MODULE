// ===== REPORT SERVICE =====
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

    // Obtener estadísticas para el reporte
    private getReportStats(request: ReportRequest): Observable<ReportStats> {
        const params = this.buildParams(request);

        return forkJoin({
            certificates: this.http.get(
                `${this.url}/reports/certificates/stats`,
                {
                    headers: this.getHeaders(),
                    params,
                }
            ),
            inspections: this.http.get(
                `${this.url}/reports/inspections/stats`,
                {
                    headers: this.getHeaders(),
                    params,
                }
            ),
            processing: this.http.get(`${this.url}/reports/processing/stats`, {
                headers: this.getHeaders(),
                params,
            }),
            shipping: this.http.get(`${this.url}/reports/shipping/stats`, {
                headers: this.getHeaders(),
                params,
            }),
        });
    }

    // Obtener detalles específicos del reporte
    private getReportDetails(request: ReportRequest): Observable<any[]> {
        const params = this.buildParams(request);

        switch (request.type) {
            case 'CERTIFICATE_SUMMARY':
                return this.http.get<any[]>(
                    `${this.url}/reports/certificates/details`,
                    {
                        headers: this.getHeaders(),
                        params,
                    }
                );

            case 'INSPECTION_REPORT':
                return this.http.get<any[]>(
                    `${this.url}/reports/inspections/details`,
                    {
                        headers: this.getHeaders(),
                        params,
                    }
                );

            case 'PRODUCTION_REPORT':
                return this.http.get<any[]>(
                    `${this.url}/reports/production/details`,
                    {
                        headers: this.getHeaders(),
                        params,
                    }
                );

            default:
                return this.http.get<any[]>(
                    `${this.url}/reports/general/details`,
                    {
                        headers: this.getHeaders(),
                        params,
                    }
                );
        }
    }

    // Construir parámetros de consulta
    private buildParams(request: ReportRequest): HttpParams {
        let params = new HttpParams()
            .set('dateFrom', request.dateFrom.toISOString())
            .set('dateTo', request.dateTo.toISOString())
            .set('type', request.type);

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
        const totalCertificates = stats.certificates?.total || 0;
        const totalAnimals = stats.processing?.animals || 0;
        const totalWeight = stats.processing?.totalWeight || 0;
        const approvedInspections = stats.inspections?.completed || 0;
        const totalInspections = stats.inspections?.total || 1;
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
        if (!shippingStats?.byDestination) {
            return [];
        }

        const destinations = Object.entries(shippingStats.byDestination)
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
                            stats.certificates.active || 0,
                            stats.certificates.processed || 0,
                            stats.certificates.expired || 0,
                            stats.certificates.cancelled || 0,
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
        if (stats.inspections?.byResult) {
            charts.push({
                type: 'bar',
                title: 'Resultados de Inspecciones',
                labels: Object.keys(stats.inspections.byResult),
                datasets: [
                    {
                        label: 'Cantidad',
                        data: Object.values(
                            stats.inspections.byResult
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
        if (stats.processing?.byType) {
            charts.push({
                type: 'doughnut',
                title: 'Procesamiento por Tipo de Animal',
                labels: Object.keys(stats.processing.byType),
                datasets: [
                    {
                        label: 'Animales',
                        data: Object.values(
                            stats.processing.byType
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

    // Exportar reporte en diferentes formatos
    exportReport(
        reportData: ReportData,
        format: ReportFormat
    ): Observable<Blob> {
        const exportData = {
            reportData,
            format,
        };

        return this.http.post(`${this.url}/reports/export`, exportData, {
            headers: this.getHeaders(),
            responseType: 'blob',
        });
    }

    // Obtener datos para dashboard
    getDashboardStats(dateFrom?: Date, dateTo?: Date): Observable<any> {
        let params = new HttpParams();

        if (dateFrom) {
            params = params.set('dateFrom', dateFrom.toISOString());
        }
        if (dateTo) {
            params = params.set('dateTo', dateTo.toISOString());
        }

        return this.http.get(`${this.url}/reports/dashboard`, {
            headers: this.getHeaders(),
            params,
        });
    }

    // Programar reporte automático
    scheduleReport(reportConfig: any): Observable<any> {
        return this.http.post(`${this.url}/reports/schedule`, reportConfig, {
            headers: this.getHeaders(),
        });
    }

    // Obtener reportes programados
    getScheduledReports(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/reports/scheduled`, {
            headers: this.getHeaders(),
        });
    }

    // Cancelar reporte programado
    cancelScheduledReport(reportId: string): Observable<any> {
        return this.http.delete(`${this.url}/reports/scheduled/${reportId}`, {
            headers: this.getHeaders(),
        });
    }

    // Obtener historial de reportes
    getReportHistory(page: number = 1, limit: number = 10): Observable<any> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('limit', limit.toString());

        return this.http.get(`${this.url}/reports/history`, {
            headers: this.getHeaders(),
            params,
        });
    }

    // Obtener plantillas de reporte
    getReportTemplates(): Observable<any[]> {
        return this.http.get<any[]>(`${this.url}/reports/templates`, {
            headers: this.getHeaders(),
        });
    }

    // Guardar plantilla de reporte
    saveReportTemplate(template: any): Observable<any> {
        return this.http.post(`${this.url}/reports/templates`, template, {
            headers: this.getHeaders(),
        });
    }

    // Validar datos del reporte
    validateReportData(request: ReportRequest): Observable<any> {
        return this.http.post(`${this.url}/reports/validate`, request, {
            headers: this.getHeaders(),
        });
    }

    // Obtener métricas de rendimiento
    getPerformanceMetrics(period: string = 'last30days'): Observable<any> {
        const params = new HttpParams().set('period', period);

        return this.http.get(`${this.url}/reports/performance`, {
            headers: this.getHeaders(),
            params,
        });
    }

    // Comparar períodos
    compareReports(
        period1: { from: Date; to: Date },
        period2: { from: Date; to: Date }
    ): Observable<any> {
        const params = new HttpParams()
            .set('period1From', period1.from.toISOString())
            .set('period1To', period1.to.toISOString())
            .set('period2From', period2.from.toISOString())
            .set('period2To', period2.to.toISOString());

        return this.http.get(`${this.url}/reports/compare`, {
            headers: this.getHeaders(),
            params,
        });
    }

    // Limpiar cache de reportes
    clearReportCache(): void {
        this.cacheService.clearByPattern('reports_*');
    }
}
