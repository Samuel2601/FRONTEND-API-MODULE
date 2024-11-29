import { Component, OnInit } from '@angular/core';
import { RegistroService } from '../services/registro.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { ImportsModule } from 'src/app/demo/services/import';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
    generalData: any = { total: 0 };
    surveyorData: any = { labels: [], datasets: [] };
    timelineData: any = { labels: [], datasets: [] };
    hourlyData: any = { labels: [], datasets: [] };
    hourlyDataConectividad: any = { labels: [], datasets: [] };
    tableData: any[] = [];

    personalData: any = { total: 0 };
    nationalityData: any = { labels: [], datasets: [] };
    ageRangeData: any = { labels: [], datasets: [] };

    ubicacionData: any = {};

    chartOptions: any;

    constructor(private registroService: RegistroService) {}

    // Método para obtener datos generales
    fetchGeneralData(): Observable<any> {
        return this.registroService.informacionRegistro();
    }

    // Método para obtener datos personales
    fetchPersonalData(): Observable<any> {
        return this.registroService.informacionPersonal();
    }

    // Método para obtener datos personales
    fetchUbicacionData(): Observable<any> {
        return this.registroService.informacionUbicacion();
    }

    loading: boolean = true;

    async ngOnInit() {
        this.loading = true;
        await this.fetchData();
        this.initChartOptions();
        this.loading = false;
    }
    async fetchData() {
        // Obtener datos generales
        this.fetchGeneralData().subscribe((data: any) => {
            console.log(data);
            this.generalData.total = data.total;
            this.processGeneralData(data);
        });

        // Obtener datos personales
        this.fetchPersonalData().subscribe((data: any) => {
            console.log(data);
            this.personalData.total = data.total;
            this.processPersonalData(data);
        });

        // Obtener datos ubicación
        this.fetchUbicacionData().subscribe((data: any) => {
            this.ubicacionData = this.processUbicacionData(data);
            this.ubicacionData.total = data.total;
            console.log(this.ubicacionData);
        });
    }

    processGeneralData(data: any) {
        this.surveyorData = {
            labels: data.porEncuestador.map(
                (item: any) => item.encuestador.name
            ),
            datasets: [
                {
                    label: 'Registros',
                    data: data.porEncuestador.map((item: any) => item.count),
                    backgroundColor: '#42A5F5',
                },
            ],
        };

        this.timelineData = {
            labels: data.lineaDeTiempo.map((item: any) => item._id),
            datasets: [
                {
                    label: 'Registros por Día',
                    data: data.lineaDeTiempo.map((item: any) => item.count),
                    backgroundColor: '#42A5F5',
                    borderColor: '#1E88E5',
                    fill: false,
                    tension: 0.4,
                },
            ],
        };

        this.hourlyData = {
            labels: data.lineaDeTiempoHora.map((item) => `${item._id}:00`),
            datasets: [
                {
                    label: 'Promedio por Hora (Line)',
                    data: data.lineaDeTiempoHora.map((item) => item.count),
                    fill: false,
                    borderColor: '#42A5F5',
                    tension: 0.5,
                    type: 'line',
                },
                {
                    label: 'Registros por Hora (Bar)',
                    data: data.lineaDeTiempoHora.map((item) => item.count),
                    backgroundColor: '#90cd93',
                    borderColor: '#66BB6A',
                    borderWidth: 1,
                    type: 'bar',
                },
            ],
        };

        this.hourlyDataConectividad = {
            labels: data.lineaDeTiempoHoraConectividad.map(
                (item: any) => `${item._id}:00`
            ),
            datasets: [
                {
                    label: 'Registros por Hora de Conectividad de Encuestadores',
                    data: data.lineaDeTiempoHoraConectividad.map(
                        (item: any) => item.count
                    ),
                    backgroundColor: '#fccc55',
                    borderColor: '#fbc02d',
                    fill: true,
                },
            ],
        };

        this.tableData = data.porEncuestador.map((item: any) => ({
            name: `${item.encuestador.name} ${item.encuestador.last_name}`,
            email: item.encuestador.email,
            count: item.count,
        }));
    }

    processPersonalData(data: any) {
        this.nationalityData = {
            labels: data.porNacionalidad.map((item: any) => item._id),
            datasets: [
                {
                    data: data.porNacionalidad.map((item: any) => item.count),
                    backgroundColor: [
                        '#42A5F5',
                        '#66BB6A',
                        '#FFA726',
                        '#AB47BC',
                        '#FF7043',
                        '#29B6F6',
                        '#FFCA28',
                        '#26A69A',
                        '#8D6E63',
                        '#78909C',
                        '#5C6BC0',
                        '#EF5350',
                        '#EC407A',
                        '#7E57C2',
                        '#42A5F5',
                        '#FFEE58',
                        '#8E24AA',
                        '#BDBDBD',
                        '#FF6F00',
                        '#00ACC1',
                    ],
                },
            ],
        };

        this.ageRangeData = {
            labels: data.rangoEdadCount.map((item: any) => item._id),
            datasets: [
                {
                    label: 'Registros',
                    data: data.rangoEdadCount.map((item: any) => item.count),
                    backgroundColor: '#66BB6A',
                },
            ],
        };

        this.personalData.telefonosUnicos = data.telefonosUnicos;
        this.personalData.promedioEdad = data.promedioEdad[0].promedioEdad;
        this.personalData.ageStats = {
            minEdad: data.ageStats[0].minEdad,
            maxEdad: data.ageStats[0].maxEdad,
        };
    }

    processUbicacionData(data: any) {
        // Procesar el promedio de posesión
        const promedioPosesion =
            data.promedioPosesion[0]?.promedioPosesion ?? 0;
        const timeUnit = data.promedioPosesion[0]?.timeUnit ?? 'años';

        // Procesar la distribución por sector
        const distribucionPorSector = {
            table: data.distribucionPorSector.map((item: any) => ({
                sector: item._id ?? 'Desconocido',
                count: item.count ?? 0,
            })),
            chart: {
                labels: data.distribucionPorSector.map((item: any) => item._id),
                datasets: [
                    {
                        label: 'Distribución por sector',
                        data: data.distribucionPorSector.map(
                            (item: any) => item.count
                        ),
                        backgroundColor: '#66BB6A',
                    },
                ],
            },
        };

        // Procesar la distribución por estado de casa
        const distribucionPorEstadoCasa = {
            table: data.distribucionPorEstadoCasa.map((item: any) => ({
                sector: item._id ?? 'Desconocido',
                count: item.count ?? 0,
            })),
            chart: {
                labels: data.distribucionPorEstadoCasa.map(
                    (item: any) => item._id
                ),
                datasets: [
                    {
                        label: 'Distribución por sector',
                        data: data.distribucionPorEstadoCasa.map(
                            (item: any) => item.count
                        ),
                        backgroundColor: '#66BB6A',
                    },
                ],
            },
        };

        // Procesar el promedio de familias por lote
        const promedioFamiliasPorLote =
            data.promedioFamiliasPorLote[0]?.promedioFamilias ?? 0;

        // Procesar el promedio de personas por lote
        const promedioPersonasPorLote =
            data.promedioPersonasPorLote[0]?.promedioPersonas ?? 0;

        // Procesar el promedio de personas por sector
        const promedioPersonasPorSector = data.promedioPersonasPorSector.map(
            (item: any) => ({
                sector: item._id ?? 'Desconocido',
                promedioPersonas: item.promedioPersonas ?? 0,
            })
        );

        // Procesar el total de personas por barrio
        const totalPersonasPorBarrio = data.totalPersonasPorBarrio.map(
            (item: any) => ({
                barrio: item._id ?? 'Desconocido',
                totalPersonas: item.totalPersonas ?? 0,
            })
        );

        // Procesar el total de lotes por sector
        const totalLotesPorSector = data.totalLotesPorSector.map(
            (item: any) => ({
                sector: item._id ?? 'Desconocido',
                totalLotes: item.totalLotes ?? 0,
            })
        );

        // Procesar el total de familias por sector
        const totalFamiliasPorSector = data.totalFamiliasPorSector.map(
            (item: any) => ({
                sector: item._id ?? 'Desconocido',
                totalFamilias: item.totalFamilias ?? 0,
            })
        );

        // Procesar el total de familias por barrio
        const totalFamiliasPorBarrio = data.totalFamiliasPorBarrio.map(
            (item: any) => ({
                barrio: item._id ?? 'Desconocido',
                totalFamilias: item.totalFamilias ?? 0,
            })
        );

        // Procesar el total de familias por lote
        const totalFamiliasPorLote = data.totalFamiliasPorLote.map(
            (item: any) => ({
                lote: item._id ?? 'Desconocido',
                totalFamilias: item.totalFamilias ?? 0,
            })
        );

        // Estructura final de datos procesados
        return {
            promedioPosesion,
            timeUnit,
            distribucionPorSector,
            distribucionPorEstadoCasa,
            promedioFamiliasPorLote,
            promedioPersonasPorLote,
            promedioPersonasPorSector,
            totalPersonasPorBarrio,
            totalLotesPorSector,
            totalFamiliasPorSector,
            totalFamiliasPorBarrio,
            totalFamiliasPorLote,
        };
    }

    processNationalityData(data: any) {
        this.nationalityData = {
            labels: data.nacionalidad.map((item) => item.nacionalidad),
            datasets: [
                {
                    data: data.nacionalidad.map((item) => item.cantidad),
                    backgroundColor: ['#00ACC1', '#00ACC1', '#FF8C00'],
                },
            ],
        };
    }
    chartOptionsPie: any;
    initChartOptions() {
        this.chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
            },
            scales: {
                x: {
                    ticks: { color: '#495057' },
                    grid: { color: '#ebedef' },
                },
                y: {
                    ticks: { color: '#495057' },
                    grid: { color: '#ebedef' },
                },
            },
        };
        this.chartOptionsPie = {
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        color: '#495057',
                    },
                },
            },
        };
    }
    showChart: boolean = true;
}
