import { Component, OnInit } from '@angular/core';
import { RegistroService } from '../services/registro.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { ImportsModule } from 'src/app/demo/services/import';
import { Observable } from 'rxjs';
import { format } from 'date-fns'; // Asegúrate de tener instalada date-fns si la usas
import { HelperService } from 'src/app/demo/services/helper.service';

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

    colors: [
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
        '#00ACC1'
    ];

    constructor(
        private registroService: RegistroService,
        private helperService: HelperService
    ) {}
    isMobil() {
        return this.helperService.isMobil();
    }
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
            this.loadData = false;
            this.ubicacionData = this.processUbicacionData(data);
            this.ubicacionData.total = data.total;
            console.log(this.ubicacionData);
            this.loadData = true;
        });
    }
    loadData: boolean = false;

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

        // Asumimos que data.lineaDeTiempo contiene fechas como string en formato 'YYYY-MM-DD'
        const startDate = new Date(data.lineaDeTiempo[0]._id); // La fecha más antigua
        const endDate = new Date(); // La fecha actual

        // Función para generar todas las fechas entre startDate y endDate
        const generateDateRange = (start: Date, end: Date) => {
            const dates = [];
            let currentDate = start;
            while (currentDate <= end) {
                dates.push(format(currentDate, 'yyyy-MM-dd')); // Formato 'YYYY-MM-DD'
                currentDate.setDate(currentDate.getDate() + 1); // Incrementamos un día
            }
            return dates;
        };

        // Generamos las fechas intermedias
        const allDates = generateDateRange(startDate, endDate);

        // Creamos el dataset con las fechas generadas y completando con 0 donde no haya datos
        this.timelineData = {
            labels: allDates, // Etiquetas con todas las fechas
            datasets: [
                {
                    label: 'Registros por Día',
                    data: allDates.map((date) => {
                        const found = data.lineaDeTiempo.find(
                            (item: any) => item._id === date
                        );
                        return found ? found.count : 0; // Si no se encuentra la fecha, asignamos 0
                    }),
                    backgroundColor: '#cae6fc7d',
                    borderColor: '#1E88E5',
                    fill: true,
                    tension: 0.4,
                },
            ],
        };

        this.hourlyData = {
            labels: Array.from(
                { length: 24 },
                (_, i) => `${i.toString().padStart(2, '0')}:00`
            ),
            datasets: [
                {
                    label: 'Promedio por Hora',
                    data: Array.from({ length: 24 }, (_, i) => {
                        const hourData = data.lineaDeTiempoHora.find(
                            (item) => item._id === i
                        );
                        return hourData ? hourData.count : 0;
                    }),
                    fill: true,
                    borderColor: '#1E88E5',
                    tension: 0.5,
                    type: 'line',
                    backgroundColor: '#cae6fc7d',
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
                    backgroundColor: this.colors,
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
        console.log(data);

        // Procesar el promedio de posesión
        const promedioPosesion = data.promedioPosesion?.promedioPosesion ?? 0;
        const timeUnit = data.promedioPosesion?.timeUnit ?? 'años';

        // Procesar la distribución por sector
        const distribucionPorSector = {
            columnOrder: ['Sector', 'Conteo', 'Porcentaje'],
            table: data.distribucionPorSector.map((item: any) => ({
                Sector: item._id ?? 'Desconocido',
                Conteo: item.count ?? 0,
                Porcentaje: parseFloat(item.percentage).toFixed(2) ?? 0,
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
            title: 'Distribución por sector',
        };

        // Procesar la distribución por barrio
        const distribucionPorBarrio = {
            columnOrder: ['Barrio', 'Conteo', 'Porcentaje'],
            table: data.distribucionPorBarrio.map((item: any) => ({
                Barrio: item._id ?? 'Desconocido',
                Conteo: item.count ?? 0,
                Porcentaje: parseFloat(item.percentage).toFixed(2) ?? 0,
            })),
            chart: {
                labels: data.distribucionPorBarrio.map((item: any) => item._id),
                datasets: [
                    {
                        label: 'Distribución por barrio',
                        data: data.distribucionPorBarrio.map(
                            (item: any) => item.count
                        ),
                        backgroundColor: '#FFA726',
                    },
                ],
            },
            title: 'Distribución por barrio',
        };

        // Procesar la distribución por manzana
        const distribucionPorManzana = {
            columnOrder: ['Manzana', 'Conteo', 'Porcentaje'],
            table: data.distribucionPorManzana.map((item: any) => ({
                Manzana: item._id ?? 'Desconocido',
                Conteo: item.count ?? 0,
                Porcentaje: parseFloat(item.percentage).toFixed(2) ?? 0,
            })),
            chart: {
                labels: data.distribucionPorManzana.map(
                    (item: any) => item._id
                ),
                datasets: [
                    {
                        label: 'Distribución por manzana',
                        data: data.distribucionPorManzana.map(
                            (item: any) => item.count
                        ),
                        backgroundColor: '#29B6F6',
                    },
                ],
            },
            title: 'Distribución por manzana',
        };

        // Procesar la distribución por estado de casa
        const distribucionPorEstadoCasa = {
            columnOrder: ['Estado', 'Conteo', 'Porcentaje'],
            table: data.distribucionPorEstadoCasa.map((item: any) => ({
                Estado: item._id ?? 'Desconocido',
                Conteo: item.count ?? 0,
                Porcentaje: parseFloat(item.percentage).toFixed(2) ?? 0,
            })),
            chart: {
                labels: data.distribucionPorEstadoCasa.map(
                    (item: any) => item._id
                ),
                datasets: [
                    {
                        label: 'Distribución por estado de casa',
                        data: data.distribucionPorEstadoCasa.map((item: any) =>
                            parseFloat(item.percentage).toFixed(2)
                        ),
                        backgroundColor: this.colors,
                    },
                ],
            },
            title: 'Distribución por estado de casa',
        };

        // Procesar el promedio de familias por lote
        const promedioFamiliasPorLote = data.promedioFamiliasPorLote ?? 0;

        // Procesar el promedio de personas por lote
        const promedioPersonasPorLote = data.promedioPersonasPorLote ?? 0;

        // Procesar el total de personas por barrio
        const totalFamiliasPorLote = {
            columnOrder: ['Barrio', 'Conteo', 'Porcentaje'],
            table: data.totalFamiliasPorLote.map((item: any) => ({
                Barrio: item._id ?? 'Desconocido',
                Conteo: item.totalFamilias ?? 0,
                Porcentaje: parseFloat(item.percentage).toFixed(2) ?? 0,
            })),
            chart: {
                labels: data.totalFamiliasPorLote.map(
                    (item: any) => item._id ?? 'Desconocido'
                ),
                datasets: [
                    {
                        label: 'Total de familias por lote',
                        data: data.totalFamiliasPorLote.map(
                            (item: any) => item.totalFamilias ?? 0
                        ),
                        backgroundColor: '#FF7043',
                    },
                ],
            },
            title: 'Total de familias por lote',
        };

        // Procesar el total de lotes por sector
        const totalFamiliasPorSector = {
            columnOrder: ['Sector', 'Conteo', 'Porcentaje'],
            table: data.totalFamiliasPorSector.map((item: any) => ({
                Sector: item._id ?? 'Desconocido',
                Conteo: item.totalFamilias ?? 0,
                Porcentaje: parseFloat(item.percentage).toFixed(2) ?? 0,
            })),
            chart: {
                labels: data.totalFamiliasPorSector.map(
                    (item: any) => item._id ?? 'Desconocido'
                ),
                datasets: [
                    {
                        label: 'Total de familias por sector',
                        data: data.totalFamiliasPorSector.map(
                            (item: any) => item.totalFamilias ?? 0
                        ),
                        backgroundColor: '#AB47BC',
                    },
                ],
            },
            title: 'Total de familias por sector',
        };

        // Procesar el total de familias por sector
        const totalPersonasPorLote = {
            columnOrder: ['Sector', 'Conteo', 'Porcentaje'],
            table: data.totalPersonasPorLote.map((item: any) => ({
                Sector: item._id ?? 'Desconocido',
                Conteo: item.totalPersonas ?? 0,
                Porcentaje: parseFloat(item.percentage).toFixed(2) ?? 0,
            })),
            chart: {
                labels: data.totalPersonasPorLote.map(
                    (item: any) => item._id ?? 'Desconocido'
                ),
                datasets: [
                    {
                        label: 'Total de personas por lote',
                        data: data.totalPersonasPorLote.map(
                            (item: any) => item.totalPersonas ?? 0
                        ),
                        backgroundColor: '#26A69A',
                    },
                ],
            },
            title: 'Total de personas por lote',
        };

        // Procesar el total de familias por barrio
        const totalPersonasPorSector = {
            columnOrder: ['Barrio', 'Conteo', 'Porcentaje'],
            table: data.totalPersonasPorSector.map((item: any) => ({
                Barrio: item._id ?? 'Desconocido',
                Conteo: item.totalPersonas ?? 0,
                Porcentaje: parseFloat(item.percentage).toFixed(2) ?? 0,
            })),
            chart: {
                labels: data.totalPersonasPorSector.map(
                    (item: any) => item._id ?? 'Desconocido'
                ),
                datasets: [
                    {
                        label: 'Total de personas por sector',
                        data: data.totalPersonasPorSector.map(
                            (item: any) => item.totalPersonas ?? 0
                        ),
                        backgroundColor: '#FF7043',
                    },
                ],
            },
            title: 'Total de personas por sector',
        };

        const components = {
            distribucionPorEstadoCasa,
            distribucionPorSector,
            distribucionPorBarrio,
            distribucionPorManzana,
            totalFamiliasPorSector,
            totalFamiliasPorLote,
            totalPersonasPorLote,
            totalPersonasPorSector,
        };

        const components_arr = Object.entries(components).map(
            ([key, value]) => ({
                key,
                ...value,
            })
        );
        console.log(components_arr);
        // Estructura final de datos procesados
        return {
            promedioPosesion,
            timeUnit,
            promedioFamiliasPorLote,
            promedioPersonasPorLote,
            components_arr,
        };
    }
    getTotalRegistros(data: any[], columnOrder: string): number {
        if (!data || !columnOrder) {
            console.error('Data or columnOrder is missing');
            return 0;
        }

        const total = data.reduce((acc, item) => {
            const value = parseFloat(item[columnOrder]) || 0; // Asegurarse de que sea numérico
            return acc + value;
        }, 0);

        return total;
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
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue(
            '--text-color-secondary'
        );
        const surfaceBorder =
            documentStyle.getPropertyValue('--surface-border');

        this.chartOptions = {
            //responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 0.6,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary,
                    },
                    grid: {
                        color: surfaceBorder,
                    },
                },
                y: {
                    ticks: {
                        color: textColorSecondary,
                    },
                    grid: {
                        color: surfaceBorder,
                    },
                },
            },
        };
        this.chartOptionsPie = {
            //responsive: true,
            //maintainAspectRatio: false,
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
    // Define el objeto
    showChart: { [key: string]: boolean } = {};

    layout: 'grid' | 'list' = this.isMobil() ? 'list' : 'grid';

    layoutOptions = [
        { label: 'Grid', value: 'grid' },
        { label: 'List', value: 'list' },
    ];

    onLayoutChange(event: any) {
        this.layout = event.value;
    }

    getSeverity(product: any) {
        switch (product) {
            case 'INSTOCK':
                return 'success';

            case 'LOWSTOCK':
                return 'warning';

            case 'OUTOFSTOCK':
                return 'danger';

            default:
                return null;
        }
    }
}
