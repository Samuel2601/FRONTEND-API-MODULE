import { Component, OnInit } from '@angular/core';
import { RegistroService } from '../services/registro.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { ImportsModule } from 'src/app/demo/services/import';
import { forkJoin, lastValueFrom, Observable } from 'rxjs';
import { format } from 'date-fns'; // Asegúrate de tener instalada date-fns si la usas
import { HelperService } from 'src/app/demo/services/helper.service';
import { GraficTableComponent } from '../grafic-table/grafic-table.component';
import { SearchComponent } from '../search/search.component';
import { DialogService } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [ImportsModule, GraficTableComponent, SearchComponent],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss',
    providers: [DialogService],
})
export class DashboardComponent implements OnInit {
    view_filter: boolean = false;

    surveyorData: any = { labels: [], datasets: [] };
    timelineData: any = { labels: [], datasets: [] };
    hourlyData: any = { labels: [], datasets: [] };
    hourlyDataConectividad: any = { labels: [], datasets: [] };
    tableData: any[] = [];

    personalData: any = { total: 0 };
    nationalityData: any = { labels: [], datasets: [] };
    ageRangeData: any = { labels: [], datasets: [] };

    ubicacionData: any = {};
    saludData: any = {};
    viviendaData: any = {};
    redesDeApoyoData: any = {};
    historicoData: any = { total: 0, total_filtered: 0 };
    generalData: any = { total: 0 };
    loadData: boolean = false;

    chartOptions: any;

    colors: any[] = [
        '#42A5F5',
        '#66BB6A',
        '#FFA726',
        '#AB47BC',
        '#FF7043',
        '#29B6F6',
        '#FFCA28',
        '#26A69A',
        '#8D6E63',
        '#78909C',
        '#5C6BC0',
        '#EF5350',
        '#EC407A',
        '#7E57C2',
        '#42A5F5',
        '#FFEE58',
        '#8E24AA',
        '#BDBDBD',
        '#FF6F00',
        '#00ACC1',
    ];

    constructor(
        private registroService: RegistroService,
        private helperService: HelperService
    ) {}

    loading: boolean = true;

    statusList: any[] = [];
    async ngOnInit() {
        try {
            this.loading = true;
            await this.fetchDataAsync();

            const dataMap = {
                salud: this.saludData,
                vivienda: this.viviendaData,
                redes: this.redesDeApoyoData,
            };

            this.statusList = Object.entries(dataMap).flatMap(([id, data]) => {
                if (
                    !data?.components_arr?.[0]?.components ||
                    data.components_arr[0].components.length === 0
                ) {
                    return [];
                }

                return [
                    data.components_arr
                        .map((components: any, index: number) => {
                            const component = components.components[0];
                            if (
                                !component?.table?.[0] ||
                                !component?.columnOrder?.[0]
                            ) {
                                return null;
                            }

                            const state =
                                component.table[0][component.columnOrder[0]];
                            const value = parseFloat(
                                component.table[0].Porcentaje
                            );

                            return {
                                id: `${component.title}`,
                                componentIndex: index,
                                value,
                                state,
                                ...this.getStyleProperties(state),
                            };
                        })
                        .filter((item: any) => item !== null),
                ];
            });

            //  console.log(this.statusList);
        } catch (error) {
            console.error('Error fetching data:', error);
            // Handle error appropriately
        } finally {
            this.loading = false;
        }
    }

