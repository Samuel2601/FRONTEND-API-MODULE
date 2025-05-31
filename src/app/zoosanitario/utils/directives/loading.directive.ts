// ===== LOADING DIRECTIVE =====
import {
    Directive,
    Input,
    ElementRef,
    Renderer2,
    OnChanges,
} from '@angular/core';

@Directive({
    standalone: false,
    selector: '[appLoading]',
})
export class LoadingDirective implements OnChanges {
    @Input() appLoading: boolean = false;
    @Input() loadingText: string = 'Cargando...';
    @Input() loadingColor: string = '#007bff';

    private loadingElement: HTMLElement | null = null;

    constructor(private elementRef: ElementRef, private renderer: Renderer2) {}

    ngOnChanges() {
        if (this.appLoading) {
            this.showLoading();
        } else {
            this.hideLoading();
        }
    }

    private showLoading() {
        if (this.loadingElement) {
            return; // Ya está mostrando loading
        }

        const element = this.elementRef.nativeElement;

        // Crear overlay
        this.loadingElement = this.renderer.createElement('div');
        this.renderer.setStyle(this.loadingElement, 'position', 'absolute');
        this.renderer.setStyle(this.loadingElement, 'top', '0');
        this.renderer.setStyle(this.loadingElement, 'left', '0');
        this.renderer.setStyle(this.loadingElement, 'width', '100%');
        this.renderer.setStyle(this.loadingElement, 'height', '100%');
        this.renderer.setStyle(
            this.loadingElement,
            'background',
            'rgba(255, 255, 255, 0.8)'
        );
        this.renderer.setStyle(this.loadingElement, 'display', 'flex');
        this.renderer.setStyle(this.loadingElement, 'align-items', 'center');
        this.renderer.setStyle(
            this.loadingElement,
            'justify-content',
            'center'
        );
        this.renderer.setStyle(this.loadingElement, 'z-index', '9999');
        this.renderer.setStyle(this.loadingElement, 'border-radius', 'inherit');

        // Crear spinner
        const spinner = this.renderer.createElement('div');
        this.renderer.setStyle(spinner, 'border', `4px solid #f3f3f3`);
        this.renderer.setStyle(
            spinner,
            'border-top',
            `4px solid ${this.loadingColor}`
        );
        this.renderer.setStyle(spinner, 'border-radius', '50%');
        this.renderer.setStyle(spinner, 'width', '40px');
        this.renderer.setStyle(spinner, 'height', '40px');
        this.renderer.setStyle(spinner, 'animation', 'spin 1s linear infinite');
        this.renderer.setStyle(spinner, 'margin-right', '10px');

        // Crear texto
        const text = this.renderer.createText(this.loadingText);
        const textElement = this.renderer.createElement('span');
        this.renderer.appendChild(textElement, text);
        this.renderer.setStyle(textElement, 'color', '#666');
        this.renderer.setStyle(textElement, 'font-size', '14px');

        // Ensamblar elementos
        this.renderer.appendChild(this.loadingElement, spinner);
        this.renderer.appendChild(this.loadingElement, textElement);

        // Asegurar que el elemento padre tenga position relative
        const position = window.getComputedStyle(element).position;
        if (position === 'static') {
            this.renderer.setStyle(element, 'position', 'relative');
        }

        // Agregar al DOM
        this.renderer.appendChild(element, this.loadingElement);

        // Agregar animación CSS si no existe
        this.addSpinAnimation();
    }

    private hideLoading() {
        if (this.loadingElement) {
            this.renderer.removeChild(
                this.elementRef.nativeElement,
                this.loadingElement
            );
            this.loadingElement = null;
        }
    }

    private addSpinAnimation() {
        const styleElement = document.getElementById('loading-spinner-style');
        if (!styleElement) {
            const style = this.renderer.createElement('style');
            this.renderer.setAttribute(style, 'id', 'loading-spinner-style');
            const css = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
            this.renderer.appendChild(style, this.renderer.createText(css));
            this.renderer.appendChild(document.head, style);
        }
    }
}

