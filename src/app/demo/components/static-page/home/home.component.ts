import { Component, OnInit } from '@angular/core';
import { ListService } from 'src/app/demo/services/list.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Router } from '@angular/router';
import { ImportsModule } from 'src/app/demo/services/import';
import { MapaComponent } from '../mapa/mapa.component';
import { MapaFichaComponent } from '../mapa-ficha/mapa-ficha.component';
import { DashboardModule } from '../../dashboard/dashboard.module';
import { MapaTrashComponent } from '../mapa-trash/mapa-trash.component';
import { AuthService } from 'src/app/demo/services/auth.service';
import { forkJoin } from 'rxjs';
@Component({
    selector: 'app-home',
    standalone: true,
    imports: [
        ImportsModule,
        MapaComponent,
        MapaFichaComponent,
        DashboardModule,
        MapaTrashComponent,
    ],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
    responsiveOptions: any[] = [];
    productos: any[] = [];
    token = this.auth.token() || undefined;
    incidencia: FormGroup<any>;
    constructor(
        private list: ListService,
        private helperService: HelperService,
        private fb: FormBuilder,
        public dialogService: DialogService,
        private router: Router,
        private auth: AuthService
    ) {
        this.incidencia = this.fb.group({
            direccion_geo: [{ value: '', disabled: true }],
            ciudadano: [{ value: '', disabled: true }, Validators.required],
            estado: [{ value: '', disabled: true }, Validators.required],
            categoria: [{ value: '', disabled: true }, Validators.required],
            subcategoria: [{ value: '', disabled: true }, Validators.required],
            descripcion: [{ value: '', disabled: true }, Validators.required],
            encargado: [{ value: '', disabled: true }, Validators.required],
            respuesta: [{ value: '', disabled: true }, Validators.required],
            evidencia: [[]],
            view: true,
        });
    }
    DashboardComponent: any;
    async ngOnInit(): Promise<void> {
        this.helperService.setHomeComponent(this);

        this.responsiveOptions = [
            {
                breakpoint: '1199px',
                numVisible: 1,
                numScroll: 1,
            },
            {
                breakpoint: '991px',
                numVisible: 1,
                numScroll: 1,
            },
            {
                breakpoint: '767px',
                numVisible: 1,
                numScroll: 1,
            },
        ];
        this.productos.push(
            {
                id: '1000',
                image: 'https://i.postimg.cc/NMKRV1SJ/Esmeraldas-la-Bella.png',
                url: 'https://play.google.com/store/apps/details?id=ec.gob.esmeraldas.labella&hl=es_CL&gl=US',
                items: [
                    {
                        logo: 'assets/icon/icono-ico.png',
                        titulo: 'ESMERALDAS LA BELLA',
                        descripcion:
                            'Cada ves, más cerca de ti <br> Ya puedes usar nuestra APP',
                    },
                ],
                mobil: false,
            },
            /*{
                id: '1001',
                image: 'https://i.postimg.cc/4ydyyKYh/444943064-772994744996058-5130094033753262063-n.jpg',
                items: [
                    {
                        logo: 'assets/icon/icono-ico.png',
                        titulo: 'ESMERALDAS LA BELLA',
                        descripcion: 'Estamos trabajando por tu bienestar',
                    },
                    {
                        logo: 'assets/icon/icono-ico.png',
                        titulo: 'ESMERALDAS LA BELLA',
                        descripcion: 'Registra tus incumbenientes',
                    },
                    {
                        logo: 'assets/icon/icono-ico.png',
                        titulo: 'ESMERALDAS LA BELLA',
                        descripcion: 'Mira lo que se ha realizado en tu barrio',
                    },
                ],
                mobil: true,
            },*/
            {
                id: '1002',
                image: 'https://i.postimg.cc/nL4GYW0G/notice-recolector.jpg',
                url: 'https://www.facebook.com/photo/?fbid=773092638319602&set=a.487906363504899',
                mobil: true,
            },
            {
                id: '1002',
                image: 'https://i.postimg.cc/CxyHrcCz/alcalde-2-1.jpg',
                url: 'https://www.facebook.com/alcaldiaciudadanadeesmeraldas/posts/pfbid037w3Up2J5CWBLeHtVYb69dJ9ZD3KKgwrUy6ga5gQxwjYa32souymP6tgbh9r2szj7l?rdid=SPHco5EmCgtnqfzb',
                mobil: true,
            },
            {
                id: '1002',
                image: 'https://i.postimg.cc/44S1Vfmv/12-02-informr-alcalde-1.jpg',
                url: 'https://www.facebook.com/alcaldiaciudadanadeesmeraldas/posts/pfbid0THQ1Q3s95P8VyRthucxoCDGbR94EgpV9KSdsUqeTnwXSrWEnUndLNe8epDM2qGp8l',
                mobil: true,
            }
        );
        this.DashboardComponent = await this.auth.hasPermissionComponent(
            'dashboard',
            'get'
        ),
        forkJoin(this.DashboardComponent).subscribe(async (check) => {
            try {
                this.filterProductos();
            } catch (error) {
                console.error('Error en ngOnInit:', error);
                this.router.navigate(['/notfound']);
            } finally {
                this.helperService.cerrarspinner('init index layer');
            }
        });
    }
    setbuttons: any = [
        {
            label: 'Más Usados',
            items: [
                {
                    label: 'ESVIAL',
                    info: 'Puedes reportar Incidentes o mirar las Infracciones de tránsito',
                    icon: 'https://i.postimg.cc/bYKqrncJ/Iconos-disen-o-09.png',
                    showInfo: false,
                    style: false,
                    items: [
                        {
                            label: 'Incidentes ESVIAL',
                            info: 'Puedes reportar los incidentes y denuncias con respecto a ESVIAL.',
                            icon: 'https://i.postimg.cc/C51r9XxQ/Imagen-de-Whats-App-2024-06-26-a-las-12-09-30-1cfaf812-fotor-bg-remover-20240626121913.png',
                            dev: true,
                            showInfo: false,
                            command: async () => {
                                this.incidente(
                                    'ESVIAL',
                                    'Transporte terrestre y seguridad vial'
                                );
                            },
                        },
                        {
                            label: 'Infracciones de Tránsito',
                            info: 'Servicio en línea para la consulta de citaciones.',
                            icon: 'https://i.postimg.cc/FsCZ1JkL/Imagen-de-Whats-App-2024-06-26-a-las-12-07-32-5233ccb0-fotor-bg-remover-20240626121152.png',
                            dev: true,
                            showInfo: false,
                            command: async () => {
                                window.open(
                                    'https://servicios.axiscloud.ec/AutoServicio/inicio.jsp?ps_empresa=10&ps_accion=P55',
                                    '_blank'
                                );
                            },
                        },
                        {
                            label: 'Página oficial',
                            info: 'Conoce su sitio oficial',
                            icon: 'https://i.postimg.cc/7YnWXf1v/375591046-633240775578090-7070193202552108562-n-removebg-preview-1.png',
                            dev: true,
                            showInfo: false,
                            command: async () => {
                                window.open(
                                    'https://esvialep.gob.ec/',
                                    '_blank'
                                );
                            },
                        },
                    ],
                },
                {
                    label: 'EPMAPSE',
                    info: 'Puedes reportar los incidentes y denuncias con respecto a EPMAPSE.',
                    icon: 'https://i.postimg.cc/j2625XdV/icoco-epmapse.png',
                    showInfo: false,
                    style: false,
                    items: [
                        {
                            label: 'Incidentes EPMAPSE',
                            info: 'Puedes reportar los incidentes y denuncias con respecto a EPMAPSE.',
                            icon: 'https://i.postimg.cc/yYGf4ccS/Agua-Potable-y-Alcantarillado.png',
                            dev: true,
                            showInfo: false,
                            command: async () => {
                                this.incidente('Agua Potable y Alcantarillado');
                            },
                        },
                        {
                            label: 'Página oficial',
                            info: 'Conoce su sitio oficial',
                            icon: 'https://i.postimg.cc/2jHdQSw6/epmapse-mod-removebg-preview-2.png',
                            dev: true,
                            showInfo: false,
                            command: async () => {
                                window.open(
                                    'https://epmapse.gob.ec/',
                                    '_blank'
                                );
                            },
                        },
                    ],
                },
                {
                    label: 'BOMBEROS',
                    info: 'Puedes reportar los incidentes y denuncias con respecto a BOMBEROS.',
                    icon: 'https://i.postimg.cc/Gh55HjWs/icoco-bomberos.png',
                    showInfo: false,
                    style: false,
                    items: [
                        {
                            label: 'Incidentes BOMBEROS',
                            info: 'Puedes reportar los incidentes y denuncias con respecto a BOMBEROS.',
                            icon: 'https://i.postimg.cc/pdYh1sx9/11.png',
                            dev: true,
                            showInfo: false,
                            command: async () => {
                                this.incidente(
                                    'Cuerpo de Bomberos',
                                    'Incendios / Desastres varios'
                                );
                            },
                        },
                        {
                            label: 'Página oficial',
                            info: 'Conoce su sitio oficial',
                            icon: 'https://i.postimg.cc/d0p2bHhy/352708610-231200392990592-6209922991130766173-n-removebg-preview.png',
                            dev: true,
                            showInfo: false,
                            command: async () => {
                                window.open(
                                    'https://bomberosdeesmeraldas.gob.ec/',
                                    '_blank'
                                );
                            },
                        },
                    ],
                },
                {
                    label: 'RECOLECTORES',
                    info: 'Puedes reportar los incidentes y denuncias con respecto a RECOLECTORES.',
                    icon: 'https://i.postimg.cc/KvSyxyB3/Iconos-disen-o-01.png',
                    showInfo: false,
                    style: false,
                    items: [
                        {
                            label: 'Incidentes Recolectores',
                            info: 'Puedes reportar los incidentes y denuncias con respecto a BOMBEROS.',
                            icon: 'https://i.postimg.cc/c4LhscCW/Imagen-de-Whats-App-2024-06-26-a-las-12-06-55-15776554-fotor-bg-remover-20240626121226.png',
                            dev: true,
                            showInfo: false,
                            command: async () => {
                                this.incidente(
                                    'Higiene',
                                    ' Servicio de recolección de desechos'
                                );
                            },
                        },
                        {
                            label: 'Rastreo de Recolectores',
                            info: 'Encuentralos, más cerca de ti',
                            icon: 'https://i.postimg.cc/wBcRdtxs/basureros-logo-esmeraldas-la-bella-recorte-2.png',
                            style: true,
                            showInfo: false,
                            command: async () => {
                                this.recolectores();
                            },
                        },
                    ],
                },
                {
                    label: 'Otros Incidentes',
                    info: 'Puedes reportar los incidentes y denuncias que se presenten en la ciudad.',
                    icon: 'https://i.postimg.cc/fW3wMKPp/Iconos-disen-o-07.png',
                    showInfo: false,
                    style: false,
                    command: async () => {
                        this.incidente();
                    },
                },
                {
                    label: 'Fichas Sectoriales',
                    info: 'Accede a información detallada sobre eventos y actividades en tu sector.',
                    icon: 'https://i.postimg.cc/zfpQgsy7/Iconos-disen-o-05.png',
                    showInfo: false,
                    style: false,
                    command: async () => {
                        this.ficha();
                    },
                },
            ],
        },
        {
            label: 'Otros Servicios',
            items: [
                {
                    label: 'Tramites Municipal',
                    info: 'Descubre otros servicios disponibles para ti.',
                    icon: 'https://i.postimg.cc/hGPB6bxC/Iconos-disen-o-12.png',
                    showInfo: false,
                    style: false,
                    command: async () => {
                        window.open(
                            'https://tramites.esmeraldas.gob.ec/',
                            '_blank'
                        );
                    },
                },
                {
                    label: 'Registro de la Propiedad',
                    info: 'Realiza tus trámites en Registro de la Propiedad, certificación e inscripción.',
                    icon: 'https://i.postimg.cc/pXfMd1JG/Iconos-disen-o-14.png',
                    showInfo: false,
                    style: false,
                    command: async () => {
                        window.open(
                            'https://tramites.esmeraldas.gob.ec/login.jsp?id_servicio=15',
                            '_blank'
                        );
                    },
                },
                {
                    label: 'Noticias',
                    info: 'Mantente informado sobre comunicados de la alcaldía.',
                    icon: 'https://i.postimg.cc/cLcWF5Kg/Iconos-disen-o-11.png',
                    showInfo: false,
                    style: false,
                    command: async () => {
                        window.open(
                            'https://esmeraldas.gob.ec/noticias.html',
                            '_blank'
                        );
                    },
                },
                {
                    label: 'Ciudad Global',
                    info: 'Interactúa con las diferentes unidades de la Alcaldía Ciudadana.',
                    icon: 'https://i.postimg.cc/4NVs93s1/Iconos-disen-o-08.png',
                    showInfo: false,
                    style: false,
                    items: [
                        {
                            label: 'Mapa de la Ciudad',
                            info: 'Interactúa con las diferentes unidades de la Alcaldía Ciudadana.',
                            icon: 'https://i.postimg.cc/qMNZLPYt/Imagen-de-Whats-App-2024-06-26-a-las-12-09-30-27b5bceb-removebg-preview.png',
                            showInfo: false,
                            command: async () => {
                                this.router.navigate(['/maps']);
                            },
                        },
                        {
                            label: "TIC's",
                            info: 'Conócenos',
                            icon: 'https://i.postimg.cc/NG4bqngb/Imagen-de-Whats-App-2024-06-26-a-las-12-07-36-c26979b6-fotor-bg-remover-20240626121035.png',
                            showInfo: false,
                            command: async () => {
                                window.open(
                                    'https://esmeraldas.gob.ec/direcciones/ti/info_tics.html',
                                    '_blank'
                                );
                            },
                        },
                        {
                            label: 'Servicios',
                            info: 'Descubre otros servicios que ofrecemos.',
                            icon: 'https://i.postimg.cc/XJnzkpS3/Imagen-de-Whats-App-2024-06-26-a-las-12-09-35-803347bd-removebg-preview.png',
                            showInfo: false,
                            command: async () => {
                                window.open(
                                    'https://esmeraldas.gob.ec/direcciones/ti/servicios-ti.html',
                                    '_blank'
                                );
                            },
                        },
                    ],
                },
                {
                    label: 'Gestión de Riesgos',
                    info: 'Información general sobre gestión de riesgos.',
                    icon: 'https://i.postimg.cc/CMfV3KBV/Iconos-disen-o-15.png',
                    showInfo: false,
                    style: false,
                    command: async () => {
                        window.open(
                            'https://esmeraldas.gob.ec/direcciones/gestion-de-riesgos/informaci%C3%B3n-general.html',
                            '_blank'
                        );
                    },
                },
            ],
        },
        {
            label: 'Concejales',
            items: [
                {
                    label: 'Lilian Orejuela',
                    info: 'Rendición de cuentas de Lilian Orejuela.',
                    icon: 'https://i.postimg.cc/R0FKBmB9/consejal-1.png',
                    showInfo: false,
                    style: true,
                    command: async () => {
                        window.open(
                            'https://www.esmeraldas.gob.ec/alcaldia/concejales-canton-esmeraldas/consejal-lilian.html',
                            '_blank'
                        );
                    },
                },
                {
                    label: 'Jorge Perea',
                    info: 'Rendición de cuentas de Jorge Perea.',
                    icon: 'https://i.postimg.cc/MZYbk9kW/JORGE-fotor-bg-remover-2024053183620.png',
                    showInfo: false,
                    style: true,
                    command: async () => {
                        window.open(
                            'https://www.esmeraldas.gob.ec/alcaldia/concejales-canton-esmeraldas/concejal-jorge-perea.html',
                            '_blank'
                        );
                    },
                },
                {
                    label: 'Ramón Echeverría',
                    info: 'Rendición de cuentas de Ramón Echeverría.',
                    icon: 'https://i.postimg.cc/VLfy1Zd4/49938764-2088066691300558-8718155154085380096-n-fotor-bg-remover-2024053193834.png',
                    showInfo: false,
                    style: true,
                    command: async () => {
                        window.open(
                            'https://www.esmeraldas.gob.ec/alcaldia/concejales-canton-esmeraldas/concejal-ram%C3%B3n-echeverria.html',
                            '_blank'
                        );
                    },
                },
                {
                    label: 'Yoli Márquez',
                    info: 'Rendición de cuentas de Yoli Márquez.',
                    icon: 'https://i.postimg.cc/BQQ5J2s2/441262099-7433463006749036-7393373753399887830-n-fotor-bg-remover-2024053114411.png',
                    showInfo: false,
                    style: true,
                    command: async () => {
                        window.open(
                            'https://www.esmeraldas.gob.ec/alcaldia/concejales-canton-esmeraldas/vicealcaldesa.html',
                            '_blank'
                        );
                    },
                },
                {
                    label: 'Galo Cabezas',
                    info: 'Rendición de Cuentas Galo Cabezas.',
                    icon: 'https://i.postimg.cc/C5JjjxCZ/357410929-6259323480831905-1173226859756085474-n-fotor-bg-remover-20240605102912.png',
                    showInfo: false,
                    style: true,
                    command: async () => {
                        window.open(
                            'https://www.esmeraldas.gob.ec/alcaldia/concejales-canton-esmeraldas/rendici%C3%B3n-de-cuenta-abg-galo-cabezas.html',
                            '_blank'
                        );
                    },
                },
                {
                    label: 'José Maffares',
                    info: 'Rendición de Cuentas José Maffares.',
                    icon: 'https://i.postimg.cc/26YFYrqc/425605791-2113349195709417-9111459625782608350-n-removebg-preview.png',
                    showInfo: false,
                    style: true,
                    command: async () => {
                        window.open(
                            'https://www.esmeraldas.gob.ec/alcaldia/concejales-canton-esmeraldas/concejal-jos%C3%A9-maffares-guagua.html',
                            '_blank'
                        );
                    },
                },
                {
                    label: 'Luisa Cuero',
                    info: 'Rendición de Cuentas Luisa Cuero.',
                    icon: 'https://i.postimg.cc/QdFpTsFt/346839338-266235752519361-8128170372082584323-n-fotor-bg-remover-20240607125013.png',
                    showInfo: false,
                    style: true,
                    command: async () => {
                        window.open(
                            'https://www.esmeraldas.gob.ec/alcaldia/concejales-canton-esmeraldas/rendici%C3%B3n-de-cuenta-luisa-cuero.html',
                            '_blank'
                        );
                    },
                },
                {
                    label: 'Laura Yagual',
                    info: 'Rendición de Cuentas Laura Yagual.',
                    icon: 'https://i.postimg.cc/HsZwnjsR/348425824-994304325315637-2066268990053037357-n-fotor-bg-remover-202406101637.png',
                    showInfo: false,
                    style: true,
                    command: async () => {
                        window.open(
                            'https://www.esmeraldas.gob.ec/alcaldia/concejales-canton-esmeraldas/concejal-laura-yagual.html',
                            '_blank'
                        );
                    },
                },
                {
                    label: 'Victor Rodríguez',
                    info: 'Rendición de Cuentas Victor Rodríguez.',
                    icon: 'https://i.postimg.cc/qqCdzqxq/Imagen-de-Whats-App-2024-07-02-a-las-10-39-12-e997acba-removebg-preview.png',
                    showInfo: false,
                    style: true,
                    command: async () => {
                        window.open(
                            'https://esmeraldas.gob.ec/alcaldia/concejales-canton-esmeraldas/concejal-victor-manuel-rodriguez-santos.html',
                            '_blank'
                        );
                    },
                },
            ],
        },
    ];

    filteredProductos: any[] = [];
    imageselecte: any;
    load_image: boolean = false;
    showimage(img: any) {
        this.imageselecte = img;
        setTimeout(() => {
            this.load_image = true;
        }, 500);
    }

    filterProductos(): void {
        if (this.isMobil()) {
            this.filteredProductos = this.productos.filter(
                (product) => product.mobil
            );
        } else {
            this.filteredProductos = this.productos;
        }
    }
    openLink(url) {
        if (url) {
            window.open(url, '_blank');
        }
    }
    isMobil(): boolean {
        return this.helperService.isMobil();
    }

    visible_incidente: boolean = false;
    visible_incidente_mirror: boolean = false;
    button_active: any = { cate: '', sub: '' };
    incidente(cate?, sub?) {
        if (cate) {
            this.button_active.cate = cate;
        } else {
            this.button_active.cate = undefined;
        }

        if (sub) {
            this.button_active.sub = sub;
        } else {
            this.button_active.sub = undefined;
        }

        if (this.DashboardComponent) {
            this.visible_incidente_mirror = true;
        } else {
            this.visible_incidente = true;
        }
    }

    visible_ficha: boolean = false;
    visible_ficha_mirror: boolean = false;
    ficha() {
        if (this.DashboardComponent) {
            this.visible_ficha_mirror = true;
        } else {
            this.visible_ficha = true;
        }
    }
    visible_trash_mirror: boolean = false;
    recolectores() {
        this.visible_trash_mirror = true;
    }

    showInfo(button: any) {
        button.showInfo = true;
    }

    hideInfo(button: any) {
        button.showInfo = false;
    }

    toggleInfo(button: any) {
        button.showInfo = !button.showInfo;
    }
    getSeverity(status: string) {
        switch (status) {
            case 'INSTOCK':
                return 'success';
            case 'LOWSTOCK':
                return 'warning';
            case 'OUTOFSTOCK':
                return 'danger';
            default:
                return 'danger';
        }
    }
    iconPaths: { [key: string]: string } = {};

    getIconPath(categoria: any): string {
        if (!this.iconPaths[categoria.nombre]) {
            const svgPath = `assets/categorias/${categoria.nombre}.svg`;
            const pngPath = `assets/categorias/${categoria.nombre}.png`;

            // Verificar si el archivo SVG existe
            if (this.fileExists(svgPath)) {
                this.iconPaths[categoria.nombre] = svgPath;
            } else {
                this.iconPaths[categoria.nombre] = pngPath;
            }
        }

        return this.iconPaths[categoria.nombre];
    }
    fileExists(url: string): boolean {
        const http = new XMLHttpRequest();
        http.open('HEAD', url, false);
        http.send();
        return http.status !== 404;
    }
}
