import {
    AfterViewInit,
    Component,
    ElementRef,
    Input,
    OnInit,
    ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';
import { MessageService } from 'primeng/api';
import { Table } from 'primeng/table';
import { ChartModule, UIChart } from 'primeng/chart';
import { Router } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { AuthService } from 'src/app/demo/services/auth.service';
import 'chartjs-adapter-date-fns'; // o 'chartjs-adapter-moment' si estás usando moment
import 'chartjs-plugin-annotation';
import { map } from 'rxjs/operators';

@Component({
    selector: 'app-list-incidentes',
    templateUrl: './list-incidentes.component.html',
    styleUrl: './list-incidentes.component.scss',
})
export class ListIncidentesComponent implements OnInit, AfterViewInit {
    @Input() cate: any = '';
    @Input() sub: any = '';
    public filterForm: FormGroup | any;
    private token = this.auth.token();
    public categorias: any[] = [];
    public subcategorias: any[] = [];
    public estados: any[] = [];
    public direcciones: any[] = [];
    load_table: boolean = false;
    constructor(
        public formBuilder: FormBuilder,
        private listar: ListService,
        private helper: HelperService,
        private messageService: MessageService,
        private router: Router,
        private auth: AuthService
    ) {
        const currentDate = new Date();
        const firstDayOfMonth = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
        );
        const lastDayOfMonth = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            0
        );

        this.filterForm = this.formBuilder.group({
            fecha_inicio: [firstDayOfMonth],
            fecha_fin: [lastDayOfMonth],
            categoria: [[], [Validators.minLength(1)]],
            subcategoria: [[], [Validators.minLength(1)]],
            estado: [[], [Validators.minLength(1)]],
            direccion: [[], [Validators.minLength(1)]],
            view: [true],
        });
    }
    viewmentOptions: any[] = [
        { name: 'Todos', value: null },
        { name: 'Visibles', value: true },
        { name: 'Ocultos', value: false },
    ];

    ngAfterViewInit() {
        // Deshabilitar autofocus en el campo fecha_inicio
        //this.fechaInicio.nativeElement.querySelector('input').blur();
    }
    load_map: boolean = false;
    dataLineaDeTiempo: any;
    optionsLineaDeTiempo: any;
    load_linechart: boolean = false;
    filtro() {
        this.load_map = false;
        this.helper.llamarspinner('filtro lista incidente');
        this.load_table = false;
        const fechaInicio = this.filterForm.get('fecha_inicio').value;
        const fechaFin = this.filterForm.get('fecha_fin').value;
        const categoria = this.filterForm.get('categoria').value;
        const subcategoria = this.filterForm.get('subcategoria').value;
        const estado = this.filterForm.get('estado').value;
        const direccion = this.filterForm.get('direccion').value;
        const view = this.filterForm.get('view').value;
        const elementosFiltrados = this.constIncidente.filter((elemento) => {
            // Filtrar por fecha de inicio y fin
            const fechaElemento = new Date(elemento.createdAt);
            if (
                fechaInicio &&
                fechaFin &&
                (fechaElemento < fechaInicio || fechaElemento > fechaFin)
            ) {
                return false;
            }

            const categoriaValida =
                categoria.length === 0 ||
                categoria.some(
                    (c: any) =>
                        c._id.toString() === elemento.categoria._id.toString()
                );

            const subcategoriaValida =
                subcategoria.length === 0 ||
                subcategoria.some(
                    (s: any) =>
                        s._id.toString() ===
                        elemento.subcategoria._id.toString()
                );

            const estadoValido =
                estado.length === 0 ||
                estado.some(
                    (e: any) =>
                        e._id.toString() === elemento.estado._id.toString()
                );

            // Filtrar por dirección
            const direccionValida =
                direccion.length === 0 ||
                direccion.some(
                    (d: any) => d.nombre == elemento.direccion_geo.nombre
                );
            const viewValida = view == null || elemento.view == view;

            return (
                categoriaValida &&
                subcategoriaValida &&
                estadoValido &&
                direccionValida &&
                viewValida
            );
        });
        this.incidente = elementosFiltrados;
        // Mostrar totales y porcentajes en la tabla
        this.totales = this.obtenerTotales(this.incidente);
        this.totales = this.obtenerPorcentajes(
            this.totales,
            this.incidente.length
        );
        for (const key in this.dataForm) {
            if (Object.prototype.hasOwnProperty.call(this.dataForm, key)) {
                const element = this.dataForm[key];
                this.dataForm[key] = this.crearDatosGrafico(this.totales[key]);
            }
        }
        this.totales = this.sortTotalesByRegistros(this.totales);
        this.dataForm = this.sortDataAndLabels(this.dataForm);
        this.table_items = this.convertirObjetoEnArreglo(this.dataForm);
        this.fechaInicio = fechaInicio;
        this.fechaFin = fechaFin;
        this.grafigDateTime(fechaInicio, fechaFin);
        this.load_table = true;

        setTimeout(() => {
            this.load_map = true;
            this.helper.cerrarspinner('filtro lista incidente');
        }, 500);
    }
    fechaFin: Date;
    fechaInicio: Date;
    timeUnits = [
        { label: 'Días', value: 'days' },
        { label: 'Semanas', value: 'weeks' },
        { label: 'Meses', value: 'months' },
        { label: 'Años', value: 'years' },
    ];

    selectedTimeUnit: string = 'days'; // Valor por defecto
    get selectedTimeUnitLabel(): string {
        return this.timeUnits.find(
            (unit) => unit.value === this.selectedTimeUnit
        )?.label;
    }
    // Opciones de orden
    timeSortOrder = [
        { label: 'Ascendente', value: 'asc' },
        { label: 'Descendente', value: 'desc' },
    ];
    selectedSortOrder: string = 'asc'; // Valor por defecto

    grafigDateTime(fechaInicio?: Date, fechaFin?: Date) {
        if (!fechaInicio) {
            fechaInicio = new Date(this.fechaInicio);
        }
        if (!fechaFin) {
            fechaFin = this.fechaFin;
        }
        this.load_linechart = false;
        this.dataLineaDeTiempo = this.crearDatosLineaDeTiempo(
            this.incidente,
            fechaInicio,
            fechaFin
        );
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--p-text-color');
        const textColorSecondary = documentStyle.getPropertyValue(
            '--p-text-muted-color'
        );
        const surfaceBorder = documentStyle.getPropertyValue(
            '--p-content-border-color'
        );

        this.optionsLineaDeTiempo = {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index', // Muestra los datos de todos los puntos que comparten el mismo valor en el eje X
                    intersect: false, // El tooltip aparece aunque el cursor no esté sobre un punto específico
                    callbacks: {
                        label: (context) => {
                            return `${context.dataset.label}: ${context.raw.y} incidentes`;
                        },
                    },
                },
                annotation: {
                    annotations: [
                        {
                            type: 'line',
                            mode: 'vertical',
                            scaleID: 'x',
                            value: 0, // Este valor se actualizará dinámicamente según el cursor
                            borderColor: 'red',
                            borderWidth: 2,
                            label: {
                                enabled: true,
                                content: 'Posición',
                                position: 'top',
                            },
                        },
                    ],
                },
            },
            scales: {
                x: {
                    type: 'category',
                    title: {
                        display: true,
                        text: 'Fecha',
                    },
                    ticks: {
                        source: 'labels',
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: 'Cantidad de Incidentes',
                    },
                },
            },
            interaction: {
                mode: 'index', // Muestra los puntos a lo largo del eje X que coinciden
                intersect: false, // Muestra los puntos sin tener que estar directamente sobre ellos
            },
        };

        this.load_linechart = true;
    }

    chartInstance: any; // Guarda la referencia del gráfico para actualizarlo

    onChartReady(chart) {
        this.chartInstance = chart; // Guarda la referencia del gráfico
    }

    onMouseMove(event: any) {
        const points = this.chartInstance.getElementsAtEventForMode(
            event,
            'index',
            { intersect: false },
            false
        );
        if (points.length) {
            const xIndex = points[0].index;
            const value = this.dataLineaDeTiempo.labels[xIndex]; // Obtiene el valor en el eje X
            // Actualizar la posición de la línea de referencia
            this.chartInstance.options.plugins.annotation.annotations[0].value =
                value;
            this.chartInstance.update();
        }
    }

    crearDatosLineaDeTiempo(
        incidentes: any[],
        fechaInicio: Date,
        fechaFin: Date
    ) {
        const estadosAgrupados: { [key: string]: any[] } = {};
        const estados: string[] = [];
        const fechas: string[] = [];

        // Iterar sobre los incidentes y agrupar por estado y fecha
        incidentes.forEach((incidente) => {
            const estado = incidente.estado.nombre;
            const fecha = new Date(incidente.updatedAt || incidente.createdAt);

            // Filtrar por el rango de fechas
            if (fecha >= fechaInicio && fecha <= fechaFin) {
                const fechaFormateada = this.formatearFecha(
                    fecha,
                    fechaInicio,
                    fechaFin
                ); // Para días, semanas, meses, años

                if (!estadosAgrupados[estado]) {
                    estadosAgrupados[estado] = [];
                    estados.push(estado);
                }

                // Inicializar la fecha si no existe
                if (!estadosAgrupados[estado][fechaFormateada]) {
                    estadosAgrupados[estado][fechaFormateada] = 0;
                }

                // Incrementar el contador de incidentes para ese estado y fecha
                estadosAgrupados[estado][fechaFormateada]++;
                if (!fechas.includes(fechaFormateada)) {
                    fechas.push(fechaFormateada);
                }
            }
        });
        // Ordenar las fechas según el orden seleccionado
        fechas.sort((a, b) => {
            const dateA = this.convertirFechaNumerica(a);
            const dateB = this.convertirFechaNumerica(b);
            if (!dateA || !dateB) {
                console.log('No se pudo convertir la fecha a número', a, b);
            }
            if (this.selectedSortOrder === 'asc') {
                return dateA - dateB; // Orden ascendente
            } else {
                return dateB - dateA; // Orden descendente
            }
        });

        // Crear dataset para cada estado
        const datasets = Object.keys(estadosAgrupados).map((estado, index) => {
            const data = fechas.map((fecha) => ({
                x: fecha,
                y: estadosAgrupados[estado][fecha] || 0, // Si no hay incidentes, poner 0
            }));

            return {
                label: estado,
                data,
                borderColor: this.obtenerColorEstado(index),
                backgroundColor: this.obtenerColorEstado(index, true),
                fill: true,
                tension: 0.6,
            };
        });

        // Crear datos para la tabla con fechas como filas y estados como columnas
        const tableData: { [fecha: string]: { [estado: string]: number } } = {};
        fechas.forEach((fecha) => {
            tableData[fecha] = {};
            Object.keys(estadosAgrupados).forEach((estado) => {
                tableData[fecha][estado] = estadosAgrupados[estado][fecha] || 0; // Poner 0 si no hay datos
            });
        });
        const columns = [
            { field: 'fecha', header: 'Fecha' },
            ...estados.map((estado: string) => ({
                field: estado,
                header: estado,
            })),
        ];
        console.log(datasets, fechas, tableData, columns);
        return {
            datasets,
            labels: fechas,
            tableData,
            columns,
        };
    }

    convertirFechaNumerica(fecha: string): number {
        const [anio, mes, dia] = fecha.split('-');
        // Convertir de "DD/MM/YYYY" a "YYYY-MM-DD"
        if (fecha.includes('/')) {
            const [dia, mes, anio] = fecha.split('/');
            fecha = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        }
        if (fecha.includes('W')) {
            // Si es una semana (Ej: "2024-W1")
            const semana = parseInt(fecha.split('W')[1], 10);
            return parseInt(anio) * 100 + semana; // Ej: 2024-W1 -> 202401
        }
        if (fecha.length === 4) {
            // Si es solo el año (Ej: "2024")
            return parseInt(anio);
        }
        if (fecha.length === 7) {
            // Si es un mes (Ej: "2024-08")
            const [year, month] = fecha.split('-');
            return parseInt(year) * 100 + parseInt(month); // Ej: "2024-08" -> 202408
        }
        return new Date(fecha).getTime(); // Para días, ya es una fecha válida
    }

    formatearFecha(fecha: Date, fechaInicio: Date, fechaFin: Date): string {
        const differenceInMilliseconds =
            fechaFin.getTime() - fechaInicio.getTime();
        const differenceInDays = differenceInMilliseconds / (1000 * 3600 * 24);
        const esMeses = differenceInDays > 30; // Si la diferencia es mayor a 30 días, usamos meses
        const esAños = differenceInDays > 365; // Si la diferencia es mayor a 365 días, usamos años

        switch (this.selectedTimeUnit) {
            case 'weeks':
                const weekStart = new Date(fecha);
                const weekNumber = this.getWeekNumber(weekStart); // Obtener la semana del año
                return `${fecha.getFullYear()}-W${weekNumber}`;
            case 'months':
                return `${fecha.getFullYear()}-${(fecha.getMonth() + 1)
                    .toString()
                    .padStart(2, '0')}`; // Año-Mes
            case 'years':
                return `${fecha.getFullYear()}`; // Solo el año
            default: // Días
                return fecha.toLocaleDateString('es-EC'); // Día-Mes-Año
        }
    }

    // Método para calcular el número de la semana
    getWeekNumber(date: Date): number {
        const startDate = new Date(date.getFullYear(), 0, 1);
        const days = Math.floor(
            (date.getTime() - startDate.getTime()) / (1000 * 3600 * 24)
        );
        return Math.ceil((days + startDate.getDay() + 1) / 7);
    }

    obtenerColorEstado(index: number, background: boolean = false) {
        const colores = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];
        const color = colores[index % colores.length];
        return background ? `${color}33` : color; // Con transparencia para fondo
    }

    sortTotalesByRegistros(totales: any) {
        // Iterar sobre cada propiedad en `totales`
        for (const key in totales) {
            if (totales.hasOwnProperty(key)) {
                const item = totales[key];
                // Verificar si el valor es un objeto que contiene `registros`
                if (typeof item === 'object') {
                    // Convertir el objeto en un array de pares [clave, valor]
                    const entriesArray = Object.entries(item);

                    // Ordenar el array en función de `registros` de mayor a menor
                    entriesArray.sort(
                        (a: any, b: any) => b[1].registros - a[1].registros
                    );

                    // Convertir de nuevo el array ordenado a un objeto
                    totales[key] = Object.fromEntries(entriesArray);
                }
            }
        }

        return totales;
    }
    sortDataAndLabels(dataForm: any) {
        // Función para ordenar datasets y labels
        const sortDataSet = (datasets: any[], labels: string[]) => {
            // Obtener el dataset que contiene los datos
            const data = datasets[0].data;

            // Crear una lista de pares [valor, label] para ordenarla
            const combined = data.map((value: number, index: number) => ({
                value,
                label: labels[index],
            }));

            // Ordenar de mayor a menor basado en el valor
            combined.sort((a, b) => b.value - a.value);

            // Actualizar los datasets y labels con el nuevo orden
            datasets[0].data = combined.map((item) => item.value);
            return combined.map((item) => item.label);
        };

        // Ordenar categorias, direcciones, estados, y subcategorias
        dataForm.categorias.labels = sortDataSet(
            dataForm.categorias.datasets,
            dataForm.categorias.labels
        );
        dataForm.direcciones.labels = sortDataSet(
            dataForm.direcciones.datasets,
            dataForm.direcciones.labels
        );
        dataForm.estados.labels = sortDataSet(
            dataForm.estados.datasets,
            dataForm.estados.labels
        );
        dataForm.subcategorias.labels = sortDataSet(
            dataForm.subcategorias.datasets,
            dataForm.subcategorias.labels
        );

        return dataForm;
    }
    table_items: any[] = [];
    convertirObjetoEnArreglo(objeto: any): any[] {
        return Object.keys(objeto).map((key) => ({
            clave: key,
            valor: objeto[key],
        }));
    }

    totales: any;
    porcentajes: any;

    dataForm: any = {
        categorias: undefined,
        subcategorias: undefined,
        estados: undefined,
        direcciones: undefined,
    };
    trackByFn(index, item) {
        return item.id; // Cambia 'id' por la propiedad única de tu objeto
    }
    obtenerTotales(incidentes: any[]) {
        const totales = {
            categorias: {},
            subcategorias: {},
            estados: {},
            direcciones: {},
        };

        incidentes.forEach((elemento) => {
            if (!elemento.categoria || !elemento.subcategoria) {
                console.log(
                    'No se pudo obtener el total de los elementos',
                    elemento
                );
                return;
            }

            // Categorías
            if (!totales.categorias[elemento.categoria.nombre]) {
                totales.categorias[elemento.categoria.nombre] = {
                    registros: 0,
                    porcentaje: 0,
                };
            }
            totales.categorias[elemento.categoria.nombre].registros++;

            // Subcategorías
            if (!totales.subcategorias[elemento.subcategoria.nombre]) {
                totales.subcategorias[elemento.subcategoria.nombre] = {
                    registros: 0,
                    porcentaje: 0,
                };
            }
            totales.subcategorias[elemento.subcategoria.nombre].registros++;

            // Estados
            if (!totales.estados[elemento.estado.nombre]) {
                totales.estados[elemento.estado.nombre] = {
                    registros: 0,
                    porcentaje: 0,
                };
            }
            totales.estados[elemento.estado.nombre].registros++;

            // Direcciones
            if (!totales.direcciones[elemento.direccion_geo.nombre]) {
                totales.direcciones[elemento.direccion_geo.nombre] = {
                    registros: 0,
                    porcentaje: 0,
                };
            }
            totales.direcciones[elemento.direccion_geo.nombre].registros++;
        });

        return totales;
    }

    obtenerPorcentajes(totales: any, totalIncidentes: number) {
        const porcentajes = {
            categorias: {},
            subcategorias: {},
            estados: {},
            direcciones: {},
        };

        for (const key in totales.categorias) {
            porcentajes.categorias[key] = {
                registros: totales.categorias[key].registros,
                porcentaje:
                    (totales.categorias[key].registros / totalIncidentes) * 100,
            };
        }

        for (const key in totales.subcategorias) {
            porcentajes.subcategorias[key] = {
                registros: totales.subcategorias[key].registros,
                porcentaje:
                    (totales.subcategorias[key].registros / totalIncidentes) *
                    100,
            };
        }

        for (const key in totales.estados) {
            porcentajes.estados[key] = {
                registros: totales.estados[key].registros,
                porcentaje:
                    (totales.estados[key].registros / totalIncidentes) * 100,
            };
        }

        for (const key in totales.direcciones) {
            porcentajes.direcciones[key] = {
                registros: totales.direcciones[key].registros,
                porcentaje:
                    (totales.direcciones[key].registros / totalIncidentes) *
                    100,
            };
        }

        return porcentajes;
    }
    check: any = {};
    async ngOnInit() {
        try {
            const checkObservables = {
                DashboardComponent: this.auth.hasPermissionComponent(
                    'dashboard',
                    'get'
                ),
                ReporteIncidenteView: this.auth.hasPermissionComponent(
                    '/reporteincidente',
                    'get'
                ),
            };

            forkJoin(checkObservables).subscribe(async (check) => {
                this.check = check;
                //console.log(check);

                if (!this.check.DashboardComponent) {
                    this.router.navigate(['/notfound']);
                    return; // Añade return para evitar continuar si no tienes permisos
                }

                try {
                    await Promise.all([
                        this.rankin(),
                        this.listCategoria(),
                        this.listarEstado(),
                    ]);

                    this.filterForm
                        .get('categoria')
                        .valueChanges.subscribe(() => {
                            this.updateSubcategorias();
                        });

                    // Llama a filtro después de que todas las promesas se hayan resuelto
                    this.filtro();
                } catch (error) {
                    console.error('Error en ngOnInit:', error);
                    this.router.navigate(['/notfound']);
                }
            });
        } catch (error) {
            console.error('Error en ngOnInit:', error);
            this.router.navigate(['/notfound']);
        }
    }

    async load_selecte() {
        if (this.cate) {
            let aux = this.categorias.find(
                (element) => element.nombre === this.cate
            );
            //console.log(aux,this.categorias,this.cate);
            if (aux) {
                this.filterForm.get('categoria').setValue([aux]);
                await this.updateSubcategorias();
            }
        }
    }
    async listarEstado() {
        this.listar
            .listarEstadosIncidentes(this.token)
            .subscribe((response) => {
                if (response.data) {
                    this.estados = response.data;
                }
            });
    }
    async listCategoria() {
        this.listar.listarCategorias(this.token).subscribe((response) => {
            if (response.data) {
                this.categorias = response.data;
                this.load_selecte();
            }
        });
    }
    async updateSubcategorias() {
        this.filterForm.get('subcategoria').setValue([]);
        const categoriaSeleccionada = this.filterForm.get('categoria').value;
        this.subcategorias = [];

        if (categoriaSeleccionada && categoriaSeleccionada.length > 0) {
            try {
                // Crear un array de promesas
                const promises = categoriaSeleccionada.map((element) =>
                    firstValueFrom(
                        this.listar.listarSubcategorias(this.token, {
                            categoria: element._id,
                        })
                    )
                );

                // Ejecutar todas las promesas en paralelo
                const responses = await Promise.all(promises);

                // Procesar las respuestas
                responses.forEach((response) => {
                    if (response.data) {
                        this.subcategorias.push(...response.data);
                    }
                });
            } catch (error) {
                console.error('Error al obtener subcategorias:', error);
            }
        }
    }

    constIncidente: any[] = [];
    incidente: any[] = [];
    options: any;
    async rankin() {
        // Obtener todos los incidentes si aún no se han cargado
        if (this.constIncidente.length === 0) {
            try {
                const response: any = await this.listar
                    .listarIncidentesDenuncias(this.token)
                    .toPromise();
                if (response.data) {
                    this.constIncidente = response.data.map((incidente) => {
                        incidente.ciudadano = incidente.ciudadano || {}; // Asegurarte que exista ciudadano aunque sea vacío
                        incidente.ciudadano.full_name =
                            incidente.ciudadano.last_name &&
                            incidente.ciudadano.name
                                ? `${incidente.ciudadano.last_name} ${incidente.ciudadano.name}`
                                : `${
                                      incidente.senderId || 'Desconocido'
                                  } (No registrado)`;
                        return incidente;
                    });
                }
            } catch (error) {
                console.error('Error al obtener incidentes:', error);
                return;
            }
        } else {
            this.incidente = this.constIncidente;
        }

        console.log(this.incidente, this.constIncidente);
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        this.options = {
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: textColor,
                    },
                    onHover: this.handleHover,
                    onLeave: this.handleLeave,
                },
            },
        };
        await this.obtenerValoresUnicosDireccionGeo();
    }
    async obtenerValoresUnicosDireccionGeo() {
        const valoresUnicos = new Set();
        this.constIncidente.forEach((incidente: any) => {
            const direccionGeo = incidente.direccion_geo;
            const { nombre, latitud, longitud } = direccionGeo;
            const claveUnica = `${nombre}`;
            valoresUnicos.add(claveUnica);
        });
        // Convertir el Set a un array para devolver los valores únicos
        this.direcciones = Array.from(valoresUnicos).map((valor: any) => {
            const [nombre, latitud, longitud] = valor.split('-');
            return { nombre };
        });
    }
    clear(table: Table) {
        table.clear();
    }

    exportToCSV(table: Table, titulo?: string) {
        let selectedColumns = [];
        let header: any;
        let csv: any[] = [];
        if (!titulo) {
            for (const key in table.filters) {
                if (Object.prototype.hasOwnProperty.call(table.filters, key)) {
                    //const element = table.filters[key];
                    selectedColumns.push({
                        field: key,
                        header: key.split('.')[0],
                    });
                }
            }
            header = selectedColumns
                .map((col) => col.header ?? col.field)
                .join(';');
            console.log(selectedColumns);
            csv = table.value.map((row) =>
                selectedColumns
                    .map((col) => this.resolveFieldData(row, col.field))
                    .map((value) => {
                        if (typeof value === 'string') {
                            return '"' + value.replace(/"/g, '""') + '"';
                        }
                        return value;
                    })
                    .join(';')
            );
            console.log(csv);
        } else {
            selectedColumns = [
                { field: titulo, header: titulo },
                { field: 'Cantidad', header: 'Cantidad' },
                { field: 'Porcentaje', header: 'Porcentaje' },
            ];
            header = selectedColumns
                .map((col) => col.header ?? col.field)
                .join(';');
            // Construir las filas del CSV
            csv = table.value.map((row) => {
                const titulo = row[0];
                const registros = row[1].registros;
                const porcentaje = row[1].porcentaje
                    .toFixed(2)
                    .replace('.', ',');

                return [titulo, registros, porcentaje]
                    .map((value) => {
                        if (typeof value === 'string') {
                            return '"' + value.replace(/"/g, '""') + '"';
                        }
                        return value;
                    })
                    .join(';');
            });
        }
        csv.unshift(header);
        const csvContent = '\uFEFF' + csv.join('\n'); // UTF-8 BOM
        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        let ext = '.csv';
        a.download = titulo ? titulo + ext : 'IncidentesFiltrado' + ext;
        a.click();
        URL.revokeObjectURL(url);
    }

    exportToCSVLineTime(dataLineaDeTiempo: any) {
        // Preparar los headers
        const headers = dataLineaDeTiempo.columns
            .map((col) => col.header)
            .join(';');

        // Preparar las filas
        const rows = dataLineaDeTiempo.labels.map((fecha) => {
            const row = [fecha]; // Primera columna es la fecha

            // Agregar los demás campos
            dataLineaDeTiempo.columns.forEach((column) => {
                if (column.field !== 'fecha') {
                    // Obtener el valor y manejar casos donde sea undefined o null
                    const value =
                        dataLineaDeTiempo.tableData[fecha][column.field] ?? 0;

                    // Si es número, reemplazar punto por coma para formato español
                    const formattedValue =
                        typeof value === 'number'
                            ? value.toString().replace('.', ',')
                            : value;

                    // Si es string, envolver en comillas y escapar comillas existentes
                    row.push(
                        typeof formattedValue === 'string'
                            ? `"${formattedValue.replace(/"/g, '""')}"`
                            : formattedValue
                    );
                }
            });

            return row.join(';');
        });

        // Unir headers y rows
        const csvContent = '\uFEFF' + [headers, ...rows].join('\n');

        // Crear y descargar el archivo
        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LineaDeTiempo_${
            new Date().toISOString().split('T')[0]
        }.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    private resolveFieldData(data: any, field: any): any {
        if (data && field) {
            const path = field.split('.');
            let obj = data;
            for (let i = 0, len = path.length; i < len; ++i) {
                obj = obj[path[i]];
            }
            return obj;
        } else {
            return null;
        }
    }

    ultimoColor: string;
    colorIndex: number = 0;
    tonoIndex: number = 0;
    generarColor(): string {
        const colores = [
            'primary',
            'blue',
            'green',
            'yellow',
            'cyan',
            'pink',
            'indigo',
            'bluegray',
            'purple',
            'red',
        ];
        const tonos = ['500', '300', '700'];

        if (!this.colorIndex) {
            this.colorIndex = 0;
            this.tonoIndex = 0;
        }

        const colorElegido = colores[this.colorIndex];
        const tonoElegido = tonos[this.tonoIndex];

        this.colorIndex++;
        if (this.colorIndex >= colores.length) {
            this.colorIndex = 0;
            this.tonoIndex++;
            if (this.tonoIndex >= tonos.length) {
                this.tonoIndex = 0;
            }
        }

        const color = `--${colorElegido}-${tonoElegido}`;

        this.ultimoColor = color;
        return color;
    }
    crearDatosGrafico(datos: any): { datasets: any[]; labels: string[] } {
        const documentStyle = getComputedStyle(document.documentElement);
        const dataset = {
            data: [],
            backgroundColor: [],
            hoverBackgroundColor: [],
        };
        const labels = [];

        for (const [key, value] of Object.entries(datos)) {
            labels.push(key);
            const [porcentaje, registros] = Object.entries(value)[0];
            dataset.data.push(registros);

            // Genera un color aleatorio para cada entrada
            const color = this.generarColor();
            dataset.backgroundColor.push(documentStyle.getPropertyValue(color));
            dataset.hoverBackgroundColor.push(
                documentStyle.getPropertyValue(color)
            );
        }
        return { datasets: [dataset], labels };
    }

    handleHover(evt, item, legend) {
        legend.chart.data.datasets[0].backgroundColor.forEach(
            (color, index, colors) => {
                colors[index] =
                    index === item.index || color.length === 9
                        ? color
                        : color + '4D';
            }
        );
        legend.chart.update();
    }
    handleLeave(evt, item, legend) {
        legend.chart.data.datasets[0].backgroundColor.forEach(
            (color, index, colors) => {
                colors[index] = color.length === 9 ? color.slice(0, -2) : color;
            }
        );
        legend.chart.update();
    }
    getEntries(obj: any): any[] {
        return Object.entries(obj || {});
    }
    onHide() {
        this.displayBasic = false;
    }

    getTotales(totales: any) {
        let totalRegistros = 0;
        let totalPorcentaje = 0;

        for (const categoria of this.getEntries(totales)) {
            totalRegistros += categoria[1].registros;
            totalPorcentaje += categoria[1].porcentaje;
        }

        return { totalRegistros, totalPorcentaje };
    }

    exportChart(
        chart: UIChart,
        exportCanvas: HTMLCanvasElement,
        titulo: string
    ) {
        const base64Image = chart.getBase64Image();
        const img = new Image();
        img.onload = () => {
            exportCanvas.width = img.width;
            exportCanvas.height = img.height;
            const exportContext = exportCanvas.getContext('2d');
            exportContext.drawImage(img, 0, 0);

            exportCanvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = titulo + '.png';
                a.click();
                URL.revokeObjectURL(url);
            });
        };
        img.src = base64Image;
    }
    viewdialog: boolean = false;
    optionview: any;
    imagenModal: any;
    imagenAMostrar: any;
    displayBasic: boolean = false;
    public url = GLOBAL.url;
    openModalimagen(url: any) {
        this.imagenModal = url;
        //console.log('imagenModal',this.imagenModal);
        this.imagenAMostrar = this.imagenModal[0];
        //const this.ref = this.dialogService.open(this.modalContent, { size: 'lg' });
    }
    isMobil() {
        return this.helper.isMobil();
    }
    responsiveOptions: any[] = [
        {
            breakpoint: '1500px',
            numVisible: 5,
        },
        {
            breakpoint: '1024px',
            numVisible: 3,
        },
        {
            breakpoint: '768px',
            numVisible: 2,
        },
        {
            breakpoint: '560px',
            numVisible: 1,
        },
    ];
    verficha(rowIndex: any) {
        this.viewdialog = true;
        this.optionview = rowIndex;
        //console.log(rowIndex);
    }
    getSeverity(
        status: string,
        fecha?: any
    ): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
        switch (status.toLowerCase()) {
            case 'suspendido':
                return 'danger';

            case 'finalizado':
                return 'success';

            case 'en proceso':
                return 'success';

            case 'pendiente':
                let fechaActualMenosTresDias = new Date(fecha);
                fechaActualMenosTresDias.setDate(
                    fechaActualMenosTresDias.getDate() + 3
                );

                if (
                    fechaActualMenosTresDias.getTime() <= new Date().getTime()
                ) {
                    return 'danger';
                } else {
                    return 'warning';
                }

            case 'planificada':
                return 'info'; // Otra opción aquí, dependiendo de lo que desees

            default:
                return 'success'; // Otra opción aquí, dependiendo de lo que desees
        }
    }
}
