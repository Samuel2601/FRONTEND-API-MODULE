import {
    Directive,
    ElementRef,
    Input,
    OnDestroy,
    OnInit,
    Renderer2,
} from '@angular/core';
import { fromEvent, Subject } from 'rxjs';
import { takeUntil, throttleTime } from 'rxjs/operators';

@Directive({
    selector: '[appParallax]',
    standalone: true,
})
export class ParallaxDirective implements OnInit, OnDestroy {
    @Input() ratio: number = 0.3; // Reduced from 0.5 for more subtle movement
    @Input() reverse: boolean = false;
    @Input() is3D: boolean = false;
    @Input() depth: number = 30; // Reduced from 50
    @Input() perspective: number = 1200;
    @Input() tiltAmount: number = 7; // Reduced from 15 for subtler effect
    @Input() tiltEasing: number = 2; // Applies easing curve to tilt (higher = more stable center)
    @Input() disableOnMobile: boolean = true; // Disable 3D effects on mobile
    @Input() mouseTiltRadius: number = 100; // Only apply tilt within this radius in px

    private observer: IntersectionObserver | null = null;
    private destroy$ = new Subject<void>();
    private baseTransform: string = '';
    private element: HTMLElement;
    private isInView: boolean = false;
    private isMobile: boolean = false;
    private windowHeight: number = 0;
    private lastScrollY: number = 0;
    private elementPosition: {
        top: number;
        left: number;
        width: number;
        height: number;
    } = { top: 0, left: 0, width: 0, height: 0 };

    // Track mouse position for smoother transitions
    private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
    private isHovering: boolean = false;
    private rafId: number | null = null;

    constructor(private el: ElementRef, private renderer: Renderer2) {
        this.element = this.el.nativeElement;
    }

