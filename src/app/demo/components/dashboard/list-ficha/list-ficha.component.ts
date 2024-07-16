import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';
import { MessageService } from 'primeng/api';
import { Table } from 'primeng/table';
import { ChartModule, UIChart } from 'primeng/chart';
import { Router } from '@angular/router';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { AuthService } from 'src/app/demo/services/auth.service';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-list-ficha',
    templateUrl: './list-ficha.component.html',
    styleUrl: './list-ficha.component.scss',
})
export class ListFichaComponent implements OnInit {
    public filterForm: FormGroup | any;
    private token = this.auth.token();
    public actividades: any[] = [];
    public encargados: any[] = [];
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
        this.filterForm = this.formBuilder.group({
            fecha_inicio: [''],
            fecha_fin: [''],
            actividad: [[], [Validators.minLength(1)]],
            encargado: [[], [Validators.minLength(1)]],
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

    filtro() {
        this.helper.llamarspinner('Filtro lista de fichas');
        this.load_table = false;
        try {
            const fechaInicio = this.filterForm.get('fecha_inicio').value;
            const fechaFin = this.filterForm.get('fecha_fin').value;
            const actividad = this.filterForm.get('actividad').value;
            const encargado = this.filterForm.get('encargado').value;
            const estado = this.filterForm.get('estado').value;
            const direccion = this.filterForm.get('direccion').value;
            const view = this.filterForm.get('view').value;

            // Optimización de filtros: Usar métodos de búsqueda más eficientes
            const actividadIds = actividad.map((c: any) => c._id.toString());
            const encargadoIds = encargado.map((s: any) => s._id.toString());
            const estadoIds = estado.map((e: any) => e._id.toString());
            const direccionesNombres = direccion.map((d: any) => d.nombre);

            const elementosFiltrados = this.constFicha.filter((elemento) => {
                const fechaElemento = new Date(elemento.createdAt);
                return (
                    (!fechaInicio ||
                        !fechaFin ||
                        (fechaElemento >= fechaInicio &&
                            fechaElemento <= fechaFin)) &&
                    (actividadIds.length === 0 ||
                        actividadIds.includes(
                            elemento.actividad._id.toString()
                        )) &&
                    (encargadoIds.length === 0 ||
                        encargadoIds.includes(
                            elemento.encargado._id.toString()
                        )) &&
                    (estadoIds.length === 0 ||
                        estadoIds.includes(elemento.estado._id.toString())) &&
                    (direccionesNombres.length === 0 ||
                        direccionesNombres.includes(
                            this.isJSONString(elemento.direccion_geo)
                                ? this.parseJSON(elemento.direccion_geo).nombre
                                : elemento.direccion_geo
                        )) &&
                    (view == null || elemento.view == view)
                );
            });

            this.ficha = elementosFiltrados;
            // Mostrar totales y porcentajes en la tabla
            // Obtener totales y porcentajes
            this.totales = this.obtenerTotales(this.ficha);

            for (const key in this.dataForm) {
                if (Object.prototype.hasOwnProperty.call(this.dataForm, key)) {
                    const element = this.dataForm[key];
                    this.dataForm[key] = this.crearDatosGrafico(
                        this.totales[key]
                    );
                }
            }
        } catch (error) {
            console.log(error);
        } finally {
            this.load_table = true;
            this.helper.cerrarspinner('Filtro lista de fichas');
        }
    }

    totales: any;
    porcentajes: any;

    dataForm: any = {
        actividades: undefined,
        encargados: undefined,
        estados: undefined,
        direcciones: undefined,
    };
    trackByFn(index, item) {
        return item.id; // Cambia 'id' por la propiedad única de tu objeto
    }
    calcularTotalesYPorcentajes(fichas: any[], totalFichas: number) {
        const totales = fichas.reduce(
            (acc, elemento) => {
                // Categorías
                acc.actividades[elemento.actividad.nombre] =
                    (acc.actividades[elemento.actividad.nombre] || 0) + 1;

                // Encargados
                acc.encargados[elemento.encargado.nombres] =
                    (acc.encargados[elemento.encargado.nombres] || 0) + 1;

                // Estados
                acc.estados[elemento.estado.nombre] =
                    (acc.estados[elemento.estado.nombre] || 0) + 1;

                // Direcciones
                const direccion = this.isJSONString(elemento.direccion_geo)
                    ? this.parseJSON(elemento.direccion_geo).nombre
                    : elemento.direccion_geo;
                acc.direcciones[direccion] =
                    (acc.direcciones[direccion] || 0) + 1;

                return acc;
            },
            {
                actividades: {},
                encargados: {},
                estados: {},
                direcciones: {},
            }
        );

        // Calcular porcentajes
        for (const tipo in totales) {
            for (const key in totales[tipo]) {
                totales[tipo][key] = {
                    registros: totales[tipo][key],
                    porcentaje: (totales[tipo][key] / totalFichas) * 100,
                };
            }
        }

        return totales;
    }

    // Uso de la función refactorizada
    obtenerTotales(fichas: any[]) {
        return this.calcularTotalesYPorcentajes(fichas, fichas.length);
    }
    check: any = {};
    async ngOnInit() {
        const checkObservables = {
            DashboardComponent: await this.auth.hasPermissionComponent(
                'dashboard',
                'get'
            ),
            ReporteFichaView: await this.auth.hasPermissionComponent(
                '/ficha_sectorial',
                'get'
            ),
        };

        forkJoin(checkObservables).subscribe(async (check) => {
            this.check = check;
            try {
                if (!this.check.DashboardComponent) {
                    this.router.navigate(['/notfound']);
                    return;
                }

                Promise.all([
                    this.cargarRanking(),
                    this.listarEstados(),
                    this.listarCategorias(),
                ])
                    .then(() => {
                        this.filterForm
                            .get('actividad')
                            .valueChanges.subscribe(() => {
                                this.updateEncargados();
                            });
                        const documentStyle = getComputedStyle(
                            document.documentElement
                        );
                        const textColor =
                            documentStyle.getPropertyValue('--text-color');
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
                        this.filtro();
                    })
                    .catch((error) => {
                        console.error('Error al cargar datos:', error);
                        // Manejar el error de forma adecuada (mostrar un mensaje al usuario, etc.)
                    });
            } catch (error) {
                console.error('Error en ngOnInit:', error);
                this.router.navigate(['/notfound']);
            }
        });
    }

    async cargarRanking() {
        if (this.constFicha.length === 0) {
            return this.listar
                .listarFichaSectorial(this.token)
                .toPromise()
                .then((response) => {
                    if (response.data) {
                        this.constFicha = response.data;
                        this.ficha = this.constFicha;
                        this.obtenerValoresUnicosDireccionGeo();
                    }
                });
        } else {
            this.ficha = this.constFicha;
            return Promise.resolve(); // Devolver una promesa resuelta si no es necesario cargar datos
        }
    }

    obtenerValoresUnicosDireccionGeo() {
        const valoresUnicos = new Set(
            this.constFicha.map((elemento) =>
                this.isJSONString(elemento.direccion_geo)
                    ? this.parseJSON(elemento.direccion_geo).nombre
                    : elemento.direccion_geo
            )
        );
        this.direcciones = Array.from(valoresUnicos).map((nombre) => ({
            nombre,
        }));
    }

    listarEstados() {
        return this.listar
            .listarEstadosActividadesProyecto(this.token)
            .toPromise()
            .then((response) => {
                if (response.data) {
                    this.estados = response.data;
                }
            });
    }

    listarCategorias() {
        return this.listar
            .listarTiposActividadesProyecto(this.token)
            .toPromise()
            .then((response) => {
                if (response.data) {
                    this.actividades = response.data;
                }
            });
    }

    async updateEncargados() {
        this.filterForm.get('encargado').setValue([]);
        const actividadSeleccionada = this.filterForm.get('actividad').value;
        this.encargados = [];
        try {
            for (const actividad of actividadSeleccionada) {
                const encargadosActividad = this.constFicha
                    .filter((ficha) => ficha.actividad._id == actividad._id)
                    .map((ficha) => ficha.encargado);
                this.encargados = this.encargados.concat(encargadosActividad);
            }
            // Eliminar duplicados
            this.encargados = this.encargados.filter(
                (encargado, index, self) =>
                    index ===
                    self.findIndex(
                        (e) =>
                            e._id === encargado._id &&
                            e.nombres === encargado.nombres
                    )
            );
        } catch (error) {
            console.error('Error al obtener encargados:', error);
        }
    }

    constFicha: any[] = [];
    ficha: any[] = [];
    options: any;
    rankin() {
        // Obtener todos los fichas si aún no se han cargado
        if (this.constFicha.length === 0) {
            try {
                const response: any = this.listar
                    .listarFichaSectorial(this.token)
                    .toPromise();
                if (response.data) {
                    this.constFicha = response.data;
                }
            } catch (error) {
                console.error('Error al obtener fichas:', error);
                return;
            }
        } else {
            this.ficha = this.constFicha;
        }
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
        this.obtenerValoresUnicosDireccionGeo();
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
        a.download = titulo ? titulo + ext : 'FichasFiltrado' + ext;
        a.click();
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

    getSeverity(
        status: string
    ): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
        switch (status.toLowerCase()) {
            case 'suspendido':
                return 'danger';

            case 'finalizado':
                return 'success';

            case 'en proceso':
                return 'info';

            case 'pendiente':
                return 'warning';

            case 'planificada':
                return 'info';

            default:
                return 'secondary'; // Asegúrate de retornar un valor válido por defecto
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
    convertirObjetoEnArreglo(objeto: any): any[] {
        return Object.keys(objeto).map((key) => ({
            clave: key,
            valor: objeto[key],
        }));
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

    getTotales(totales: any) {
        let totalRegistros = 0;
        let totalPorcentaje = 0;

        for (const actividad of this.getEntries(totales)) {
            totalRegistros += actividad[1].registros;
            totalPorcentaje += actividad[1].porcentaje;
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
    responsiveOptions = [
        {
            breakpoint: '1024px',
            numVisible: 5,
        },
        {
            breakpoint: '768px',
            numVisible: 3,
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
    isJSONString(str: string) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }
    parseJSON(str: string): any {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.error('Error parsing JSON string:', e);
            return null;
        }
    }
}
