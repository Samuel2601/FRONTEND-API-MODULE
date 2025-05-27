/**
 * Utilidades específicas para el módulo de recolección
 * Contiene funciones de ayuda, validaciones y transformaciones de datos
 */

import {
    IPuntoRecoleccion,
    IAsignacion,
    IDatosGPS,
    IValidacionUbicacion,
    PrecisionGPS,
    IEstadisticasAsignacion,
    CONFIGURACION_DEFECTO,
} from '../interfaces/recoleccion.interfaces';

// ============================================================================
// UTILIDADES DE GEOLOCALIZACIÓN
// ============================================================================

/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
 * @param punto1 - Primer punto con latitud y longitud
 * @param punto2 - Segundo punto con latitud y longitud
 * @returns Distancia en metros
 */
export function calcularDistancia(
    punto1: { lat: number; lng: number },
    punto2: { lat: number; lng: number }
): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (punto1.lat * Math.PI) / 180;
    const φ2 = (punto2.lat * Math.PI) / 180;
    const Δφ = ((punto2.lat - punto1.lat) * Math.PI) / 180;
    const Δλ = ((punto2.lng - punto1.lng) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Calcula la velocidad entre dos puntos basada en distancia y tiempo
 * @param punto1 - Punto inicial con timestamp
 * @param punto2 - Punto final con timestamp
 * @returns Velocidad en km/h
 */
export function calcularVelocidad(
    punto1: { lat: number; lng: number; timestamp: string },
    punto2: { lat: number; lng: number; timestamp: string }
): number {
    const distancia = calcularDistancia(punto1, punto2);
    const tiempoMs =
        new Date(punto2.timestamp).getTime() -
        new Date(punto1.timestamp).getTime();
    const tiempoHoras = tiempoMs / (1000 * 60 * 60);

    if (tiempoHoras <= 0) return 0;

    return distancia / 1000 / tiempoHoras; // km/h
}

/**
 * Determina el nivel de precisión GPS basado en la exactitud
 * @param accuracy - Precisión en metros
 * @returns Nivel de precisión
 */
export function determinarPrecisionGPS(accuracy: number): PrecisionGPS {
    if (accuracy < 5) return 'ALTA';
    if (accuracy < 15) return 'MEDIA';
    if (accuracy < 50) return 'BAJA';
    return 'MUY_BAJA';
}

/**
 * Valida si una ubicación es válida según los criterios establecidos
 * @param nuevaUbicacion - Nueva ubicación a validar
 * @param ultimaUbicacion - Última ubicación conocida (opcional)
 * @returns Resultado de la validación
 */
export function validarUbicacion(
    nuevaUbicacion: IPuntoRecoleccion,
    ultimaUbicacion?: IPuntoRecoleccion
): IValidacionUbicacion {
    const { SEGUIMIENTO } = CONFIGURACION_DEFECTO;

    // Validaciones básicas de coordenadas
    if (!nuevaUbicacion.lat || !nuevaUbicacion.lng) {
        return {
            resp: false,
            message: 'Coordenadas inválidas',
            code: 'LOC_001',
        };
    }

    if (
        Math.abs(nuevaUbicacion.lat) > 90 ||
        Math.abs(nuevaUbicacion.lng) > 180
    ) {
        return {
            resp: false,
            message: 'Coordenadas fuera del rango válido',
            code: 'LOC_002',
        };
    }

    // Si es la primera ubicación, es válida
    if (!ultimaUbicacion) {
        return {
            resp: true,
            message: 'Primera ubicación registrada',
        };
    }

    // Validación de precisión
    if (
        nuevaUbicacion.accuracy &&
        nuevaUbicacion.accuracy > SEGUIMIENTO.PRECISION_MAXIMA
    ) {
        return {
            resp: false,
            message: `Precisión insuficiente: ${nuevaUbicacion.accuracy}m (máximo ${SEGUIMIENTO.PRECISION_MAXIMA}m)`,
            code: 'LOC_003',
        };
    }

    // Calcular distancia desde la última ubicación
    const distancia = calcularDistancia(ultimaUbicacion, nuevaUbicacion);

    // Validar movimiento mínimo
    if (distancia < SEGUIMIENTO.DISTANCIA_MINIMA) {
        return {
            resp: false,
            message: `Movimiento insuficiente: ${distancia.toFixed(
                1
            )}m (mínimo ${SEGUIMIENTO.DISTANCIA_MINIMA}m)`,
            code: 'LOC_004',
        };
    }

    // Validación de velocidad máxima (evitar saltos irreales)
    const tiempoTranscurrido =
        (new Date(nuevaUbicacion.timestamp).getTime() -
            new Date(ultimaUbicacion.timestamp).getTime()) /
        1000 /
        3600; // horas

    if (tiempoTranscurrido > 0) {
        const velocidadCalculada = distancia / 1000 / tiempoTranscurrido; // km/h

        if (velocidadCalculada > SEGUIMIENTO.VELOCIDAD_MAXIMA) {
            return {
                resp: false,
                message: `Velocidad irreal: ${velocidadCalculada.toFixed(
                    1
                )}km/h (máximo ${SEGUIMIENTO.VELOCIDAD_MAXIMA}km/h)`,
                code: 'LOC_005',
            };
        }
    }

    return {
        resp: true,
        message: 'Ubicación válida',
    };
}

/**
 * Convierte coordenadas decimales a formato DMS (Grados, Minutos, Segundos)
 * @param decimal - Coordenada en formato decimal
 * @param tipo - Tipo de coordenada ('lat' o 'lng')
 * @returns Coordenada en formato DMS
 */
export function convertirADMS(decimal: number, tipo: 'lat' | 'lng'): string {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.floor((minutesNotTruncated - minutes) * 60);

    const direction =
        decimal >= 0
            ? tipo === 'lat'
                ? 'N'
                : 'E'
            : tipo === 'lat'
            ? 'S'
            : 'W';

    return `${degrees}°${minutes}'${seconds}"${direction}`;
}

// ============================================================================
// UTILIDADES DE TIEMPO Y FORMATO
// ============================================================================

/**
 * Formatea una duración en milisegundos a formato legible
 * @param duracionMs - Duración en milisegundos
 * @returns Duración formateada (ej: "2h 30m 15s")
 */
export function formatearDuracion(duracionMs: number): string {
    const segundos = Math.floor((duracionMs / 1000) % 60);
    const minutos = Math.floor((duracionMs / (1000 * 60)) % 60);
    const horas = Math.floor(duracionMs / (1000 * 60 * 60));

    const partes: string[] = [];

    if (horas > 0) partes.push(`${horas}h`);
    if (minutos > 0) partes.push(`${minutos}m`);
    if (segundos > 0 || partes.length === 0) partes.push(`${segundos}s`);

    return partes.join(' ');
}

/**
 * Formatea una fecha para mostrar de forma amigable
 * @param fecha - Fecha a formatear
 * @param incluirHora - Si incluir la hora en el formato
 * @returns Fecha formateada
 */
export function formatearFecha(
    fecha: Date | string,
    incluirHora: boolean = true
): string {
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;

    const opciones: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    };

    if (incluirHora) {
        opciones.hour = '2-digit';
        opciones.minute = '2-digit';
        opciones.second = '2-digit';
    }

    return fechaObj.toLocaleDateString('es-EC', opciones);
}

