import { Component, OnInit } from '@angular/core';
import { Table } from 'primeng/table';
import { AuthService } from 'src/app/demo/services/auth.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';
import { GLOBAL } from '../../demo/services/GLOBAL';
import { Router } from '@angular/router';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AgregarUbicacionRecolectoresComponent } from '../agregar-ubicacion-recolectores/agregar-ubicacion-recolectores.component';
import { UbicacionService } from '../service/ubicacion.service';
import { App } from '@capacitor/app';

@Component({
    selector: 'app-recolector-estadisticas',
    standalone: false,
    templateUrl: './recolector-estadisticas.component.html',
    styleUrl: './recolector-estadisticas.component.scss',
    providers: [
        ConfirmationService,
        MessageService,
        DynamicDialogRef,
        DialogService,
    ],
})
export class RecolectorEstadisticasComponent implements OnInit {
    dialogVisible = false;
    dialogChartData: any;
    dialogTableData: any[] = [];
    tableHeaders: string[] = [];
    headers_dialog: string = 'Datos del Gráfico';
    tipo_chart: 'line' | 'bar' | 'pie' = 'bar';
    load_char_dialog: boolean = false;
    datosRecolectores: any[] = [];
    cargando: boolean = true;
    url = GLOBAL.url;

    constructor(
        private recolectorService: ListService,
        private auth: AuthService,
        private helper: HelperService,
        private router: Router,
        private ref: DynamicDialogRef,
        private dialogService: DialogService,
        private ubicar: UbicacionService
    ) {}

    openDialog(
        title: string,
        chartData: any,
        titleRow: string,
        tipo_chart: 'line' | 'bar' | 'pie'
    ) {
        this.tipo_chart = tipo_chart;
        this.load_char_dialog = false;
        this.dialogChartData = chartData;
        this.headers_dialog = title;
        // Transformar datos del gráfico a formato de tabla
        this.dialogTableData = this.transformChartDataToTableData(
            chartData,
            titleRow
        );
        this.tableHeaders = this.getTableHeaders(chartData, titleRow);

        this.dialogVisible = true;
        setTimeout(() => {
            this.load_char_dialog = true;
        }, 1000);
    }

    transformChartDataToTableData(chartData: any, titleRow: string): any[] {
        const labels = chartData.labels;
        const datasets = chartData.datasets;

        // Inicializar la tabla con los labels como filas
        const tableData = labels.map((label, index) => {
            // Crear una fila para cada label
            const row: any = { [titleRow]: label }; // Usar titleRow como nombre de la primera columna

            // Añadir columnas para cada dataset
            datasets.forEach((dataset) => {
                row[dataset.label] = dataset.data[index];
            });

            return row;
        });

        return tableData;
    }

    getTableHeaders(chartData: any, titleRow: string): string[] {
        const headers = [titleRow];

        // Obtener todos los nombres de los datasets como encabezados de columna
        chartData.datasets.forEach((dataset) => {
            headers.push(dataset.label);
        });

        return headers;
    }
    isMobil() {
        return this.helper.isMobil();
    }

    ngOnInit(): void {
        this.obtenerDatosRecolectores();
    }
    representatives: any[] = [];
    recolectoresId: any[] = [];
    obtenerDatosRecolectores() {
        const token = this.auth.token();

        // Verificamos que el datatoken sea de tipo string
        if (!token || typeof token !== 'string') {
            console.error('Token inválido o no encontrado.');
            return;
        }

        this.recolectorService
            .listarAsignacionRecolectores(token, {}, true)
            .subscribe({
                next: (data) => {
                    this.datosRecolectores = data.data;
                    this.datosRecolectores.map((e) => {
                        e.date = new Date(e.dateOnly);
                        /*e.dateOnly = new Date(e.dateOnly).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                    });*/
                        e.fullname = e.funcionario
                            ? e.funcionario.name + ' ' + e.funcionario.last_name
                            : e.externo.name;
                        e.externo = e.funcionario ? true : false;
                        e.velocidad_maxima = this.calcularVelocidadMaxima(
                            e.ruta
                        );
                    });
                    //console.log(this.datosRecolectores);
                    this.representatives = [
                        ...new Set(
                            this.datosRecolectores.map((e) => e.fullname)
                        ),
                    ];
                    this.recolectoresId = [
                        ...new Set(
                            this.datosRecolectores.map((e) => e.deviceId)
                        ),
                    ];
                    //console.log(this.datosRecolectores);
                    this.cargando = false;
                    this.generarEstadisticas();
                },
                error: (err) => console.error('Error al obtener datos', err),
            });
    }
    onSort(event: any, dt1: any) {
        console.log('Orden aplicado:', event);
        console.log('Datos ordenados:', dt1.filteredValue || dt1.value);

        // Llama a la función para generar estadísticas con los datos ordenados
        //this.generarEstadisticas(dt1);
        this.representatives = [
            ...new Set(this.datosRecolectores.map((e) => e.fullname)),
        ];
        this.recolectoresId = [
            ...new Set(this.datosRecolectores.map((e) => e.deviceId)),
        ];
    }

