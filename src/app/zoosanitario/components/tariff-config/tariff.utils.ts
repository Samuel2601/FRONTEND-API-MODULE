import {
    TariffConfig,
    TariffCalculation,
    CalculationType,
    TariffType,
    TariffCategory,
    Species,
    IntroducerType,
    TARIFF_CONSTANTS,
    CALCULATION_PRECISION,
    ExportOptions,
    RBUHistory,
    TariffFilters,
    ValidationError,
} from './tariff.types';

// ===== UTILIDADES DE FORMATEO =====

/**
 * Formatea un monto como moneda
 */
export function formatCurrency(
    amount: number,
    currency = 'USD',
    locale = 'es-EC'
): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: CALCULATION_PRECISION.CURRENCY,
        maximumFractionDigits: CALCULATION_PRECISION.CURRENCY,
    }).format(amount);
}

/**
 * Formatea un porcentaje
 */
export function formatPercentage(
    value: number,
    decimals = CALCULATION_PRECISION.PERCENTAGE
): string {
    return `${value.toFixed(decimals)}%`;
}

/**
 * Formatea un peso
 */
export function formatWeight(weight: number): string {
    return `${weight.toFixed(CALCULATION_PRECISION.WEIGHT)} kg`;
}

/**
 * Formatea una cantidad
 */
export function formatQuantity(quantity: number): string {
    return quantity.toFixed(CALCULATION_PRECISION.QUANTITY);
}

/**
 * Formatea una fecha
 */
export function formatDate(
    date: Date | string,
    format = 'dd/MM/yyyy',
    locale = 'es-EC'
): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(dateObj);
}

/**
 * Formatea fecha y hora
 */
export function formatDateTime(date: Date | string, locale = 'es-EC'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(dateObj);
}

// ===== UTILIDADES DE CÁLCULO =====

/**
 * Calcula el monto basado en porcentaje de RBU
 */
export function calculateRBUAmount(
    percentageRBU: number,
    currentRBU: number
): number {
    return (currentRBU * percentageRBU) / 100;
}

/**
 * Calcula el porcentaje de cambio entre dos valores
 */
