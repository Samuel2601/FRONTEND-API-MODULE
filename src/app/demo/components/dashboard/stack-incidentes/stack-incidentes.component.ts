import { Component, Input, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Table } from 'primeng/table';
import { AuthService } from 'src/app/demo/services/auth.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';

@Component({
    selector: 'app-stack-incidentes',
    templateUrl: './stack-incidentes.component.html',
    styleUrl: './stack-incidentes.component.scss',
    providers: [MessageService],
})
export class StackIncidentesComponent implements OnInit {
    urlgeoser =
        'https://geoapi.esmeraldas.gob.ec/geoserver/catastro/wms?service=WFS&version=1.1.0&request=GetFeature&srsname=EPSG%3A4326&typeName=catastro%3Ageo_barrios&outputFormat=application%2Fjson';
    constructor(
        private messageService: MessageService,
        private helper: HelperService,
        private listar: ListService,
        private auth:AuthService
    ) {}
    token = this.auth.token();
    constIncidente: any = [];
    loading = true;

    basicData: any = {};
    basicOptions: any;
    optionsLine: any;
    isMobil() {
        return this.helper.isMobil();
    }
    async ngOnInit() {
        await this.getWFSgeojson(this.urlgeoser);
        if (this.valor && this.filtro) {
            await this.cargar();
        } else {
            await this.rankin();
        }
        this.sumaValores = this.calcularSumaValores();
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue(
            '--text-color-secondary'
        );
        const surfaceBorder =
            documentStyle.getPropertyValue('--surface-border');

        this.optionsLine = {
            maintainAspectRatio: false,
            aspectRatio: 0.6,
            plugins: {
                legend: {
                    labels: {
                        color: textColor,
                    },
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary,
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false,
                    },
                },
                y: {
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

    labelsmobil: any = [];
    async rankin() {
        this.loading = true;
        // Obtener todos los incidentes si aún no se han cargado
        if (this.constIncidente.length === 0) {
            try {
                const response: any = await this.listar
                    .listarIncidentesDenuncias(this.token)
                    .toPromise();
                if (response.data) {
                    this.constIncidente = response.data;
                }
            } catch (error) {
                //console.error('Error al obtener incidentes:', error);
                this.loading = false;
                return;
            }
        }
        // Obtener valores únicos de categoria.nombre
        const categoriasUnicas = [
            ...new Set(
                this.constIncidente.map(
                    (incidente: any) => incidente.categoria.nombre
                )
            ),
        ];
        const barriosUnicos = [
            ...new Set(
                this.constIncidente.map(
                    (incidente: any) => incidente.estado.nombre
                )
            ),
        ];

        const datasets = barriosUnicos.map((elementbarr: any) => {
            const incidentesPorDireccion = this.constIncidente.filter(
                (incidente: any) => incidente.estado.nombre === elementbarr
            );
            const data = categoriasUnicas.map((elementcat: any) => {
                return incidentesPorDireccion.reduce(
                    (acc: any, incidente: any) => {
                        const nombreCategoria = elementcat;
                        if (incidente.categoria.nombre === nombreCategoria) {
                            acc++;
                        }
                        return acc;
                    },
                    0
                );
            });
            return {
                data,
                label: elementbarr,
                tension: 0.4,
                borderWidth: 2,
                fill: true,
                type: 'bar',
            };
        });
        ////console.log("datasets",datasets);

        this.basicData.datasets = datasets.flat(); // Utiliza flat para aplanar el arreglo de arreglos
        if (this.modal) {
            this.labelsmobil = categoriasUnicas;
            let auxlabel: any = [];
            this.labelsmobil.forEach((element: any, index: any) => {
                auxlabel.push((index + 1).toString());
            });
            this.basicData.labels = auxlabel;
        } else {
            this.basicData.labels = categoriasUnicas;
        }
        // Actualizar la vista
        this.canvas();
        this.sumaValores = this.calcularSumaValores();
        ////console.log(this.encontrarMaximo());
        this.loading = false;
        this.helper.setStincidenteComponent(this);
    }
    encontrarMaximo(): { label: string; valor: number } {
        let maximoValor = 0;
        let maximoLabel = '';
        // Obtener todos los valores de los datasets combinados en un solo array
        // Obtener la suma de los valores de los datasets
        const sumaValores =
            this.basicData.datasets.length > 1
                ? this.basicData.datasets.reduce(
                      (acc: number[], dataset: any) => {
                          dataset.data.forEach(
                              (valor: number, index: number) => {
                                  acc[index] = (acc[index] || 0) + valor;
                              }
                          );
                          return acc;
                      },
                      []
                  )
                : this.basicData.datasets[0];

        // Encontrar el valor máximo y su correspondiente label
        sumaValores.forEach((valor: number, index: number) => {
            if (valor > maximoValor) {
                maximoValor = valor;
                maximoLabel = this.basicData.labels[index];
            }
        });

        return {
            label: this.labelsmobil[parseInt(maximoLabel) - 1],
            valor: maximoValor,
        };
    }
    sumaValores: number[] = [];
    calcularSumaValores(): number[] {
        ////console.log("Sumar valores",this.basicData);
        return this.basicData.datasets.reduce((acc: number[], dataset: any) => {
            dataset.data.forEach((valor: number, index: number) => {
                acc[index] = (acc[index] || 0) + valor;
            });
            return acc;
        }, []);
    }
    getTotales(arreglo:any){
        let total=0;
        arreglo.forEach((element:number) => {
            total+=element;
        });
        return total;
    }


    @Input() filtro: string | undefined;
    @Input() valor: number | undefined;
    @Input() modal: any = false;
    async cargar() {
        this.loading = true;
        // Obtener todos los incidentes si aún no se han cargado
        if (this.constIncidente.length === 0) {
            try {
                const fil = {
                    [this.filtro]: this.valor
                };
                
                const response: any = await this.listar
                    .listarIncidentesDenuncias(
                        this.token,
                        fil
                    )
                    .toPromise();
                if (response.data) {
                    this.constIncidente = response.data;
                }
            } catch (error) {
                ////console.error('Error al obtener incidentes:', error);
                this.loading = false;
                return;
            }
        }
        ////console.log(this.constIncidente);
        // Obtener valores únicos de categoria.nombre
        const categoriasUnicas = [
            ...new Set(
                this.constIncidente.map(
                    (incidente: any) => incidente.categoria.nombre
                )
            ),
        ];
        const barriosUnicos = [
            ...new Set(
                this.constIncidente.map(
                    (incidente: any) => incidente.estado.nombre
                )
            ),
        ];

        const datasets = barriosUnicos.map((elementbarr: any) => {
            const incidentesPorDireccion = this.constIncidente.filter(
                (incidente: any) => incidente.estado.nombre === elementbarr
            );
            const data = categoriasUnicas.map((elementcat: any) => {
                return incidentesPorDireccion.reduce(
                    (acc: any, incidente: any) => {
                        const nombreCategoria = elementcat;
                        if (incidente.categoria.nombre === nombreCategoria) {
                            acc++;
                        }
                        return acc;
                    },
                    0
                );
            });
            return {
                data,
                label: elementbarr,
                backgroundColor: this.modal
                    ? [
                          getComputedStyle(
                              document.documentElement
                          ).getPropertyValue('--blue-500'),
                          getComputedStyle(
                              document.documentElement
                          ).getPropertyValue('--green-500'),
                          getComputedStyle(
                              document.documentElement
                          ).getPropertyValue('--yellow-500'),
                          getComputedStyle(
                              document.documentElement
                          ).getPropertyValue('--cyan-500'),
                          getComputedStyle(
                              document.documentElement
                          ).getPropertyValue('--pink-500'),
                          getComputedStyle(
                              document.documentElement
                          ).getPropertyValue('--indigo-500'),
                          getComputedStyle(
                              document.documentElement
                          ).getPropertyValue('--teal-500'),
                          getComputedStyle(
                              document.documentElement
                          ).getPropertyValue('--orange-500'),
                          getComputedStyle(
                              document.documentElement
                          ).getPropertyValue('--bluegray-500'),
                          getComputedStyle(
                              document.documentElement
                          ).getPropertyValue('--purple-500'),
                          getComputedStyle(
                              document.documentElement
                          ).getPropertyValue('--red-500'),
                      ]
                    : undefined,
                borderWidth: 1,
                type: 'bar',
            };
        });
        ////console.log("datasets",datasets);

        this.basicData.datasets = datasets.flat(); // Utiliza flat para aplanar el arreglo de arreglos

        if (this.modal) {
            this.labelsmobil = categoriasUnicas;
            let auxlabel: any = [];
            this.labelsmobil.forEach((element: any, index: any) => {
                auxlabel.push((index + 1).toString());
            });
            this.basicData.labels = auxlabel;
        } else {
            this.basicData.labels = categoriasUnicas;
        }
        ////console.log(this.basicData);
        // Actualizar la vista
        this.canvas();

        this.loading = false;
    }
    getBackgroundColor(index: number): string {
        switch (index) {
            case 0:
                return getComputedStyle(
                    document.documentElement
                ).getPropertyValue('--blue-500');
            case 1:
                return getComputedStyle(
                    document.documentElement
                ).getPropertyValue('--green-500');
            case 2:
                return getComputedStyle(
                    document.documentElement
                ).getPropertyValue('--yellow-500');
            case 3:
                return getComputedStyle(
                    document.documentElement
                ).getPropertyValue('--cyan-500');
            case 4:
                return getComputedStyle(
                    document.documentElement
                ).getPropertyValue('--pink-500');
            case 5:
                return getComputedStyle(
                    document.documentElement
                ).getPropertyValue('--indigo-500');
            case 6:
                return getComputedStyle(
                    document.documentElement
                ).getPropertyValue('--teal-500');
            case 7:
                return getComputedStyle(
                    document.documentElement
                ).getPropertyValue('--orange-500');
            case 8:
                return getComputedStyle(
                    document.documentElement
                ).getPropertyValue('--bluegray-500');
            case 9:
                return getComputedStyle(
                    document.documentElement
                ).getPropertyValue('--purple-500');
            case 10:
                return getComputedStyle(
                    document.documentElement
                ).getPropertyValue('--red-500');
            default:
                return '';
        }
    }

    options: any;

    canvas() {
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

        this.options = {
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
}
