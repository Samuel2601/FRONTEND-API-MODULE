// ===== CLICK OUTSIDE DIRECTIVE =====
import {
    Directive,
    ElementRef,
    EventEmitter,
    HostListener,
    Output,
} from '@angular/core';

@Directive({
    selector: '[appClickOutside]',
})
export class ClickOutsideDirective {
    @Output() clickOutside = new EventEmitter<Event>();

    constructor(private elementRef: ElementRef) {}

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event) {
        const targetElement = event.target as HTMLElement;

        if (
            targetElement &&
            !this.elementRef.nativeElement.contains(targetElement)
        ) {
            this.clickOutside.emit(event);
        }
    }
}
