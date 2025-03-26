import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { ImportsModule } from 'src/app/demo/services/import';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Router } from '@angular/router';
import { HelperService } from 'src/app/demo/services/helper.service';
import { LoginComponent } from '../login/login.component';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from 'src/app/demo/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TourismService } from '../service/tourism.service';

@Component({
    selector: 'app-tourism',
    standalone: true,
    imports: [ImportsModule, LoginComponent, ProgressSpinnerModule],
    templateUrl: './tourism.component.html',
    styleUrl: './tourism.component.scss',
})
export class TourismComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    menuItems: MenuItem[] = [];
    activeTab: string = 'accommodation';
    mostVisited: any[] = [];
    url: string = GLOBAL.url;
    load: boolean = true; // Initially loading
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
                    this.loginVisible = true; // Open login modal
                } else {
                    this.router.navigate(['/home']);
                }
            },
        },
    ];

    constructor(
        private router: Router,
        private helperService: HelperService,
        private tourismService: TourismService,
        private auth: AuthService
    ) {}

    ngOnInit() {
        // Ensure spinner is shown from the start
        this.load = true;
        console.log('Initial loading state:', this.load);

        this.isMobile = this.helperService.isMobil();

        // Load data using our improved service
        this.loadData();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadData() {
        // Subscribe to both activities and most visited in parallel
        this.tourismService
            .getActivities()
            .pipe(takeUntil(this.destroy$))
            .subscribe((activities) => {
                this.menuItems = activities;
                console.log('Menu loaded:', this.menuItems.length);
            });

        this.tourismService
            .getMostVisited()
            .pipe(takeUntil(this.destroy$))
            .subscribe((mostVisited) => {
                this.mostVisited = mostVisited;
                console.log('Most visited loaded:', this.mostVisited.length);

                // Give a small delay for the spinner to be visible
                setTimeout(() => {
                    this.load = false;
                    console.log('Loading complete, load state:', this.load);
                }, 300);
            });
    }

    isMobil(): boolean {
        return window.innerWidth <= 575;
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

    toggleSidebar() {
        this.visibleSidebar = !this.visibleSidebar;
    }
}
