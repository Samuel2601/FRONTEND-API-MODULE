import { moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, Input, OnInit, inject } from '@angular/core';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ImportsModule } from 'src/app/demo/services/import';
import { Chart, registerables, ChartConfiguration, ChartType } from 'chart.js';

import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Registrar los plugins y componentes de Chart.js
Chart.register(...registerables);

interface ComponentData {
    title: string;
    key: string;
    chart: any;
    table: any[];
    columnOrder: string[];
}

interface GroupData {
    title: string;
    components: ComponentData[];
}

@Component({
    selector: 'app-grafic-table',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './grafic-table.component.html',
    styleUrl: './grafic-table.component.scss', // Cambié styleUrls a styleUrl
})
export class GraficTableComponent implements OnInit {
    @Input() components_arr!: GroupData[];

    // Inject services using new Angular syntax
    private helperService = inject(HelperService);

    // Define el objeto
    showChart: { [key: string]: boolean } = {};
    layout: 'grid' | 'list' = this.isMobil() ? 'list' : 'grid';

    layoutOptions = [
        { label: 'Grid', value: 'grid' },
        { label: 'List', value: 'list' },
    ];

    chartOptions: { [key: string]: ChartConfiguration['options'] } = {};

    ngOnInit(): void {
        this.initChartOptions();
    }

    onLayoutChange(event: any): void {
        this.layout = event.value;
    }

    isMobil(): boolean {
        return this.helperService.isMobil();
    }

    initChartOptions(): void {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor =
            documentStyle.getPropertyValue('--text-color') || '#495057';
        const surfaceBorder =
            documentStyle.getPropertyValue('--surface-border') || '#ddd';

        // Formateador de números localizado
        const numberFormatter = new Intl.NumberFormat('es-ES', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });

        // Callback para formatear valores
        const formatValueCallback = (value: number | string): string =>
            numberFormatter.format(Number(value));

        // Plugin personalizado para resaltar valores máximos y mínimos
        /*const highlightMinMaxPlugin = {
            id: 'highlightMinMax',
            afterDraw: (chart: any) => {
                const ctx = chart.ctx;
                chart.data.datasets.forEach(
                    (dataset: any, datasetIndex: number) => {
                        const meta = chart.getDatasetMeta(datasetIndex);
                        const numericData = dataset.data
                            .map((d: any) => Number(d))
                            .filter((d: number) => !isNaN(d));

                        if (numericData.length === 0) return;

                        const min = Math.min(...numericData);
                        const max = Math.max(...numericData);

                        meta.data.forEach((datapoint: any, index: number) => {
                            const value = Number(dataset.data[index]);
                            if (value === min || value === max) {
                                ctx.save();
                                ctx.fillStyle =
                                    value === max ? '#ff6b6b' : '#4ecdc4';
                                ctx.beginPath();
                                const position = datapoint.tooltipPosition
                                    ? datapoint.tooltipPosition()
                                    : { x: datapoint.x, y: datapoint.y };
                                ctx.arc(
                                    position.x,
                                    position.y,
                                    5,
                                    0,
                                    2 * Math.PI
                                );
                                ctx.fill();
                                ctx.restore();
                            }
                        });
                    }
                );
            },
        };

        // Plugin para etiquetas flotantes en el eje X
        const xAxisFloatingLabelsPlugin = {
            id: 'xAxisFloatingLabels',
            afterDraw: (chart: any) => {
                const ctx = chart.ctx;
                const xAxis = chart.scales.x;

                if (!xAxis || !xAxis.ticks) return;

                xAxis.ticks.forEach((tick: any, index: number) => {
                    const x = xAxis.getPixelForTick(index);
                    const y = xAxis.bottom;

                    // Draw marker for each tick
                    ctx.save();
                    ctx.fillStyle = '#007ad9';
                    ctx.beginPath();
                    ctx.arc(x, y + 5, 3, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.restore();store();
        });   afterEvent: (            afterEvent: (chart: any, args: any) => {
                const { event } = args;
                const xAxis = chart.scales.x;

                if (!xAxis || !xAxis.ticks) return;

                const tooltipEl = document.getElementById(
                    'xAxis-floating-tooltip'
                );
                if (!tooltipEl) return;

                if (event.type === 'mousemove') {
                    const x = event.x;
                    let found = false;

                    xAxis.ticks.forEach((tick: any, index: number) => {
                        const tickX = xAxis.getPixelForTick(index);

                        if (Math.abs(tickX - x) < 10) {
                            const label =
                                xAxis.ticks[index]?.label ||
                                chart.data.labels[index];
                            tooltipEl.innerHTML = `Etiqueta: ${label}`;
                            tooltipEl.style.left = `${tickX}px`;
                            tooltipEl.style.top = `${xAxis.bottom + 20}px`;
                            tooltipEl.style.opacity = '1';
                            found = true;
                        }
                    });
                   ifif (!found) {        tooltipEl        tooltipEl.style.opacity = '0';tyle.opacity = '0';
                    }
                } else if (event.type === 'mouseout') {
                    tooltipEl.style.opacity = '0';
                }
            },
        };

        // Plugin para etiquetas flotantes
        const floatingLabelsPlugin = {
            id: 'floatingLabels',
            afterEvent: (chart: any, args: any) => {
                const { event } = args;
                const tooltipEl = document.getElementById(
                    'chartjs-floating-tooltip'
                );

                if (!tooltipEl) return;

                if (event.type === 'mousemove') {
                    const { x, y } = event;
                    const elements = chart.getElementsAtEventForMode(
                        event,
                        'nearest',
                        { intersect: true },
                        false
                    );

                    if (elements.length > 0) {
                        const datasetIndex = elements[0].datasetIndex;
                        const index = elements[0].index;
                        const label = chart.data.labels[index];
                        const value =
                            chart.data.datasets[datasetIndex].data[index];

                        tooltipEl.innerHTML = `Etiqueta: ${label}<br>Valor: ${formatValueCallback(
                            value
                        )}`;
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
        };*/

