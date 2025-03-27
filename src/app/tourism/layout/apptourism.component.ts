// app-layout.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { SidebarModule } from 'primeng/sidebar';
import { AuthService } from 'src/app/demo/services/auth.service';

export interface NavItem {
    id: string;
    label: string;
    icon: string;
    url?: string;
    active?: boolean;
    command?: (event: { originalEvent: any; item: any }) => void;
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
    ],
    templateUrl: './apptourism.component.html',
    styleUrls: ['./apptourism.component.scss'],
})
export class AppLayoutComponent implements OnInit {
    token: any = null;
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
            label: 'Mapa',
            icon: 'assets/icon/location.png',
            id: 'mapa',
            url: '/mapa-turistico/maps',
            active: false,
            command: () => {
                this.router.navigate(['/mapa-turistico/maps']);
            },
        },
        {
            label: 'Logout',
            icon: !this.token
                ? 'assets/icon/avatar.png'
                : 'assets/icon/logo.png',
            id: 'logout',
            active: false,
            command: () => {
                if (!this.token) {
                    this.loginVisible = true; // Open login modal
                } else {
                    this.router.navigate(['/home']);
                }
            },
        },
    ];
    loginVisible: boolean = false;

    @Input() homeItem: NavItem | null = null;

    // UI states
    sidebarVisible: boolean = false;

    constructor(private router: Router, private auth: AuthService) {}

    ngOnInit() {
        this.token = this.auth.token();
        // Set active item based on current route
        this.updateActiveItems();
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

    navigateTo(item: NavItem): void {
        // Update active status
        this.mobileNavItems.forEach((navItem) => {
            navItem.active = navItem.id === item.id;
        });

        if (this.homeItem) {
            this.homeItem.active = this.homeItem.id === item.id;
        }

        // Execute command or navigate
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
}
