// tourism.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { TourismService } from '../service/tourism.service';
import { ImportsModule } from 'src/app/demo/services/import';
import { Card3dComponent } from '../directive/card-3d.component';
import { Router } from '@angular/router';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';

@Component({
    selector: 'app-tourism',
    templateUrl: './tourism.component.html',
    styleUrls: ['./tourism.component.scss'],
    standalone: true,
    imports: [ImportsModule, Card3dComponent],
    providers: [MessageService],
})
export class TourismComponent implements OnInit, OnDestroy {
    activities$: Observable<any[]>;
    mostVisited$: Observable<any[]>;
    filteredFichas$: Observable<any[]>;

    responsiveOptions = [
        {
            breakpoint: '1400px',
            numVisible: 2,
            numScroll: 1,
        },
        {
            breakpoint: '1199px',
            numVisible: 3,
            numScroll: 1,
        },
        {
            breakpoint: '767px',
            numVisible: 2,
            numScroll: 1,
        },
        {
            breakpoint: '575px',
            numVisible: 1,
            numScroll: 1,
        },
    ];

    selectedActivities = new Set<string>();

    loading$: Observable<boolean>;

    private destroy$ = new Subject<void>();

    constructor(
        private tourismService: TourismService,
        private messageService: MessageService,
        private router: Router
    ) {}

    ngOnInit(): void {
        // Subscribe to loading state
        this.loading$ = this.tourismService.loading$.pipe(
            map(
                (loadingState) =>
                    loadingState['activities'] ||
                    loadingState['fichas'] ||
                    loadingState['mostVisited']
            )
        );

        // Initialize data streams
        this.activities$ = this.tourismService.getActivities();
        this.mostVisited$ = this.tourismService.getMostVisited();

        // Initialize filtered fichas
        this.updateFilteredFichas();

        // Auto-refresh stale data when component initializes
        this.checkForStaleData();
    }

    goMaps(label: string): void {
        this.router.navigate(['/mapa-turistico/maps'], {
            queryParams: { name: label },
        });
    }

    goList(label: string): void {
        this.router.navigate(['/mapa-turistico/list'], {
            queryParams: { name: label },
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Toggle activity selection for filtering
     */
    toggleActivity(activityId: string): void {
        if (this.selectedActivities.has(activityId)) {
            this.selectedActivities.delete(activityId);
        } else {
            this.selectedActivities.add(activityId);
        }

        this.updateFilteredFichas();
    }

    /**
     * Update filtered fichas based on selected activities
     */
    private updateFilteredFichas(): void {
        this.filteredFichas$ = this.tourismService.filterFichasByActivities(
            this.selectedActivities
        );
    }

    /**
     * Manually refresh data
     */
    refreshData(type: 'activities' | 'fichas' | 'mostVisited' | 'all'): void {
        this.tourismService
            .refreshData(type)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Datos actualizados',
                    detail: 'La información ha sido actualizada correctamente',
                });

                // Update filtered fichas if we refreshed fichas
                if (type === 'fichas' || type === 'all') {
                    this.updateFilteredFichas();
                }
            });
    }

    /**
     * Check for stale data and refresh if needed
     */
    private checkForStaleData(): void {
        const needsRefresh = {
            activities: this.tourismService.isDataStale('activities'),
            fichas: this.tourismService.isDataStale('fichas'),
            mostVisited: this.tourismService.isDataStale('mostVisited'),
        };

        // If all are stale, refresh all at once
        if (
            needsRefresh.activities &&
            needsRefresh.fichas &&
            needsRefresh.mostVisited
        ) {
            this.refreshData('all');
            return;
        }

        // Otherwise refresh individual stale data
        if (needsRefresh.activities) {
            this.tourismService
                .refreshData('activities')
                .pipe(takeUntil(this.destroy$))
                .subscribe();
        }

        if (needsRefresh.fichas) {
            this.tourismService
                .refreshData('fichas')
                .pipe(takeUntil(this.destroy$))
                .subscribe(() => this.updateFilteredFichas());
        }

        if (needsRefresh.mostVisited) {
            this.tourismService
                .refreshData('mostVisited')
                .pipe(takeUntil(this.destroy$))
                .subscribe();
        }
    }

    url: string = GLOBAL.url;
    // Configuración ajustable para diferentes dispositivos
    effectSettings = {
        // Valores predeterminados para dispositivos de alta capacidad
        cardTiltAmount: 10,
        cardDepth: 30,
        parallaxStrength: 0.3,
        useAdvancedEffects: true,
        imageScaling: 'high', // Controlar calidad de imagen: 'high', 'medium', 'low'
        animationDuration: '0.2s',
        useHardwareAcceleration: true,
    };

    /**
     * Obtener URL de imagen optimizada según la calidad configurada
     * Esta función se puede usar en la plantilla con:
     * [src]="getOptimizedImageUrl(place.foto[0])"
     */
    getOptimizedImageUrl(photoPath: string): string {
        const baseUrl = this.url + 'obtener_imagen/ficha_sectorial/';
        return baseUrl + photoPath;
    }
}
