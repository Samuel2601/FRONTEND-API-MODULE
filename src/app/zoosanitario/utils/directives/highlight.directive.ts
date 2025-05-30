// ===== HIGHLIGHT DIRECTIVE =====
import {
    Directive,
    ElementRef,
    Input,
    OnChanges,
    Renderer2,
} from '@angular/core';

@Directive({
    selector: '[appHighlight]',
})
export class HighlightDirective implements OnChanges {
    @Input() appHighlight: string = '';
    @Input() highlightColor: string = '#ffeb3b';
    @Input() highlightClass: string = '';

    constructor(private elementRef: ElementRef, private renderer: Renderer2) {}

    ngOnChanges() {
        this.highlight();
    }

    private highlight() {
        const element = this.elementRef.nativeElement;
        const text = element.textContent || element.innerText || '';

        if (
            !this.appHighlight ||
            !text.toLowerCase().includes(this.appHighlight.toLowerCase())
        ) {
            // Restaurar texto original si no hay coincidencia
            element.innerHTML = text;
            return;
        }

        const regex = new RegExp(
            `(${this.escapeRegExp(this.appHighlight)})`,
            'gi'
        );
        const highlightedText = text.replace(regex, (match) => {
            if (this.highlightClass) {
                return `<span class="${this.highlightClass}">${match}</span>`;
            } else {
                return `<span style="background-color: ${this.highlightColor}; padding: 2px;">${match}</span>`;
            }
        });

        element.innerHTML = highlightedText;
    }

    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
