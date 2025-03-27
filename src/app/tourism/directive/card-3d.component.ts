import {
    Component,
    ElementRef,
    Input,
    OnDestroy,
    OnInit,
    Renderer2,
} from '@angular/core';
import { fromEvent, Subject } from 'rxjs';
import { takeUntil, throttleTime } from 'rxjs/operators';

@Component({
    selector: 'app-card-3d',
    standalone: true,
    template: `<div class="card-3d-container"><ng-content></ng-content></div>`,
    styles: [
        `
            .card-3d-container {
                position: relative;
                width: 100%;
                height: 100%;
                transform-style: preserve-3d;
                transition: transform 0.1s ease-out;
                will-change: transform;
            }

            :host {
                display: block;
                perspective: 1200px;
                transform-style: preserve-3d;
            }

            /* Apply hardware acceleration for smoother performance */
            :host,
            .card-3d-container {
                backface-visibility: hidden;
                -webkit-backface-visibility: hidden;
                transform: translateZ(0);
            }

            /* Respect user's motion preferences */
            @media (prefers-reduced-motion: reduce) {
                .card-3d-container {
                    transition: none !important;
                    transform: none !important;
                }
            }
        `,
    ],
})
export class Card3dComponent implements OnInit, OnDestroy {
    @Input() tiltAmount: number = 10; // Default tilt amount in degrees (reduced from original)
    @Input() depth: number = 20; // Z-depth effect
    @Input() perspective: number = 1200;
    @Input() transitionSpeed: number = 0.1; // in seconds
    @Input() scale: number = 1.02; // Subtle scale effect on hover
    @Input() disableOnMobile: boolean = true;

    private destroy$ = new Subject<void>();
    private container: HTMLElement | null = null;
    private isMobile: boolean = false;
    private defaultTransform: string = '';
    private isHovering: boolean = false;

    constructor(private el: ElementRef, private renderer: Renderer2) {}

    ngOnInit(): void {
        this.container =
            this.el.nativeElement.querySelector('.card-3d-container');
        this.checkDevice();
        this.setupInitialStyles();
        this.setupEventListeners();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private checkDevice(): void {
        // Simple mobile detection
        this.isMobile = window.innerWidth <= 768;

        // Also respect user's preference for reduced motion
        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        if (prefersReducedMotion) {
            this.tiltAmount = 0;
            this.scale = 1;
        }
    }

    private setupInitialStyles(): void {
        if (!this.container) return;

        // Set perspective on host element
        this.renderer.setStyle(
            this.el.nativeElement,
            'perspective',
            `${this.perspective}px`
        );

        // Store the default transform if any
        const computedStyle = window.getComputedStyle(this.container);
        this.defaultTransform =
            computedStyle.transform !== 'none' ? computedStyle.transform : '';

        // Set initial transition for smooth effects
        this.renderer.setStyle(
            this.container,
            'transition',
            `transform ${this.transitionSpeed}s ease-out`
        );
    }

    private setupEventListeners(): void {
        if (!this.container || (this.isMobile && this.disableOnMobile)) return;

        const element = this.el.nativeElement;

        // Mousemove for tilt effect
        fromEvent(element, 'mousemove')
            .pipe(
                throttleTime(10), // Limit to 100 updates per second for performance
                takeUntil(this.destroy$)
            )
            .subscribe((event: Event) => {
                if (this.isHovering) {
                    this.applyTiltEffect(event as MouseEvent);
                }
            });

        // Mouse enter - start tracking
        fromEvent(element, 'mouseenter')
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.isHovering = true;
                this.applyHoverEffect();
            });

        // Mouse leave - reset
        fromEvent(element, 'mouseleave')
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.isHovering = false;
                this.resetTiltEffect();
            });

        // Handle window resize
        fromEvent(window, 'resize')
            .pipe(throttleTime(100), takeUntil(this.destroy$))
            .subscribe(() => {
                this.checkDevice();
                if (this.isMobile && this.disableOnMobile) {
                    this.resetTiltEffect();
                }
            });
    }

    private applyTiltEffect(event: MouseEvent): void {
        if (!this.container || (this.isMobile && this.disableOnMobile)) return;

        const rect = this.el.nativeElement.getBoundingClientRect();

        // Calculate mouse position relative to card center (from -1 to 1)
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Normalize values from -1 to 1, but add a "dead zone" in the center
        // for a more stable effect (adjust 0.1 to change dead zone size)
        const rawX = (event.clientX - centerX) / (rect.width / 2);
        const rawY = (event.clientY - centerY) / (rect.height / 2);

        // Apply a small dead zone in the center for stability
        const deadZone = 0.1;
        const normalizedX = Math.abs(rawX) < deadZone ? 0 : rawX;
        const normalizedY = Math.abs(rawY) < deadZone ? 0 : rawY;

        // Calculate tilt (reversed Y axis for natural feel)
        const tiltY = normalizedX * this.tiltAmount;
        const tiltX = normalizedY * -this.tiltAmount;

        // Apply easing for more natural movement (quadratic easing)
        const easedTiltY =
            Math.sign(tiltY) *
            Math.pow(Math.abs(tiltY / this.tiltAmount), 1.5) *
            this.tiltAmount;
        const easedTiltX =
            Math.sign(tiltX) *
            Math.pow(Math.abs(tiltX / this.tiltAmount), 1.5) *
            this.tiltAmount;

        // Calculate Z translation to make it appear closer when in center
        const distanceFromCenter = Math.sqrt(
            normalizedX * normalizedX + normalizedY * normalizedY
        );
        const zTranslation = this.depth * (1 - distanceFromCenter);

        // Apply the transform with subtle scale effect
        const transform = `${this.defaultTransform} perspective(${this.perspective}px) rotateX(${easedTiltX}deg) rotateY(${easedTiltY}deg) translateZ(${zTranslation}px) scale(${this.scale})`;

        this.renderer.setStyle(this.container, 'transform', transform);
    }

    private applyHoverEffect(): void {
        if (!this.container || (this.isMobile && this.disableOnMobile)) return;

        // Just apply the scale part if not tracking mouse movement
        if (!this.isHovering) {
            const transform = `${this.defaultTransform} scale(${this.scale})`;
            this.renderer.setStyle(this.container, 'transform', transform);
        }
    }

    private resetTiltEffect(): void {
        if (!this.container) return;

        // Smoothly reset to default state
        const transform = this.defaultTransform || 'none';
        this.renderer.setStyle(this.container, 'transform', transform);
    }
}
