import { Component } from '@angular/core';
import { AuthService } from 'src/app/demo/services/auth.service';
import { ListService } from 'src/app/demo/services/list.service';

@Component({
    selector: 'app-recolector-estadisticas',
    standalone: false,
    templateUrl: './recolector-estadisticas.component.html',
    styleUrl: './recolector-estadisticas.component.scss',
})
export class RecolectorEstadisticasComponent {
    datosRecolectores: any[] = [];
    cargando: boolean = true;

    constructor(
        private recolectorService: ListService,
        private auth: AuthService
    ) {}

    ngOnInit(): void {
        this.obtenerDatosRecolectores();
    }

    obtenerDatosRecolectores() {
        const token = this.auth.token();

        // Verificamos que el datatoken sea de tipo string
        if (!token || typeof token !== 'string') {
            console.error('Token inválido o no encontrado.');
            return;
        }

        this.recolectorService.listarAsignacionRecolectores(token).subscribe({
            next: (data) => {
                this.datosRecolectores = data.data;
                console.log(this.datosRecolectores);
                this.cargando = false;
                this.generarEstadisticas();
            },
            error: (err) => console.error('Error al obtener datos', err),
        });
    }
    generarEstadisticas() {
        this.generarDistribucionVelocidades();
        this.generarVelocidadPromedio();
        this.generarPuntosRecoleccion();
        this.generarCapacidadRetorno();
        this.generarDistanciaRecorrida();
    }
    dataDistribucionVelocidades: any | undefined;
    // En tu componente .ts 1
    generarDistribucionVelocidades() {
        const recolectores = this.datosRecolectores.map((d) => d.deviceId);
        const velocidades = this.datosRecolectores
            .map((d) => d.ruta.map((punto) => punto.speed))
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
                    data: histogram.map((h) => h.count),
                    backgroundColor: '#42A5F5',
                },
            ],
        };
    }
    dataVelocidadPromedio: any | undefined;
    // En tu componente .ts 2
    generarVelocidadPromedio() {
        const recolectores = this.datosRecolectores.map((d) => d.deviceId);
        const velocidades = this.datosRecolectores.map(
            (d) =>
                d.ruta
                    .filter((punto) => punto.speed > 1)
                    .reduce((acc, punto) => acc + punto.speed, 1) /
                d.ruta.length
        );

        this.dataVelocidadPromedio = {
            labels: recolectores,
            datasets: [
                {
                    label: 'Velocidad Promedio',
                    data: velocidades,
                    backgroundColor: '#42A5F5',
                },
            ],
        };
    }
    dataPuntosRecoleccion: any | undefined;
    // En tu componente .ts 3
    generarPuntosRecoleccion() {
        const recolectores = this.datosRecolectores.map((d) => d.deviceId);
        const puntos = this.datosRecolectores.map(
            (d) => d.puntos_recoleccion.filter((e) => e.retorno == false).length
        );

        this.dataPuntosRecoleccion = {
            labels: recolectores,
            datasets: [
                {
                    label: 'Puntos de Recolección',
                    data: puntos,
                    backgroundColor: '#FF7043',
                },
            ],
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
    generarCapacidadRetorno() {
        this.tabla_info.forEach((item) => {
            this.mapaCapacidades.set(item.id, item.capacidad);
        });
        console.log(this.mapaCapacidades);
        const recolectores = this.datosRecolectores.map((d) => d.deviceId);
        console.log(recolectores);
        const capacidades = this.datosRecolectores.map((d) => {
            const capacidadReal =
                this.mapaCapacidades.get(parseInt(d.deviceId)) || 0;
            const capacidadRetorno = d.capacidad_retorno
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

            return capacidadRetorno;
        });

        this.dataCapacidadRetorno = {
            labels: recolectores,
            datasets: [
                {
                    label: 'Capacidad de Retorno',
                    data: capacidades,
                    backgroundColor: '#66BB6A',
                },
            ],
        };
        console.log(this.dataCapacidadRetorno);
    }

    dataDistanciaRecorrida: any | undefined;
    // En tu componente .ts 5
    generarDistanciaRecorrida() {
        // Paso 1: Preparar la estructura de datos inicial
        const distanciasPorFecha = {};
        const fechasSet = new Set();

        this.datosRecolectores.forEach((recolector) => {
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
                (fecha) => distanciasPorFecha[deviceId][fecha] || 0 // Usar 0 si no hay datos
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
        return ruta.reduce(
            (max, punto) => (punto.speed > max ? punto.speed : max),
            0
        );
    }
}
