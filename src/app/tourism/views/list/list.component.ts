import { FilterService } from 'src/app/demo/services/filter.service';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem, SelectItem } from 'primeng/api';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { GoogleMapsService } from 'src/app/demo/services/google.maps.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ImportsModule } from 'src/app/demo/services/import';
import { ListService } from 'src/app/demo/services/list.service';
import { DataViewModule } from 'primeng/dataview';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { AuthService } from 'src/app/demo/services/auth.service';
import { CacheService } from 'src/app/demo/services/cache.service';
import { LoginComponent } from '../../login/login.component';

@Component({
    selector: 'app-list',
    standalone: true,
    imports: [
        ImportsModule,
        DataViewModule,
        ButtonModule,
        CommonModule,
        LoginComponent,
    ],
    templateUrl: './list.component.html',
    styleUrl: './list.component.scss',
})
export class ListComponent implements OnInit {
    goMaps(arg0: any) {
        this.router.navigate(['/mapa-turistico/maps'], {
            queryParams: { name: arg0 },
        });
    }
    isMobil(): any {
        return window.innerWidth <= 575; //Capacitor.isNativePlatform(); //
    }

    goBack() {
        this.router.navigate(['/mapa-turistico']);
    }
    loginVisible: boolean = false;
    menuItems: any[] = [
        {
            label: 'Home',
            icon: 'assets/icon/home.png',
            _id: 'home',
            url: '/home',
            active: false,
            command: () => {
                this.router.navigate(['/mapa-turistico']);
            },
        },
        {
            label: 'Actividades',
            icon: 'assets/icon/list.png',
            _id: 'actividades',
            url: '/mapa-turistico/list',
            active: true,
            command: () => {
                this.router.navigate(['/mapa-turistico/list']);
            },
        },
        {
            label: 'Mapa',
            icon: 'assets/icon/location.png',
            _id: 'mapa',
            url: '/mapa-turistico/maps',
            active: false,
            command: () => {
                this.router.navigate(['/mapa-turistico/maps']);
            },
        },
        {
            label: 'Logout',
            icon: !this.auth.token()
                ? 'assets/icon/avatar.png'
                : 'assets/icon/logo.png',
            _id: 'logout',
            active: false,
            command: () => {
                if (!this.auth.token()) {
                    this.loginVisible = true; // Abre el modal de login
                } else {
                    this.router.navigate(['/home']);
                }
            },
        },
    ];
    url: string = GLOBAL.url;

    constructor(
        private router: Router,
        private googlemaps: GoogleMapsService,
        private helperService: HelperService,
        private listService: ListService,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef,
        private auth: AuthService,
        private filterService: FilterService,
        private cacheService: CacheService
    ) {}
    name: string = '';
    async ngOnInit(): Promise<void> {
        this.name = this.route.snapshot.queryParamMap.get('name') || '';
        console.log('Nombre recibido:', this.name);

        // Cargamos las actividades y fichas en paralelo
        const loadPromises = [this.loadActivities(), this.getFichas()];

        await Promise.all(loadPromises);

        // Una vez que tengamos tanto las actividades como las fichas, aplicamos el filtro
        this.applyNameFilter();
    }
    /**
     * Carga todas las actividades
     */
    actividad: any[] = [];
    actividadesCargadas: boolean = false;
    async loadActivities() {
        return new Promise<void>((resolve) => {
            this.listService
                .listarTiposActividadesProyecto(null, { is_tourism: true })
                .subscribe((response: any) => {
                    if (response.data) {
                        this.actividad = response.data.map((item: any) => ({
                            label: item.nombre,
                            icon: item.icono,
                            _id: item._id,
                        }));
                        console.log('Actividades disponibles:', this.actividad);
                        this.actividadesCargadas = true;
                    }
                    resolve();
                });
        });
    }
    /**
     * Aplica el filtro basado en el nombre recibido en la URL
     */
    selectedActivities: Set<string> = new Set();
    allFichas: any[] = []; // Todas las fichas sin filtrar
    fichasCargadas: boolean = false;
    applyNameFilter() {
        if (this.name && this.actividadesCargadas && this.fichasCargadas) {
            //console.log('Aplicando filtro por nombre:', this.name);

            // Encontramos todas las actividades que coincidan con el nombre
            const actividadesEncontradas = this.actividad.filter(
                (a) => a.label.toLowerCase() === this.name.toLowerCase()
            );

            if (actividadesEncontradas.length > 0) {
                //console.log('Actividades encontradas:', actividadesEncontradas);
                // Seleccionamos todas las actividades que coincidan con el nombre
                this.selectedActivities = new Set(
                    actividadesEncontradas.map((a) => a._id)
                );
            } else {
                console.warn(
                    `No se encontró la actividad con el nombre: ${this.name}`
                );
                this.selectedActivities = new Set(); // No selecciona ninguna si no existe
            }
        } else if (!this.name) {
            // Si no hay nombre, seleccionamos todas las actividades
            this.selectedActivities = new Set(this.actividad.map((a) => a._id));
        }

        // Aplicamos el filtro
        this.filterFichas();
    }