    private getStyleProperties(state: string): { color: string; icon: string } {
        const styleMap = {
            EXCELENTE: { color: '#4CAF50', icon: 'pi-face-smile' },
            BUENO: { color: '#4CAF50', icon: 'pi-thumbs-up' },
            FATAL: { color: '#F44336', icon: 'pi-thumbs-down' },
            REGULAR: { color: '#FFC107', icon: 'pi-exclamation-circle' },
            MALO: { color: '#FF5722', icon: 'pi-times-circle' },

            MALA_ALIMENTACION: { color: '#F44336', icon: 'pi-ban' }, // Rojo - Crítico para la salud
            ENTORNO: { color: '#4DB6AC', icon: 'pi-globe' }, // Turquesa - Factores ambientales
            NO_USO_MEDICAMENTO: { color: '#FF9800', icon: 'pi-prescription' }, // Naranja - Advertencia médica
            NO_ME_GUSTA_MEDICO: { color: '#9C27B0', icon: 'pi-user-minus' }, // Púrpura - Rechazo personal
            NO_RECURSOS_MEDICO: { color: '#F44336', icon: 'pi-dollar' }, // Rojo - Barrera económica crítica
            DISTANCIA_SUBCENTRO: { color: '#FF7043', icon: 'pi-map-marker' }, // Naranja rojizo - Problema de acceso

            RED_PUBLICA: { color: '#4CAF50', icon: 'pi-check-circle' },
            POZO_CIEGO: { color: '#FF9800', icon: 'pi-exclamation-triangle' },
            POZO_SEPTICO: { color: '#2196F3', icon: 'pi-info-circle' },
            RIO_CANAL: { color: '#F44336', icon: 'pi-times-circle' },
            NO_TIENE: { color: '#9E9E9E', icon: 'pi-minus-circle' },

            HORMIGON: { color: '#607D8B', icon: 'pi-home' }, // Gris azulado - Material durable
            CARTON: { color: '#795548', icon: 'pi-exclamation-triangle' }, // Marrón - Material frágil
            MIXTA: { color: '#673AB7', icon: 'pi-clone' }, // Púrpura - Combinación de materiales
            MADERA: { color: '#8D6E63', icon: 'pi-th-large' }, // Marrón claro - Material natural
            PLASTICO: { color: '#00BCD4', icon: 'pi-box' }, // Cyan - Material sintético
            CANA: { color: '#CDDC39', icon: 'pi-bars' }, // Verde lima - Material natural
            PLYWOOD: { color: '#FF5722', icon: 'pi-table' }, // Naranja oscuro - Material procesado
            ZINC: { color: '#78909C', icon: 'pi-shield' }, // Gris - Metal

            AGUA: { color: '#2196F3', icon: 'pi-tint' }, // Azul - Agua
            TELEFONO: { color: '#9C27B0', icon: 'pi-phone' }, // Púrpura - Telecomunicaciones
            CELULAR: { color: '#673AB7', icon: 'pi-mobile' }, // Violeta - Dispositivo móvil
            LUZ: { color: '#FFC107', icon: 'pi-bolt' }, // Amarillo - Electricidad
            ALCANTARILLADO: { color: '#795548', icon: 'pi-filter' }, // Marrón - Sistema de drenaje
            RECOLECCION_BASURA: { color: '#4CAF50', icon: 'pi-trash' }, // Verde - Gestión de residuos

            INTERNET: { color: '#2196F3', icon: 'pi-wifi' }, // Azul - Conectividad
            LAVADORA: { color: '#00BCD4', icon: 'pi-refresh' }, // Cyan - Lavado
            COCINA_GAS: { color: '#FF9800', icon: 'pi-fire' }, // Naranja - Gas
            COCINA: { color: '#FF7043', icon: 'pi-fire' }, // Naranja rojizo - Cocina general
            COCINA_INDUCCION: { color: '#E91E63', icon: 'pi-bolt' }, // Rosa - Inducción eléctrica
            TV: { color: '#3F51B5', icon: 'pi-tv' }, // Indigo - Televisión
            TV_CABLE: { color: '#673AB7', icon: 'pi-broadcast' }, // Violeta - TV Cable
            LAPTOP: { color: '#009688', icon: 'pi-laptop' }, // Verde azulado - Portátil
            REFRIGERADORA: { color: '#4CAF50', icon: 'pi-box' }, // Verde - Refrigerador
            COMPUTADORA: { color: '#607D8B', icon: 'pi-desktop' }, // Gris azulado - PC
            PLANCHA_ELECTRICA: { color: '#795548', icon: 'pi-tablet' }, // Marrón - Plancha
            MICROONDAS: { color: '#9C27B0', icon: 'pi-clock' }, // Púrpura - Microondas

            PROPIA: { color: '#4CAF50', icon: 'pi-home' }, // Verde - Propiedad establecida
            ALQUILADA: { color: '#2196F3', icon: 'pi-dollar' }, // Azul - Pago periódico
            PRESTADA: { color: '#FF9800', icon: 'pi-users' }, // Naranja - Préstamo temporal
            DONADA: { color: '#9C27B0', icon: 'pi-gift' }, // Púrpura - Regalo/donación
            INVADIDA: { color: '#F44336', icon: 'pi-exclamation-triangle' }, // Rojo - Situación irregular
            ABANDONADA: { color: '#9E9E9E', icon: 'pi-ban' }, // Gris - Desocupada

            DESLAVE: { color: '#795548', icon: 'pi-sort-amount-down-alt' }, // Marrón - Deslizamiento de tierra
            DEBORDAMIENTOS_RIO: { color: '#2196F3', icon: 'pi-arrows-h' }, // Azul - Agua desbordada
            INUNDACIONES: { color: '#1976D2', icon: 'pi-wave-pulse' }, // Azul oscuro - Inundación
            INCENDIOS: { color: '#F44336', icon: 'pi-fire' }, // Rojo - Fuego
            NO: { color: '#4CAF50', icon: 'pi-shield' }, // Gris - Sin riesgos

            IGLESIA: { color: '#673AB7', icon: 'pi-building' }, // Violeta - Institución religiosa
            'GRUPOS LGTBIQ': { color: '#E91E63', icon: 'pi-heart' }, // Rosa - Diversidad
            'COMITE BARRIAL': { color: '#4CAF50', icon: 'pi-home' }, // Verde - Comunidad local
            'CLUBES DEPORTIVOS': { color: '#FF9800', icon: 'pi-flag' }, // Naranja - Deporte
            'ASOCIACION DE MUJERES': { color: '#9C27B0', icon: 'pi-users' }, // Púrpura - Grupo mujeres
            'ASOCIACION JUVENIL': { color: '#2196F3', icon: 'pi-star' }, // Azul - Juventud
            'CLUB DE BARCO': { color: '#03A9F4', icon: 'pi-compass' }, // Azul claro - Náutico
            'CLUB DE POLICIA': { color: '#1976D2', icon: 'pi-shield' }, // Azul oscuro - Seguridad
            'CLUB DE ASESORIAS': { color: '#009688', icon: 'pi-book' }, // Verde azulado - Educación
            'CLUB DE ESTUDIANTES': {
                color: '#00BCD4',
                icon: 'pi-graduation-cap',
            }, // Cyan - Estudiantes
            OTROS: { color: '#9E9E9E', icon: 'pi-plus-circle' }, // Gris - Misceláneos
            'VECINO(A)S': { color: '#8BC34A', icon: 'pi-map-marker' }, // Verde claro - Vecindad
            'AMIGO(A)S': { color: '#FF5722', icon: 'pi-heart-fill' }, // Naranja rojizo - Amistad
            FAMILIA: { color: '#FFC107', icon: 'pi-home' }, // Amarillo - Familia
            ONG: { color: '#607D8B', icon: 'pi-globe' }, // Gris azulado - Global
            'INSTITUCIONES PÚBLICA': { color: '#3F51B5', icon: 'pi-building' }, // Indigo - Gobierno// Naranja rojizo - Instituciones Públicas

            'CALLES PAVIMENTADAS': { color: '#607D8B', icon: 'pi-truck' }, // Gris azulado - Vías
            'PRESENCIA POLICÍAL': { color: '#1976D2', icon: 'pi-shield' }, // Azul oscuro - Seguridad
            'AREAS VERDES': { color: '#4CAF50', icon: 'pi-tree' }, // Verde - Naturaleza
            'AGUA POTABLE': { color: '#2196F3', icon: 'pi-tint' }, // Azul - Agua
            ALCUNTARILLADO: { color: '#795548', icon: 'pi-filter' }, // Marrón - Sistema drenaje
            'ACTIVIDADES RECREATIVAS': { color: '#FF9800', icon: 'pi-users' }, // Naranja - Actividades grupales
            'ALUMBRADO PÚBLICO': { color: '#FFC107', icon: 'pi-bolt' }, // Amarillo - Iluminación
            'RECOLECCIÓN DE BASURA': { color: '#4DB6AC', icon: 'pi-trash' }, // Verde azulado - Gestión residuos
            'SUB-CENTRO DE SALUD': { color: '#E91E63', icon: 'pi-heart' }, // Rosa - Salud
        };

        return styleMap[state] || { color: '#4CAF50', icon: 'pi-bolt' };
    }

