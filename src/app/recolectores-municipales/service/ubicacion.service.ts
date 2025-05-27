import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Preferences } from '@capacitor/preferences';
import { registerPlugin } from '@capacitor/core';
import { BehaviorSubject } from 'rxjs';
import { Geolocation } from '@capacitor/geolocation';
import { Network } from '@capacitor/network';
import { AuthService } from 'src/app/demo/services/auth.service';

// Importaciones para background geolocation
import {
    BackgroundGeolocationPlugin,
    WatcherOptions,
    Location,
    CallbackError,
} from '@capacitor-community/background-geolocation';

// Importar las interfaces y utilidades creadas
import {
    IAsignacion,
    IPuntoRecoleccion,
    IDispositivoGPS,
    IValidacionUbicacion,
    IConfigSeguimiento,
    IApiResponse,
    CONFIGURACION_DEFECTO,
    MENSAJES,
    CODIGOS_ERROR,
    CapacidadVehiculo,
} from '../interfaces/recoleccion.interfaces';

import {
    validarUbicacion,
    calcularDistancia,
    RecoleccionLogger,
    medirRendimiento,
} from '../utils/recoleccion.utils';

// Registrar el plugin de background geolocation
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
    'BackgroundGeolocation'
);

@Injectable({
    providedIn: 'root',
})
export class UbicacionService {
    // Estados del servicio con tipado fuerte
    private ubicaciones = new BehaviorSubject<IPuntoRecoleccion[]>([]);
    private retornos = new BehaviorSubject<
        { label: string; value: CapacidadVehiculo }[]
    >([]);
    private velocidadActual = new BehaviorSubject<number>(0);
    private distanciaRecorrida = new BehaviorSubject<number>(0);

    // Control del watcher de background
    private watcherId: string | null = null;
    private isBackgroundTracking = false;

    // Configuración usando las constantes centralizadas
    private readonly config: IConfigSeguimiento = {
        backgroundTracking: false,
        drivingMode: false,
        intervaloMinimo: CONFIGURACION_DEFECTO.SEGUIMIENTO.INTERVALO_MINIMO,
        distanciaMinima: CONFIGURACION_DEFECTO.SEGUIMIENTO.DISTANCIA_MINIMA,
        precisionMaxima: CONFIGURACION_DEFECTO.SEGUIMIENTO.PRECISION_MAXIMA,
        velocidadMaxima: CONFIGURACION_DEFECTO.SEGUIMIENTO.VELOCIDAD_MAXIMA,
    };

    public url: string;

    constructor(private _http: HttpClient, private auth: AuthService) {
        this.url = GLOBAL.url;
        RecoleccionLogger.info('UbicacionService inicializado');
    }

    /**
     * Inicia el seguimiento de ubicación en segundo plano
     * Ahora usa la configuración centralizada y logging consistente
     */
    async iniciarBackgroundTracking(): Promise<boolean> {
        return await medirRendimiento(
            'Iniciar Background Tracking',
            async () => {
                try {
                    // Verificar si ya está activo el tracking
                    if (this.isBackgroundTracking) {
                        RecoleccionLogger.info(
                            'Background tracking ya está activo'
                        );
                        return true;
                    }

                    // Configuración del watcher usando constantes centralizadas
                    const options: WatcherOptions = {
                        backgroundMessage:
                            'La aplicación está rastreando tu ubicación para optimizar las rutas de recolección',
                        backgroundTitle: 'Seguimiento de Recolección Activo',
                        requestPermissions: true,
                        stale: false,
                        distanceFilter: this.config.distanciaMinima,
                    };

                    // Crear el watcher
                    this.watcherId = await BackgroundGeolocation.addWatcher(
                        options,
                        (location: Location, error: CallbackError) => {
                            this.handleBackgroundLocation(location, error);
                        }
                    );

                    this.isBackgroundTracking = true;
                    this.config.backgroundTracking = true;

                    RecoleccionLogger.info('Background tracking iniciado', {
                        watcherId: this.watcherId,
                        config: this.config,
                    });

                    return true;
                } catch (error) {
                    RecoleccionLogger.error(
                        'Error al iniciar background tracking',
                        error
                    );
                    return false;
                }
            }
        );
    }

