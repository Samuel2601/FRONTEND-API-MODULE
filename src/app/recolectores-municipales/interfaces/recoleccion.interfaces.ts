/**
 * Interfaces y tipos compartidos para el módulo de recolección
 * Centraliza las definiciones de tipos para mantener consistencia
 */

// ============================================================================
// INTERFACES PRINCIPALES
// ============================================================================

/**
 * Interface para una asignación de recolección
 */
export interface IAsignacion {
    ruta: [];
    _id: string;
    deviceId: string;
    externo: IExterno;
    funcionario?: IFuncionario;
    createdAt: string;
    updatedAt?: string;
    dateOnly: string;
    view_date: string;
    view: boolean;
    puntos_recoleccion: IPuntoRecoleccion[];
    capacidad_retorno?: ICapacidadRetorno[];
    estado?: EstadoAsignacion;
    observaciones?: string;
}

/**
 * Interface para información de un trabajador externo
 */
export interface IExterno {
    _id: string;
    name: string;
    dni: string;
    telefono?: string;
    email?: string;
    activo: boolean;
}

/**
 * Interface para información de un funcionario
 */
export interface IFuncionario {
    _id: string;
    name: string;
    last_name: string;
    email: string;
    dni: string;
    cargo?: string;
    departamento?: string;
    activo: boolean;
}

/**
 * Interface para un punto de recolección
 */
export interface IPuntoRecoleccion {
    _id?: string;
    lat: number;
    lng: number;
    timestamp: string;
    speed?: number;
    accuracy?: number;
    destacado: boolean;
    retorno: boolean;
    observaciones?: string;
    tipo?: TipoPunto;
    validado?: boolean;
}

/**
 * Interface para datos de capacidad de retorno
 */
export interface ICapacidadRetorno {
    label: string;
    value: CapacidadVehiculo;
    timestamp?: string;
    observaciones?: string;
}

/**
 * Interface para datos GPS detallados
 */
export interface IDatosGPS {
    id: string;
    latitude: number;
    longitude: number;
    altitude?: number;
    speed: number;
    heading?: number;
    accuracy?: number;
    fixTime: string;
    valid: boolean;
    satellites?: number;
}

/**
 * Interface para dispositivos GPS
 */
export interface IDispositivoGPS {
    id: number;
    name: string;
    status: 'online' | 'offline' | 'maintenance';
    lastUpdate?: string;
    battery?: number;
    signal?: number;
    plate?: string;
    deviceType?: string;
}

/**
 * Interface para opciones de filtro
 */
export interface IOpcionFiltro {
    label: string;
    value: any;
    icon?: string;
    disabled?: boolean;
}

/**
 * Interface para configuración de mapa
 */
export interface IMapConfig {
    center: { lat: number; lng: number };
    zoom: number;
    mapTypeId: string;
    styles?: google.maps.MapTypeStyle[];
    controls?: {
        fullscreen?: boolean;
        mapType?: boolean;
        streetView?: boolean;
        zoom?: boolean;
    };
}

/**
 * Interface para información de validación de ubicación
 */
export interface IValidacionUbicacion {
    resp: boolean;
    message: string;
    code?: string;
    details?: any;
}

/**
 * Interface para configuración de seguimiento
 */
export interface IConfigSeguimiento {
    backgroundTracking: boolean;
    drivingMode: boolean;
    intervaloMinimo: number; // en segundos
    distanciaMinima: number; // en metros
    precisionMaxima: number; // en metros
    velocidadMaxima: number; // en km/h
}

/**
 * Interface para estadísticas de asignación
 */
export interface IEstadisticasAsignacion {
    totalPuntos: number;
    puntosRecoleccion: number;
    puntosRetorno: number;
    distanciaRecorrida: number; // en metros
    tiempoTotal: number; // en milisegundos
    velocidadPromedio: number; // en km/h
    eficiencia: number; // porcentaje
}

/**
 * Interface para respuesta de API
 */
export interface IApiResponse<T = any> {
    success: boolean;
    data: T;
    message?: string;
    errors?: string[];
    meta?: {
        total?: number;
        page?: number;
        limit?: number;
        timestamp?: string;
    };
}

// ============================================================================
// TYPES Y ENUMS
// ============================================================================

/**
 * Estados posibles de una asignación
 */
export type EstadoAsignacion =
    | 'PENDIENTE'
    | 'EN_PROGRESO'
    | 'COMPLETADA'
    | 'CANCELADA'
    | 'PAUSADA';

/**
 * Tipos de puntos de recolección
 */
export type TipoPunto = 'RECOLECCION' | 'RETORNO' | 'PARADA' | 'INICIO' | 'FIN';

/**
 * Niveles de capacidad del vehículo
 */
export type CapacidadVehiculo = 'Vacío' | 'Medio' | 'Lleno';

/**
 * Tipos de seguimiento disponibles
 */
export type TipoSeguimiento =
    | 'MANUAL'
    | 'AUTOMATICO'
    | 'CONDUCCION'
    | 'HIBRIDO';

/**
 * Niveles de precisión GPS
 */
export type PrecisionGPS =
    | 'ALTA' // < 5 metros
    | 'MEDIA' // 5-15 metros
    | 'BAJA' // 15-50 metros
    | 'MUY_BAJA'; // > 50 metros

