import { FilterService } from 'src/app/demo/services/filter.service';
import {
    ChangeDetectorRef,
    Component,
    OnInit,
    OnDestroy,
    signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { HelperService } from 'src/app/demo/services/helper.service';
import { ImportsModule } from 'src/app/demo/services/import';
import { DataViewModule } from 'primeng/dataview';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { AuthService } from 'src/app/demo/services/auth.service';
import { CacheService } from 'src/app/demo/services/cache.service';
import { LoginComponent } from '../../login/login.component';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, finalize, take } from 'rxjs/operators';
import { TourismService } from '../../service/tourism.service';

@Component({
    selector: 'app-list',
    standalone: true,
    imports: [
        ImportsModule,
        DataViewModule,
        ButtonModule,
        CommonModule,
        LoginComponent,
    ],
    templateUrl: './list.component.html',
    styleUrl: './list.component.scss',
})
export class ListComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    loginVisible: boolean = false;
    url: string = GLOBAL.url;
    name: string = '';
    actividad: any[] = [];
    selectedActivities: Set<string> = new Set();
    allFichas: any[] = []; // All unfiltered fichas
    layout: 'list' | 'grid' = this.isMobil() ? 'grid' : 'list';
    options = ['list', 'grid'];
    mostVisited = signal<any>([]);
    load_dataview: boolean = false;

    // Sorting options
    sortOrder: number = 0;
    sortField: string = '';
    sortOptions: any = [
        { label: 'Más visitados', value: 'visits:desc' },
        { label: 'Más destacados', value: 'me_gusta:desc' },
        { label: 'Más comentados', value: 'comentarios:desc' },
        { label: 'Nombre (A-Z)', value: 'title_marcador:asc' },
        { label: 'Nombre (Z-A)', value: 'title_marcador:desc' },
    ];

    // Loading state trackers
    private dataLoaded = {
        activities: false,
        fichas: false,
    };

    constructor(
        private router: Router,
        private helperService: HelperService,
        private tourismService: TourismService,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef,
        private auth: AuthService,
        private filterService: FilterService,
        private cacheService: CacheService
    ) {}

    ngOnInit(): void {
        this.name = this.route.snapshot.queryParamMap.get('name') || '';
        console.log('Name received:', this.name);

        // Load all data in parallel
        this.loadData();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load all necessary data in parallel with optimized approach
     */
    private loadData(): void {
        // Set loading state
        this.load_dataview = false;

        // Load activities
        this.tourismService
            .getActivities()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (activities) => {
                    this.actividad = activities;
                    this.dataLoaded.activities = true;
                    console.log('Activities loaded:', this.actividad.length);
                    this.checkAllDataLoaded();
                },
                error: (err) => {
                    console.error('Error loading activities:', err);
                    this.dataLoaded.activities = true;
                    this.checkAllDataLoaded();
                },
            });

        // Load all fichas
        this.tourismService
            .getAllFichas()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (fichas) => {
                    this.allFichas = fichas;
                    this.dataLoaded.fichas = true;
                    console.log('Fichas loaded:', this.allFichas.length);
                    this.checkAllDataLoaded();
                },
                error: (err) => {
                    console.error('Error loading fichas:', err);
                    this.dataLoaded.fichas = true;
                    this.checkAllDataLoaded();
                },
            });
    }

    /**
     * Check if all data has loaded and apply filters
     */
    private checkAllDataLoaded(): void {
        if (this.dataLoaded.activities && this.dataLoaded.fichas) {
            this.applyNameFilter();

            // Allow time for DOM updates
            setTimeout(() => {
                this.load_dataview = true;
            }, 100);
        }
    }

    /**
     * Applies filter based on the name received in the URL
     */
    applyNameFilter(): void {
        if (this.name && this.actividad.length > 0) {
            // Find all activities that match the name
            const matchingActivities = this.actividad.filter(
                (a) => a.label.toLowerCase() === this.name.toLowerCase()
            );

            if (matchingActivities.length > 0) {
                console.log('Matching activities:', matchingActivities);
                // Select all activities that match the name
                this.selectedActivities = new Set(
                    matchingActivities.map((a) => a._id)
                );
            } else {
                console.warn(`No activity found with name: ${this.name}`);
                this.selectedActivities = new Set(); // Don't select any if none exists
            }
        } else if (!this.name) {
            // If no name, select all activities
            this.selectedActivities = new Set(this.actividad.map((a) => a._id));
        }

        // Apply the filter
        this.filterFichas();
    }

    /**
     * Filter fichas based on selected activities
     */
    filterFichas(): void {
        this.load_dataview = false;

        if (this.selectedActivities.size === 0) {
            this.mostVisited.set([...this.allFichas]); // Show all if nothing selected
        } else {
            const filteredFichas = this.allFichas.filter(
                (ficha) =>
                    ficha.actividadId &&
                    this.selectedActivities.has(ficha.actividadId)
            );
            this.mostVisited.set([...filteredFichas]);
        }

        // Apply sorting if needed
        if (this.sortField) {
            this.applySort();
        }

        // Show data with a slight delay to ensure smooth UI updates
        setTimeout(() => {
            this.load_dataview = true;
        }, 100);

        console.log('Filtered mostVisited:', this.mostVisited().length);
    }

    /**
     * Handle activity selection as checkboxes
     */
    toggleActivity(activity: any): void {
        if (this.selectedActivities.has(activity._id)) {
            this.selectedActivities.delete(activity._id);
        } else {
            this.selectedActivities.add(activity._id);
        }
        this.filterFichas(); // Apply filter without making another request
    }

    /**
     * When sort changes
     */
    onSortChange(event: any): void {
        const value = event.value;
        console.log('onSortChange', value);

        if (value.indexOf(':') === -1) {
            this.sortOrder = 1;
            this.sortField = value;
        } else {
            const [field, order] = value.split(':');
            this.sortOrder = order === 'asc' ? 1 : -1;
            this.sortField = field;
        }

        // Apply sorting to existing data
        this.applySort();
    }

    /**
     * Apply sorting to data
     */
    applySort(): void {
        if (!this.sortField || this.sortField.length === 0) {
            return;
        }

        // Get current signal value
        const currentData = this.mostVisited();

        // Create a copy to sort
        const sortedData = [...currentData].sort((a, b) => {
            let value1 = this.resolveFieldData(a, this.sortField);
            let value2 = this.resolveFieldData(b, this.sortField);

            // If field is 'me_gusta' or 'comentarios', compare by length
            if (
                this.sortField === 'me_gusta' ||
                this.sortField === 'comentarios'
            ) {
                const length1 = Array.isArray(value1) ? value1.length : 0;
                const length2 = Array.isArray(value2) ? value2.length : 0;
                return this.sortOrder * (length1 - length2);
            }

            // For text fields
            if (typeof value1 === 'string' && typeof value2 === 'string') {
                return this.sortOrder * value1.localeCompare(value2);
            }

            // For numeric fields
            return this.sortOrder * (value1 - value2);
        });

        // Update signal with sorted data
        this.mostVisited.set(sortedData);
    }

    /**
     * Helper function to get field value
     */
    resolveFieldData(obj: any, field: string): any {
        if (!obj || !field) {
            return null;
        }

        // If field is 'visits', use comments as approximation
        if (field === 'visits') {
            return obj.comentarios ? obj.comentarios.length : 0;
        }

        if (field.indexOf('.') > -1) {
            const fields: string[] = field.split('.');
            let value = obj;
            for (let i = 0, len = fields.length; i < len; ++i) {
                if (value == null) {
                    return null;
                }
                value = value[fields[i]];
            }
            return value;
        }

        return obj[field];
    }

    /**
     * Refresh data
     */
    async refreshData(): Promise<void> {
        await this.filterFichas();
    }

    /**
     * Check if item is liked by current user
     */
    isLiked(item: any): boolean {
        if (this.auth.token()) {
            const userId: string = this.auth.idUserToken();
            return (
                item.me_gusta &&
                item.me_gusta.some(
                    (user) => user._id === userId || user === userId
                )
            );
        }
        return false;
    }

    /**
     * Toggle like on an item
     */
    toggleLike(item: any): void {
        if (!this.auth.token()) {
            this.loginVisible = true; // Open login modal
            return;
        }

        const userId = this.auth.idUserToken();

        // Add optimistic update for better UX
        const previousLikes = [...item.me_gusta];
        const isCurrentlyLiked = this.isLiked(item);

        // Update UI instantly before API response
        if (isCurrentlyLiked) {
            item.me_gusta = item.me_gusta.filter(
                (user) => user._id !== userId && user !== userId
            );
        } else {
            item.me_gusta.push(userId);
        }

        // Make API call
        this.filterService
            .actualizarFichaMeGusta(this.auth.token(), item._id, userId)
            .pipe(finalize(() => this.refreshData()))
            .subscribe({
                next: (response: any) => {
                    console.log('Like updated successfully');
                    if (response.me_gusta) {
                        // Update the ficha in the main array
                        const ficha = this.allFichas.find(
                            (x) => x._id === item._id
                        );
                        if (ficha) {
                            ficha.me_gusta = response.me_gusta;
                        }
                    }
                },
                error: (error) => {
                    console.error('Error updating like: ', error);
                    // Revert the optimistic update on error
                    item.me_gusta = previousLikes;
                },
            });
    }

    /**
     * Navigate to maps view
     */
    goMaps(arg0: any): void {
        this.router.navigate(['/mapa-turistico/maps'], {
            queryParams: { name: arg0 },
        });
    }

    /**
     * Check if device is mobile
     */
    isMobil(): boolean {
        return window.innerWidth <= 575;
    }

    /**
     * Go back to main view
     */
    goBack(): void {
        this.router.navigate(['/mapa-turistico']);
    }
}