    /**
     * Maneja las ubicaciones recibidas del background geolocation
     * Ahora usa la validación centralizada y manejo de errores consistente
     */
    private async handleBackgroundLocation(
        location: Location,
        error: CallbackError
    ): Promise<void> {
        // Manejar errores del background geolocation usando códigos centralizados
        if (error) {
            RecoleccionLogger.error('Error en background geolocation', error);

            // Caso especial: permisos denegados usando códigos de error centralizados
            if (error.code === 'NOT_AUTHORIZED') {
                const shouldOpenSettings = confirm(
                    `${MENSAJES.ERROR.ERROR_PERMISOS}\n\n` +
                        'Los permisos de ubicación son necesarios para:\n' +
                        '• Registrar puntos de recolección\n' +
                        '• Optimizar rutas de trabajo\n' +
                        '• Proporcionar informes precisos\n\n' +
                        '¿Deseas abrir la configuración para otorgar permisos?'
                );

                if (shouldOpenSettings) {
                    BackgroundGeolocation.openSettings();
                }
            }
            return;
        }

        // Procesar la ubicación recibida
        if (location && location.latitude && location.longitude) {
            RecoleccionLogger.debug('Nueva ubicación desde background', {
                lat: location.latitude,
                lng: location.longitude,
                accuracy: location.accuracy,
                speed: location.speed,
            });

            // Actualizar velocidad actual
            const velocidadKmh = location.speed ? location.speed * 3.6 : 0;
            this.velocidadActual.next(velocidadKmh);

            // Obtener la asignación actual para vincular la ubicación
            const asignacionActual = await this.getAsignacion();
            if (!asignacionActual) {
                RecoleccionLogger.warn(
                    'No hay asignación activa, no se guardará la ubicación'
                );
                return;
            }

            // Crear objeto de ubicación usando la interface tipada
            const nuevaUbicacion: IPuntoRecoleccion = {
                _id: asignacionActual._id,
                lat: location.latitude,
                lng: location.longitude,
                timestamp: new Date().toISOString(),
                speed: velocidadKmh,
                accuracy: location.accuracy || 0,
                destacado: false,
                retorno: false,
            };

            // Usar la validación centralizada
            const ultimaUbicacion = this.obtenerUltimaUbicacion();
            const validacion = validarUbicacion(
                nuevaUbicacion,
                ultimaUbicacion
            );

            if (validacion.resp) {
                await this.saveLocation(nuevaUbicacion, true);
                RecoleccionLogger.info(
                    'Ubicación de background guardada exitosamente'
                );
            } else {
                RecoleccionLogger.warn('Ubicación de background rechazada', {
                    motivo: validacion.message,
                    codigo: validacion.code,
                });
            }
        }
    }

    /**
     * Detiene el seguimiento de ubicación en segundo plano
     */
    async detenerBackgroundTracking(): Promise<boolean> {
        return await medirRendimiento(
            'Detener Background Tracking',
            async () => {
                try {
                    if (this.watcherId && this.isBackgroundTracking) {
                        await BackgroundGeolocation.removeWatcher({
                            id: this.watcherId,
                        });

                        this.watcherId = null;
                        this.isBackgroundTracking = false;
                        this.config.backgroundTracking = false;

                        RecoleccionLogger.info('Background tracking detenido');
                        return true;
                    }
                    return false;
                } catch (error) {
                    RecoleccionLogger.error(
                        'Error al detener background tracking',
                        error
                    );
                    return false;
                }
            }
        );
    }

    /**
     * Verifica si el background tracking está activo
     */
    isBackgroundTrackingActive(): boolean {
        return this.isBackgroundTracking;
    }

