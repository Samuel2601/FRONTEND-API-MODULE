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
    ) {
        this.auth.permissions$.subscribe(async (permissions) => {
            if (permissions.length > 0) {
                this.permisos_arr = permissions;
            }
            await this.loadPermissions(); // Llama a loadPermissions cuando hay cambios en los permisos
        });
    }
    permisos_arr: any[] = [];
    async ngOnInit() {
        //this.permisos_arr = this.auth.getPermisosSubject();
        await this.loadPermissions();
    }
    async boolPermiss(permission: any, method: any) {
        const hasPermissionBOL =
            this.permisos_arr.length > 0
                ? this.permisos_arr.some(
                      (e) => e.name === permission && e.method === method
                  )
                : false;
        return hasPermissionBOL;
    }

    async loadPermissions() {
        const permissions = {
            canViewregistro: await this.boolPermiss('/registro', 'get'),
            canViewRecolector: await this.boolPermiss(
                '/recolector_ruta/:id',
                'get'
            ),
            canTrashRecolector: await this.boolPermiss(
                '/recolector/:id',
                'get'
            ),
            canRecolectorExterno: this.auth.token(),
            RecolecternoExterno: this.auth.roleUserToken() == undefined,
            canViewMapa: await this.boolPermiss('/incidentes_denuncia', 'get'),
            canViewCategoria: await this.boolPermiss('/categoria', 'get'),
            canViewCategoriaCrear: await this.boolPermiss('/categoria', 'post'),
            canViewSubCategoriaCrear: await this.boolPermiss(
                '/subcategoria',
                'post'
            ),
            canViewIncidente: await this.boolPermiss(
                '/incidentes_denuncia',
                'get'
            ),
            canViewIncidenteReporte: await this.boolPermiss(
                'reporteincidente',
                'get'
            ),
            //canViewFicha: (this.boolPermiss('/ficha_sectorial', 'get')),
            canViewFichaReporte: await this.boolPermiss('reporteficha', 'get'),
            canViewAdministracion: await this.boolPermiss('/categoria', 'post'),
            canViewPanelControl: await this.boolPermiss('dashboard', 'get'),

            canViewZooSanitario: await this.boolPermiss(
                '/zoosanitarycertificate',
                'get'
            ),
            // Nuevos permisos para ZooSanitario
            canViewReception: await this.boolPermiss(
                '/zoosanitarycertificate',
                'get'
            ),
            canViewExternalInspection: await this.boolPermiss(
                '/zoosanitarycertificate',
                'get'
            ),
            canViewSlaughterProcess: await this.boolPermiss(
                '/zoosanitarycertificate',
                'get'
            ),
            canViewInvoices: await this.boolPermiss(
                '/zoosanitarycertificate',
                'get'
            ),
            canViewIntroducers: await this.boolPermiss(
                '/zoosanitarycertificate',
                'get'
            ),
            canViewConfig: await this.boolPermiss(
                '/zoosanitarycertificate',
                'get'
            ),
            canViewReferenceValues: await this.boolPermiss(
                '/zoosanitarycertificate',
                'get'
            ),
            canViewRates: await this.boolPermiss(
                '/zoosanitarycertificate',
                'get'
            ),
        };

        this.model = [
            {
                label: 'ZooSanitario',
                visible: permissions.canViewZooSanitario,
                items: [
                    {
                        label: 'Inicio',
                        icon: 'pi pi-fw pi-home',
                        routerLink: ['/zoosanitario/dashboard'],
                        visible: permissions.canViewZooSanitario,
                    },
                    {
                        label: 'Flujo de Trabajo',
                        icon: 'pi pi-fw pi-sitemap',
                        visible: permissions.canViewZooSanitario,
                        items: [
                            {
                                label: 'Recepción',
                                icon: 'pi pi-fw pi-clipboard',
                                routerLink: [
                                    '/zoosanitario/workflow/reception',
                                ],
                                visible: permissions.canViewReception,
                            },
                            {
                                label: 'Lista de Recepciones',
                                icon: 'pi pi-fw pi-list',
                                routerLink: [
                                    '/zoosanitario/workflow/listar-reception',
                                ],
                                visible: permissions.canViewReception,
                            },
                            {
                                label: 'Inspección Externa',
                                icon: 'pi pi-fw pi-search',
                                visible: permissions.canViewExternalInspection,
                                items: [
                                    {
                                        label: 'Recepción',
                                        icon: 'pi pi-fw pi-clipboard',
                                        routerLink: [
                                            '/zoosanitario/workflow/external-inspection/recepcion',
                                        ],
                                        visible:
                                            permissions.canViewExternalInspection,
                                    },
                                    {
                                        label: 'Ante Mortem',
                                        icon: 'pi pi-fw pi-heart',
                                        routerLink: [
                                            '/zoosanitario/workflow/external-inspection/ante-mortem',
                                        ],
                                        visible:
                                            permissions.canViewExternalInspection,
                                    },
                                ],
                            },
                            {
                                label: 'Procesos de Faenamiento',
                                icon: 'pi pi-fw pi-cog',
                                routerLink: [
                                    '/zoosanitario/workflow/slaughter-process',
                                ],
                                visible: permissions.canViewSlaughterProcess,
                            },
                        ].filter((item) => item.visible !== false),
                    },
                    {
                        label: 'Facturas',
                        icon: 'pi pi-fw pi-file-edit',
                        visible: permissions.canViewInvoices,
                        items: [
                            {
                                label: 'Lista de Facturas',
                                icon: 'pi pi-fw pi-list',
                                routerLink: ['/zoosanitario/invoices'],
                                visible: permissions.canViewInvoices,
                            },
                            {
                                label: 'Nueva Factura',
                                icon: 'pi pi-fw pi-plus',
                                routerLink: ['/zoosanitario/invoices/new'],
                                visible: permissions.canViewInvoices,
                            },
                        ].filter((item) => item.visible !== false),
                    },
                    {
                        label: 'Introductores',
                        icon: 'pi pi-fw pi-users',
                        visible: permissions.canViewIntroducers,
                        items: [
                            {
                                label: 'Lista de Introductores',
                                icon: 'pi pi-fw pi-list',
                                routerLink: ['/zoosanitario/introducers'],
                                visible: permissions.canViewIntroducers,
                            },
                            {
                                label: 'Nuevo Introductor',
                                icon: 'pi pi-fw pi-user-plus',
                                routerLink: ['/zoosanitario/introducers/new'],
                                visible: permissions.canViewIntroducers,
                            },
                        ].filter((item) => item.visible !== false),
                    },
                    {
                        label: 'Configuración',
                        icon: 'pi pi-fw pi-cog',
                        visible: permissions.canViewConfig,
                        items: [
                            {
                                label: 'Valores de Referencia',
                                icon: 'pi pi-fw pi-chart-line',
                                routerLink: [
                                    '/zoosanitario/config/reference-values',
                                ],
                                visible: permissions.canViewReferenceValues,
                            },
                            {
                                label: 'Tarifas',
                                icon: 'pi pi-fw pi-dollar',
                                routerLink: ['/zoosanitario/config/rate'],
                                visible: permissions.canViewRates,
                            },
                        ].filter((item) => item.visible !== false),
                    },
                    {
                        label: 'Certificados',
                        icon: 'pi pi-fw pi-file-edit',
                        routerLink: ['/zoosanitario/certificates'],
                        visible: permissions.canViewZooSanitario,
                    },
                ].filter((item) => item.visible !== false),
            },
            {
                label: 'Ficha Socio Economica',
                visible: permissions.canViewregistro,
                items: [
                    {
                        label: 'Panel de Control',
                        icon: 'pi pi-fw pi-slack',
                        routerLink: ['/ficha-socio-economica/dashboard'],
                        visible: permissions.canViewregistro,
                    },
                    {
                        label: 'Formulario',
                        icon: 'pi pi-fw pi-file-edit',
                        routerLink: ['/ficha-socio-economica/formulario'],
                        visible: permissions.canViewregistro,
                    },
                    {
                        label: 'Registros',
                        icon: 'pi pi-fw pi-slack',
                        routerLink: ['/ficha-socio-economica/registros'],
                        visible: permissions.canViewregistro,
                    },
                ],
            },
            {
                label: 'Recolectores',
                visible:
                    permissions.canViewRecolector ||
                    permissions.canTrashRecolector ||
                    (permissions.canRecolectorExterno &&
                        permissions.RecolecternoExterno),
                items: [
                    {
                        label: 'Recolectores',
                        icon: 'pi pi-fw pi-slack',
                        routerLink: ['/recolectores/listar'],
                        visible: permissions.canViewRecolector,
                    },
                    {
                        label: 'Recolectores Mapa',
                        icon: 'pi pi-fw pi-map-marker',
                        routerLink: [
                            permissions.canViewRecolector
                                ? '/recolectores/listar-asignacion'
                                : '/recolectores/map',
                        ],
                        visible:
                            permissions.canTrashRecolector ||
                            (permissions.canRecolectorExterno &&
                                permissions.RecolecternoExterno),
                    },
                    {
                        label: 'Recolectores Estadística',
                        icon: 'pi pi-fw pi-wave-pulse',
                        routerLink: ['/recolectores/status'],
                        visible: permissions.canViewRecolector,
                    },
                ],
            },
            {
                label: 'Inicio',
                visible: true,
                items: [
                    {
                        label: 'Inicio',
                        icon: 'pi pi-fw pi-home',
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
                        icon: 'pi pi-fw pi-objects-column',
                        routerLink: ['/dashboard'],
                        badge: 'NEW',
                        visible: permissions.canViewPanelControl,
                    },
                ],
            },
        ].filter((item) => item.visible !== false);

        this.viewmenu = true;
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