    isMobil() {
        return this.helperService.isMobil();
    }
    // Método para obtener datos generales
    fetchGeneralData(): Observable<any> {
        return this.registroService.informacionRegistro();
    }

    // Método para obtener datos personales
    fetchPersonalData(): Observable<any> {
        return this.registroService.informacionPersonal();
    }

    // Método para obtener datos personales
    fetchUbicacionData(): Observable<any> {
        return this.registroService.informacionUbicacion();
    }

    fetchSaludData(): Observable<any> {
        return this.registroService.informacionsalud();
    }
    fetchViviendaData(): Observable<any> {
        return this.registroService.informacionVivienda();
    }

    fetchRedesDeApoyoData(): Observable<any> {
        return this.registroService.informacionRedesdeApoyo();
    }

    fetchHistoricoData(): Observable<any> {
        return this.registroService.informacionHistorico();
    }

    private async fetchDataAsync(): Promise<void> {
        this.loadData = true;

        const observables = {
            general: this.fetchGeneralData(),
            personal: this.fetchPersonalData(),
            ubicacion: this.fetchUbicacionData(),
            salud: this.fetchSaludData(),
            historico: this.fetchHistoricoData(),
            vivienda: this.fetchViviendaData(),
            redesDeApoyo: this.fetchRedesDeApoyoData(),
        };

        try {
            const results = await lastValueFrom(forkJoin(observables));

            // Assign results to component properties
            this.generalData = results.general;
            this.personalData = results.personal;
            this.ubicacionData = results.ubicacion;
            this.saludData = results.salud;
            this.historicoData = results.historico;
            this.viviendaData = results.vivienda;
            this.redesDeApoyoData = results.redesDeApoyo;
        } catch (error) {
            console.error('Error in fetchDataAsync:', error);
            throw error; // Re-throw to be handled by the caller
        } finally {
            this.loadData = false;
        }
    }

    majorState: {} = {};
    knobValue: {} = {};
    knobColor: {} = {};
    icon: {} = {};

    calculateMajorState(data: any, stack: string, head: string) {
        this.majorState[stack] = data[head];
        this.knobValue[stack] = parseFloat(data.Porcentaje);

        // Definir color e ícono según el estado de salud
        switch (this.majorState[stack]) {
            case 'EXCELENTE':
                this.knobColor[stack] = '#4CAF50'; // Verde
                this.icon[stack] = 'pi-thumbs-up';
                break;
            case 'FATAL':
                this.knobColor[stack] = '#F44336'; // Rojo
                this.icon[stack] = 'pi-thumbs-down';
                break;
            case 'REGULAR':
                this.knobColor[stack] = '#FFC107'; // Amarillo
                this.icon[stack] = 'pi-exclamation-circle';
                break;
            case 'MALO':
                this.knobColor[stack] = '#FF5722'; // Naranja
                this.icon[stack] = 'pi-times-circle';
                break;
            default:
                this.knobColor[stack] = '#4CAF50'; // Gris
                this.icon[stack] = 'pi-bolt';
                break;
        }
    }

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
}
