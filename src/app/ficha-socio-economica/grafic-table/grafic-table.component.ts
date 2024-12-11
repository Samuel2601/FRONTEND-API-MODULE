import { moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, Input, OnInit } from '@angular/core';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ImportsModule } from 'src/app/demo/services/import';

@Component({
    selector: 'app-grafic-table',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './grafic-table.component.html',
    styleUrl: './grafic-table.component.scss',
})
export class GraficTableComponent implements OnInit {
    @Input() components_arr!: any;
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
        //console.log(this.components_arr);
        this.initChartOptions();
    }

    isMobil() {
        return this.helperService.isMobil();
    }
    chartOptions: any;
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

    onDrop(event: any, target: string) {
        console.log('Usando onDrop');
        console.log(event);

        // El índice del item arrastrado y el índice anterior
        const previousIndex = event.previousIndex;
        const currentIndex = event.currentIndex;

        // Realiza el reordenamiento directamente usando moveItemInArray
        if (previousIndex !== currentIndex) {
            // Mueve el item en el array desde previousIndex a currentIndex
            moveItemInArray(this.components_arr, previousIndex, currentIndex);
        }

        console.log(this.components_arr);
    }

}