    ngOnInit(): void {
        // Check device and motion preferences
        this.checkDeviceAndPreferences();

        // Capture base transform value
        const computedStyle = window.getComputedStyle(this.element);
        this.baseTransform =
            computedStyle.transform !== 'none' ? computedStyle.transform : '';

        // Apply initial 3D settings if enabled
        if (this.is3D && !(this.isMobile && this.disableOnMobile)) {
            this.setup3DEnvironment();
        }

        // Setup performance optimized event listeners
        this.setupIntersectionObserver();
        this.setupScrollEvent();
        this.setupResizeEvent();

        // Only setup mouse interactions if 3D is enabled and not on mobile
        if (this.is3D && !(this.isMobile && this.disableOnMobile)) {
            this.setupMouseEvents();
        }

        // Set initial values and apply first transform
        this.updateElementPosition();
        this.windowHeight = window.innerHeight;
        this.lastScrollY = window.scrollY;
        this.updateParallaxTransform();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();

        if (this.observer) {
            this.observer.disconnect();
        }

        // Cancel any pending animation frame
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
        }
    }

    private checkDeviceAndPreferences(): void {
        // Simple mobile check
        this.isMobile = window.innerWidth <= 768;

        // Respect user's motion preferences
        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        if (prefersReducedMotion) {
            // Disable or significantly reduce effects
            this.ratio = 0.1;
            this.is3D = false;
            this.tiltAmount = 0;
        }
    }

    private setup3DEnvironment(): void {
        const parentElement = this.element.parentElement;
        if (parentElement) {
            this.renderer.setStyle(
                parentElement,
                'perspective',
                `${this.perspective}px`
            );
            this.renderer.setStyle(
                parentElement,
                'transform-style',
                'preserve-3d'
            );
            this.renderer.setStyle(parentElement, 'overflow', 'hidden');
        }

        // Apply 3D styles to the element itself
        this.renderer.setStyle(this.element, 'transform-style', 'preserve-3d');
        this.renderer.setStyle(this.element, 'backface-visibility', 'hidden');

        // Help browser optimize animations
        this.renderer.setStyle(this.element, 'will-change', 'transform');

        // Apply a subtle transition for smoother tilt
        this.renderer.setStyle(
            this.element,
            'transition',
            'transform 0.1s ease-out'
        );
    }

    private setupIntersectionObserver(): void {
        const options = {
            rootMargin: '100px 0px',
            threshold: [0, 0.25, 0.5, 0.75, 1], // Multiple thresholds for smoother transitions
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                // Update visibility status
                this.isInView = entry.isIntersecting;

                if (this.isInView) {
                    // Element just became visible, update position data
                    this.updateElementPosition();
                    this.updateParallaxTransform();
                }
            });
        }, options);

        this.observer.observe(this.element);
    }

    private setupScrollEvent(): void {
        // Use passive event listener for better performance
        fromEvent(window, 'scroll', { passive: true })
            .pipe(
                throttleTime(10), // ~100fps max
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                if (this.isInView) {
                    // Use requestAnimationFrame for smoother animations
                    if (this.rafId === null) {
                        this.rafId = requestAnimationFrame(() => {
                            this.updateParallaxTransform();
                            this.rafId = null;
                        });
                    }
                }
            });
    }

    private setupResizeEvent(): void {
        fromEvent(window, 'resize', { passive: true })
            .pipe(
                throttleTime(100), // Don't need to update as frequently on resize
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                // Re-check device type on resize
                this.checkDeviceAndPreferences();

                // Update dimensions
                this.windowHeight = window.innerHeight;
                this.updateElementPosition();

                if (this.isInView) {
                    this.updateParallaxTransform();
                }
            });
    }

    private setupMouseEvents(): void {
        // Only track mouse on larger displays
        if (this.isMobile && this.disableOnMobile) return;

        const parent = this.element.parentElement || document.body;

        // Track mouse movements
        fromEvent(parent, 'mousemove', { passive: true })
            .pipe(throttleTime(10), takeUntil(this.destroy$))
            .subscribe((event: Event) => {
                if (this.isInView && this.isHovering) {
                    const mouseEvent = event as MouseEvent;
                    // Store mouse position
                    this.mousePosition = {
                        x: mouseEvent.clientX,
                        y: mouseEvent.clientY,
                    };

                    // Apply tilt on next frame
                    if (this.rafId === null) {
                        this.rafId = requestAnimationFrame(() => {
                            this.applyTiltEffect();
                            this.rafId = null;
                        });
                    }
                }
            });

        // Track when mouse enters the element's parent
        fromEvent(parent, 'mouseenter')
            .pipe(takeUntil(this.destroy$))
            .subscribe((event: Event) => {
                if (this.isInView) {
                    this.isHovering = true;

                    // Capture initial position
                    const mouseEvent = event as MouseEvent;
                    this.mousePosition = {
                        x: mouseEvent.clientX,
                        y: mouseEvent.clientY,
                    };

                    this.applyTiltEffect();
                }
            });

        // Reset when mouse leaves
        fromEvent(parent, 'mouseleave')
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.isHovering = false;

                // Reset tilt, keeping scroll parallax
                this.updateParallaxTransform();
            });
    }

    private updateElementPosition(): void {
        const rect = this.element.getBoundingClientRect();
        this.elementPosition = {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
        };
    }

    private updateParallaxTransform(): void {
        const scrollY = window.scrollY;

        // Only update if scroll position changed significantly
        if (Math.abs(scrollY - this.lastScrollY) < 1 && !this.isHovering) {
            return;
        }

        this.lastScrollY = scrollY;

        // Calculate vertical parallax effect
        const elementCenter =
            this.elementPosition.top + this.elementPosition.height / 2;
        const windowCenter = scrollY + this.windowHeight / 2;
        const distance = elementCenter - windowCenter;

        // Apply parallax with direction control
        const factor = this.reverse ? -this.ratio : this.ratio;
        const translateY = distance * factor;

        // Start with the vertical parallax
        let transform = `translateY(${translateY}px)`;

        // Add 3D depth effect if enabled
        if (this.is3D && !(this.isMobile && this.disableOnMobile)) {
            // Make elements closer to center of screen appear "closer" to viewer
            const viewportPosition =
                (elementCenter - scrollY) / this.windowHeight;

            // Smooth curve: closer to center = closer to viewer
            const distanceFromCenter = Math.abs(viewportPosition - 0.5) * 2; // 0-1
            const zTranslation =
                this.depth * (1 - Math.pow(distanceFromCenter, 2));

            transform = `translateY(${translateY}px) translateZ(${zTranslation}px)`;
        }

        // Apply base transform plus parallax effect
        if (this.baseTransform) {
            transform = `${this.baseTransform} ${transform}`;
        }

        // Apply final transform
        this.renderer.setStyle(this.element, 'transform', transform);
    }

    private applyTiltEffect(): void {
        if (
            !this.isHovering ||
            !this.is3D ||
            (this.isMobile && this.disableOnMobile)
        ) {
            return;
        }

        const rect = this.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Calculate distance from mouse to center of element
        const dx = this.mousePosition.x - centerX;
        const dy = this.mousePosition.y - centerY;

        // Calculate distance as percentage of element size, capped to mouseTiltRadius
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only apply tilt if mouse is close enough
        if (distance > this.mouseTiltRadius) {
            // Mouse is too far, just apply parallax without tilt
            this.updateParallaxTransform();
            return;
        }

        // Normalize values from -1 to 1 based on element size
        const normalizedX = dx / (rect.width / 2);
        const normalizedY = dy / (rect.height / 2);

        // Apply easing for more stable center (higher value = more stable center)
        const easedX =
            Math.sign(normalizedX) *
            Math.pow(Math.abs(normalizedX), this.tiltEasing);
        const easedY =
            Math.sign(normalizedY) *
            Math.pow(Math.abs(normalizedY), this.tiltEasing);

        // Calculate tilt angles (reverse Y for natural feel)
        const tiltY = easedX * this.tiltAmount;
        const tiltX = -easedY * this.tiltAmount;

        // Start with the base transform + parallax from scroll
        let transform = this.getBaseParallaxTransform();

        // Add rotation
        transform += ` rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

        // Apply final transform
        this.renderer.setStyle(this.element, 'transform', transform);
    }

    private getBaseParallaxTransform(): string {
        // Calculate just the scroll-based parallax part
        const scrollY = window.scrollY;
        const elementCenter =
            this.elementPosition.top + this.elementPosition.height / 2;
        const windowCenter = scrollY + this.windowHeight / 2;
        const distance = elementCenter - windowCenter;

        const factor = this.reverse ? -this.ratio : this.ratio;
        const translateY = distance * factor;

        // Start with basic vertical parallax
        let transform = `translateY(${translateY}px)`;

        // Add Z translation for depth if enabled
        if (this.is3D) {
            const viewportPosition =
                (elementCenter - scrollY) / this.windowHeight;
            const distanceFromCenter = Math.abs(viewportPosition - 0.5) * 2;
            const zTranslation =
                this.depth * (1 - Math.pow(distanceFromCenter, 2));

            transform = `translateY(${translateY}px) translateZ(${zTranslation}px)`;
        }

        // Include base transform if it exists
        if (this.baseTransform) {
            transform = `${this.baseTransform} ${transform}`;
        }

        return transform;
    }
}
