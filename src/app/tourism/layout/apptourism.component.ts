// app-layout.component.ts
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { SidebarModule } from 'primeng/sidebar';
import { AuthService } from 'src/app/demo/services/auth.service';
import { LoginComponent } from '../login/login.component';
import { AuthEventsService } from '../service/auth-events.service';
import { Subscription } from 'rxjs';

// 1. Actualizar la estructura de NavItem para incluir más propiedades si es necesario
export interface NavItem {
    id: string;
    label: string;
    icon: string;
    url?: string;
    active?: boolean;
    command?: (event: { originalEvent: any; item: any }) => void;
    badge?: string; // Para mostrar notificaciones o contadores
    badgeType?: string; // Para determinar el estilo del badge (success, warn, etc.)
}

@Component({
    selector: 'apptourism',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule, // Added RouterModule
        ButtonModule,
        ProgressSpinnerModule,
        MenuModule,
        SidebarModule,
        LoginComponent,
    ],
    templateUrl: './apptourism.component.html',
    styleUrls: ['./apptourism.component.scss'],
})
export class AppLayoutComponent implements OnInit, OnDestroy {
    token: any = this.auth.token();
    // App info
    @Input() appTitle: string = 'Mi Aplicación';
    @Input() logoSrc: string = 'assets/icon/ESMERALDAS_LA_BELLA.png';

    // Layout options
    @Input() showBackButton: boolean = true;
    @Input() loading: boolean = false;
    @Input() theme: 'light' | 'dark' = 'light';
    @Input() headerFixed: boolean = true;
    @Input() showSidebarToggle: boolean = false;

    // Navigation items
    @Input() menuItems: MenuItem[] = [];
    @Input() mobileNavItems: NavItem[] = [
        {
            label: 'Home',
            icon: 'assets/icon/home.png',
            id: 'home',
            url: '/home',
            active: false,
            command: () => {
                this.router.navigate(['/mapa-turistico']);
            },
        },
        {
            label: 'Actividades',
            icon: 'assets/icon/list.png',
            id: 'actividades',
            url: '/mapa-turistico/list',
            active: false,
            command: () => {
                this.router.navigate(['/mapa-turistico/list']);
            },
        },
        {
            label: 'Esmeraldas la Bella',
            icon: 'assets/icon/logo.png',
            id: 'esmeraldas',
            url: '/home',
            badgeType: 'logo-icon',
            active: false,
            command: () => {
                this.router.navigate(['/home']);
            },
        },
        {
            label: !this.token ? 'Iniciar Sesión' : '',
            icon: !this.token ? 'assets/icon/avatar.png' : '',
            id: 'logout',
            //badgeType: 'logo-icon',
            active: false,
            command: () => {
                if (!this.token) {
                    this.loginVisible = true; // Open login modal
                }
            },
        },
    ];
    loginVisible: boolean = false;

    @Input() homeItem: NavItem | null = null;

    // UI states
    sidebarVisible: boolean = false;

    constructor(
        private router: Router,
        private auth: AuthService,
        private authEvents: AuthEventsService
    ) {}
    // Añadir una propiedad para la suscripción
    private authSubscription: Subscription;

    /// Modificar el método ngOnInit para organizar los elementos alrededor del botón central
    ngOnInit() {
        this.token = this.auth.token();
        // IMPORTANTE: Suscribirse a eventos de inicio de sesión
        this.authSubscription = this.authEvents.loginSuccess$.subscribe(
            (userData) => {
                this.onLoginSuccess(userData);
            }
        );

        // Actualizar el ítem de logout basado en el estado de autenticación actual
        this.updateLogoutItem();

        // Configurar el item central (Mapa) si no se ha configurado manualmente
        if (!this.homeItem) {
            this.homeItem = {
                id: 'mapa',
                label: 'Mapa',
                icon: 'assets/icon/location.png',
                url: '/mapa-turistico/maps',
                active: false,
                command: () => {
                    this.router.navigate(['/mapa-turistico/maps']);
                },
            };
        }

        // Reorganizar los elementos móviles para que se distribuyan uniformemente alrededor del botón central
        // Asegurarse de que haya un balance a ambos lados del botón central
        if (this.mobileNavItems.length % 2 !== 0) {
            // Si hay un número impar de elementos, añadir uno vacío para mantener el balance
            /* this.mobileNavItems.push({
                id: 'placeholder',
                label: '',
                icon: 'assets/icon/transparent.png',
                active: false,
            });*/
        }

        // Actualizar elementos activos basados en la ruta actual
        this.updateActiveItems();

        // Suscribirse a cambios de ruta para mantener actualizado el estado activo
        this.router.events.subscribe(() => {
            this.updateActiveItems();
        });
        this.organizeNavigationItems();
    }