/**
 * Roles de usuario que pueden acceder al sistema
 */
export type RolUsuario =
    | 'ADMIN'
    | 'SUPERVISOR'
    | 'COORDINADOR'
    | 'ANALISTA'
    | 'RECOLECTOR'
    | 'EXTERNO';

// ============================================================================
// CONSTANTES Y CONFIGURACIONES
// ============================================================================

/**
 * Configuraciones por defecto del sistema
 */
export const CONFIGURACION_DEFECTO = {
    // Configuración de mapa
    MAPA: {
        CENTER: { lat: 0.9609762, lng: -79.65353 }, // Quito, Ecuador
        ZOOM: 13,
        MIN_ZOOM: 10,
        MAX_ZOOM: 20,
    } as const,

    // Configuración de seguimiento
    SEGUIMIENTO: {
        INTERVALO_MINIMO: 30, // segundos
        DISTANCIA_MINIMA: 15, // metros
        PRECISION_MAXIMA: 100, // metros
        VELOCIDAD_MAXIMA: 110, // km/h
        TIMEOUT_PERMISOS: 15000, // milisegundos
    } as const,

    // Configuración de interfaz
    INTERFAZ: {
        FILAS_POR_PAGINA: [5, 10, 25, 50],
        FILAS_DEFECTO: 10,
        TIEMPO_TOAST: 5000, // milisegundos
        DEBOUNCE_BUSQUEDA: 300, // milisegundos
    } as const,

    // Configuración de retorno
    RETORNO: {
        TIEMPO_ESPERA: 15 * 60 * 1000, // 15 minutos en milisegundos
        CAPACIDADES: [
            { label: 'Vacío', value: 'Vacío' },
            { label: 'Medio', value: 'Medio' },
            { label: 'Lleno', value: 'Lleno' },
        ] as ICapacidadRetorno[],
    } as const,
} as const;

/**
 * Mensajes del sistema
 */
export const MENSAJES = {
    EXITO: {
        ASIGNACION_ENCONTRADA: 'Asignación encontrada correctamente',
        PUNTO_AGREGADO: 'Punto de recolección agregado',
        RETORNO_REGISTRADO: 'Retorno a estación registrado',
        SEGUIMIENTO_ACTIVADO: 'Seguimiento automático activado',
        SEGUIMIENTO_DESACTIVADO: 'Seguimiento automático desactivado',
        DATOS_SINCRONIZADOS: 'Datos sincronizados correctamente',
        TURNO_FINALIZADO: 'Turno finalizado correctamente',
    },
    ERROR: {
        SIN_ASIGNACION: 'No tienes una asignación activa',
        ERROR_UBICACION: 'No se pudo obtener la ubicación',
        ERROR_PERMISOS: 'Permisos de ubicación denegados',
        ERROR_SINCRONIZACION: 'Error al sincronizar datos',
        ERROR_SEGUIMIENTO: 'Error en el seguimiento automático',
        UBICACION_INVALIDA: 'La ubicación no es válida',
    },
    ADVERTENCIA: {
        SIN_CONEXION: 'Sin conexión a internet',
        PRECISION_BAJA: 'Precisión GPS baja',
        BATERIA_BAJA: 'Batería baja, considera desactivar el seguimiento',
        TIEMPO_ESPERA: 'Debes esperar antes de realizar otro retorno',
    },
    INFO: {
        CARGANDO: 'Cargando información...',
        CONSULTANDO: 'Consultando asignación...',
        SINCRONIZANDO: 'Sincronizando datos...',
        PROCESANDO: 'Procesando solicitud...',
    },
} as const;

/**
 * Códigos de error del sistema
 */
export const CODIGOS_ERROR = {
    // Errores de ubicación
    UBICACION_NO_DISPONIBLE: 'LOC_001',
    PRECISION_INSUFICIENTE: 'LOC_002',
    VELOCIDAD_IRREAL: 'LOC_003',
    MOVIMIENTO_INSUFICIENTE: 'LOC_004',

    // Errores de permisos
    PERMISOS_DENEGADOS: 'PERM_001',
    PERMISOS_TIMEOUT: 'PERM_002',

    // Errores de red
    SIN_CONEXION: 'NET_001',
    TIMEOUT_REQUEST: 'NET_002',
    ERROR_SERVIDOR: 'NET_003',

    // Errores de asignación
    ASIGNACION_NO_ENCONTRADA: 'ASG_001',
    ASIGNACION_EXPIRADA: 'ASG_002',
    ASIGNACION_CANCELADA: 'ASG_003',
} as const;

// ============================================================================
// UTILIDADES DE TIPO
// ============================================================================

/**
 * Hace todas las propiedades de un tipo opcionales excepto las especificadas
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Extrae el tipo de los elementos de un array
 */
export type ArrayElement<T extends readonly unknown[]> = T[number];

/**
 * Crea un tipo de unión a partir de las claves de un objeto
 */
export type KeysOf<T> = keyof T;

/**
 * Crea un tipo de unión a partir de los valores de un objeto
 */
export type ValuesOf<T> = T[keyof T];