    generarEstadisticas(dt1?: any) {
        //console.log(dt1, dt1?.filteredValue);
        //console.log('Datos ordenados:', dt1?.filteredValue || dt1?.value);
        // Acceder a los datos filtrados
        const datosFiltrados =
            dt1?.filteredValue || dt1?.value || this.datosRecolectores;

        this.generarDistribucionVelocidades(datosFiltrados);
        this.generarVelocidadPromedio(datosFiltrados);
        this.generarPuntosRecoleccion(datosFiltrados);
        this.generarCapacidadRetorno(datosFiltrados);
        this.generarDistanciaRecorrida(datosFiltrados);
    }
    dataDistribucionVelocidades: any | undefined;
    // En tu componente .ts 1
    generarDistribucionVelocidades(datosRecolectores: any) {
        const recolectores = datosRecolectores.map((d: any) => d.deviceId);
        const velocidades = datosRecolectores
            .map((d: any) => d.ruta.map((punto: any) => punto.speed))
            .flat();

        // Crear histogramas de velocidades
        const bins = Array.from({ length: 10 }, (_, i) => i * 10); // Rango de 0-100 con intervalos de 10
        const histogram = bins.map((bin) => ({
            bin,
            count: velocidades.filter((v) => v >= bin && v < bin + 10).length,
        }));

        this.dataDistribucionVelocidades = {
            labels: histogram.map((h) => `${h.bin}-${h.bin + 10}`),
            datasets: [
                {
                    label: 'Distribución de Velocidad',
                    data: histogram.map((h) => parseFloat(h.count.toFixed(2))), // Redondear a 2 decimales
                    backgroundColor: '#42A5F5',
                },
            ],
        };
    }
    dataVelocidadPromedio: any | undefined;
    // En tu componente .ts 2

    generarVelocidadPromedio(datosRecolectores: any) {
        // Paso 1: Preparar la estructura de datos inicial
        const velocidadesPorFechaYRecolector = {};
        const fechasSet = new Set();

        datosRecolectores.forEach((recolector: any) => {
            const { deviceId, dateOnly, ruta } = recolector;

            // Inicializar el objeto para el deviceId si no existe
            if (!velocidadesPorFechaYRecolector[deviceId]) {
                velocidadesPorFechaYRecolector[deviceId] = {};
            }

            // Inicializar el objeto para la fecha si no existe
            if (!velocidadesPorFechaYRecolector[deviceId][dateOnly]) {
                velocidadesPorFechaYRecolector[deviceId][dateOnly] = [];
            }

            // Calcular las velocidades y agregarlas a la estructura de datos
            const velocidades = ruta
                .filter((punto: any) => punto.speed > 1)
                .map((punto: any) => punto.speed);

            velocidadesPorFechaYRecolector[deviceId][dateOnly].push(
                velocidades.length > 0
                    ? velocidades.reduce((acc, v) => acc + v, 0) /
                          velocidades.length
                    : 0
            );

            // Agregar las fechas al conjunto
            fechasSet.add(dateOnly);
        });

        // Paso 2: Preparar los datos para los gráficos
        const datasets = [];
        const fechasArray = [...fechasSet]; // Convertir el conjunto a un array

        Object.keys(velocidadesPorFechaYRecolector).forEach((deviceId) => {
            const data = fechasArray.map((fecha) => {
                const velocidades =
                    velocidadesPorFechaYRecolector[deviceId][fecha];
                return velocidades && velocidades.length > 0
                    ? parseFloat(
                          (
                              velocidades.reduce((acc, v) => acc + v, 0) /
                              velocidades.length
                          ).toFixed(2)
                      )
                    : 0; // Usar 0 si no hay datos
            });

            const color = this.getRandomColor();
            const opacoColor = this.hexToRgba(color, 0.2); // Ajusta la opacidad aquí (0.2 = 20% opacidad)

            datasets.push({
                label: deviceId,
                data: data,
                tension: 0.4,
                fill: true,
                backgroundColor: opacoColor, // Método para obtener colores aleatorios
                borderColor: color,
            });
        });

        this.dataVelocidadPromedio = {
            labels: fechasArray, // Las fechas son las etiquetas del gráfico
            datasets: datasets,
        };
    }

