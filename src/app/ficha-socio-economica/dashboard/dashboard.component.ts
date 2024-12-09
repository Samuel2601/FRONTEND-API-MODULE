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
    saludData: any = {};

    chartOptions: any;

    colors: any[] = [
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

    fetchSaludData(): Observable<any> {
        return this.registroService.informacionsalud();
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

        this.fetchSaludData().subscribe((data: any) => {
            console.log(data);
            this.saludData = this.processSalud(data);
            this.saludData.total = data.total;
            console.log(this.saludData);
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
                    borderColor: '#4caf50',
                    tension: 0.5,
                    type: 'line',
                    backgroundColor: '#b2ddb4',
                },
            ],
        };

        this.hourlyDataConectividad = {
            labels: Array.from(
                { length: 24 },
                (_, i) => `${i.toString().padStart(2, '0')}:00`
            ),
            datasets: [
                {
                    label: 'Registros por Hora de Conectividad de Encuestadores',
                    data: Array.from({ length: 24 }, (_, i) => {
                        const hourData =
                            data.lineaDeTiempoHoraConectividad.find(
                                (item) => item._id === i
                            );
                        return hourData ? hourData.count : 0;
                    }),
                    backgroundColor: '#facb618c',
                    borderColor: '#fbc02d',
                    fill: true,
                    type: 'line',
                    tension: 0.5,
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
                    label: 'Personas con este nacionalidad',
                    data: data.porNacionalidad.map((item: any) => item.count),
                    backgroundColor: this.colors,
                },
            ],
        };

        this.ageRangeData = {
            labels: data.rangoEdadCount.map((item: any) => item._id),
            datasets: [
                {
                    label: 'Personas con este rango de edad',
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
                type: 'bar',
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
                type: 'bar',
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
                type: 'bar',
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
                type: 'doughnut',
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
                type: 'bar',
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
                type: 'bar',
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
                type: 'bar',
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
                type: 'bar',
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

    processSalud(data: any) {
        console.log(data);
        // Assuming data.estadisticas[0] contains the statistics
        const estadisticas = data.estadisticas[0];

        // Distribución de estado de salud
        const distribucionEstadoSalud = {
            columnOrder: ['Estado de Salud', 'Conteo', 'Porcentaje'],
            table: estadisticas.distribucionEstadoSalud.map((item: any) => ({
                'Estado de Salud': item._id ?? 'Desconocido',
                Conteo: item.count ?? 0,
                Porcentaje: parseFloat(item.percentage).toFixed(2) ?? 0,
            })),
            chart: {
                type: 'bar',
                labels: estadisticas.distribucionEstadoSalud.map(
                    (item: any) => item._id
                ),
                datasets: [
                    {
                        label: 'Distribución de Estado de Salud por Registros',
                        data: estadisticas.distribucionEstadoSalud.map(
                            (item: any) => item.count
                        ),
                        backgroundColor: '#66BB6A',
                    },
                ],
                title: 'Distribución de Estado de Salud por Registros',
            },
            title: 'Distribución de Estado de Salud por Registros',
        };

        // Causas frecuentes
        const causasFrecuentes = {
            columnOrder: ['Causa', 'Conteo', 'Porcentaje'],
            table: estadisticas.causasFrecuentes.map((item: any) => ({
                Causa: item._id ?? 'Desconocido',
                Conteo: item.count ?? 0,
                Porcentaje: parseFloat(item.percentage).toFixed(2) ?? 0,
            })),
            chart: {
                type: 'bar',
                labels: estadisticas.causasFrecuentes.map(
                    (item: any) => item._id
                ),
                datasets: [
                    {
                        label: 'Causas Frecuentes',
                        data: estadisticas.causasFrecuentes.map(
                            (item: any) => item.count
                        ),
                        backgroundColor: '#FFA726',
                    },
                ],
                title: 'Causas Frecuentes',
            },
            title: 'Causas Frecuentes',
        };

        // Distribución de estado de salud y causa
        const distribucionEstadoSaludYCausa = {
            columnOrder: ['Estado de Salud', 'Causa', 'Conteo', 'Porcentaje'],
            table: estadisticas.distribucionEstadoSaludYCausa.map(
                (item: any) => ({
                    'Estado de Salud': item._id.estadoSalud ?? 'Desconocido',
                    Causa: item._id.causaSalud ?? 'Desconocido',
                    Conteo: item.count ?? 0,
                    Porcentaje: parseFloat(item.percentage).toFixed(2) ?? 0,
                })
            ),
            chart: {
                type: 'bar', // Tipo de gráfico de barras apiladas
                options: this.chartOptions.stacked,
                labels: Array.from(
                    new Set(
                        estadisticas.distribucionEstadoSaludYCausa.map(
                            (item: any) => item._id.estadoSalud
                        )
                    )
                ),
                datasets: Array.from(
                    new Set(
                        estadisticas.distribucionEstadoSaludYCausa.map(
                            (item: any) => item._id.causaSalud
                        )
                    )
                ).map((causa, index) => ({
                    label: causa,
                    data: Array.from(
                        new Set(
                            estadisticas.distribucionEstadoSaludYCausa.map(
                                (item: any) => item._id.estadoSalud
                            )
                        )
                    ).map((estadoSalud) => {
                        const matchingItem =
                            estadisticas.distribucionEstadoSaludYCausa.find(
                                (item: any) =>
                                    item._id.estadoSalud === estadoSalud &&
                                    item._id.causaSalud === causa
                            );
                        return matchingItem ? matchingItem.count : 0;
                    }),
                    backgroundColor: this.colors[index % this.colors.length],
                })),
                title: 'Estado de Salud y Causa',
            },
            title: 'Estado de Salud y Causa',
        };

        // Conexión higiénico
        const distribucionConexionHigienico = {
            columnOrder: ['Tipo de Conexión', 'Conteo', 'Porcentaje'],
            table: estadisticas.distribucionConexionHigienico.map(
                (item: any) => ({
                    'Tipo de Conexión': item._id ?? 'Desconocido',
                    Conteo: item.count ?? 0,
                    Porcentaje: parseFloat(item.percentage).toFixed(2) ?? 0,
                })
            ),
            chart: {
                type: 'bar',
                labels: estadisticas.distribucionConexionHigienico.map(
                    (item: any) => item._id
                ),
                datasets: [
                    {
                        label: 'Distribución de Conexión Higiénico',
                        data: estadisticas.distribucionConexionHigienico.map(
                            (item: any) => item.count
                        ),
                        backgroundColor: '#26A69A',
                    },
                ],
                title: 'Distribución de Conexión Higiénico',
            },
            title: 'Distribución de Conexión Higiénico',
        };
        const distribucionConexionHigienicoPorEstadoSalud = {
            columnOrder: [
                'Estado de Salud',
                'Conexión Higiénico',
                'Conteo',
                'Porcentaje',
            ],
            table: estadisticas.distribucionConexionHigienicoPorEstadoSalud.map(
                (item: any) => ({
                    'Estado de Salud': item._id.estadoSalud ?? 'Desconocido',
                    'Conexión Higiénico':
                        item._id.conexionHigienico ?? 'Desconocido',
                    Conteo: item.count ?? 0,
                    Porcentaje: parseFloat(item.percentage).toFixed(2) ?? 0,
                })
            ),
            chart: {
                type: 'bar',
                options: this.chartOptions.stacked,
                labels: Array.from(
                    new Set(
                        estadisticas.distribucionConexionHigienicoPorEstadoSalud.map(
                            (item: any) => item._id.estadoSalud
                        )
                    )
                ),
                datasets: Array.from(
                    new Set(
                        estadisticas.distribucionConexionHigienicoPorEstadoSalud.map(
                            (item: any) => item._id.conexionHigienico
                        )
                    )
                ).map((conexion, index) => ({
                    label: conexion,
                    data: Array.from(
                        new Set(
                            estadisticas.distribucionConexionHigienicoPorEstadoSalud.map(
                                (item: any) => item._id.estadoSalud
                            )
                        )
                    ).map((estadoSalud) => {
                        const matchingItem =
                            estadisticas.distribucionConexionHigienicoPorEstadoSalud.find(
                                (item: any) =>
                                    item._id.estadoSalud === estadoSalud &&
                                    item._id.conexionHigienico === conexion
                            );
                        return matchingItem ? matchingItem.count : 0;
                    }),
                    backgroundColor: this.colors[index % this.colors.length],
                })),
                title: 'Conexión Higiénico por Estado de Salud',
            },
            title: 'Conexión Higiénico por Estado de Salud',
        };

        const causasPorSector = {
            columnOrder: ['Sector', 'Causa de Salud', 'Conteo', 'Porcentaje'],
            table: estadisticas.causasPorSector.map((item: any) => ({
                Sector: item._id.sector ?? 'Desconocido',
                'Causa de Salud': item._id.causaSalud ?? 'Desconocido',
                Conteo: item.count ?? 0,
                Porcentaje: parseFloat(item.percentage).toFixed(2) ?? 0,
            })),
            chart: {
                type: 'bar',
                options: this.chartOptions.stacked,
                labels: Array.from(
                    new Set(
                        estadisticas.causasPorSector.map(
                            (item: any) => item._id.sector
                        )
                    )
                ),
                datasets: Array.from(
                    new Set(
                        estadisticas.causasPorSector.map(
                            (item: any) => item._id.causaSalud
                        )
                    )
                ).map((causa, index) => ({
                    label: causa,
                    data: Array.from(
                        new Set(
                            estadisticas.causasPorSector.map(
                                (item: any) => item._id.sector
                            )
                        )
                    ).map((sector) => {
                        const matchingItem = estadisticas.causasPorSector.find(
                            (item: any) =>
                                item._id.sector === sector &&
                                item._id.causaSalud === causa
                        );
                        return matchingItem ? matchingItem.count : 0;
                    }),
                    backgroundColor: this.colors[index % this.colors.length],
                })),
                title: 'Causas de Salud por Sector',
            },
            title: 'Causas de Salud por Sector',
        };

        // Distribución de estado de salud
        const totalPersonasPorCausa = {
            columnOrder: ['Causa', 'Conteo', 'Porcentaje'],
            table: estadisticas.totalPersonasPorCausaCombinada.map(
                (item: any) => ({
                    Causa: item._id ?? 'Desconocido',
                    Conteo: item.totalPersonas ?? 0,
                    Porcentaje: parseFloat(item.percentage).toFixed(2) ?? 0,
                })
            ),
            chart: {
                type: 'bar',
                labels: estadisticas.totalPersonasPorCausaCombinada.map(
                    (item: any) => item._id
                ),
                datasets: [
                    {
                        label: 'Personas afectadas por casus del Salud',
                        data: estadisticas.totalPersonasPorCausaCombinada.map(
                            (item: any) => item.totalPersonas
                        ),
                        backgroundColor: '#66BB6A',
                    },
                ],
                title: 'Personas afectadas por casus del Salud',
            },
            title: 'Personas afectadas por casus del Salud',
        };

        // Datos adicionales

        const totalPersonasPorEstadoSalud = {
            columnOrder: ['Estado', 'Conteo', 'Porcentaje'],
            table: estadisticas.totalPersonasPorEstadoSalud.map(
                (item: any) => ({
                    Estado: item._id ?? 'Desconocido',
                    Conteo: item.totalPersonas ?? 0,
                    Porcentaje: parseFloat(item.percentage).toFixed(2) ?? 0,
                })
            ),
            chart: {
                type: 'bar',
                labels: estadisticas.totalPersonasPorEstadoSalud.map(
                    (item: any) => item._id
                ),
                datasets: [
                    {
                        label: 'Personas afectadas por Estado Salud',
                        data: estadisticas.totalPersonasPorEstadoSalud.map(
                            (item: any) => item.totalPersonas
                        ),
                        backgroundColor: '#66BB6A',
                    },
                ],
                title: 'Personas afectadas por Estado Salud',
            },
            title: 'Personas afectadas por Estado Salud',
        };

        // Componentes para el array
        const components = {
            distribucionEstadoSalud,
            causasFrecuentes,
            distribucionEstadoSaludYCausa,
            distribucionConexionHigienico,
            distribucionConexionHigienicoPorEstadoSalud,
            causasPorSector,
            totalPersonasPorCausa,
            totalPersonasPorEstadoSalud
        };

        const components_arr = Object.entries(components).map(
            ([key, value]) => ({
                key,
                ...value,
            })
        );

        return {
            total: data.total,
            totalPersonasPorCausa,
            components_arr,
            promedioCausasPorRegistro: parseFloat(
                estadisticas.promedioCausasPorRegistro[0].promedioCausas
            ).toFixed(2),
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
        const surfaceBorder =
            documentStyle.getPropertyValue('--surface-border');

        // Formateador de números localizado
        const numberFormatter = new Intl.NumberFormat('es-ES', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });

        // Callback para formatear valores
        const formatValueCallback = (value: number) =>
            numberFormatter.format(value);

        // Configuración común de ejes
        const commonAxisOptions = {
            ticks: {
                color: textColor,
                font: { size: 12 },
                callback: formatValueCallback,
            },
            grid: { color: surfaceBorder },
        };

        // Plugin personalizado para resaltar valores máximos y mínimos
        const highlightMinMaxPlugin = {
            id: 'highlightMinMax',
            afterDraw: (chart: any) => {
                const ctx = chart.ctx;
                chart.data.datasets.forEach(
                    (dataset: any, datasetIndex: number) => {
                        const meta = chart.getDatasetMeta(datasetIndex);
                        const min = Math.min(...dataset.data);
                        const max = Math.max(...dataset.data);
                        meta.data.forEach((datapoint: any, index: number) => {
                            if (
                                dataset.data[index] === min ||
                                dataset.data[index] === max
                            ) {
                                ctx.save();
                                ctx.fillStyle = 'red';
                                ctx.beginPath();
                                const { x, y } = datapoint.tooltipPosition();
                                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                                ctx.fill();
                                ctx.restore();
                            }
                        });
                    }
                );
            },
        };

        // Configuración base de gráficos
        const baseChartOptions = {
            maintainAspectRatio: false,
            aspectRatio: 0.6,
            responsive: true,
            animation: {
                duration: 1000,
                easing: 'easeOutQuart',
            },
            interaction: {
                mode: 'nearest',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 14 },
                        color: textColor,
                    },
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#ffffff',
                    titleColor: '#333333',
                    bodyColor: '#555555',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    padding: 10,
                    titleFont: { size: 16, weight: 'bold' },
                    bodyFont: { size: 14 },
                    displayColors: false,
                    callbacks: {
                        label: (context: any) =>
                            `Valor: ${numberFormatter.format(context.raw)}`,
                    },
                },
            },
        };

        // Configuraciones específicas para diferentes gráficos
        this.chartOptions = {
            line: {
                ...baseChartOptions,
                plugins: {
                    ...baseChartOptions.plugins,
                    highlightMinMaxPlugin,
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#495057',
                            font: {
                                size: 12,
                            },
                        },
                        grid: {
                            color: '#ebedef',
                        },
                    },
                    y: { ...commonAxisOptions },
                },
            },
            bar: {
                ...baseChartOptions,
                plugins: {
                    ...baseChartOptions.plugins,
                    highlightMinMaxPlugin,
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#495057',
                            font: {
                                size: 12,
                            },
                        },
                        grid: {
                            color: '#ebedef',
                        },
                    },
                    y: { ...commonAxisOptions },
                },
            },
            pie: {
                ...baseChartOptions,
                plugins: {
                    ...baseChartOptions.plugins,
                    legend: {
                        ...baseChartOptions.plugins.legend,
                        labels: {
                            usePointStyle: true,
                            color: textColor,
                        },
                    },
                },
            },
            doughnut: {
                ...baseChartOptions,
                plugins: {
                    ...baseChartOptions.plugins,
                    legend: {
                        ...baseChartOptions.plugins.legend,
                        labels: {
                            usePointStyle: true,
                            color: textColor,
                        },
                    },
                },
            },
            stacked: {
                ...baseChartOptions,
                scales: {
                    x: {
                        ticks: {
                            color: '#495057',
                            font: {
                                size: 12,
                            },
                        },
                        grid: {
                            color: '#ebedef',
                        },
                        stacked: true,
                    },
                    y: { ...commonAxisOptions, stacked: true },
                },
            },
            doubleAxis: {
                ...baseChartOptions,
                scales: {
                    y: {
                        type: 'linear',
                        position: 'left',
                        ticks: { callback: formatValueCallback },
                    },
                    y2: {
                        type: 'linear',
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { callback: formatValueCallback },
                    },
                },
            },
        };
        this.chartOptions.stacked.plugins.tooltip.callbacks.label = (
            context: any
        ) => {
            const datasetLabel = context.dataset.label || 'Sin etiqueta';
            const value = context.raw;
            return `${datasetLabel}: ${numberFormatter.format(value)}`;
        };
        this.chartOptions.stacked.scales.x = {
            ticks: {
                color: '#495057',
                font: {
                    size: 12,
                },
            },
            grid: {
                color: '#ebedef',
            },
            stacked: true,
        };
        this.chartOptions.stacked.scales.y = {
            ...commonAxisOptions,
            stacked: true,
        };
    }

    getChartType(chart: string[]) {
        let option = {};
        for (const key in chart) {
            option = { ...option, ...this.chartOptions[key] };
        }
        return option;
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
            case 'Tabla':
                return 'success';

            case 'Gráfico':
                return 'info';

            case 'OUTOFSTOCK':
                return 'danger';

            default:
                return null;
        }
    }
}