/**
 * Obtiene el tiempo relativo desde una fecha (ej: "hace 2 horas")
 * @param fecha - Fecha de referencia
 * @returns Tiempo relativo formateado
 */
export function obtenerTiempoRelativo(fecha: Date | string): string {
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    const ahora = new Date();
    const diferencia = ahora.getTime() - fechaObj.getTime();

    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));

    if (minutos < 1) return 'Ahora mismo';
    if (minutos < 60) return `Hace ${minutos} minuto${minutos > 1 ? 's' : ''}`;
    if (horas < 24) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
    if (dias < 7) return `Hace ${dias} día${dias > 1 ? 's' : ''}`;

    return formatearFecha(fechaObj, false);
}

// ============================================================================
// UTILIDADES DE CÁLCULO Y ESTADÍSTICAS
// ============================================================================

/**
 * Calcula estadísticas completas de una asignación
 * @param asignacion - Asignación a analizar
 * @returns Estadísticas calculadas
 */
export function calcularEstadisticasAsignacion(
    asignacion: IAsignacion
): IEstadisticasAsignacion {
    const puntos = asignacion.puntos_recoleccion || [];

    // Contadores básicos
    const totalPuntos = puntos.length;
    const puntosRecoleccion = puntos.filter((p) => !p.retorno).length;
    const puntosRetorno = puntos.filter((p) => p.retorno).length;

    // Cálculo de distancia total
    let distanciaTotal = 0;
    for (let i = 1; i < puntos.length; i++) {
        distanciaTotal += calcularDistancia(puntos[i - 1], puntos[i]);
    }

    // Cálculo de tiempo total
    const tiempoTotal =
        totalPuntos > 1
            ? new Date(puntos[puntos.length - 1].timestamp).getTime() -
              new Date(puntos[0].timestamp).getTime()
            : 0;

    // Velocidad promedio
    const velocidadPromedio =
        tiempoTotal > 0
            ? distanciaTotal / 1000 / (tiempoTotal / (1000 * 60 * 60))
            : 0;

    // Eficiencia (puntos por hora)
    const eficiencia =
        tiempoTotal > 0
            ? (puntosRecoleccion / (tiempoTotal / (1000 * 60 * 60))) * 100
            : 0;

    return {
        totalPuntos,
        puntosRecoleccion,
        puntosRetorno,
        distanciaRecorrida: distanciaTotal,
        tiempoTotal,
        velocidadPromedio,
        eficiencia: Math.min(eficiencia, 100), // Máximo 100%
    };
}

