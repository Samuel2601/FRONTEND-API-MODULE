import { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { LayoutService } from './service/app.layout.service';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../demo/services/auth.service';
import { catchError } from 'rxjs/operators';

@Component({
    selector: 'app-menu',
    templateUrl: './app.menu.component.html',
})
export class AppMenuComponent implements OnInit {
    model: any[] = [];
    permissions: any = {};
    viewmenu: boolean = false;

    constructor(
        public layoutService: LayoutService,
        private auth: AuthService
    ) {}

    ngOnInit() {
        this.loadPermissions();
    }

    async loadPermissions() {
        const permissionsObservables = {
            
            canViewMapa: (await this.auth.hasPermissionComponent('/incidentes_denuncia', 'get')).pipe(catchError(() => of(false))),
            canViewCategoria: (await this.auth.hasPermissionComponent('/categoria', 'get')).pipe(catchError(() => of(false))),
            canViewCategoriaCrear: (await this.auth.hasPermissionComponent('/categoria', 'post')).pipe(catchError(() => of(false))),
            canViewSubCategoriaCrear: (await this.auth.hasPermissionComponent('/subcategoria', 'post')).pipe(catchError(() => of(false))),
            canViewIncidente: (await this.auth.hasPermissionComponent('/incidentes_denuncia', 'get')).pipe(catchError(() => of(false))),
            canViewIncidenteReporte: (await this.auth.hasPermissionComponent('reporteincidente', 'get')).pipe(catchError(() => of(false))),
            //canViewFicha: (await this.auth.hasPermissionComponent('/ficha_sectorial', 'get')).pipe(catchError(() => of(false))),
            canViewFichaReporte: (await this.auth.hasPermissionComponent('reporteficha', 'get')).pipe(catchError(() => of(false))),
            canViewAdministracion: (await this.auth.hasPermissionComponent('/categoria', 'post')).pipe(catchError(() => of(false))),
            canViewPanelControl: (await this.auth.hasPermissionComponent('dashboard', 'get')).pipe(catchError(() => of(false))),
        };

        forkJoin(permissionsObservables).subscribe(
            (permissions) => {
                this.permissions = permissions;
                console.log(permissions);

                this.model = [                    
                    {
                        label: 'Recolectores',
                        visible: true,
                        items: [
                            {
                                label: 'Recolectores',
                                icon: 'pi pi-fw pi-map',
                                routerLink: ['/recolectores/map'],
                                visible: true,
                            },
                        ],
                    },
                    {
                        label: 'Inicio',
                        visible: true,
                        items: [
                            {
                                label: 'Inicio',
                                icon: 'pi pi-fw pi-map',
                                routerLink: ['/home'],
                                visible: true,
                            },
                        ],
                    },
                    {
                        label: 'Mapa',
                        visible: permissions.canViewMapa,
                        items: [
                            {
                                label: 'Mapa',
                                icon: 'pi pi-fw pi-map',
                                routerLink: ['/maps'],
                                visible: permissions.canViewMapa,
                            },
                        ],
                    },
                    {
                        label: 'Categoría',
                        visible: permissions.canViewCategoria,
                        items: [
                            {
                                label: 'Listado',
                                icon: 'pi pi-fw pi-folder-open',
                                routerLink: ['/maps/categoria'],
                                visible: permissions.canViewCategoria,
                            },
                            {
                                label: 'Nuevo',
                                icon: 'pi pi-fw pi-folder-open',
                                routerLink: ['/maps/categoria/create-categoria'],
                                visible: permissions.canViewCategoriaCrear,
                            },
                            {
                                label: 'Subcategoría',
                                icon: 'pi pi-fw pi-folder-open',
                                routerLink: ['/maps/subcategoria/create-subcategoria'],
                                visible: permissions.canViewSubCategoriaCrear,
                            },
                        ].filter((item) => item.visible !== false),
                    },
                    {
                        label: 'Incidente',
                        visible: permissions.canViewIncidente,
                        items: [
                            {
                                label: 'Incidente',
                                icon: 'pi pi-fw pi-exclamation-triangle',
                                routerLink: ['/maps/incidente'],
                                visible: permissions.canViewIncidente,
                            },
                            {
                                label: 'Reporte',
                                icon: 'pi pi-fw pi-chart-bar',
                                routerLink: ['/dashboard/incidente'],
                                visible: permissions.canViewIncidenteReporte,
                            },
                        ].filter((item) => item.visible !== false),
                    },
                    {
                        label: 'Ficha',
                        items: [
                            {
                                label: 'Ficha',
                                icon: 'pi pi-fw pi-file-edit',
                                routerLink: ['/maps/ficha-sectorial'],
                            },
                            {
                                label: 'Reporte',
                                icon: 'pi pi-fw pi-chart-bar',
                                routerLink: ['/dashboard/ficha'],
                                visible: permissions.canViewFichaReporte,
                            },
                        ].filter((item) => item.visible !== false),
                    },
                    {
                        label: 'Administración',
                        visible: permissions.canViewAdministracion,
                        items: [
                            {
                                label: 'Administración',
                                icon: 'pi pi-fw pi-cog',
                                routerLink: ['/maps/administracion'],
                                visible: permissions.canViewAdministracion,
                            },
                        ],
                    },
                    {
                        label: 'Panel de Control',
                        visible: permissions.canViewPanelControl,
                        items: [
                            {
                                label: 'Estadísticas',
                                icon: 'pi pi-fw pi-home',
                                routerLink: ['/dashboard'],
                                badge: 'NEW',
                                visible: permissions.canViewPanelControl,
                            },
                        ],
                    },
                ].filter((item) => item.visible !== false);
                

                this.viewmenu = true;
            },
            (error) => {
                console.error(error);
            }
        );
    }
}

/*
 {
                label: 'UI Components',
                items: [
                    { label: 'Form Layout', icon: 'pi pi-fw pi-id-card', routerLink: ['/uikit/formlayout'] },
                    { label: 'Input', icon: 'pi pi-fw pi-check-square', routerLink: ['/uikit/input'] },
                    { label: 'Float Label', icon: 'pi pi-fw pi-bookmark', routerLink: ['/uikit/floatlabel'] },
                    { label: 'Invalid State', icon: 'pi pi-fw pi-exclamation-circle', routerLink: ['/uikit/invalidstate'] },
                    { label: 'Button', icon: 'pi pi-fw pi-box', routerLink: ['/uikit/button'] },
                    { label: 'Table', icon: 'pi pi-fw pi-table', routerLink: ['/uikit/table'] },
                    { label: 'List', icon: 'pi pi-fw pi-list', routerLink: ['/uikit/list'] },
                    { label: 'Tree', icon: 'pi pi-fw pi-share-alt', routerLink: ['/uikit/tree'] },
                    { label: 'Panel', icon: 'pi pi-fw pi-tablet', routerLink: ['/uikit/panel'] },
                    { label: 'Overlay', icon: 'pi pi-fw pi-clone', routerLink: ['/uikit/overlay'] },
                    { label: 'Media', icon: 'pi pi-fw pi-image', routerLink: ['/uikit/media'] },
                    { label: 'Menu', icon: 'pi pi-fw pi-bars', routerLink: ['/uikit/menu'], routerLinkActiveOptions: { paths: 'subset', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' } },
                    { label: 'Message', icon: 'pi pi-fw pi-comment', routerLink: ['/uikit/message'] },
                    { label: 'File', icon: 'pi pi-fw pi-file', routerLink: ['/uikit/file'] },
                    { label: 'Chart', icon: 'pi pi-fw pi-chart-bar', routerLink: ['/uikit/charts'] },
                    { label: 'Misc', icon: 'pi pi-fw pi-circle', routerLink: ['/uikit/misc'] }
                ]
            },
            {
                label: 'Prime Blocks',
                items: [
                    { label: 'Free Blocks', icon: 'pi pi-fw pi-eye', routerLink: ['/blocks'], badge: 'NEW' },
                    { label: 'All Blocks', icon: 'pi pi-fw pi-globe', url: ['https://www.primefaces.org/primeblocks-ng'], target: '_blank' },
                ]
            },
            {
                label: 'Utilities',
                items: [
                    { label: 'PrimeIcons', icon: 'pi pi-fw pi-prime', routerLink: ['/utilities/icons'] },
                    { label: 'PrimeFlex', icon: 'pi pi-fw pi-desktop', url: ['https://www.primefaces.org/primeflex/'], target: '_blank' },
                ]
            },
            {
                label: 'Pages',
                icon: 'pi pi-fw pi-briefcase',
                items: [
                    {
                        label: 'Landing',
                        icon: 'pi pi-fw pi-globe',
                        routerLink: ['/landing']
                    },
                    {
                        label: 'Auth',
                        icon: 'pi pi-fw pi-user',
                        items: [
                            {
                                label: 'Login',
                                icon: 'pi pi-fw pi-sign-in',
                                routerLink: ['/auth/login']
                            },
                            {
                                label: 'Error',
                                icon: 'pi pi-fw pi-times-circle',
                                routerLink: ['/auth/error']
                            },
                            {
                                label: 'Access Denied',
                                icon: 'pi pi-fw pi-lock',
                                routerLink: ['/auth/access']
                            }
                        ]
                    },
                    {
                        label: 'Crud',
                        icon: 'pi pi-fw pi-pencil',
                        routerLink: ['/pages/crud']
                    },
                    {
                        label: 'Timeline',
                        icon: 'pi pi-fw pi-calendar',
                        routerLink: ['/pages/timeline']
                    },
                    {
                        label: 'Not Found',
                        icon: 'pi pi-fw pi-exclamation-circle',
                        routerLink: ['/notfound']
                    },
                    {
                        label: 'Empty',
                        icon: 'pi pi-fw pi-circle-off',
                        routerLink: ['/pages/empty']
                    },
                ]
            },
            {
                label: 'Hierarchy',
                items: [
                    {
                        label: 'Submenu 1', icon: 'pi pi-fw pi-bookmark',
                        items: [
                            {
                                label: 'Submenu 1.1', icon: 'pi pi-fw pi-bookmark',
                                items: [
                                    { label: 'Submenu 1.1.1', icon: 'pi pi-fw pi-bookmark' },
                                    { label: 'Submenu 1.1.2', icon: 'pi pi-fw pi-bookmark' },
                                    { label: 'Submenu 1.1.3', icon: 'pi pi-fw pi-bookmark' },
                                ]
                            },
                            {
                                label: 'Submenu 1.2', icon: 'pi pi-fw pi-bookmark',
                                items: [
                                    { label: 'Submenu 1.2.1', icon: 'pi pi-fw pi-bookmark' }
                                ]
                            },
                        ]
                    },
                    {
                        label: 'Submenu 2', icon: 'pi pi-fw pi-bookmark',
                        items: [
                            {
                                label: 'Submenu 2.1', icon: 'pi pi-fw pi-bookmark',
                                items: [
                                    { label: 'Submenu 2.1.1', icon: 'pi pi-fw pi-bookmark' },
                                    { label: 'Submenu 2.1.2', icon: 'pi pi-fw pi-bookmark' },
                                ]
                            },
                            {
                                label: 'Submenu 2.2', icon: 'pi pi-fw pi-bookmark',
                                items: [
                                    { label: 'Submenu 2.2.1', icon: 'pi pi-fw pi-bookmark' },
                                ]
                            },
                        ]
                    }
                ]
            },
            {
                label: 'Get Started',
                items: [
                    {
                        label: 'Documentation', icon: 'pi pi-fw pi-question', routerLink: ['/documentation']
                    },
                    {
                        label: 'View Source', icon: 'pi pi-fw pi-search', url: ['https://github.com/primefaces/sakai-ng'], target: '_blank'
                    }
                ]
            }
*/
