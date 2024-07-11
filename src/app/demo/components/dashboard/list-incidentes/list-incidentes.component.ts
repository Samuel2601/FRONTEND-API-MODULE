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
import { firstValueFrom } from 'rxjs';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { AuthService } from 'src/app/demo/services/auth.service';

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
        private auth:AuthService
    ) {
        this.filterForm = this.formBuilder.group({
            fecha_inicio: [''],
            fecha_fin: [''],
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
    @ViewChild('fechaInicio', { static: true }) fechaInicio: ElementRef;
    ngAfterViewInit() {
        // Deshabilitar autofocus en el campo fecha_inicio
        //this.fechaInicio.nativeElement.querySelector('input').blur();
    }
    filtro() {
        this.helper.llamarspinner();
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
        // Obtener totales y porcentajes
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
        this.load_table = true;
        setTimeout(() => {
            this.helper.cerrarspinner();
        }, 500);
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
        this.check.DashboardComponent =
            this.helper.decryptData('DashboardComponent') || false;
        this.check.ReporteIncidenteView =
            this.helper.decryptData('ReporteIncidenteView') || false;
        //console.log(this.check.DashboardComponent);
        if (!this.check.DashboardComponent) {
            this.router.navigate(['/notfound']);
        }
        //this.helper.llamarspinner();
        if (!this.token) {
            this.router.navigate(['/auth/login']);
            //this.helper.cerrarspinner();
            throw new Error('Token no encontrado');
        }

        await this.rankin();
        await this.listCategoria();
        await this.listarEstado();
        this.filterForm.get('categoria').valueChanges.subscribe(() => {
            this.updateSubcategorias();
        });
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
        this.filtro();
    }
    async listarEstado() {
        if (this.token)
            this.listar
                .listarEstadosIncidentes(this.token)
                .subscribe((response) => {
                    if (response.data) {
                        this.estados = response.data;
                    }
                });
    }
    async listCategoria() {
        if (this.token)
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
                const promises = categoriaSeleccionada.map(element => 
                    firstValueFrom(this.listar.listarSubcategorias(this.token, 'categoria', element._id))
                );
                
                // Ejecutar todas las promesas en paralelo
                const responses = await Promise.all(promises);
                
                // Procesar las respuestas
                responses.forEach(response => {
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
        if (this.constIncidente.length === 0 && this.token) {
            try {
                const response: any = await this.listar
                    .listarIncidentesDenuncias(this.token, '', '', false)
                    .toPromise();
                if (response.data) {
                    this.constIncidente = response.data;
                }
            } catch (error) {
                console.error('Error al obtener incidentes:', error);
                return;
            }
        } else {
            this.incidente = this.constIncidente;
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
        a.download = titulo ? titulo + ext : 'IncidentesFiltrado' + ext;
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