export function calculatePercentageChange(
    oldValue: number,
    newValue: number
): number {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Calcula la diferencia en horas entre dos fechas
 */
export function calculateHoursDifference(
    startDate: Date,
    endDate: Date
): number {
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
}

/**
 * Redondea un monto a la precisión de moneda
 */
export function roundCurrency(amount: number): number {
    return Math.round(amount * 100) / 100;
}

/**
 * Obtiene el valor de cálculo según el tipo
 */
export function getCalculationValue(tariff: TariffConfig): number {
    switch (tariff.calculationType) {
        case 'FIXED_AMOUNT':
            return tariff.fixedAmount;
        case 'PERCENTAGE_RBU':
            return calculateRBUAmount(tariff.percentageRBU, tariff.currentRBU);
        case 'PER_UNIT':
            return tariff.unitPrice;
        case 'PER_KG':
            return tariff.pricePerKg;
        case 'PERCENTAGE_WEIGHT':
            return (tariff.minPercentage + tariff.maxPercentage) / 2; // Promedio
        default:
            return 0;
    }
}

// ===== UTILIDADES DE VALIDACIÓN =====

/**
 * Valida si un RBU es válido
 */
export function isValidRBU(rbu: number): boolean {
    return rbu >= TARIFF_CONSTANTS.MIN_RBU && rbu <= TARIFF_CONSTANTS.MAX_RBU;
}

/**
 * Valida si un porcentaje es válido
 */
export function isValidPercentage(percentage: number): boolean {
    return (
        percentage >= TARIFF_CONSTANTS.MIN_PERCENTAGE &&
        percentage <= TARIFF_CONSTANTS.MAX_PERCENTAGE
    );
}

/**
 * Valida si una cantidad es válida
 */
export function isValidQuantity(quantity: number): boolean {
    return quantity > 0 && Number.isInteger(quantity);
}

/**
 * Valida si un peso es válido
 */
export function isValidWeight(weight: number): boolean {
    return weight > 0;
}

/**
 * Valida si las horas de límite de tiempo son válidas
 */
export function isValidTimeLimit(hours: number): boolean {
    return hours > 0 && hours <= TARIFF_CONSTANTS.MAX_TIME_LIMIT_HOURS;
}

/**
 * Valida una configuración de tarifa
 */
export function validateTariffConfig(
    tariff: Partial<TariffConfig>
): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!tariff.name || tariff.name.trim().length < 3) {
        errors.push({
            field: 'name',
            message: 'El nombre debe tener al menos 3 caracteres',
        });
    }

    if (!tariff.type) {
        errors.push({ field: 'type', message: 'El tipo es requerido' });
    }

    if (!tariff.category) {
        errors.push({
            field: 'category',
            message: 'La categoría es requerida',
        });
    }

    if (!tariff.calculationType) {
        errors.push({
            field: 'calculationType',
            message: 'El tipo de cálculo es requerido',
        });
    }

    if (tariff.currentRBU && !isValidRBU(tariff.currentRBU)) {
        errors.push({
            field: 'currentRBU',
            message: `El RBU debe estar entre ${TARIFF_CONSTANTS.MIN_RBU} y ${TARIFF_CONSTANTS.MAX_RBU}`,
        });
    }

    // Validaciones específicas por tipo de cálculo
    if (tariff.calculationType) {
        switch (tariff.calculationType) {
            case 'FIXED_AMOUNT':
                if (!tariff.fixedAmount || tariff.fixedAmount <= 0) {
                    errors.push({
                        field: 'fixedAmount',
                        message: 'El monto fijo debe ser mayor a 0',
                    });
                }
                break;
            case 'PERCENTAGE_RBU':
                if (
                    !tariff.percentageRBU ||
                    !isValidPercentage(tariff.percentageRBU)
                ) {
                    errors.push({
                        field: 'percentageRBU',
                        message: 'El porcentaje RBU debe estar entre 0 y 100',
                    });
                }
                break;
            case 'PER_UNIT':
                if (!tariff.unitPrice || tariff.unitPrice <= 0) {
                    errors.push({
                        field: 'unitPrice',
                        message: 'El precio por unidad debe ser mayor a 0',
                    });
                }
                break;
            case 'PER_KG':
                if (!tariff.pricePerKg || tariff.pricePerKg <= 0) {
                    errors.push({
                        field: 'pricePerKg',
                        message: 'El precio por kg debe ser mayor a 0',
                    });
                }
                break;
            case 'PERCENTAGE_WEIGHT':
                if (!isValidPercentage(tariff.minPercentage || 0)) {
                    errors.push({
                        field: 'minPercentage',
                        message:
                            'El porcentaje mínimo debe estar entre 0 y 100',
                    });
                }
                if (!isValidPercentage(tariff.maxPercentage || 0)) {
                    errors.push({
                        field: 'maxPercentage',
                        message:
                            'El porcentaje máximo debe estar entre 0 y 100',
                    });
                }
                if (
                    (tariff.minPercentage || 0) >= (tariff.maxPercentage || 0)
                ) {
                    errors.push({
                        field: 'maxPercentage',
                        message:
                            'El porcentaje máximo debe ser mayor al mínimo',
                    });
                }
                break;
        }
    }

    return errors;
}

// ===== UTILIDADES DE ETIQUETAS Y TRADUCCIONES =====

/**
 * Obtiene la etiqueta de un tipo de tarifa
 */
export function getTariffTypeLabel(type: TariffType): string {
    const labels: Record<TariffType, string> = {
        INSCRIPTION: 'Inscripción',
        SLAUGHTER_FEE: 'Tarifa de Faenamiento',
        ADDITIONAL_SERVICE: 'Servicios Adicionales',
        PROLONGED_USE: 'Uso Prolongado',
        EXTERNAL_PRODUCTS: 'Productos Externos',
        POULTRY: 'Avícola',
        PRIVATE_ESTABLISHMENT: 'Establecimiento Privado',
        FINE_CLANDESTINE: 'Multa Clandestino',
        FINE_UNAUTHORIZED_ACCESS: 'Multa Acceso No Autorizado',
    };
    return labels[type] || type;
}

/**
 * Obtiene la etiqueta de una categoría
 */
