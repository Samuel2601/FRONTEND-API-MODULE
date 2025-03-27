// scroll-animation.service.ts
import { Injectable, NgZone, Renderer2, RendererFactory2 } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class ScrollAnimationService {
    private renderer: Renderer2;
    private observer: IntersectionObserver | null = null;

    constructor(private zone: NgZone, rendererFactory: RendererFactory2) {
        this.renderer = rendererFactory.createRenderer(null, null);
    }

    /**
     * Inicializa el observador para detectar elementos visibles en pantalla
     */
    initScrollObserver() {
        // Solo crear el observador si no existe y si la API está disponible
        if (!this.observer && typeof IntersectionObserver !== 'undefined') {
            const options = {
                root: null, // viewport
                rootMargin: '0px',
                threshold: 0.1, // Elemento visible al 10%
            };

            this.zone.runOutsideAngular(() => {
                this.observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            // Aplicar clase visible a elementos que entran en viewport
                            this.renderer.addClass(entry.target, 'visible');

                            // Opcional: dejar de observar después de que aparece
                            // this.observer?.unobserve(entry.target);
                        } else {
                            // Opcional: quitar clase cuando sale del viewport
                            // this.renderer.removeClass(entry.target, 'visible');
                        }
                    });
                }, options);
            });
        }
    }

    /**
     * Observa un elemento para aplicar animaciones al scroll
     */
    observeElement(element: HTMLElement) {
        if (!this.observer) {
            this.initScrollObserver();
        }

        this.observer?.observe(element);
    }

    /**
     * Observa múltiples elementos buscándolos por selector CSS
     */
    observeElements(selector: string) {
        if (!this.observer) {
            this.initScrollObserver();
        }

        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
            this.observer?.observe(el);
        });
    }

    /**
     * Detiene la observación de un elemento
     */
    unobserveElement(element: HTMLElement) {
        this.observer?.unobserve(element);
    }

    /**
     * Detiene todas las observaciones y libera recursos
     */
    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}
