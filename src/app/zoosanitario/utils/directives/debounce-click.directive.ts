// ===== DEBOUNCE CLICK DIRECTIVE =====
import {
    Directive,
    EventEmitter,
    HostListener,
    Input,
    OnDestroy,
    OnInit,
    Output,
} from '@angular/core';
import { Subject, debounceTime, takeUntil } from 'rxjs';

@Directive({
    selector: '[appDebounceClick]',
})
export class DebounceClickDirective implements OnInit, OnDestroy {
    @Input() debounceTime: number = 500;
    @Output() debounceClick = new EventEmitter();

    private clicks = new Subject();
    private destroy$ = new Subject<void>();

    ngOnInit() {
        this.clicks
            .pipe(debounceTime(this.debounceTime), takeUntil(this.destroy$))
            .subscribe((e) => this.debounceClick.emit(e));
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    @HostListener('click', ['$event'])
    clickEvent(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        this.clicks.next(event);
    }
}
