// ===== AUTO SAVE DIRECTIVE =====
import { Directive, Input, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';

@Directive({
    standalone: false,
    selector: '[appAutoSave]',
})
export class AutoSaveDirective implements OnInit, OnDestroy {
    @Input() autoSaveDelay: number = 2000; // 2 segundos por defecto
    @Input() autoSaveCallback?: (value: any) => void;

    private destroy$ = new Subject<void>();
    private saveSubject$ = new Subject<any>();

    constructor(private elementRef: ElementRef, private ngControl: NgControl) {}

    ngOnInit() {
        if (!this.ngControl || !this.ngControl.control) {
            console.warn('AutoSave directive requires a form control');
            return;
        }

        // Configurar auto-guardado
        this.saveSubject$
            .pipe(debounceTime(this.autoSaveDelay), takeUntil(this.destroy$))
            .subscribe((value) => {
                if (this.autoSaveCallback) {
                    this.autoSaveCallback(value);
                }
                this.showSaveIndicator();
            });

        // Escuchar cambios en el control
        this.ngControl.control.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((value) => {
                if (this.ngControl.control?.dirty) {
                    this.saveSubject$.next(value);
                }
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private showSaveIndicator() {
        const element = this.elementRef.nativeElement;
        const indicator = document.createElement('span');
        indicator.className = 'auto-save-indicator';
        indicator.textContent = '✓ Guardado';
        indicator.style.cssText = `
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      color: #4caf50;
      font-size: 12px;
      pointer-events: none;
      opacity: 1;
      transition: opacity 0.3s ease;
    `;

        // Posicionar relativo al elemento padre
        const parent = element.parentElement;
        if (parent) {
            parent.style.position = 'relative';
            parent.appendChild(indicator);

            // Remover después de 2 segundos
            setTimeout(() => {
                indicator.style.opacity = '0';
                setTimeout(() => {
                    if (indicator.parentElement) {
                        indicator.parentElement.removeChild(indicator);
                    }
                }, 300);
            }, 2000);
        }
    }
}