    // Nuevo método para actualizar el ítem de logout basado en el token
    private updateLogoutItem() {
        const logoutItemIndex = this.mobileNavItems.findIndex(
            (item) => item.id === 'logout'
        );
        if (logoutItemIndex >= 0) {
            const hasToken = !!this.token;

            this.mobileNavItems[logoutItemIndex] = {
                ...this.mobileNavItems[logoutItemIndex],
                label: hasToken ? '' : 'Iniciar Sesión',
                icon: hasToken ? '' : 'assets/icon/avatar.png',
                command: (event) => {
                    if (!this.token) {
                        this.loginVisible = true; // Abrir modal de login
                    } else {
                        // this.router.navigate(['/home']);
                    }
                },
            };
        }
    }

    isMobile(): boolean {
        return window.innerWidth <= 768;
    }

    goBack(): void {
        window.history.back();
    }

    onLogoClick(): void {
        this.router.navigate(['/mapa-turistico/home']);
    }

    toggleSidebar(): void {
        this.sidebarVisible = !this.sidebarVisible;
    }

    // 3. Modificar navigateTo para incluir efectos de feedback táctil
    navigateTo(item: NavItem): void {
        if (!item || item.id === 'placeholder') return;

        // Feedback táctil si está disponible (iOS y algunos Android)
        if (window.navigator && (window.navigator as any).vibrate) {
            (window.navigator as any).vibrate(50);
        }

        // Actualizar estado activo
        this.mobileNavItems.forEach((navItem) => {
            navItem.active = navItem.id === item.id;
        });

        if (this.homeItem) {
            this.homeItem.active = this.homeItem.id === item.id;
        }

        // Ejecutar comando o navegar
        if (item.command) {
            item.command({ originalEvent: event, item: item });
        } else if (item.url) {
            this.router.navigate([item.url]);
        }
    }

    private updateActiveItems(): void {
        const currentPath = this.router.url;

        // Update mobile nav items
        this.mobileNavItems.forEach((item) => {
            if (item.url) {
                item.active = currentPath.startsWith(item.url);
            }
        });

        // Update home item
        if (this.homeItem && this.homeItem.url) {
            this.homeItem.active = currentPath === this.homeItem.url;
        }
    }

    firstHalfItems: NavItem[] = [];
    secondHalfItems: NavItem[] = [];

    private organizeNavigationItems(): void {
        // Asegura un número par de elementos
        if (this.mobileNavItems.length % 2 !== 0) {
            this.mobileNavItems.push({
                id: 'placeholder',
                label: '',
                icon: '', //'assets/icon/transparent.png',
                active: false,
            });
        }

        // Divide los elementos
        const midPoint = Math.floor(this.mobileNavItems.length / 2);
        this.firstHalfItems = this.mobileNavItems.slice(0, midPoint);
        this.secondHalfItems = this.mobileNavItems.slice(midPoint);
    }

    // Agrega este método para manejar el evento de login exitoso
    onLoginSuccess(userData: any): void {
        // Actualiza el token - obtenlo fresco del almacenamiento
        this.token = this.auth.token(false);

        // Actualiza el ítem de login/logout
        const logoutItemIndex = this.mobileNavItems.findIndex(
            (item) => item.id === 'logout'
        );
        if (logoutItemIndex >= 0) {
            this.mobileNavItems[logoutItemIndex] = {
                ...this.mobileNavItems[logoutItemIndex],
                label: 'Esmeraldas la Bella',
                icon: 'assets/icon/logo.png',
                command: () => {
                    this.router.navigate(['/home']);
                },
            };
        }

        // Reorganiza los elementos de navegación
        this.organizeNavigationItems();

        // Opcional: notificar al usuario de inicio de sesión exitoso
        // Si estás usando PrimeNG MessageService, podrías mostrar un mensaje
        console.log('Usuario logueado exitosamente:', userData);
    }

    // Implementar OnDestroy para limpiar suscripciones
    ngOnDestroy() {
        if (this.authSubscription) {
            this.authSubscription.unsubscribe();
        }
    }
}
