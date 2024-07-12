import { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { LayoutService } from './service/app.layout.service';
import { forkJoin } from 'rxjs';
import { AuthService } from '../demo/services/auth.service';
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
            canViewMapa: await this.auth.hasPermissionComponent(
                '/categoria',
                'get'
            ),
            canViewCategoria: await this.auth.hasPermissionComponent(
                '/categoria',
                'get'
            ),
            canViewIncidente: await this.auth.hasPermissionComponent(
                '/categoria',
                'get'
            ),
            canViewFicha: await this.auth.hasPermissionComponent(
                '/categoria',
                'get'
            ),
            canViewAdministracion: await this.auth.hasPermissionComponent(
                '/categoria',
                'get'
            ),
            canViewPanelControl: await this.auth.hasPermissionComponent(
                '/categoria',
                'get'
            ),
        };

        await forkJoin(permissionsObservables).subscribe(
            (permissions) => {
                this.permissions = permissions;
                console.log(permissions);

                this.model = [
                    {
                        label: 'Inicio',
                        items: [
                            {
                                label: 'Inicio',
                                icon: 'pi pi-fw pi-map',
                                routerLink: ['/home'],
                            },
                        ],
                    },
                    permissions.canViewMapa
                        ? {
                              label: 'Mapa',
                              items: [
                                  {
                                      label: 'Mapa',
                                      icon: 'pi pi-fw pi-map',
                                      routerLink: ['/maps'],
                                  },
                              ],
                          }
                        : null,
                    permissions.canViewCategoria
                        ? {
                              label: 'Categoría',
                              items: [
                                  {
                                      label: 'Listado',
                                      icon: 'pi pi-fw pi-folder-open',
                                      routerLink: ['/maps/categoria'],
                                  },
                                  {
                                      label: 'Nuevo',
                                      icon: 'pi pi-fw pi-folder-open',
                                      routerLink: [
                                          '/maps/categoria/create-categoria',
                                      ],
                                  },
                                  {
                                      label: 'Subcategoría',
                                      icon: 'pi pi-fw pi-folder-open',
                                      routerLink: [
                                          '/maps/subcategoria/create-subcategoria',
                                      ],
                                  },
                              ],
                          }
                        : null,
                    permissions.canViewIncidente
                        ? {
                              label: 'Incidente',
                              items: [
                                  {
                                      label: 'Incidente',
                                      icon: 'pi pi-fw pi-exclamation-triangle',
                                      routerLink: ['/maps/incidente'],
                                  },
                                  {
                                      label: 'Reporte',
                                      icon: 'pi pi-fw pi-chart-bar',
                                      routerLink: ['/dashboard/incidente'],
                                  },
                              ],
                          }
                        : null,
                    permissions.canViewFicha
                        ? {
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
                                  },
                              ],
                          }
                        : null,
                    permissions.canViewAdministracion
                        ? {
                              label: 'Administración',
                              items: [
                                  {
                                      label: 'Administración',
                                      icon: 'pi pi-fw pi-cog',
                                      routerLink: ['/maps/administracion'],
                                  },
                              ],
                          }
                        : null,
                    permissions.canViewPanelControl
                        ? {
                              label: 'Panel de Control',
                              items: [
                                  {
                                      label: 'Estadísticas',
                                      icon: 'pi pi-fw pi-home',
                                      routerLink: ['/dashboard'],
                                  },
                              ],
                          }
                        : null,
                ].filter((item) => item !== null);

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
