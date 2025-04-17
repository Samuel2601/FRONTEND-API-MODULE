import { Injectable, OnDestroy } from '@angular/core';
import {
    Observable,
    of,
    forkJoin,
    BehaviorSubject,
    Subject,
    throwError,
} from 'rxjs';
import {
    map,
    tap,
    shareReplay,
    catchError,
    takeUntil,
    finalize,
    switchMap,
} from 'rxjs/operators';
import { CacheService } from 'src/app/demo/services/cache.service';
import { FilterService } from 'src/app/demo/services/filter.service';
import { ListService } from 'src/app/demo/services/list.service';

interface TourismActivity {
    label: string;
    icon: string;
    _id: string;
    url_pdf: string;
}

interface TourismFicha {
    title_marcador: string;
    image: string;
    _id: string;
    foto: string;
    direccion: string;
    me_gusta: any[];
    comentarios: any[];
    lat: number;
    lng: number;
    actividadId: string | null;
    actividadNombre: string | null;
    created_at: Date;
}

interface MostVisitedPlace
    extends Omit<
        TourismFicha,
        'lat' | 'lng' | 'actividadId' | 'actividadNombre'
    > {
    title: string;
}

const CACHE_KEYS = {
    ACTIVITIES: 'tourism_activities',
    FICHAS: 'tourism_fichas',
    MOST_VISITED: 'tourism_most_visited',
};

const CACHE_DURATION = {
    ACTIVITIES: 30 * 60 * 1000, // 30 minutes
    FICHAS: 20 * 60 * 1000, // 20 minutes
    MOST_VISITED: 15 * 60 * 1000, // 15 minutes
    FICHA_DETAIL: 10 * 60 * 1000, // 10 minutes
};

@Injectable({
    providedIn: 'root',
})
export class TourismService implements OnDestroy {
    private activitiesCache$ = new BehaviorSubject<TourismActivity[]>([]);
    private allFichasCache$ = new BehaviorSubject<TourismFicha[]>([]);
    private mostVisitedCache$ = new BehaviorSubject<MostVisitedPlace[]>([]);

    // Use a single loading subject to track all loading states
    private loadingSubject$ = new BehaviorSubject<{ [key: string]: boolean }>({
        activities: false,
        fichas: false,
        mostVisited: false,
    });

    // Observable for loading states that components can subscribe to
    public loading$ = this.loadingSubject$.asObservable();

    // For cleanup when the service is destroyed
    private destroy$ = new Subject<void>();

