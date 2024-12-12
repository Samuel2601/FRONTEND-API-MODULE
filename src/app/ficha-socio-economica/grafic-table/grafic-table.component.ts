import { moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, Input, OnInit } from '@angular/core';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ImportsModule } from 'src/app/demo/services/import';
import { Chart, registerables } from 'chart.js';

// Registrar los plugins y componentes de Chart.js
Chart.register(...registerables);

@Component({
    selector: 'app-grafic-table',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './grafic-table.component.html',
    styleUrls: ['./grafic-table.component.scss'], // Cambié styleUrl a styleUrls
})
export class GraficTableComponent implements OnInit {
    @Input() components_arr!: any[];
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

    constructor(private helperService: HelperService) {}

    ngOnInit(): void {
        this.initChartOptions();
    }

    isMobil(): boolean {
        return this.helperService.isMobil();
    }

    chartOptions: any;

    initChartOptions(): void {
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

        const xAxisFloatingLabelsPlugin = {
            id: 'xAxisFloatingLabels',
            afterDraw: (chart: any) => {
                const ctx = chart.ctx;
                const xAxis = chart.scales.x;

                xAxis.ticks.forEach((tick: any, index: number) => {
                    const x = xAxis.getPixelForTick(index);
                    const y = xAxis.bottom;

                    // Draw marker for each tick
                    ctx.save();
                    ctx.fillStyle = 'blue';
                    ctx.beginPath();
                    ctx.arc(x, y + 5, 3, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.restore();
                });
            },
            afterEvent: (chart: any, args: any) => {
                const { event } = args;
                const xAxis = chart.scales.x;

                if (event.type === 'mousemove') {
                    const x = event.x;

                    xAxis.ticks.forEach((tick: any, index: number) => {
                        const tickX = xAxis.getPixelForTick(index);

                        if (Math.abs(tickX - x) < 5) {
                            const label = xAxis.ticks[index].label;

                            // Display floating label near the tick
                            const tooltipEl = document.getElementById(
                                'xAxis-floating-tooltip'
                            );
                            tooltipEl.innerHTML = `Label: ${label}`;
                            tooltipEl.style.left = `${tickX}px`;
                            tooltipEl.style.top = `${xAxis.bottom + 20}px`;
                            tooltipEl.style.opacity = '1';
                        }
                    });
                } else if (event.type === 'mouseout') {
                    const tooltipEl = document.getElementById(
                        'xAxis-floating-tooltip'
                    );
                    if (tooltipEl) tooltipEl.style.opacity = '0';
                }
            },
        };

        const floatingLabelsPlugin = {
            id: 'floatingLabels',
            afterEvent: (chart: any, args: any) => {
                console.log('Evento recibido:', args.event); // Verifica los eventos
                const { event } = args;
                const tooltipEl = document.getElementById(
                    'chartjs-floating-tooltip'
                );

                if (event.type === 'mousemove') {
                    const { x, y } = event;
                    const elements = chart.getElementsAtEventForMode(
                        event,
                        'nearest',
                        { intersect: true },
                        false
                    );

                    if (elements.length) {
                        const datasetIndex = elements[0].datasetIndex;
                        const index = elements[0].index;
                        const label = chart.data.labels[index];
                        const value =
                            chart.data.datasets[datasetIndex].data[index];

                        tooltipEl.innerHTML = `Label: ${label}<br>Value: ${value}`;
                        tooltipEl.style.left = `${x + 10}px`;
                        tooltipEl.style.top = `${y + 10}px`;
                        tooltipEl.style.opacity = '1';
                    } else {
                        tooltipEl.style.opacity = '0';
                    }
                } else if (event.type === 'mouseout') {
                    tooltipEl.style.opacity = '0';
                }
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
                floatingLabelsPlugin,
                xAxisFloatingLabelsPlugin,
                highlightMinMaxPlugin,
            },
        };

        // Configuraciones específicas para diferentes gráficos
        this.chartOptions = {
            line: {
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
                return 'danger';
        }
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

    onDrop(event: any, targetGroup: string, index: number): void {
        console.log('Usando onDrop');
        console.log(event);

        // Datos del ítem arrastrado
        const draggedItem = event.item.data;

        // El índice en el que se soltó el ítem (destino)
        const currentIndex = event.currentIndex;

        // Identificar si el arrastre fue dentro del mismo grupo o entre grupos
        const isSameGroup = event.previousContainer === event.container;

        if (isSameGroup) {
            // Movimiento dentro del mismo grupo
            console.log(
                `Movimiento dentro del grupo: ${targetGroup}`,
                index,
                targetGroup,
                this.components_arr[index].components
            );

            moveItemInArray(
                this.components_arr[index].components,
                event.previousIndex,
                currentIndex
            );
        }
    }
}