    dataPuntosRecoleccion: any | undefined;
    // En tu componente .ts 3
    generarPuntosRecoleccion(datosRecolectores: any) {
        // Paso 1: Preparar la estructura de datos inicial
        const puntosPorFechaYRecolector = {};
        const fechasSet = new Set();

        // Procesar los datos recolectores
        datosRecolectores.forEach((recolector: any) => {
            const { deviceId, dateOnly, puntos_recoleccion } = recolector;

            // Inicializar el objeto para el deviceId si no existe
            if (!puntosPorFechaYRecolector[deviceId]) {
                puntosPorFechaYRecolector[deviceId] = {};
            }

            // Inicializar el objeto para la fecha si no existe
            if (!puntosPorFechaYRecolector[deviceId][dateOnly]) {
                puntosPorFechaYRecolector[deviceId][dateOnly] = 0;
            }

            // Contar los puntos de recolección que no tienen retorno
            const puntos = puntos_recoleccion.filter(
                (e: any) => e.retorno === false
            ).length;

            puntosPorFechaYRecolector[deviceId][dateOnly] = puntos;

            // Agregar las fechas al conjunto
            fechasSet.add(dateOnly);
        });

        // Paso 2: Preparar los datos para los gráficos
        const datasets = [];
        const fechasArray = [...fechasSet]; // Convertir el conjunto a un array

        Object.keys(puntosPorFechaYRecolector).forEach((deviceId) => {
            const data = fechasArray.map(
                (fecha) => puntosPorFechaYRecolector[deviceId][fecha] || 0 // Usar 0 si no hay datos
            );

            const color = this.getRandomColor();
            const opacoColor = this.hexToRgba(color, 0.2); // Ajusta la opacidad aquí (0.2 = 20% opacidad)

            datasets.push({
                label: deviceId,
                data: data,
                tension: 0.4,
                fill: true,
                backgroundColor: opacoColor, // Método para obtener colores aleatorios
                borderColor: color,
            });
        });

        this.dataPuntosRecoleccion = {
            labels: fechasArray, // Las fechas son las etiquetas del gráfico
            datasets: datasets,
        };
    }

