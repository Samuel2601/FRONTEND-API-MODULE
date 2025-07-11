﻿import { Component, Input, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Table } from 'primeng/table';
import { AuthService } from 'src/app/demo/services/auth.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';

@Component({
    standalone: false,
    selector: 'app-stackbarrioficha',
    templateUrl: './stackbarrioficha.component.html',
    styleUrl: './stackbarrioficha.component.scss',
    providers: [MessageService],
})
export class StackbarriofichaComponent {
    urlgeoser =
        'https://geoapi.esmeraldas.gob.ec/geoserver/catastro/wms?service=WFS&version=1.1.0&request=GetFeature&srsname=EPSG%3A4326&typeName=catastro%3Ageo_barrios&outputFormat=application%2Fjson';
    constructor(
        private messageService: MessageService,
        private helper: HelperService,
        private listar: ListService,
        private auth: AuthService
    ) {}

    @Input() modal: any = false;
    basicData: any = {};
    basicOptions: any;
    async ngOnInit() {
        await this.getWFSgeojson(this.urlgeoser);
        this.rankin();
    }
    token = this.auth.token();
    constFicha: any = [];
    loading = true;
    longLabels: any[] = [];
    async rankin() {
        this.loading = true;
        // Obtener todos los incidentes si aún no se han cargado
        if (this.constFicha.length === 0) {
            try {
                const response: any = await this.listar
                    .listarFichaSectorial(this.token)
                    .toPromise();
                if (response.data) {
                    this.constFicha = response.data;
                }
            } catch (error) {
                //console.error('Error al obtener incidentes:', error);
                this.loading = false;
                return;
            }
        }
        // Agrupar y contar los incidentes por nombre de dirección
        const incidentesPorDireccion = this.constFicha.reduce(
            (acc: any, incidente: any) => {
                let nombreDireccion: string;

                // Verifica si `direccion_geo` es un string o un objeto
                if (typeof incidente.direccion_geo === 'string') {
                    try {
                        // Intenta parsear el string como JSON
                        const parsedDireccion = JSON.parse(
                            incidente.direccion_geo
                        );

                        // Si el parseo tiene éxito y tiene la propiedad `nombre`, úsala
                        nombreDireccion =
                            parsedDireccion.nombre || incidente.direccion_geo;
                    } catch (e) {
                        // Si no se puede parsear, asumimos que es un string plano y lo usamos
                        nombreDireccion = incidente.direccion_geo;
                    }
                } else if (typeof incidente.direccion_geo === 'object') {
                    // Si ya es un objeto, simplemente accede a la propiedad `nombre`
                    nombreDireccion = incidente.direccion_geo.nombre;
                }

                // Suma la incidencia en `acc` para la dirección correspondiente
                acc[nombreDireccion] = acc[nombreDireccion]
                    ? acc[nombreDireccion] + 1
                    : 1;

                return acc;
            },
            {}
        );
        // Ordenar las direcciones por cantidad de incidentes (de mayor a menor)
        const direccionesOrdenadas = Object.entries(incidentesPorDireccion)
            .sort((a: any, b: any) => b[1] - a[1])
            .map(([nombre]) => nombre);

        // Crear el dataset para basicData
        const dataset = {
            data: Object.values(incidentesPorDireccion).sort(
                (a: number, b: number) => b - a
            ),
            backgroundColor: [],
            borderColor: [],
            hoverBackgroundColor: [],
            label: 'Ficha Sectorial',
            borderWidth: 1,
        };
        const documentStyle = getComputedStyle(document.documentElement);
        dataset.data.forEach((element) => {
            const color = this.generarColor();
            dataset.backgroundColor.push(
                documentStyle.getPropertyValue(color + '-300')
            );
            dataset.borderColor.push(
                documentStyle.getPropertyValue(color + '-500')
            );
            dataset.hoverBackgroundColor.push(
                documentStyle.getPropertyValue(color + '-700')
            );
        });

        // Actualizar basicData con los datos ordenados
        this.basicData.datasets = [dataset];

        //console.log(this.basicData);
        // Actualizar la vista
        this.canvas();
        ////console.log(this.encontrarMaximo());
        this.loading = false;
        this.helper.setStbarrioficha(this);

        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue(
            '--text-color-secondary'
        );
        const surfaceBorder =
            documentStyle.getPropertyValue('--surface-border');

        this.longLabels = direccionesOrdenadas;
        const longLabels = this.longLabels;
        const indices = this.longLabels.map((_, index) => index + 1);
        this.basicData.labels = indices; //direccionesOrdenadas;
        this.optionsbar = {
            maintainAspectRatio: false,
            aspectRatio: 0.8,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function (context) {
                            // Muestra el label largo en el tooltip
                            const index = context.dataIndex;
                            return (
                                longLabels[index] + ': ' + dataset.data[index]
                            );
                        },
                    },
                },
                legend: {
                    labels: {
                        color: textColor,
                    },
                },
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        color: textColorSecondary,
                        callback: function (value, index) {
                            // Muestra el índice en el eje x
                            return indices[index];
                        },
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false,
                    },
                },
                y: {
                    stacked: true,
                    ticks: {
                        color: textColorSecondary,
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false,
                    },
                },
            },
        };
    }
    colorIndex: number = 0;
    generarColor(): string {
        const colores = [
            'green',
            'blue',
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
        }

        const colorElegido = colores[this.colorIndex];

        this.colorIndex++;
        if (this.colorIndex >= colores.length) {
            this.colorIndex = 0;
        }

        const color = `--${colorElegido}`;
        return color;
    }
    encontrarMaximo(): { label: string; valor: number } {
        let maximoValor = 0;
        let maximoLabel = '';
        let indexmax = -1;
        // Obtener todos los valores de los datasets combinados en un solo array
        // Obtener la suma de los valores de los datasets
        const sumaValores = this.basicData.datasets[0].data;

        // Encontrar el valor máximo y su correspondiente label
        sumaValores.forEach((valor: number, index: number) => {
            if (valor > maximoValor) {
                maximoValor = valor;
                maximoLabel = this.basicData.labels[index];
                indexmax = index;
            }
        });
        return { label: this.longLabels[indexmax], valor: maximoValor };
    }
    getTotales(arreglo: any) {
        let total = 0;
        arreglo.forEach((element: number) => {
            total += element;
        });
        return total;
    }

    async cargar() {
        this.loading = true;
        let aux = [];
        let axu2: any[] = [];
        for (const element of this.currentData) {
            if (element.properties.nombre) {
                axu2.push(element.properties.nombre);
                let ci = this.constFicha?.filter((element2: any) => {
                    if (
                        element2.direccion_geo &&
                        element.properties &&
                        element.properties.nombre
                    ) {
                        return (
                            element2.direccion_geo == element.properties.nombre
                        );
                    } else {
                        return false;
                    }
                });
                if (ci.length != 0) {
                    aux.push(ci.length);
                } else {
                    const response: any = await this.listar
                        .listarFichaSectorial(
                            this.token,
                            'direccion_geo',
                            element.properties.nombre
                        )
                        .toPromise();
                    if (response.data) {
                        aux.push(response.data.length);
                        this.constFicha.push(...response.data);
                    }
                }
            }
        }

        const dataset = {
            data: Object.values(aux),
            label: 'Incidentes o Denuncias',
            borderWidth: 1,
        };
        this.basicData.datasets = [dataset];
        this.basicData.labels = axu2;
        this.canvas();
        this.loading = false;
    }
    optionspie: any;
    optionsbar: any;
    canvas() {
        ////console.log(this.constFicha);
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue(
            '--text-color-secondary'
        );
        const surfaceBorder =
            documentStyle.getPropertyValue('--surface-border');
        this.basicOptions = {
            plugins: {
                legend: {
                    labels: {
                        color: textColor,
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColorSecondary,
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false,
                    },
                },
                x: {
                    ticks: {
                        color: textColorSecondary,
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false,
                    },
                },
            },
        };
        this.optionsbar = {
            maintainAspectRatio: false,
            aspectRatio: 0.8,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                },
                legend: {
                    labels: {
                        color: textColor,
                    },
                },
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        color: textColorSecondary,
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false,
                    },
                },
                y: {
                    stacked: true,
                    ticks: {
                        color: textColorSecondary,
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false,
                    },
                },
            },
        };
        this.optionspie = {
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        color: textColor,
                    },
                },
            },
        };
    }

    lista_feature = [];
    async getWFSgeojson(url: any) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            var aux = [];
            aux.push(data.features);
            this.lista_feature = aux[0];
            this.lista_feature = this.lista_feature.filter((element: any) => {
                return element.properties.nombre;
            });
            return data;
        } catch (error) {
            this.messageService.add({
                severity: 'error',
                summary: 'File Uploaded',
                detail: 'Sin Conexión a Geoserver',
            });
            return null;
        }
    }

    // Variable para almacenar los datos actuales a mostrar en el canvas
    currentData: any[] = [];

    // Índice del primer elemento del conjunto actual en la lista
    currentIndex = 0;

    async previoDataFeature() {
        // Verificar que haya elementos anteriores para mostrar
        if (this.currentIndex >= 5) {
            this.currentIndex -= 5;
            this.updateCurrentData();
        }
    }

    async dataFeature() {
        // Mostrar los datos actuales
        this.currentIndex = 0;
        this.updateCurrentData();
    }

    async postDataFeature() {
        // Verificar que haya elementos posteriores para mostrar
        if (this.currentIndex + 5 < this.lista_feature.length) {
            this.currentIndex += 5;
            this.updateCurrentData();
        }
    }

    updateCurrentData() {
        this.currentData = this.lista_feature.slice(
            this.currentIndex,
            this.currentIndex + 5
        );
        this.cargar();
    }

    clear(table: Table) {
        table.clear();
    }

    getSeverity(
        status: string
    ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
        switch (status.toLowerCase()) {
            case 'suspendido':
                return 'danger';

            case 'finalizado':
                return 'success';

            case 'en proceso':
                return 'info';

            case 'pendiente':
                return 'warn';

            case 'planificada':
                return 'info';

            default:
                return 'secondary'; // Asegúrate de retornar un valor válido por defecto
        }
    }
}
