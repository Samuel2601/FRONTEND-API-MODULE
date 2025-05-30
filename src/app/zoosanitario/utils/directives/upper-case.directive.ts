// ===== UPPER CASE DIRECTIVE =====
import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
    selector: '[appUpperCase]',
})
export class UpperCaseDirective {
    @Input() appUpperCase: 'full' | 'first' | 'words' = 'full';

    constructor(private elementRef: ElementRef, private ngControl: NgControl) {}

    @HostListener('input', ['$event'])
    onInput(event: Event) {
        const input = event.target as HTMLInputElement;
        const value = input.value;
        let transformedValue: string;

        switch (this.appUpperCase) {
            case 'full':
                transformedValue = value.toUpperCase();
                break;
            case 'first':
                transformedValue =
                    value.charAt(0).toUpperCase() + value.slice(1);
                break;
            case 'words':
                transformedValue = value.replace(/\b\w/g, (l) =>
                    l.toUpperCase()
                );
                break;
            default:
                transformedValue = value;
        }

        if (transformedValue !== value) {
            input.value = transformedValue;

            // Actualizar el control del formulario si existe
            if (this.ngControl && this.ngControl.control) {
                this.ngControl.control.setValue(transformedValue, {
                    emitEvent: false,
                });
            }
        }
    }

    @HostListener('blur', ['$event'])
    onBlur(event: Event) {
        // Aplicar transformación final al perder el foco
        this.onInput(event);
    }
}