    dataCapacidadRetorno: any | undefined;
    tabla_info = [
        { id: 1840, name: 'RECL - 04 HIGIENE', plate: '', capacidad: 12 },
        {
            id: 1812,
            name: 'VOLQ - 1155 HIGIENE',
            plate: 'EMA - 1155',
            capacidad: 6,
        },
        { id: 1828, name: 'VOLQ 1162', plate: 'VOLQ 1162', capacidad: 6 },
        { id: 1813, name: 'RECL - 06 HIGIENE', plate: 'HINO ', capacidad: 12 },
        { id: 1799, name: 'RECL - 10 HIGENE', plate: '', capacidad: 8 },
        { id: 1801, name: 'RECL - Goliat ', plate: 'GOLIAT', capacidad: 22 },
        { id: 1802, name: 'VOLQ 1159 OP', plate: 'EMA - 1159', capacidad: 6 },
        { id: 1804, name: 'VOLQ 1160 OP ', plate: 'EMA - 1160', capacidad: 6 },
        {
            id: 1820,
            name: 'VOLQ - EMA - 1157',
            plate: 'EMA - 1157',
            capacidad: 6,
        },
        { id: 1837, name: 'RECL - 07 HIGIENE', plate: '', capacidad: 12 },
        { id: 1838, name: 'RECL - 02  HIGENE', plate: '', capacidad: 8 },
        { id: 1839, name: 'RECL - 01 HIGIENE', plate: '', capacidad: 8 },
    ];
    mapaCapacidades = new Map<number, number>();
    // En tu componente .ts 4
    generarCapacidadRetorno(datosRecolectores: any) {
        // Paso 1: Preparar la estructura de datos inicial
        const capacidadesPorFechaYRecolector = {};
        const fechasSet = new Set();

        // Inicializar el mapa de capacidades por ID
        this.tabla_info.forEach((item) => {
            this.mapaCapacidades.set(item.id, item.capacidad);
        });

        // Procesar los datos recolectores
        datosRecolectores.forEach((recolector) => {
            const { deviceId, dateOnly, capacidad_retorno } = recolector;

            // Inicializar el objeto para el deviceId si no existe
            if (!capacidadesPorFechaYRecolector[deviceId]) {
                capacidadesPorFechaYRecolector[deviceId] = {};
            }

            // Inicializar el objeto para la fecha si no existe
            if (!capacidadesPorFechaYRecolector[deviceId][dateOnly]) {
                capacidadesPorFechaYRecolector[deviceId][dateOnly] = 0;
            }

            // Calcular la capacidad de retorno
            const capacidadReal =
                this.mapaCapacidades.get(parseInt(deviceId)) || 0;
            const capacidadRetorno = capacidad_retorno
                .map((cr) => {
                    switch (cr.value) {
                        case 'Lleno':
                            return capacidadReal;
                        case 'Medio':
                            return capacidadReal / 2;
                        case 'Vacío':
                            return 0;
                        default:
                            return 0;
                    }
                })
                .reduce((acc, curr) => acc + curr, 0);

            capacidadesPorFechaYRecolector[deviceId][dateOnly] = parseFloat(
                capacidadRetorno.toFixed(2)
            );

            // Agregar las fechas al conjunto
            fechasSet.add(dateOnly);
        });

        // Paso 2: Preparar los datos para los gráficos
        const datasets = [];
        const fechasArray = [...fechasSet]; // Convertir el conjunto a un array

        Object.keys(capacidadesPorFechaYRecolector).forEach((deviceId) => {
            const data = fechasArray.map(
                (fecha) => capacidadesPorFechaYRecolector[deviceId][fecha] || 0 // Usar 0 si no hay datos
            );

            const color = this.getRandomColor();
            const opacoColor = this.hexToRgba(color, 0.2); // Ajusta la opacidad aquí (0.2 = 20% opacidad)

            datasets.push({
                label: deviceId,
                data: data,
                tension: 0.4,
                fill: true,
                backgroundColor: opacoColor, // Método para obtener colores aleatorios
                borderColor: color,
            });
        });

        this.dataCapacidadRetorno = {
            labels: fechasArray, // Las fechas son las etiquetas del gráfico
            datasets: datasets,
        };
    }

