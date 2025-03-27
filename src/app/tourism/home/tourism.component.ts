import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    Component,
    OnInit,
    OnDestroy,
    HostListener,
    ElementRef,
    NgZone,
} from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Router } from '@angular/router';
import { HelperService } from 'src/app/demo/services/helper.service';
import { LoginComponent } from '../login/login.component';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from 'src/app/demo/services/auth.service';
import { fromEvent, Subject } from 'rxjs';
import { takeUntil, throttleTime } from 'rxjs/operators';
import { TourismService } from '../service/tourism.service';
import { ScrollAnimationService } from '../service/scroll-animation.service';
import { ParallaxDirective } from '../directive/parallax.directive';
import { Card3dComponent } from '../directive/card-3d.component';
import {
    animate,
    query,
    stagger,
    style,
    transition,
    trigger,
} from '@angular/animations';

@Component({
    selector: 'app-tourism',
    standalone: true,
    imports: [
        ImportsModule,
        LoginComponent,
        ProgressSpinnerModule,
        ParallaxDirective,
        Card3dComponent,
    ],
    templateUrl: './tourism.component.html',
    styleUrl: './tourism.component.scss',
    animations: [
        trigger('staggerAnimation', [
            transition('* => *', [
                query(
                    ':enter',
                    [
                        style({ opacity: 0, transform: 'translateY(20px)' }),
                        stagger(100, [
                            animate(
                                '0.5s ease',
                                style({
                                    opacity: 1,
                                    transform: 'translateY(0)',
                                })
                            ),
                        ]),
                    ],
                    { optional: true }
                ),
            ]),
        ]),
    ],
})
export class TourismComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    private rafId: number | null = null;
    private scrollAnimationActive = false;

    menuItems: MenuItem[] = [];
    activeTab: string = 'accommodation';
    mostVisited: any[] = [];
    url: string = GLOBAL.url;
    load: boolean = true; // Initially loading
    isMobile: boolean = false;
    loginVisible: boolean = false;
    visibleSidebar: boolean = false;
    prefersReducedMotion: boolean = false;

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

    constructor(
        private router: Router,
        private helperService: HelperService,
        private tourismService: TourismService,
        private auth: AuthService,
        private scrollAnimationService: ScrollAnimationService,
        private el: ElementRef,
        private ngZone: NgZone
    ) {}

    ngOnInit() {
        // Check user preferences
        this.prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        // Ensure spinner is shown from the start
        this.load = true;

        // Check device type
        this.isMobile = this.helperService.isMobil();

        // Load data using our improved service
        this.loadData();

        // Initialize scroll animation (outside Angular zone for better performance)
        this.ngZone.runOutsideAngular(() => {
            this.initScrollAnimation();
        });
    }

    ngAfterViewInit() {
        // Initialize scroll animations after view is ready
        setTimeout(() => {
            this.scrollAnimationService.observeElements('.section-fade-in');
            this.animateOnScroll();
        }, 500);
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();

        // Stop all observers
        this.scrollAnimationService.disconnect();

        // Cancel any pending animation frame
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
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

    // Optimized data loading method
    private loadData() {
        // Subscribe to both activities and most visited in parallel
        this.tourismService
            .getActivities()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (activities) => {
                    this.menuItems = activities;
                },
                error: (err) => {
                    console.error('Error loading menu items:', err);
                    this.load = false;
                },
            });

        this.tourismService
            .getMostVisited()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (mostVisited) => {
                    // Initialize the imageLoaded property for each item
                    this.mostVisited = mostVisited.map((item) => {
                        return { ...item, imageLoaded: false };
                    });

                    // Preload first few images for the carousel
                    this.preloadInitialImages();

                    // Give a small delay for the spinner to be visible
                    setTimeout(() => {
                        this.load = false;
                    }, 300);
                },
                error: (err) => {
                    console.error('Error loading most visited:', err);
                    this.load = false;
                },
            });
    }

    // Method to handle image loading
    onImageLoad(place: any) {
        // Mark the image as loaded
        place.imageLoaded = true;
    }

    // Method to preload the first few images
    private preloadInitialImages() {
        // Determine how many images to preload based on responsive options
        const visibleItems = Math.min(3, this.mostVisited.length);

        if (this.mostVisited.length === 0) return;

        // Only preload the first few visible images
        for (let i = 0; i < visibleItems; i++) {
            const img = new Image();
            const place = this.mostVisited[i];
            img.onload = () => this.onImageLoad(place);
            img.src =
                this.url + 'obtener_imagen/ficha_sectorial/' + place.foto[0];
        }
    }

    // Optimized scroll animation setup (runs outside Angular zone)
    private initScrollAnimation() {
        fromEvent(window, 'scroll', { passive: true })
            .pipe(
                throttleTime(16), // ~60fps
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                // Use RAF for smoother animations
                if (!this.scrollAnimationActive && !this.rafId) {
                    this.scrollAnimationActive = true;
                    this.rafId = requestAnimationFrame(() => {
                        this.animateOnScroll();
                        this.scrollAnimationActive = false;
                        this.rafId = null;
                    });
                }
            });
    }

    // Refined animation on scroll with optimized 3D effects
    private animateOnScroll() {
        // Skip all animations if user prefers reduced motion
        if (this.prefersReducedMotion) return;

        // Animation for sections with class section-fade-in
        const fadeSections =
            this.el.nativeElement.querySelectorAll('.section-fade-in');
        fadeSections.forEach((section: HTMLElement) => {
            const sectionTop = section.getBoundingClientRect().top;
            const triggerPosition = window.innerHeight * 0.8;

            if (sectionTop < triggerPosition) {
                section.classList.add('visible');
            }
        });

        // Only apply the card rotation effect on desktop for better performance
        if (!this.isMobile) {
            // Get all regular cards (not using the Card3D component)
            const regularCards = this.el.nativeElement.querySelectorAll(
                '.tourism-card:not(.card-3d-container *)'
            );

            regularCards.forEach((card: HTMLElement) => {
                const cardRect = card.getBoundingClientRect();

                // Skip if card is not in viewport (performance optimization)
                if (cardRect.bottom < 0 || cardRect.top > window.innerHeight) {
                    return;
                }

                // Calculate position relative to center
                const centerY = window.innerHeight / 2;
                const centerX = window.innerWidth / 2;

                // Calculate distance from center (normalized -1 to 1)
                const distY =
                    (cardRect.top + cardRect.height / 2 - centerY) /
                    (window.innerHeight / 2);
                const distX =
                    (cardRect.left + cardRect.width / 2 - centerX) /
                    (window.innerWidth / 2);

                // Apply very subtle rotation based on position (max 3 degrees)
                const rotateX = -distY * 3;
                const rotateY = distX * 3;

                // Apply a subtle depth effect based on position
                const translateZ = 5 - Math.abs(distY) * 3;

                // Apply easing for more natural feel (cube easing)
                const easedRotateX =
                    Math.sign(rotateX) * Math.pow(Math.abs(rotateX / 3), 2) * 3;
                const easedRotateY =
                    Math.sign(rotateY) * Math.pow(Math.abs(rotateY / 3), 2) * 3;

                // Apply transform with subtle easing
                card.style.transform = `perspective(1200px) rotateX(${easedRotateX}deg) rotateY(${easedRotateY}deg) translateZ(${translateZ}px)`;
            });
        }
    }

    // Handle orientation and resize changes
    @HostListener('window:resize', ['{ passive: true }'])
    onResize() {
        // Update mobile status
        this.isMobile = this.isMobil();

        // Update animations on resize
        if (!this.scrollAnimationActive && !this.rafId) {
            this.scrollAnimationActive = true;
            this.rafId = requestAnimationFrame(() => {
                this.animateOnScroll();
                this.scrollAnimationActive = false;
                this.rafId = null;
            });
        }
    }
}
