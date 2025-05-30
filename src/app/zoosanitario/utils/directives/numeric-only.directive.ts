// ===== NUMERIC ONLY DIRECTIVE =====
import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
    selector: '[appNumericOnly]',
})
export class NumericOnlyDirective {
    @Input() allowDecimals: boolean = true;
    @Input() allowNegative: boolean = false;
    @Input() maxDecimals: number = 2;

    private regex: RegExp;

    constructor(private elementRef: ElementRef) {
        this.updateRegex();
    }

    ngOnInit() {
        this.updateRegex();
    }

    private updateRegex() {
        let pattern = '^';

        if (this.allowNegative) {
            pattern += '-?';
        }

        pattern += '\\d*';

        if (this.allowDecimals) {
            pattern += `(\\.\\d{0,${this.maxDecimals}})?`;
        }

        pattern += '$';

        this.regex = new RegExp(pattern);
    }

    @HostListener('keydown', ['$event'])
    onKeyDown(event: KeyboardEvent) {
        const key = event.key;

        // Permitir teclas especiales
        if (this.isSpecialKey(key, event)) {
            return;
        }

        // Verificar si el carácter es válido
        const currentValue = this.elementRef.nativeElement.value;
        const newValue = this.getNewValue(currentValue, key, event);

        if (!this.regex.test(newValue)) {
            event.preventDefault();
        }
    }

    @HostListener('paste', ['$event'])
    onPaste(event: ClipboardEvent) {
        event.preventDefault();
        const pastedText = event.clipboardData?.getData('text') || '';
        const currentValue = this.elementRef.nativeElement.value;
        const newValue = currentValue + pastedText;

        if (this.regex.test(newValue)) {
            this.elementRef.nativeElement.value = newValue;
            this.elementRef.nativeElement.dispatchEvent(new Event('input'));
        }
    }

    private isSpecialKey(key: string, event: KeyboardEvent): boolean {
        const specialKeys = [
            'Backspace',
            'Delete',
            'Tab',
            'Escape',
            'Enter',
            'ArrowLeft',
            'ArrowRight',
            'ArrowUp',
            'ArrowDown',
            'Home',
            'End',
            'PageUp',
            'PageDown',
        ];

        return (
            specialKeys.includes(key) ||
            (key === 'a' && event.ctrlKey) || // Ctrl+A
            (key === 'c' && event.ctrlKey) || // Ctrl+C
            (key === 'v' && event.ctrlKey) || // Ctrl+V
            (key === 'x' && event.ctrlKey)
        ); // Ctrl+X
    }

    private getNewValue(
        currentValue: string,
        key: string,
        event: KeyboardEvent
    ): string {
        const element = event.target as HTMLInputElement;
        const start = element.selectionStart || 0;
        const end = element.selectionEnd || 0;

        // Si hay texto seleccionado, se reemplazará
        const beforeSelection = currentValue.substring(0, start);
        const afterSelection = currentValue.substring(end);

        return beforeSelection + key + afterSelection;
    }
}