    dataDistanciaRecorrida: any | undefined;
    // En tu componente .ts 5
    generarDistanciaRecorrida(datosRecolectores: any) {
        // Paso 1: Preparar la estructura de datos inicial
        const distanciasPorFecha = {};
        const fechasSet = new Set();

        datosRecolectores.forEach((recolector: any) => {
            const { deviceId, dateOnly, ruta } = recolector;

            // Inicializar el objeto para el deviceId si no existe
            if (!distanciasPorFecha[deviceId]) {
                distanciasPorFecha[deviceId] = {};
            }

            // Inicializar el objeto para la fecha si no existe
            if (!distanciasPorFecha[deviceId][dateOnly]) {
                distanciasPorFecha[deviceId][dateOnly] = 0;
            }

            // Calcular la distancia total para la ruta
            for (let i = 1; i < ruta.length; i++) {
                const puntoAnterior = ruta[i - 1];
                const puntoActual = ruta[i];

                const distancia = this.calcularDistancia(
                    puntoAnterior.latitude,
                    puntoAnterior.longitude,
                    puntoActual.latitude,
                    puntoActual.longitude
                );

                distanciasPorFecha[deviceId][dateOnly] += distancia;
            }

            // Agregar las fechas al conjunto
            fechasSet.add(dateOnly);
        });

        // Paso 2: Preparar los datos para los gráficos
        const datasets = [];
        const fechasArray = [...fechasSet]; // Convertir el conjunto a un array

        Object.keys(distanciasPorFecha).forEach((deviceId) => {
            const data = fechasArray.map(
                (fecha) =>
                    distanciasPorFecha[deviceId][fecha]
                        ? parseFloat(
                              distanciasPorFecha[deviceId][fecha].toFixed(2)
                          )
                        : 0 // Usar 0 si no hay datos
            );
            const color = this.getRandomColor();
            const opacoColor = this.hexToRgba(color, 0.2); // Ajusta la opacidad aquí (0.2 = 20% opacidad)

            datasets.push({
                label: deviceId,
                data: data,
                tension: 0.4,
                fill: true,
                backgroundColor: opacoColor, // Método para obtener colores aleatorios
                borderColor: color,
            });
        });

        this.dataDistanciaRecorrida = {
            labels: fechasArray, // Las fechas son las etiquetas del gráfico
            datasets: datasets,
        };
    }

    // Método para obtener colores aleatorios para los datasets
    getRandomColor(): string {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // Método para convertir color hexadecimal a rgba con opacidad
    hexToRgba(hex: string, alpha: number): string {
        let r = 0,
            g = 0,
            b = 0;

        // Eliminar el símbolo '#'
        hex = hex.replace(/^#/, '');

        // Convertir de 3 caracteres a 6
        if (hex.length === 4) {
            hex = hex.replace(/(.)/g, '$1$1');
        }

        // Obtener valores RGB
        r = parseInt(hex.substr(0, 2), 16);
        g = parseInt(hex.substr(2, 2), 16);
        b = parseInt(hex.substr(4, 2), 16);

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    // Función para calcular la distancia entre dos puntos usando la fórmula de Haversine
    calcularDistancia(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) *
                Math.cos(this.deg2rad(lat2)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distancia = R * c; // Distancia en km
        return distancia;
    }

    // Convertir grados a radianes
    deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    // En tu componente .ts
    calcularVelocidadMaxima(ruta: any[]): number {
        return (
            ruta?.reduce(
                (max, punto) => (punto.speed > max ? punto.speed : max),
                0
            ) || 0
        );
    }
    searchValue: string | undefined;
    clear(table: Table) {
        table.clear();
        this.searchValue = '';
    }
    displayBasic: boolean = false;
    imagenModal: any;
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
    onAvatarClick(event: Event, photo: string | undefined): void {
        // Detener la propagación del evento click
        event.stopPropagation();

        // Tu lógica para abrir el modal y asignar la imagen
        this.displayBasic = true;
        this.imagenModal = [this.url + 'obtener_imagen/usuario/' + photo];
    }

    verRuta(register: any) {
        //console.log(register);
        this.ref = this.dialogService.open(
            AgregarUbicacionRecolectoresComponent,
            {
                header:
                    'Seguimiento de ruta del vehiculo: ' +
                    this.getDeviceGPS(register.deviceId) +
                    ' a cargo de: ' +
                    register.fullname,
                width: '90vw',
                data: { id: register._id },
            }
        );
        App.addListener('backButton', (data) => {
            this.ref.close();
        });
        /*this.ref.onClose.subscribe(() => {
                this.listar_asignacion();
            });*/
    }
    devices: any[] = [];
    async fetchDevices() {
        this.ubicar.obtenerDeviceGPS().subscribe((response) => {
            const aux = response.map((e) => {
                return { id: e.id, name: e.name, plate: e.plate, capacidad: 0 };
            });
            this.devices = response;
        });
    }
    getDeviceGPS(id: string) {
        let nameDevice = '';
        if (this.devices.length > 0) {
            let aux = this.devices.find(
                (element) => element.id === parseInt(id)
            );
            nameDevice = aux ? aux.name : 'No encontrado';
        } else {
            nameDevice = id;
        }
        return nameDevice;
    }
}