    /**
     * Función mejorada de validación de ubicaciones usando la utilidad centralizada
     * Ya no duplicamos la lógica de validación
     */
    isValidLocation(nuevaUbicacion: IPuntoRecoleccion): IValidacionUbicacion {
        const ultimaUbicacion = this.obtenerUltimaUbicacion();
        return validarUbicacion(nuevaUbicacion, ultimaUbicacion);
    }

    /**
     * Obtiene la última ubicación registrada (excluyendo retornos)
     * Método helper para la validación
     */
    private obtenerUltimaUbicacion(): IPuntoRecoleccion | undefined {
        const ubicaciones = this.ubicaciones.getValue();
        const ubicacionesSinRetorno = ubicaciones.filter((u) => !u.retorno);
        return ubicacionesSinRetorno[ubicacionesSinRetorno.length - 1];
    }

    /**
     * Inicializa el listener de red con manejo de errores mejorado
     */
    async initializeNetworkListener(): Promise<void> {
        try {
            const status = await Network.getStatus();
            let lastStatus = status.connected;
            let hasNotifiedUser = false;

            Network.addListener('networkStatusChange', async (status) => {
                if (!lastStatus && status.connected) {
                    RecoleccionLogger.info(
                        'Conexión restaurada, sincronizando datos'
                    );
                    await this.syncData();
                    hasNotifiedUser = false;
                } else if (!status.connected && !hasNotifiedUser) {
                    RecoleccionLogger.warn('Conexión perdida');
                    alert(
                        MENSAJES.ADVERTENCIA.SIN_CONEXION +
                            '. La próxima vez que te conectes, enviaremos tu información.'
                    );
                    hasNotifiedUser = true;
                }
                lastStatus = status.connected;
            });

            RecoleccionLogger.info('Network listener inicializado');
        } catch (error) {
            RecoleccionLogger.error(
                'Error inicializando network listener',
                error
            );
        }
    }

    /**
     * Sincroniza datos con manejo mejorado de errores y logging
     */
    async syncData(): Promise<void> {
        return await medirRendimiento('Sincronización de datos', async () => {
            try {
                const [locations, asign, capacidad_retorno] = await Promise.all(
                    [
                        Preferences.get({ key: 'locations' }),
                        Preferences.get({ key: 'asign' }),
                        Preferences.get({ key: 'capacidad_retorno' }),
                    ]
                );

                if (locations.value && asign.value) {
                    const parsedLocations: IPuntoRecoleccion[] = JSON.parse(
                        locations.value
                    );
                    const parsedAsign: IAsignacion = JSON.parse(asign.value);
                    const parseCapacidad = JSON.parse(
                        capacidad_retorno.value || '[]'
                    );
                    const token = this.auth.token();

                    if (!token || typeof token !== 'string') {
                        throw new Error(CODIGOS_ERROR.ASIGNACION_NO_ENCONTRADA);
                    }

                    RecoleccionLogger.info('Iniciando sincronización', {
                        puntosCount: parsedLocations.length,
                        asignacionId: parsedAsign._id,
                    });

                    const result = await this.updateRutaRecolector(
                        token,
                        parsedAsign._id,
                        { puntos_recoleccion: parsedLocations }
                    ).toPromise();

                    const nuevosSolo = parseCapacidad.slice(
                        result.data.capacidad_retorno.length
                    );
                    const capacidadCombinada = [
                        ...result.data.capacidad_retorno,
                        ...nuevosSolo,
                    ];

                    await this.updateRutaRecolector(token, parsedAsign._id, {
                        capacidad_retorno: capacidadCombinada,
                    }).toPromise();

                    RecoleccionLogger.info(
                        'Sincronización completada exitosamente'
                    );
                    alert(MENSAJES.EXITO.DATOS_SINCRONIZADOS);
                } else {
                    RecoleccionLogger.warn('No hay datos para sincronizar');
                }
            } catch (error) {
                RecoleccionLogger.error('Error al sincronizar datos', error);
                throw error;
            }
        });
    }

