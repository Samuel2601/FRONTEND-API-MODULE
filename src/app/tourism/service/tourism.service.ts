import { Injectable } from '@angular/core';
import { Observable, of, forkJoin, BehaviorSubject } from 'rxjs';
import { map, tap, shareReplay, catchError } from 'rxjs/operators';
import { CacheService } from 'src/app/demo/services/cache.service';
import { FilterService } from 'src/app/demo/services/filter.service';
import { ListService } from 'src/app/demo/services/list.service';

@Injectable({
    providedIn: 'root',
})
export class TourismService {
    private activitiesCache$ = new BehaviorSubject<any[]>([]);
    private allFichasCache$ = new BehaviorSubject<any[]>([]);
    private mostVisitedCache$ = new BehaviorSubject<any[]>([]);

    // Loading states
    private loadingActivities = false;
    private loadingFichas = false;
    private loadingMostVisited = false;

    constructor(
        private listService: ListService,
        private filterService: FilterService,
        private cacheService: CacheService
    ) {
        // Initialize cache from localStorage on service creation
        this.initializeFromCache();
    }

    /**
     * Initialize data from cache if available
     */
    private initializeFromCache(): void {
        const activities = this.cacheService.get<any[]>('tourism_activities');
        if (activities && activities.length > 0) {
            this.activitiesCache$.next(activities);
        }

        const allFichas =
            this.cacheService.getChunkedData<any>('tourism_fichas');
        if (allFichas && allFichas.length > 0) {
            this.allFichasCache$.next(allFichas);
        }

        const mostVisited = this.cacheService.get<any[]>(
            'tourism_most_visited'
        );
        if (mostVisited && mostVisited.length > 0) {
            this.mostVisitedCache$.next(mostVisited);
        }
    }

    /**
     * Get tourism activities with caching
     */
    getActivities(): Observable<any[]> {
        // If we have cached data and aren't currently loading, return it
        if (this.activitiesCache$.value.length > 0 && !this.loadingActivities) {
            return this.activitiesCache$.asObservable();
        }

        // If we're already loading, just return the observable
        if (this.loadingActivities) {
            return this.activitiesCache$.asObservable();
        }

        // Otherwise, load the data
        this.loadingActivities = true;

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
                tap((activities) => {
                    // Cache the data
                    this.cacheService.set(
                        'tourism_activities',
                        activities,
                        30 * 60 * 1000
                    ); // 30 minutes
                    this.activitiesCache$.next(activities);
                    this.loadingActivities = false;
                })
            )
            .subscribe();