    /**
     * Obtiene todas las fichas sin filtrar al inicio
     */
    async getFichas() {
        return new Promise<void>((resolve) => {
            this.listService
                .listarFichaSectorial(null, {
                    //'actividad.is_tourism': true,
                    view: true,
                })
                .subscribe((response: any) => {
                    if (response.data) {
                        this.allFichas = response.data
                            .map((item: any) => {
                                if (item.actividad.is_tourism) {
                                    return {
                                        title_marcador: item.title_marcador,
                                        image: item.icono_marcador,
                                        _id: item._id,
                                        foto: item.foto,
                                        direccion: item.direccion_geo.nombre,
                                        me_gusta: item.me_gusta || [],
                                        comentarios: item.comentarios || [],
                                        lat: item.direccion_geo.latitud,
                                        lng: item.direccion_geo.longitud,
                                        actividadId:
                                            item.actividad?._id || null, // ID de la actividad
                                        actividadNombre:
                                            item.actividad?.nombre || null, // Nombre de la actividad
                                    };
                                } else {
                                    return null; // Para evitar `undefined` en el array
                                }
                            })
                            .filter(Boolean); // Elimina valores `null` o `undefined`
                        console.log('Fichas cargadas:', this.allFichas);
                        //this.cacheService.saveChunkedData(this.allFichas);

                        this.fichasCargadas = true;
                    }
                    resolve();
                });
        });
    }

    /**
     * Filtra las fichas basándose en las actividades seleccionadas
     */
    layout: 'list' | 'grid' = this.isMobil() ? 'grid' : 'list';
    options = ['list', 'grid'];
    mostVisited = signal<any>([]);
    load_dataview: boolean = false;
    async filterFichas() {
        this.load_dataview = false;
        if (this.selectedActivities.size === 0) {
            this.mostVisited.set([...this.allFichas]); // Mostrar todas si nada está seleccionado
        } else {
            const aux = this.allFichas.filter(
                (ficha) =>
                    ficha.actividadId &&
                    this.selectedActivities.has(ficha.actividadId)
            );
            this.mostVisited.set([...aux]);
        }
        setTimeout(() => {
            this.load_dataview = true;
        }, 1000);
        console.log('Fichas mostVisited:', this.mostVisited());
    }

    /**
     * Maneja la selección de actividades como checkboxes
     */
    toggleActivity(activity: any) {
        if (this.selectedActivities.has(activity._id)) {
            this.selectedActivities.delete(activity._id);
        } else {
            this.selectedActivities.add(activity._id);
        }
        this.filterFichas(); // Aplica filtro sin volver a hacer la petición
    }