    /**
     * Carga ubicaciones iniciales con mejor manejo de errores
     */
    async loadInitialLocations(): Promise<void> {
        try {
            const [locations, capacidad_retorno] = await Promise.all([
                Preferences.get({ key: 'locations' }),
                Preferences.get({ key: 'capacidad_retorno' }),
            ]);

            const asignID = await this.getAsignacion();

            if (locations.value) {
                const parsedLocations: IPuntoRecoleccion[] = JSON.parse(
                    locations.value
                );
                const parsedCapacidad = JSON.parse(
                    capacidad_retorno.value || '[]'
                );

                const containsAsignID = parsedLocations.some(
                    (location) => location._id === asignID?._id
                );

                if (containsAsignID) {
                    this.ubicaciones.next(parsedLocations);
                    this.retornos.next(parsedCapacidad);
                    RecoleccionLogger.info('Ubicaciones iniciales cargadas', {
                        ubicacionesCount: parsedLocations.length,
                        retornosCount: parsedCapacidad.length,
                    });
                } else {
                    await Promise.all([
                        Preferences.remove({ key: 'locations' }),
                        Preferences.remove({ key: 'capacidad_retorno' }),
                    ]);
                    this.ubicaciones.next([]);
                    this.retornos.next([]);
                    RecoleccionLogger.info(
                        'Ubicaciones limpiadas por cambio de asignación'
                    );
                }
            } else {
                this.ubicaciones.next([]);
                this.retornos.next([]);
                RecoleccionLogger.info('No hay ubicaciones almacenadas');
            }
        } catch (error) {
            RecoleccionLogger.error('Error loading locations', error);
            this.ubicaciones.next([]);
            this.retornos.next([]);
        }
    }

    /**
     * Guarda una ubicación con validación mejorada
     */
    async saveLocation(
        location: IPuntoRecoleccion,
        valid?: boolean
    ): Promise<void> {
        const isValid =
            valid !== undefined ? valid : this.isValidLocation(location).resp;

        if (isValid) {
            const locations = await Preferences.get({ key: 'locations' });
            const parsedLocations: IPuntoRecoleccion[] = locations.value
                ? JSON.parse(locations.value)
                : [];

            parsedLocations.push(location);

            await Preferences.set({
                key: 'locations',
                value: JSON.stringify(parsedLocations),
            });

            this.ubicaciones.next([...this.ubicaciones.getValue(), location]);

            RecoleccionLogger.debug('Ubicación guardada', {
                tipo: location.retorno ? 'retorno' : 'recoleccion',
                coordenadas: `${location.lat}, ${location.lng}`,
            });
        } else {
            RecoleccionLogger.warn('Ubicación no guardada por validación');
        }
    }

    /**
     * Guarda datos de retorno con tipado fuerte
     */
    async saveRetorno(retorno: {
        label: string;
        value: CapacidadVehiculo;
    }): Promise<void> {
        const capacidad_retorno = await Preferences.get({
            key: 'capacidad_retorno',
        });
        const parsedRetornos = capacidad_retorno.value
            ? JSON.parse(capacidad_retorno.value)
            : [];

        parsedRetornos.push(retorno);

        await Preferences.set({
            key: 'capacidad_retorno',
            value: JSON.stringify(parsedRetornos),
        });

        const currentRetornos = this.retornos.getValue();
        this.retornos.next([...currentRetornos, retorno]);

        RecoleccionLogger.info('Retorno guardado', {
            capacidad: retorno.value,
        });
    }

    /**
     * Guarda asignación con mejor manejo de errores
     */
    async saveAsignacion(asign: IAsignacion): Promise<boolean> {
        try {
            await Preferences.set({
                key: 'asign',
                value: JSON.stringify(asign),
            });
            RecoleccionLogger.info('Asignación guardada', { id: asign._id });
            return true;
        } catch (error) {
            RecoleccionLogger.error('Error al guardar la asignación', error);
            return false;
        }
    }