/**
 * Agrupa puntos de recolección por períodos de tiempo
 * @param puntos - Array de puntos a agrupar
 * @param intervalo - Intervalo de agrupación ('hora', 'dia', 'semana')
 * @returns Puntos agrupados por período
 */
export function agruparPuntosPorTiempo(
    puntos: IPuntoRecoleccion[],
    intervalo: 'hora' | 'dia' | 'semana' = 'hora'
): { [periodo: string]: IPuntoRecoleccion[] } {
    const grupos: { [periodo: string]: IPuntoRecoleccion[] } = {};

    puntos.forEach((punto) => {
        const fecha = new Date(punto.timestamp);
        let clave: string;

        switch (intervalo) {
            case 'hora':
                clave = fecha.toISOString().slice(0, 13); // YYYY-MM-DDTHH
                break;
            case 'dia':
                clave = fecha.toISOString().slice(0, 10); // YYYY-MM-DD
                break;
            case 'semana':
                const inicioSemana = new Date(fecha);
                inicioSemana.setDate(fecha.getDate() - fecha.getDay());
                clave = inicioSemana.toISOString().slice(0, 10);
                break;
            default:
                clave = fecha.toISOString().slice(0, 13);
        }

        if (!grupos[clave]) {
            grupos[clave] = [];
        }
        grupos[clave].push(punto);
    });

    return grupos;
}

// ============================================================================
// UTILIDADES DE TRANSFORMACIÓN DE DATOS
// ============================================================================

/**
 * Convierte datos GPS del formato de API al formato interno
 * @param datosApi - Datos GPS desde la API externa
 * @returns Datos GPS en formato interno
 */
export function transformarDatosGPS(datosApi: any[]): IDatosGPS[] {
    return datosApi.map((item, index) => ({
        id: item.id?.toString() || index.toString(),
        latitude: parseFloat(item.latitude || item.lat || 0),
        longitude: parseFloat(item.longitude || item.lng || item.lon || 0),
        altitude: item.altitude ? parseFloat(item.altitude) : undefined,
        speed: parseFloat(item.speed || 0),
        heading: item.heading ? parseFloat(item.heading) : undefined,
        accuracy: item.accuracy ? parseFloat(item.accuracy) : undefined,
        fixTime: item.fixTime || item.timestamp || new Date().toISOString(),
        valid: Boolean(item.valid !== false),
        satellites: item.satellites ? parseInt(item.satellites) : undefined,
    }));
}

/**
 * Convierte puntos de recolección para exportación
 * @param puntos - Puntos a convertir
 * @param formato - Formato de salida ('csv', 'geojson', 'kml')
 * @returns Datos formateados para exportación
 */
export function convertirParaExportacion(
    puntos: IPuntoRecoleccion[],
    formato: 'csv' | 'geojson' | 'kml' = 'csv'
): string {
    switch (formato) {
        case 'csv':
            return convertirACSV(puntos);
        case 'geojson':
            return convertirAGeoJSON(puntos);
        case 'kml':
            return convertirAKML(puntos);
        default:
            return convertirACSV(puntos);
    }
}

/**
 * Convierte puntos a formato CSV
 */
function convertirACSV(puntos: IPuntoRecoleccion[]): string {
    const headers = [
        'Nro',
        'Latitud',
        'Longitud',
        'Fecha',
        'Hora',
        'Tipo',
        'Velocidad',
        'Precisión',
    ];
    const rows = puntos.map((punto, index) => {
        const fecha = new Date(punto.timestamp);
        return [
            index + 1,
            punto.lat.toFixed(6),
            punto.lng.toFixed(6),
            fecha.toLocaleDateString('es-EC'),
            fecha.toLocaleTimeString('es-EC'),
            punto.retorno ? 'Retorno' : 'Recolección',
            punto.speed?.toFixed(1) || 'N/A',
            punto.accuracy?.toFixed(0) || 'N/A',
        ];
    });

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
}

/**
 * Convierte puntos a formato GeoJSON
 */
function convertirAGeoJSON(puntos: IPuntoRecoleccion[]): string {
    const features = puntos.map((punto, index) => ({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [punto.lng, punto.lat],
        },
        properties: {
            id: index + 1,
            timestamp: punto.timestamp,
            tipo: punto.retorno ? 'retorno' : 'recoleccion',
            destacado: punto.destacado,
            speed: punto.speed || null,
            accuracy: punto.accuracy || null,
        },
    }));

    const geojson = {
        type: 'FeatureCollection',
        features,
    };

    return JSON.stringify(geojson, null, 2);
}

