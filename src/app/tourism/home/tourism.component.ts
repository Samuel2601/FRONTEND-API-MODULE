import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { ImportsModule } from 'src/app/demo/services/import';
import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { MenuItemCommandEvent } from 'primeng/api';
import { Router } from '@angular/router';
import { GoogleMapsService } from 'src/app/demo/services/google.maps.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ListService } from 'src/app/demo/services/list.service';
import { map } from 'rxjs';
import { ItemComponent } from '../views/item/item.component';
import { LoginComponent } from '../login/login.component';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from 'src/app/demo/services/auth.service';

@Component({
    selector: 'app-tourism',
    standalone: true,
    imports: [ImportsModule, LoginComponent, ProgressSpinnerModule],
    templateUrl: './tourism.component.html',
    styleUrl: './tourism.component.scss',
})
export class TourismComponent implements OnInit {
    menuItems: MenuItem[] = [];
    activeTab: string = 'accommodation';
    accommodations: any[] = [];
    mostVisited: any[] = [];
    url: string = GLOBAL.url;
    load: boolean = true; // Inicialmente está cargando
    isMobile: boolean = false;
    loginVisible: boolean = false;
    visibleSidebar: boolean = false;

    responsiveOptions = [
        {
            breakpoint: '1400px',
            numVisible: 2,
            numScroll: 1,
        },
        {
            breakpoint: '1199px',
            numVisible: 3,
            numScroll: 1,
        },
        {
            breakpoint: '767px',
            numVisible: 2,
            numScroll: 1,
        },
        {
            breakpoint: '575px',
            numVisible: 1,
            numScroll: 1,
        },
    ];

    menuItemssub: any[] = [
        {
            label: 'Home',
            icon: 'assets/icon/home.png',
            _id: 'home',
            url: '/home',
            active: true,
            command: () => {
                this.router.navigate(['/mapa-turistico']);
            },
        },
        {
            label: 'Actividades',
            icon: 'assets/icon/list.png',
            _id: 'actividades',
            url: '/mapa-turistico/list',
            active: false,
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

    constructor(
        private router: Router,
        private helperService: HelperService,
        private listService: ListService,
        private auth: AuthService
    ) {}

    async ngOnInit() {
        // Asegurarse de que el spinner se muestre desde el inicio
        this.load = true;
        console.log('Estado inicial de carga:', this.load);

        this.isMobile = this.helperService.isMobil();

        try {
            // Cargar datos en paralelo
            await Promise.all([this.initializeMenu(), this.loadMostVisited()]);

            // Dar un pequeño tiempo para que el spinner sea visible
            setTimeout(() => {
                this.load = false;
                console.log('Carga completada, estado de load:', this.load);
            }, 500);
        } catch (error) {
            console.error('Error al cargar datos:', error);
            this.load = false;
        }
    }

    isMobil(): boolean {
        return window.innerWidth <= 575; //Capacitor.isNativePlatform(); //
    }

    goBack() {
        this.router.navigate(['/home']);
    }

    goList(name: string) {
        this.router.navigate(['/mapa-turistico/list'], {
            queryParams: { name },
        });
    }
    goMaps(name: string) {
        this.router.navigate(['/mapa-turistico/maps'], {
            queryParams: { name },
        });
    }

    async initializeMenu(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.listService
                .listarTiposActividadesProyecto(null, { is_tourism: true })
                .subscribe({
                    next: (response: any) => {
                        if (response.data) {
                            this.menuItems = response.data.map((item: any) => {
                                return {
                                    label: item.nombre,
                                    icon: item.icono,
                                    _id: item._id,
                                    url_pdf: item.url_pdf,
                                    command: () => (this.activeTab = item._id),
                                };
                            });
                            resolve();
                        } else {
                            resolve(); // Resolvemos incluso si no hay datos
                        }
                    },
                    error: (err) => {
                        console.error('Error al cargar menú:', err);
                        reject(err);
                    },
                });
        });
    }

    async loadMostVisited(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.listService
                .listarFichaSectorial(null, {
                    view: true,
                })
                .subscribe({
                    next: (response: any) => {
                        if (response.data) {
                            this.mostVisited = response.data
                                .map((item: any) => {
                                    const menuItem = this.menuItems.find(
                                        (x: any) => x._id === item.actividad._id
                                    );
                                    if (menuItem && item.title_marcador) {
                                        return {
                                            title: item.title_marcador,
                                            image: item.icono_marcador,
                                            _id: item._id,
                                            foto: item.foto,
                                            direccion: item.direccion,
                                            me_gusta: item.me_gusta || [],
                                            comentarios: item.comentarios || [],
                                            created_at: new Date(
                                                item.created_at
                                            ),
                                        };
                                    }
                                    return null;
                                })
                                .filter(Boolean)
                                .sort((a, b) => {
                                    const likesA = a.me_gusta.length;
                                    const likesB = b.me_gusta.length;
                                    const commentsA = a.comentarios.length;
                                    const commentsB = b.comentarios.length;

                                    if (likesB !== likesA)
                                        return likesB - likesA;
                                    if (commentsB !== commentsA)
                                        return commentsB - commentsA;
                                    return (
                                        b.created_at.getTime() -
                                        a.created_at.getTime()
                                    );
                                })
                                .slice(0, 10);
                            console.log('Most visited:', this.mostVisited);
                            resolve();
                        } else {
                            resolve(); // Resolvemos incluso si no hay datos
                        }
                    },
                    error: (err) => {
                        console.error(
                            'Error al cargar lugares visitados:',
                            err
                        );
                        reject(err);
                    },
                });
        });
    }

    toggleSidebar() {
        this.visibleSidebar = !this.visibleSidebar;
    }
}