export function getCategoryLabel(category: TariffCategory): string {
    const labels: Record<TariffCategory, string> = {
        BOVINE: 'Bovino',
        PORCINE: 'Porcino',
        MIXED: 'Mixto',
        GENERAL: 'General',
        PRIVATE_ESTABLISHMENT: 'Establecimiento Privado',
        POULTRY: 'Avícola',
    };
    return labels[category] || category;
}

/**
 * Obtiene la etiqueta de un tipo de cálculo
 */
export function getCalculationTypeLabel(
    calculationType: CalculationType
): string {
    const labels: Record<CalculationType, string> = {
        FIXED_AMOUNT: 'Monto Fijo',
        PERCENTAGE_RBU: 'Porcentaje RBU',
        PER_UNIT: 'Por Unidad',
        PER_KG: 'Por Kilogramo',
        PERCENTAGE_WEIGHT: 'Porcentaje por Peso',
    };
    return labels[calculationType] || calculationType;
}

/**
 * Obtiene la etiqueta de una especie
 */
export function getSpeciesLabel(species: Species): string {
    const labels: Record<Species, string> = {
        BOVINE: 'Bovino',
        PORCINE: 'Porcino',
    };
    return labels[species] || species;
}

/**
 * Obtiene la etiqueta de un tipo de introductor
 */
export function getIntroducerTypeLabel(type: IntroducerType): string {
    const labels: Record<IntroducerType, string> = {
        BOVINE_MAJOR: 'Bovino Mayor',
        PORCINE_MINOR: 'Porcino Menor',
        MIXED: 'Mixto',
    };
    return labels[type] || type;
}

// ===== UTILIDADES DE FILTRADO Y BÚSQUEDA =====

/**
 * Filtra tarifas según criterios
 */
export function filterTariffs(
    tariffs: TariffConfig[],
    filters: TariffFilters
): TariffConfig[] {
    return tariffs.filter((tariff) => {
        if (filters.type && tariff.type !== filters.type) return false;
        if (filters.category && tariff.category !== filters.category)
            return false;
        if (
            filters.calculationType &&
            tariff.calculationType !== filters.calculationType
        )
            return false;
        if (
            filters.isActive !== undefined &&
            tariff.isActive !== filters.isActive
        )
            return false;

        if (filters.searchText) {
            const searchText = filters.searchText.toLowerCase();
            const searchFields = [
                tariff.name,
                getTariffTypeLabel(tariff.type),
                getCategoryLabel(tariff.category),
                tariff.description || '',
            ]
                .join(' ')
                .toLowerCase();

            if (!searchFields.includes(searchText)) return false;
        }

        if (
            filters.dateFrom &&
            tariff.createdAt &&
            new Date(tariff.createdAt) < filters.dateFrom
        )
            return false;
        if (
            filters.dateTo &&
            tariff.createdAt &&
            new Date(tariff.createdAt) > filters.dateTo
        )
            return false;

        return true;
    });
}

/**
 * Ordena tarifas
 */
export function sortTariffs(
    tariffs: TariffConfig[],
    field: string,
    order: 'asc' | 'desc' = 'asc'
): TariffConfig[] {
    return [...tariffs].sort((a, b) => {
        let aValue: any = (a as any)[field];
        let bValue: any = (b as any)[field];

        // Manejar fechas
        if (field === 'createdAt' || field === 'updatedAt') {
            aValue = new Date(aValue || 0).getTime();
            bValue = new Date(bValue || 0).getTime();
        }

        // Manejar strings
        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return order === 'asc' ? -1 : 1;
        if (aValue > bValue) return order === 'asc' ? 1 : -1;
        return 0;
    });
}

// ===== UTILIDADES DE EXPORTACIÓN =====

/**
 * Convierte tarifas a CSV
 */