/**
 * Convierte puntos a formato KML
 */
function convertirAKML(puntos: IPuntoRecoleccion[]): string {
    const placemarks = puntos
        .map((punto, index) => {
            const fecha = new Date(punto.timestamp);
            return `
        <Placemark>
            <name>Punto ${index + 1} - ${
                punto.retorno ? 'Retorno' : 'Recolección'
            }</name>
            <description>
                Fecha: ${formatearFecha(fecha)}
                Tipo: ${
                    punto.retorno
                        ? 'Retorno a estación'
                        : 'Punto de recolección'
                }
                ${
                    punto.speed
                        ? `Velocidad: ${punto.speed.toFixed(1)} km/h`
                        : ''
                }
                ${
                    punto.accuracy
                        ? `Precisión: ±${punto.accuracy.toFixed(0)}m`
                        : ''
                }
            </description>
            <Point>
                <coordinates>${punto.lng},${punto.lat},0</coordinates>
            </Point>
        </Placemark>`;
        })
        .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
        <name>Puntos de Recolección</name>
        <description>Puntos registrados durante el turno de trabajo</description>
        ${placemarks}
    </Document>
</kml>`;
}

// ============================================================================
// UTILIDADES DE VALIDACIÓN Y SANITIZACIÓN
// ============================================================================

/**
 * Sanitiza datos de entrada para prevenir problemas de seguridad
 * @param datos - Datos a sanitizar
 * @returns Datos sanitizados
 */
export function sanitizarDatos<T>(datos: T): T {
    if (typeof datos === 'string') {
        return datos.trim().replace(/[<>]/g, '') as unknown as T;
    }

    if (Array.isArray(datos)) {
        return datos.map((item) => sanitizarDatos(item)) as unknown as T;
    }

    if (typeof datos === 'object' && datos !== null) {
        const objetoSanitizado: any = {};
        for (const [clave, valor] of Object.entries(datos)) {
            objetoSanitizado[clave] = sanitizarDatos(valor);
        }
        return objetoSanitizado;
    }

    return datos;
}

/**
 * Valida que los datos requeridos estén presentes
 * @param datos - Datos a validar
 * @param camposRequeridos - Array de campos que deben estar presentes
 * @returns Resultado de la validación
 */
export function validarCamposRequeridos(
    datos: any,
    camposRequeridos: string[]
): { valido: boolean; camposFaltantes: string[] } {
    const camposFaltantes: string[] = [];

    camposRequeridos.forEach((campo) => {
        if (
            datos[campo] === undefined ||
            datos[campo] === null ||
            datos[campo] === ''
        ) {
            camposFaltantes.push(campo);
        }
    });

    return {
        valido: camposFaltantes.length === 0,
        camposFaltantes,
    };
}

// ============================================================================
// UTILIDADES DE DEPURACIÓN Y LOGGING
// ============================================================================

/**
 * Logger personalizado para el módulo de recolección
 */
export const RecoleccionLogger = {
    debug: (mensaje: string, datos?: any) => {
        if (typeof datos !== 'undefined') {
            console.debug(`[RECOLECCION] ${mensaje}`, datos);
        } else {
            console.debug(`[RECOLECCION] ${mensaje}`);
        }
    },

    info: (mensaje: string, datos?: any) => {
        if (typeof datos !== 'undefined') {
            console.info(`[RECOLECCION] ${mensaje}`, datos);
        } else {
            console.info(`[RECOLECCION] ${mensaje}`);
        }
    },

    warn: (mensaje: string, datos?: any) => {
        if (typeof datos !== 'undefined') {
            console.warn(`[RECOLECCION] ${mensaje}`, datos);
        } else {
            console.warn(`[RECOLECCION] ${mensaje}`);
        }
    },

    error: (mensaje: string, error?: any) => {
        if (error) {
            console.error(`[RECOLECCION] ${mensaje}`, error);
        } else {
            console.error(`[RECOLECCION] ${mensaje}`);
        }
    },
};

/**
 * Función para medir el rendimiento de operaciones
 * @param operacion - Nombre de la operación
 * @param fn - Función a ejecutar
 * @returns Resultado de la función
 */
export async function medirRendimiento<T>(
    operacion: string,
    fn: () => Promise<T> | T
): Promise<T> {
    const inicio = performance.now();

    try {
        const resultado = await fn();
        const duracion = performance.now() - inicio;
        RecoleccionLogger.debug(
            `${operacion} completada en ${duracion.toFixed(2)}ms`
        );
        return resultado;
    } catch (error) {
        const duracion = performance.now() - inicio;
        RecoleccionLogger.error(
            `${operacion} falló después de ${duracion.toFixed(2)}ms`,
            error
        );
        throw error;
    }
}