    constructor(
        private listService: ListService,
        private filterService: FilterService,
        private cacheService: CacheService
    ) {
        // Initialize cache from localStorage on service creation
        this.initializeFromCache();

        // Set up window storage event listener to handle multiple tabs
        this.setupStorageEventListener();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Set up storage event listener to detect changes from other tabs
     */
    private setupStorageEventListener(): void {
        window.addEventListener('storage', (event) => {
            // Only process if it's our cache keys
            if (event.key?.startsWith('tourism_')) {
                switch (event.key) {
                    case CACHE_KEYS.ACTIVITIES:
                        this.activitiesCache$.next(
                            this.cacheService.get<TourismActivity[]>(
                                CACHE_KEYS.ACTIVITIES
                            ) || []
                        );
                        break;
                    case CACHE_KEYS.MOST_VISITED:
                        this.mostVisitedCache$.next(
                            this.cacheService.get<MostVisitedPlace[]>(
                                CACHE_KEYS.MOST_VISITED
                            ) || []
                        );
                        break;
                    default:
                        // For chunked data or individual ficha data
                        if (event.key.startsWith(CACHE_KEYS.FICHAS)) {
                            const allFichas =
                                this.cacheService.getChunkedData<TourismFicha>(
                                    CACHE_KEYS.FICHAS
                                );
                            if (allFichas && allFichas.length > 0) {
                                this.allFichasCache$.next(allFichas);
                            }
                        }
                        break;
                }
            }
        });
    }

    /**
     * Initialize data from cache if available
     */
    private initializeFromCache(): void {
        const activities = this.cacheService.get<TourismActivity[]>(
            CACHE_KEYS.ACTIVITIES
        );
        if (activities && activities.length > 0) {
            this.activitiesCache$.next(activities);
        }

        const allFichas = this.cacheService.getChunkedData<TourismFicha>(
            CACHE_KEYS.FICHAS
        );
        if (allFichas && allFichas.length > 0) {
            this.allFichasCache$.next(allFichas);
        }

        const mostVisited = this.cacheService.get<MostVisitedPlace[]>(
            CACHE_KEYS.MOST_VISITED
        );
        if (mostVisited && mostVisited.length > 0) {
            this.mostVisitedCache$.next(mostVisited);
        }
    }

    /**
     * Update loading state
     */
    private updateLoadingState(key: string, isLoading: boolean): void {
        this.loadingSubject$.next({
            ...this.loadingSubject$.value,
            [key]: isLoading,
        });
    }

    /**
     * Get tourism activities with caching
     */
    getActivities(): Observable<TourismActivity[]> {
        // Return cached data if available
        if (
            this.activitiesCache$.value.length > 0 &&
            !this.loadingSubject$.value['activities']
        ) {
            return this.activitiesCache$.asObservable();
        }

        // If already loading, just return the current observable
        if (this.loadingSubject$.value['activities']) {
            return this.activitiesCache$.asObservable();
        }

        // Set loading state
        this.updateLoadingState('activities', true);

        // Fetch fresh data
        this.listService
            .listarTiposActividadesProyecto(null, { is_tourism: true })
            .pipe(
                map((response: any) => {
                    if (response.data) {
                        return response.data.map((item: any) => ({
                            label: item.nombre,
                            icon: item.icono,
                            _id: item._id,
                            url_pdf: item.url_pdf,
                        }));
                    }
                    return [];
                }),
                catchError((err) => {
                    console.error('Error loading activities:', err);
                    return of([]);
                }),
                finalize(() => this.updateLoadingState('activities', false)),
                takeUntil(this.destroy$)
            )
            .subscribe((activities) => {
                // Cache the data with persistent storage
                this.cacheService.set(
                    CACHE_KEYS.ACTIVITIES,
                    activities,
                    CACHE_DURATION.ACTIVITIES
                );
                this.activitiesCache$.next(activities);
            });

        return this.activitiesCache$.asObservable();
    }

    /**
     * Get all tourism fichas with caching
     */
    getAllFichas(): Observable<TourismFicha[]> {
        // Return cached data if available
        if (
            this.allFichasCache$.value.length > 0 &&
            !this.loadingSubject$.value['fichas']
        ) {
            return this.allFichasCache$.asObservable();
        }

        // If already loading, just return the current observable
        if (this.loadingSubject$.value['fichas']) {
            return this.allFichasCache$.asObservable();
        }

        // Set loading state
        this.updateLoadingState('fichas', true);

        // Fetch fresh data
        this.listService
            .listarFichaSectorial(null, {
                view: true,
                view_date_evento: false,
                select: [
                    'title_marcador',
                    'icono_marcador',
                    'foto',
                    'direccion_geo',
                    'me_gusta',
                    'comentarios',
                    'created_at',
                    'actividad',
                    'direccion_geo',
                ],
            })
            .pipe(
                map((response: any) => {
                    if (response.data) {
                        return response.data
                            .map((item: any) => {
                                if (item.actividad?.is_tourism) {
                                    return {
                                        title_marcador: item.title_marcador,
                                        image: item.icono_marcador,
                                        _id: item._id,
                                        foto: item.foto,
                                        direccion:
                                            item.direccion_geo?.nombre || '',
                                        me_gusta: item.me_gusta || [],
                                        comentarios: item.comentarios || [],
                                        lat: item.direccion_geo?.latitud || 0,
                                        lng: item.direccion_geo?.longitud || 0,
                                        actividadId:
                                            item.actividad?._id || null,
                                        actividadNombre:
                                            item.actividad?.nombre || null,
                                        created_at: item.created_at
                                            ? new Date(item.created_at)
                                            : new Date(),
                                    };
                                }
                                return null;
                            })
                            .filter(Boolean);
                    }
                    return [];
                }),
                catchError((err) => {
                    console.error('Error loading fichas:', err);
                    return of([]);
                }),
                finalize(() => this.updateLoadingState('fichas', false)),
                takeUntil(this.destroy$)
            )
            .subscribe((fichas) => {
                // Cache the data in chunks with persistent storage
                this.cacheService.saveChunkedData(
                    fichas,
                    CACHE_KEYS.FICHAS,
                    50,
                    CACHE_DURATION.FICHAS
                );
                this.allFichasCache$.next(fichas);
            });

        return this.allFichasCache$.asObservable();
    }

    /**
     * Get most visited places with caching
     */
    getMostVisited(): Observable<MostVisitedPlace[]> {
        // Return cached data if available
        if (
            this.mostVisitedCache$.value.length > 0 &&
            !this.loadingSubject$.value['mostVisited']
        ) {
            return this.mostVisitedCache$.asObservable();
        }

        // If already loading, just return the current observable
        if (this.loadingSubject$.value['mostVisited']) {
            return this.mostVisitedCache$.asObservable();
        }

        // Set loading state
        this.updateLoadingState('mostVisited', true);

        // Fetch fresh data
        this.listService
            .listarFichaSectorial(null, {
                view: true,
                view_date_evento: false,
                select: [
                    'title_marcador',
                    'icono_marcador',
                    'foto',
                    'direccion_geo',
                    'me_gusta',
                    'comentarios',
                    'created_at',
                    'actividad',
                    'direccion_geo',
                ],
            })
            .pipe(
                map((response: any) => {
                    if (response.data) {
                        return response.data
                            .map((item: any) => {
                                if (
                                    item.actividad?.is_tourism &&
                                    item.title_marcador
                                ) {
                                    return {
                                        title: item.title_marcador,
                                        image: item.icono_marcador,
                                        _id: item._id,
                                        foto: item.foto,
                                        direccion:
                                            item.direccion_geo?.nombre || '',
                                        me_gusta: item.me_gusta || [],
                                        comentarios: item.comentarios || [],
                                        created_at: new Date(item.created_at),
                                    };
                                }
                                return null;
                            })
                            .filter(Boolean)
                            .sort(
                                (a: MostVisitedPlace, b: MostVisitedPlace) => {
                                    const likesA = a.me_gusta.length;
                                    const likesB = b.me_gusta.length;
                                    const commentsA = a.comentarios.length;
                                    const commentsB = b.comentarios.length;

                                    if (likesB !== likesA)
                                        return likesB - likesA;
                                    if (commentsB !== commentsA)
                                        return commentsB - commentsA;
                                    return (
                                        b.created_at.getTime() -
                                        a.created_at.getTime()
                                    );
                                }
                            )
                            .slice(0, 10);
                    }
                    return [];
                }),
                catchError((err) => {
                    console.error('Error loading most visited:', err);
                    return of([]);
                }),
                finalize(() => this.updateLoadingState('mostVisited', false)),
                takeUntil(this.destroy$)
            )
            .subscribe((mostVisited) => {
                // Cache the data with persistent storage
                this.cacheService.set(
                    CACHE_KEYS.MOST_VISITED,
                    mostVisited,
                    CACHE_DURATION.MOST_VISITED
                );
                this.mostVisitedCache$.next(mostVisited);
            });

        return this.mostVisitedCache$.asObservable();
    }

    /**
     * Load all tourism data in parallel
     */
    loadAllData(): Observable<
        [TourismActivity[], TourismFicha[], MostVisitedPlace[]]
    > {
        return forkJoin([
            this.getActivities(),
            this.getAllFichas(),
            this.getMostVisited(),
        ]);
    }

    /**
     * Filter fichas by selected activities
     */
    filterFichasByActivities(
        selectedActivities: Set<string>
    ): Observable<TourismFicha[]> {
        return this.getAllFichas().pipe(
            map((allFichas) => {
                if (selectedActivities.size === 0) {
                    return allFichas; // Return all if nothing selected
                }

                return allFichas.filter(
                    (ficha) =>
                        ficha.actividadId &&
                        selectedActivities.has(ficha.actividadId)
                );
            }),
            // Use shareReplay to avoid multiple executions if there are multiple subscribers
            shareReplay(1)
        );
    }

    /**
     * Get a specific ficha by ID with caching
     */
    getFichaById(fichaId: string): Observable<any> {
        if (!fichaId) {
            return throwError(() => new Error('Ficha ID is required'));
        }

        const cacheKey = `tourism_ficha_${fichaId}`;

        // Try to get from cache first
        if (this.cacheService.has(cacheKey)) {
            return of(this.cacheService.get(cacheKey));
        }

        // Try to find in our cached fichas
        const cachedFicha = this.allFichasCache$.value.find(
            (f) => f._id === fichaId
        );
        if (cachedFicha) {
            this.cacheService.set(
                cacheKey,
                cachedFicha,
                CACHE_DURATION.FICHA_DETAIL
            );
            return of(cachedFicha);
        }

        // Otherwise, fetch from API
        return this.filterService.obtenerFichaPublica(fichaId).pipe(
            map((response: any) => response.data),
            tap((ficha) => {
                if (ficha) {
                    this.cacheService.set(
                        cacheKey,
                        ficha,
                        CACHE_DURATION.FICHA_DETAIL
                    );
                }
            }),
            catchError((err) => {
                console.error(`Error fetching ficha ${fichaId}:`, err);
                return of(null);
            }),
            // Use shareReplay to avoid multiple executions if there are multiple subscribers
            shareReplay(1)
        );
    }

    /**
     * Refresh a specific data type
     */
    refreshData(
        type: 'activities' | 'fichas' | 'mostVisited' | 'all'
    ): Observable<any> {
        // Invalidate the cache first
        this.invalidateCache(type);

        // Then load fresh data
        switch (type) {
            case 'activities':
                return this.getActivities();
            case 'fichas':
                return this.getAllFichas();
            case 'mostVisited':
                return this.getMostVisited();
            case 'all':
                return this.loadAllData();
            default:
                return throwError(() => new Error('Invalid data type'));
        }
    }

    /**
     * Check if data is stale and needs refreshing
     */
    isDataStale(type: 'activities' | 'fichas' | 'mostVisited'): boolean {
        switch (type) {
            case 'activities':
                return !this.cacheService.isValid(CACHE_KEYS.ACTIVITIES);
            case 'fichas':
                return !this.cacheService.isChunkedDataValid(CACHE_KEYS.FICHAS);
            case 'mostVisited':
                return !this.cacheService.isValid(CACHE_KEYS.MOST_VISITED);
            default:
                return true;
        }
    }

    /**
     * Invalidate specific cache entries when data changes
     */
    invalidateCache(
        type: 'activities' | 'fichas' | 'mostVisited' | 'all'
    ): void {
        switch (type) {
            case 'activities':
                this.cacheService.remove(CACHE_KEYS.ACTIVITIES);
                this.activitiesCache$.next([]);
                break;
            case 'fichas':
                this.cacheService.clearChunks(CACHE_KEYS.FICHAS);
                this.allFichasCache$.next([]);
                break;
            case 'mostVisited':
                this.cacheService.remove(CACHE_KEYS.MOST_VISITED);
                this.mostVisitedCache$.next([]);
                break;
            case 'all':
                this.cacheService.remove(CACHE_KEYS.ACTIVITIES);
                this.cacheService.clearChunks(CACHE_KEYS.FICHAS);
                this.cacheService.remove(CACHE_KEYS.MOST_VISITED);
                this.activitiesCache$.next([]);
                this.allFichasCache$.next([]);
                this.mostVisitedCache$.next([]);
                break;
        }
    }
}