export function tariffsToCsv(
    tariffs: TariffConfig[],
    options: ExportOptions = { format: 'csv' }
): string {
    const headers = [
        'Nombre',
        'Tipo',
        'Categoría',
        'Tipo de Cálculo',
        'Monto Fijo',
        'Porcentaje RBU',
        'Precio Unitario',
        'Precio por Kg',
        'Porcentaje Mín',
        'Porcentaje Máx',
        'RBU Actual',
        'Descripción',
        'Estado',
        'Fecha Creación',
    ];

    const rows = tariffs.map((tariff) => [
        tariff.name,
        getTariffTypeLabel(tariff.type),
        getCategoryLabel(tariff.category),
        getCalculationTypeLabel(tariff.calculationType),
        tariff.fixedAmount.toString(),
        tariff.percentageRBU.toString(),
        tariff.unitPrice.toString(),
        tariff.pricePerKg.toString(),
        tariff.minPercentage.toString(),
        tariff.maxPercentage.toString(),
        tariff.currentRBU.toString(),
        tariff.description || '',
        tariff.isActive ? 'Activa' : 'Inactiva',
        formatDate(tariff.createdAt || new Date()),
    ]);

    return [headers, ...rows]
        .map((row) =>
            row
                .map((cell) => `"${cell.toString().replace(/"/g, '""')}"`)
                .join(',')
        )
        .join('\n');
}

/**
 * Descarga un archivo
 */
export function downloadFile(
    content: string,
    filename: string,
    contentType = 'text/plain'
): void {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
}

// ===== UTILIDADES DE HISTORIAL =====

/**
 * Genera un CSV del historial de RBU
 */
export function rbuHistoryToCsv(history: RBUHistory[]): string {
    const headers = [
        'Fecha',
        'Valor Anterior',
        'Nuevo Valor',
        'Cambio (%)',
        'Configuraciones Afectadas',
        'Usuario',
        'Motivo',
    ];

    const rows = history.map((record) => [
        formatDateTime(record.date),
        record.oldValue.toString(),
        record.newValue.toString(),
        calculatePercentageChange(record.oldValue, record.newValue).toFixed(2),
        record.updatedConfigs.toString(),
        record.user || 'N/A',
        record.reason || 'N/A',
    ]);

    return [headers, ...rows]
        .map((row) =>
            row
                .map((cell) => `"${cell.toString().replace(/"/g, '""')}"`)
                .join(',')
        )
        .join('\n');
}

// ===== UTILIDADES DE COLORES Y TEMAS =====

/**
 * Obtiene el color de severidad para un tipo de tarifa
 */
export function getTariffTypeSeverity(type: TariffType): string {
    const severityMap: Record<TariffType, string> = {
        INSCRIPTION: 'info',
        SLAUGHTER_FEE: 'success',
        ADDITIONAL_SERVICE: 'secondary',
        PROLONGED_USE: 'warning',
        EXTERNAL_PRODUCTS: 'secondary',
        POULTRY: 'info',
        PRIVATE_ESTABLISHMENT: 'secondary',
        FINE_CLANDESTINE: 'danger',
        FINE_UNAUTHORIZED_ACCESS: 'danger',
    };
    return severityMap[type] || 'secondary';
}

/**
 * Obtiene el ícono para un tipo de tarifa
 */
export function getTariffTypeIcon(type: TariffType): string {
    const iconMap: Record<TariffType, string> = {
        INSCRIPTION: 'pi pi-id-card',
        SLAUGHTER_FEE: 'pi pi-home',
        ADDITIONAL_SERVICE: 'pi pi-plus-circle',
        PROLONGED_USE: 'pi pi-clock',
        EXTERNAL_PRODUCTS: 'pi pi-external-link',
        POULTRY: 'pi pi-heart',
        PRIVATE_ESTABLISHMENT: 'pi pi-building',
        FINE_CLANDESTINE: 'pi pi-exclamation-triangle',
        FINE_UNAUTHORIZED_ACCESS: 'pi pi-ban',
    };
    return iconMap[type] || 'pi pi-question';
}

// ===== UTILIDADES GENERALES =====

/**
 * Genera un ID único simple
 */
export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Debounce para búsquedas
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;

    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
}

/**
 * Convierte un string a slug
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
        .trim()
        .replace(/\s+/g, '-') // Reemplazar espacios con guiones
        .replace(/-+/g, '-'); // Remover guiones duplicados
}

/**
 * Clona profundamente un objeto
 */
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Comprueba si un objeto está vacío
 */
export function isEmpty(obj: any): boolean {
    if (obj == null) return true;
    if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
}

/**
 * Obtiene el valor de una propiedad anidada
 */
export function getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Establece el valor de una propiedad anidada
 */
export function setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
        if (!(key in current)) current[key] = {};
        return current[key];
    }, obj);
    target[lastKey] = value;
}