        // Configuración base de gráficos
        const baseChartOptions: ChartConfiguration['options'] = {
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
                            `Valor: ${formatValueCallback(context.raw)}`,
                    },
                },
            },
        };

        // Configuraciones específicas para diferentes gráficos
        this.chartOptions = {
            line: {
                ...baseChartOptions,
                scales: {
                    x: {
                        ticks: {
                            color: textColor,
                            font: { size: 12 },
                        },
                        grid: { color: surfaceBorder },
                    },
                    y: {
                        ticks: {
                            color: textColor,
                            font: { size: 12 },
                            callback: function (value: any) {
                                return formatValueCallback(value);
                            },
                        },
                        grid: { color: surfaceBorder },
                    },
                },
                plugins: {
                    ...baseChartOptions.plugins,
                },
            },
            bar: {
                ...baseChartOptions,
                scales: {
                    x: {
                        ticks: {
                            color: textColor,
                            font: { size: 12 },
                        },
                        grid: { color: surfaceBorder },
                    },
                    y: {
                        ticks: {
                            color: textColor,
                            font: { size: 12 },
                            callback: function (value: any) {
                                return formatValueCallback(value);
                            },
                        },
                        grid: { color: surfaceBorder },
                    },
                },
                plugins: {
                    ...baseChartOptions.plugins,
                },
            },
            pie: {
                ...baseChartOptions,
                plugins: {
                    ...baseChartOptions.plugins,
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            color: textColor,
                            font: { size: 14 },
                        },
                    },
                },
            },
            doughnut: {
                ...baseChartOptions,
                plugins: {
                    ...baseChartOptions.plugins,
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            color: textColor,
                            font: { size: 14 },
                        },
                    },
                },
            },
            stacked: {
                ...baseChartOptions,
                scales: {
                    x: {
                        ticks: {
                            color: textColor,
                            font: { size: 12 },
                        },
                        grid: { color: surfaceBorder },
                        stacked: true,
                    },
                    y: {
                        ticks: {
                            color: textColor,
                            font: { size: 12 },
                            callback: function (value: any) {
                                return formatValueCallback(value);
                            },
                        },
                        grid: { color: surfaceBorder },
                        stacked: true,
                    },
                },
                plugins: {
                    ...baseChartOptions.plugins,
                    tooltip: {
                        ...baseChartOptions.plugins?.tooltip,
                        callbacks: {
                            label: (context: any) => {
                                const datasetLabel =
                                    context.dataset.label || 'Sin etiqueta';
                                const value = context.raw;
                                return `${datasetLabel}: ${formatValueCallback(
                                    value
                                )}`;
                            },
                        },
                    },
                },
            },
            doubleAxis: {
                ...baseChartOptions,
                scales: {
                    x: {
                        ticks: {
                            color: textColor,
                            font: { size: 12 },
                        },
                        grid: { color: surfaceBorder },
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        ticks: {
                            color: textColor,
                            font: { size: 12 },
                            callback: function (value: any) {
                                return formatValueCallback(value);
                            },
                        },
                        grid: { color: surfaceBorder },
                    },
                    y2: {
                        type: 'linear',
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: {
                            color: textColor,
                            font: { size: 12 },
                            callback: function (value: any) {
                                return formatValueCallback(value);
                            },
                        },
                    },
                },
            },
        };
    }

    getSeverity(product: string): 'success' | 'info' | 'danger' | 'contrast' {
        switch (product) {
            case 'Tabla':
                return 'success';
            case 'Gráfico':
                return 'info';
            case 'OUTOFSTOCK':
                return 'danger';
            default:
                return 'contrast';
        }
    }

    getTotalRegistros(data: any[], columnOrder: string): number {
        if (!data || !columnOrder) {
            console.error('Data or columnOrder is missing');
            return 0;
        }

        const total = data.reduce((acc, item) => {
            const value = parseFloat(item[columnOrder]) || 0;
            return acc + value;
        }, 0);

        return total;
    }

    onDrop(
        event: CdkDragDrop<ComponentData[]>,
        targetGroup: string,
        index: number
    ): void {
        console.log('Usando onDrop');
        console.log(event);

        // Identificar si el arrastre fue dentro del mismo contenedor
        if (event.previousContainer === event.container) {
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
                event.currentIndex
            );
        } else {
            // Movimiento entre diferentes grupos
            // Esto requeriría lógica adicional para mover entre contenedores
            console.log('Movimiento entre grupos no implementado');
        }
    }

    async exportExcel(index: number): Promise<void> {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Datos');

            // Obtener el componente específico
            const component = this.components_arr[0]?.components[index];

            if (!component?.table || !Array.isArray(component.table)) {
                console.error('No hay datos para exportar');
                return;
            }

            // Configurar los estilos
            const headerStyle: Partial<ExcelJS.Style> = {
                font: { bold: true, color: { argb: 'FFFFFF' } },
                fill: {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: '4472C4' },
                },
                alignment: { horizontal: 'center', vertical: 'middle' },
            };

            const totalStyle: Partial<ExcelJS.Style> = {
                font: { bold: true },
                fill: {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'D9E1F2' },
                },
                alignment: { horizontal: 'center' },
            };

            // Agregar el título del componente
            const titleRow = worksheet.addRow([component.title]);
            titleRow.eachCell((cell) => {
                cell.font = { bold: true, size: 14 };
            });
            worksheet.addRow([]); // Espacio en blanco

            // Agregar encabezados
            const headerRow = worksheet.addRow(component.columnOrder);
            headerRow.eachCell((cell) => {
                cell.style = headerStyle;
            });

            // Agregar datos
            component.table.forEach((row: any) => {
                const rowData = component.columnOrder.map(
                    (col: string) => row[col] || ''
                );
                const dataRow = worksheet.addRow(rowData);
                dataRow.eachCell((cell) => {
                    cell.alignment = { horizontal: 'center' };
                });
            });

            // Agregar fila de totales
            const totalCells = component.columnOrder.map(
                (col: string, i: number) => {
                    if (i === 0) return 'Total';
                    if (col === 'Conteo') {
                        return component.table.reduce(
                            (sum: number, row: any) =>
                                sum + (Number(row[col]) || 0),
                            0
                        );
                    }
                    if (col === 'Porcentaje') return '100%';
                    return '';
                }
            );

            const totalsRow = worksheet.addRow(totalCells);
            totalsRow.eachCell((cell) => {
                cell.style = totalStyle;
            });

            // Ajustar el ancho de las columnas
            worksheet.columns.forEach((column) => {
                if (column) {
                    column.width = 20;
                }
            });

            // Generar y descargar el archivo
            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = `${component.title}_${
                new Date().toISOString().split('T')[0]
            }.xlsx`;

            saveAs(
                new Blob([buffer], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                }),
                fileName
            );
        } catch (error) {
            console.error('Error al generar el archivo Excel:', error);
        }
    }
}