    getCOnsole(json: any) {
        return JSON.stringify(json);
    }
    sortOrder: number = 0;
    sortField: string = '';
    sortOptions: any = [
        { label: 'Más visitados', value: 'visits:desc' },
        { label: 'Más destacados', value: 'me_gusta:desc' },
        { label: 'Más comentados', value: 'comentarios:desc' },
        { label: 'Nombre (A-Z)', value: 'title_marcador:asc' },
        { label: 'Nombre (Z-A)', value: 'title_marcador:desc' },
    ];
    // Cuando cambia el ordenamiento
    onSortChange(event: any) {
        const value = event.value;
        console.log('onSortChange', value);

        if (value.indexOf(':') === -1) {
            this.sortOrder = 1;
            this.sortField = value;
        } else {
            const [field, order] = value.split(':');
            this.sortOrder = order === 'asc' ? 1 : -1;
            this.sortField = field;
        }

        // Aplicar ordenamiento a los datos existentes
        this.applySort();
    }

    // Método para aplicar el ordenamiento
    applySort() {
        //console.log('applySort', this.sortField, this.sortOrder);
        if (!this.sortField || this.sortField.length === 0) {
            return;
        }

        // Obtener el valor actual de la señal
        const currentData = this.mostVisited();

        // Crear una copia para ordenar
        const sortedData = [...currentData].sort((a, b) => {
            let value1 = this.resolveFieldData(a, this.sortField);
            let value2 = this.resolveFieldData(b, this.sortField);

            // Si el campo es 'me_gusta' o 'comentarios', comparar por longitud
            if (
                this.sortField === 'me_gusta' ||
                this.sortField === 'comentarios'
            ) {
                const length1 = Array.isArray(value1) ? value1.length : 0;
                const length2 = Array.isArray(value2) ? value2.length : 0;
                return this.sortOrder * (length1 - length2);
            }

            // Para campos de texto
            if (typeof value1 === 'string' && typeof value2 === 'string') {
                return this.sortOrder * value1.localeCompare(value2);
            }

            // Para campos numéricos
            return this.sortOrder * (value1 - value2);
        });
        //console.log('applySort', sortedData);
        // Actualizar la señal con los datos ordenados
        this.mostVisited.set(sortedData);
    }

    // Función auxiliar para obtener el valor de un campo
    resolveFieldData(obj: any, field: string): any {
        if (!obj || !field) {
            return null;
        }

        // Si el campo es 'visits', usamos comentarios como aproximación
        if (field === 'visits') {
            return obj.comentarios ? obj.comentarios.length : 0;
        }

        if (field.indexOf('.') > -1) {
            const fields: string[] = field.split('.');
            let value = obj;
            for (let i = 0, len = fields.length; i < len; ++i) {
                if (value == null) {
                    return null;
                }
                value = value[fields[i]];
            }
            return value;
        }

        return obj[field];
    }

    async refreshData() {
        await this.filterFichas();
    }

    isLiked(item: any): boolean {
        if (this.auth.token()) {
            const userId: string = this.auth.idUserToken();
            return (
                item.me_gusta &&
                item.me_gusta.some(
                    (user) => user._id === userId || user === userId
                )
            );
        }
        return false;
    }

    toggleLike(item: any) {
        if (!this.auth.token()) {
            this.loginVisible = true; // Abre el modal de login
            return;
        }

        const userId = this.auth.idUserToken();
        const isCurrentlyLiked = this.isLiked(item);

        this.filterService
            .actualizarFichaMeGusta(this.auth.token(), item._id, userId)
            .subscribe(
                (response: any) => {
                    console.log(response);
                    if (response.me_gusta) {
                        this.allFichas.find((x) => x._id == item._id).me_gusta =
                            response.me_gusta;
                        this.refreshData();
                    }
                },
                (error) => {
                    console.error('Error al actualizar me gusta: ', error);
                }
            );
    }
}