    /**
     * Obtiene asignación con tipado fuerte
     */
    async getAsignacion(): Promise<IAsignacion | null> {
        try {
            const { value } = await Preferences.get({ key: 'asign' });
            return value ? (JSON.parse(value) as IAsignacion) : null;
        } catch (error) {
            RecoleccionLogger.error('Error obteniendo asignación', error);
            return null;
        }
    }

    /**
     * Obtiene observables con tipado fuerte
     */
    getUbicaciones(): {
        ubicaciones: Observable<IPuntoRecoleccion[]>;
        retorno: Observable<{ label: string; value: CapacidadVehiculo }[]>;
    } {
        return {
            ubicaciones: this.ubicaciones.asObservable(),
            retorno: this.retornos.asObservable(),
        };
    }

    getVelocidadActual(): Observable<number> {
        return this.velocidadActual.asObservable();
    }

    getDistanciaRecorrida(): Observable<number> {
        return this.distanciaRecorrida.asObservable();
    }

    /**
     * Headers con mejor manejo
     */
    private getHeaders(token: string): HttpHeaders {
        return new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
    }

    /**
     * Actualiza ruta con tipado fuerte en la respuesta
     */
    updateRutaRecolector(
        token: string,
        id: string,
        data: any
    ): Observable<IApiResponse> {
        const headers = this.getHeaders(token);
        return this._http
            .put<IApiResponse>(`${this.url}recolector/${id}`, data, { headers })
            .pipe(
                map((response) => response),
                catchError((error) => {
                    RecoleccionLogger.error(
                        'Error en updateRutaRecolector',
                        error
                    );
                    return throwError(error);
                })
            );
    }

    /**
     * Obtiene dispositivos GPS con tipado fuerte
     */
    private storageKey = 'deviceGPSData';

    obtenerDeviceGPS(): Observable<IDispositivoGPS[]> {
        const cachedData = sessionStorage.getItem(this.storageKey);
        if (cachedData) {
            return of(JSON.parse(cachedData));
        }

        let headers = new HttpHeaders()
            .set('Content-Type', 'application/json')
            .set('Authorization', 'Basic ' + btoa('CIUDADANIA:123456789'));

        return this._http
            .get<IDispositivoGPS[]>(
                'https://inteligenciavehicular.com/api/devices',
                { headers }
            )
            .pipe(
                tap((data) => {
                    sessionStorage.setItem(
                        this.storageKey,
                        JSON.stringify(data)
                    );
                    RecoleccionLogger.info('Dispositivos GPS obtenidos', {
                        count: data.length,
                    });
                }),
                catchError((error) => {
                    RecoleccionLogger.error(
                        'Error obteniendo dispositivos GPS',
                        error
                    );
                    return throwError(error);
                })
            );
    }

    invalidateCache(): void {
        sessionStorage.removeItem(this.storageKey);
        RecoleccionLogger.info('Cache de dispositivos invalidado');
    }

    /**
     * Obtiene datos de ruta con mejor manejo de errores
     */
    async fetchRouteData(
        deviceId: string,
        from: string,
        to: string
    ): Promise<Observable<any>> {
        const url = `https://inteligenciavehicular.com/api/reports/route?deviceId=${deviceId}&type=allEvents&from=${from}&to=${to}`;
        let headers = new HttpHeaders()
            .set('Content-Type', 'application/json')
            .set('Authorization', 'Basic ' + btoa('CIUDADANIA:123456789'));

        try {
            RecoleccionLogger.info('Obteniendo datos de ruta', {
                deviceId,
                from,
                to,
            });
            return this._http.get(url, { headers });
        } catch (error) {
            RecoleccionLogger.error('Error fetching route data', error);
            throw error;
        }
    }

    /**
     * Obtiene configuración actual del seguimiento
     */
    getConfiguracionSeguimiento(): IConfigSeguimiento {
        return { ...this.config };
    }

    /**
     * Actualiza configuración del seguimiento
     */
    actualizarConfiguracion(nuevaConfig: Partial<IConfigSeguimiento>): void {
        Object.assign(this.config, nuevaConfig);
        RecoleccionLogger.info('Configuración actualizada', this.config);
    }
}