        return this.activitiesCache$.asObservable();
    }

    /**
     * Get all tourism fichas with caching
     */
    getAllFichas(): Observable<any[]> {
        // If we have cached data and aren't currently loading, return it
        if (this.allFichasCache$.value.length > 0 && !this.loadingFichas) {
            return this.allFichasCache$.asObservable();
        }

        // If we're already loading, just return the observable
        if (this.loadingFichas) {
            return this.allFichasCache$.asObservable();
        }

        // Otherwise, load the data
        this.loadingFichas = true;

        this.listService
            .listarFichaSectorial(null, { view: true })
            .pipe(
                map((response: any) => {
                    if (response.data) {
                        return response.data
                            .map((item: any) => {
                                if (item.actividad.is_tourism) {
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
                tap((fichas) => {
                    // Cache the data in chunks for better performance with large datasets
                    this.cacheService.saveChunkedData(
                        fichas,
                        'tourism_fichas',
                        50
                    );
                    this.allFichasCache$.next(fichas);
                    this.loadingFichas = false;
                })
            )
            .subscribe();

        return this.allFichasCache$.asObservable();
    }

    /**
     * Get most visited places with caching
     */
    getMostVisited(): Observable<any[]> {
        // If we have cached data and aren't currently loading, return it
        if (
            this.mostVisitedCache$.value.length > 0 &&
            !this.loadingMostVisited
        ) {
            return this.mostVisitedCache$.asObservable();
        }

        // If we're already loading, just return the observable
        if (this.loadingMostVisited) {
            return this.mostVisitedCache$.asObservable();
        }

        // Otherwise, load the data
        this.loadingMostVisited = true;

        this.listService
            .listarFichaSectorial(null, { view: true })
            .pipe(
                map((response: any) => {
                    if (response.data) {
                        return response.data
                            .map((item: any) => {
                                if (
                                    item.actividad.is_tourism &&
                                    item.title_marcador
                                ) {
                                    return {
                                        title: item.title_marcador,
                                        image: item.icono_marcador,
                                        _id: item._id,
                                        foto: item.foto,
                                        direccion: item.direccion,
                                        me_gusta: item.me_gusta || [],
                                        comentarios: item.comentarios || [],
                                        created_at: new Date(item.created_at),
                                    };
                                }
                                return null;
                            })
                            .filter(Boolean)
                            .sort((a, b) => {
                                const likesA = a.me_gusta.length;
                                const likesB = b.me_gusta.length;
                                const commentsA = a.comentarios.length;
                                const commentsB = b.comentarios.length;

                                if (likesB !== likesA) return likesB - likesA;
                                if (commentsB !== commentsA)
                                    return commentsB - commentsA;
                                return (
                                    b.created_at.getTime() -
                                    a.created_at.getTime()
                                );
                            })
                            .slice(0, 10);
                    }
                    return [];
                }),
                catchError((err) => {
                    console.error('Error loading most visited:', err);
                    return of([]);
                }),
                tap((mostVisited) => {
                    // Cache the data
                    this.cacheService.set(
                        'tourism_most_visited',
                        mostVisited,
                        15 * 60 * 1000
                    ); // 15 minutes
                    this.mostVisitedCache$.next(mostVisited);
                    this.loadingMostVisited = false;
                })
            )
            .subscribe();

        return this.mostVisitedCache$.asObservable();
    }

    /**
     * Load all tourism data in parallel
     */
    loadAllData(): Observable<[any[], any[], any[]]> {
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
    ): Observable<any[]> {
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
            })
        );
    }

    /**
     * Get a specific ficha by ID with caching
     */
    getFichaById(fichaId: string): Observable<any> {
        const cacheKey = `tourism_ficha_${fichaId}`;

        if (this.cacheService.has(cacheKey)) {
            return of(this.cacheService.get(cacheKey));
        }

        // Try to find in our cached fichas first
        const cachedFicha = this.allFichasCache$.value.find(
            (f) => f._id === fichaId
        );
        if (cachedFicha) {
            this.cacheService.set(cacheKey, cachedFicha);
            return of(cachedFicha);
        }

        // Otherwise, fetch from API
        return this.filterService.obtenerFichaPublica(fichaId).pipe(
            map((response: any) => response.data),
            tap((ficha) => {
                if (ficha) {
                    this.cacheService.set(cacheKey, ficha, 10 * 60 * 1000); // 10 minutes
                }
            }),
            catchError((err) => {
                console.error(`Error fetching ficha ${fichaId}:`, err);
                return of(null);
            })
        );
    }

    /**
     * Invalidate specific cache entries when data changes
     */
    invalidateCache(
        type: 'activities' | 'fichas' | 'mostVisited' | 'all'
    ): void {
        switch (type) {
            case 'activities':
                this.cacheService.remove('tourism_activities');
                this.activitiesCache$.next([]);
                break;
            case 'fichas':
                this.cacheService.clearChunks('tourism_fichas');
                this.allFichasCache$.next([]);
                break;
            case 'mostVisited':
                this.cacheService.remove('tourism_most_visited');
                this.mostVisitedCache$.next([]);
                break;
            case 'all':
                this.cacheService.remove('tourism_activities');
                this.cacheService.clearChunks('tourism_fichas');
                this.cacheService.remove('tourism_most_visited');
                this.activitiesCache$.next([]);
                this.allFichasCache$.next([]);
                this.mostVisitedCache$.next([]);
                break;
        }
    }
}
