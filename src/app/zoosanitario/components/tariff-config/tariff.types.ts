// ===== INTERFACES Y TIPOS PARA EL SISTEMA DE TARIFAS =====

export interface TariffConfig {
    _id?: string;
    name: string;
    type: TariffType;
    category: TariffCategory;
    calculationType: CalculationType;
    fixedAmount: number;
    percentageRBU: number;
    unitPrice: number;
    pricePerKg: number;
    minPercentage: number;
    maxPercentage: number;
    currentRBU: number;
    description?: string;
    isActive: boolean;
    specialConditions?: SpecialConditions;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface SpecialConditions {
    requiresTimeLimit: boolean;
    timeLimitHours: number;
    appliesAfterHours: boolean;
}

export interface TariffCalculation {
    amount: number;
    details: CalculationDetails;
    tariffConfig: TariffConfig;
}

export interface CalculationDetails {
    baseAmount?: number;
    rbuAmount?: number;
    quantity?: number;
    weight?: number;
    hours?: number;
    percentage?: number;
}

// ===== TIPOS DE TARIFA =====
export type TariffType =
    | 'INSCRIPTION'
    | 'SLAUGHTER_FEE'
    | 'ADDITIONAL_SERVICE'
    | 'PROLONGED_USE'
    | 'EXTERNAL_PRODUCTS'
    | 'POULTRY'
    | 'PRIVATE_ESTABLISHMENT'
    | 'FINE_CLANDESTINE'
    | 'FINE_UNAUTHORIZED_ACCESS';

export type TariffCategory =
    | 'BOVINE'
    | 'PORCINE'
    | 'MIXED'
    | 'GENERAL'
    | 'PRIVATE_ESTABLISHMENT'
    | 'POULTRY';

export type CalculationType =
    | 'FIXED_AMOUNT'
    | 'PERCENTAGE_RBU'
    | 'PER_UNIT'
    | 'PER_KG'
    | 'PERCENTAGE_WEIGHT';

export type Species = 'BOVINE' | 'PORCINE';

export type IntroducerType = 'BOVINE_MAJOR' | 'PORCINE_MINOR' | 'MIXED';

export type FineType = 'FINE_CLANDESTINE' | 'FINE_UNAUTHORIZED_ACCESS';

// ===== PARÁMETROS PARA CÁLCULOS =====
export interface SlaughterCalculationParams {
    species: Species;
    weight?: number;
    quantity: number;
    introducerType?: IntroducerType;
}

export interface AdditionalServicesParams {
    totalSlaughterAmount: number;
    services: Array<{
        type: string;
        percentage: number;
    }>;
}

export interface ProlongedUseParams {
    species: Species;
    arrivalTime: Date;
    slaughterTime: Date;
    quantity: number;
}

export interface InscriptionCalculationParams {
    introducerType: IntroducerType;
    year: number;
}

export interface FineCalculationParams {
    fineType: FineType;
    category?: TariffCategory;
    quantity?: number;
    percentage?: number;
}

export interface TotalCostCalculationParams {
    species: Species;
    quantity: number;
    weight?: number;
    arrivalTime: Date;
    slaughterTime: Date;
    additionalServices?: Array<{ type: string; percentage: number }>;
    introducerType: IntroducerType;
}

// ===== RESPUESTAS DEL SERVIDOR =====
export interface RBUUpdateResponse {
    message: string;
    oldRBU: number;
    newRBU: number;
    updatedConfigs: number;
}

export interface InitializeDefaultsResponse {
    message: string;
    created: number;
}

export interface CurrentRBUResponse {
    currentRBU: number;
}

export interface TotalCostResponse {
    slaughterFee: TariffCalculation;
    additionalServices?: TariffCalculation;
    prolongedUse?: TariffCalculation;
    totalAmount: number;
}

// ===== OPCIONES PARA DROPDOWNS =====
export interface DropdownOption {
    label: string;
    value: string | number | null;
}

export interface TariffTypeOption extends DropdownOption {
    value: TariffType;
    icon?: string;
    color?: string;
    description?: string;
}

export interface CategoryOption extends DropdownOption {
    value: TariffCategory;
    icon?: string;
}

export interface CalculationTypeOption extends DropdownOption {
    value: CalculationType;
    description?: string;
}

// ===== CONFIGURACIONES Y CONSTANTES =====
export interface TariffConfiguration {
    types: TariffTypeOption[];
    categories: CategoryOption[];
    calculationTypes: CalculationTypeOption[];
    species: DropdownOption[];
    introducerTypes: DropdownOption[];
    fineTypes: DropdownOption[];
}

export interface AdditionalService {
    label: string;
    type: string;
    percentage: number;
    description?: string;
    isDefault?: boolean;
}

// ===== ESTADÍSTICAS Y DASHBOARD =====
export interface DashboardStats {
    totalTariffs: number;
    activeTariffs: number;
    inactiveTariffs: number;
    lastUpdated: Date;
}

export interface TariffsByType {
    [key: string]: number;
}

export interface ChartData {
    labels: string[];
    datasets: Array<{
        data: number[];
        backgroundColor: string[];
        borderWidth: number;
        borderColor: string;
    }>;
}

export interface ChartOptions {
    responsive: boolean;
    maintainAspectRatio: boolean;
    plugins: {
        legend: {
            position: string;
            labels: {
                color: string;
                font: {
                    size: number;
                };
            };
        };
    };
}

// ===== HISTORIAL Y AUDITORÍA =====
export interface RBUHistory {
    date: Date;
    oldValue: number;
    newValue: number;
    updatedConfigs: number;
    user?: string;
    reason?: string;
    effectiveDate?: Date;
}

export interface TariffAuditLog {
    id: string;
    tariffId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE';
    changes: any;
    user: string;
    timestamp: Date;
    reason?: string;
}

// ===== VALIDACIONES Y ERRORES =====
export interface ValidationError {
    field: string;
    message: string;
    code?: string;
}

export interface TariffError {
    message: string;
    code?: string;
    status?: number;
    details?: ValidationError[];
}

// ===== FILTROS Y BÚSQUEDA =====
export interface TariffFilters {
    type?: TariffType;
    category?: TariffCategory;
    calculationType?: CalculationType;
    isActive?: boolean;
    searchText?: string;
    dateFrom?: Date;
    dateTo?: Date;
}

export interface SortOptions {
    field: string;
    order: 'asc' | 'desc';
}

export interface PaginationOptions {
    page: number;
    size: number;
    totalRecords?: number;
}

// ===== CONFIGURACIÓN DE FORMULARIOS =====
export interface FormFieldConfig {
    name: string;
    label: string;
    type:
        | 'text'
        | 'number'
        | 'dropdown'
        | 'textarea'
        | 'checkbox'
        | 'date'
        | 'currency';
    required?: boolean;
    options?: DropdownOption[];
    validators?: any[];
    placeholder?: string;
    help?: string;
    visible?: boolean;
    disabled?: boolean;
    dependsOn?: string;
    dependsOnValue?: any;
}

export interface FormSectionConfig {
    title: string;
    icon?: string;
    fields: FormFieldConfig[];
    collapsible?: boolean;
    collapsed?: boolean;
}

// ===== EVENTOS Y CALLBACKS =====
export interface TariffEvent {
    type: 'created' | 'updated' | 'deleted' | 'calculated';
    data: any;
    timestamp: Date;
}

export interface CalculationResult {
    success: boolean;
    result?: TariffCalculation;
    error?: TariffError;
    warnings?: string[];
}

// ===== CONFIGURACIÓN DE EXPORTACIÓN =====
export interface ExportOptions {
    format: 'csv' | 'excel' | 'pdf';
    fields?: string[];
    filters?: TariffFilters;
    includeInactive?: boolean;
    includeHistory?: boolean;
}

export interface ImportOptions {
    format: 'csv' | 'excel';
    validateOnly?: boolean;
    updateExisting?: boolean;
    ignoreErrors?: boolean;
}

// ===== PERMISOS Y ROLES =====
export interface TariffPermissions {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canCalculate: boolean;
    canManageRBU: boolean;
    canViewAudit: boolean;
    canExport: boolean;
    canImport: boolean;
}

export interface UserRole {
    id: string;
    name: string;
    permissions: TariffPermissions;
    description?: string;
}

// ===== CONFIGURACIÓN DEL SISTEMA =====
export interface SystemConfig {
    defaultRBU: number;
    currency: string;
    locale: string;
    timezone: string;
    auditEnabled: boolean;
    autoBackup: boolean;
    maxHistoryDays: number;
    notificationEnabled: boolean;
}

// ===== NOTIFICACIONES =====
export interface TariffNotification {
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    actions?: Array<{
        label: string;
        action: () => void;
    }>;
}

// ===== HELPERS Y UTILIDADES =====
export interface CurrencyFormat {
    symbol: string;
    code: string;
    locale: string;
    decimals: number;
}

export interface DateFormat {
    format: string;
    locale: string;
    timezone?: string;
}

// ===== CONSTANTES =====
export const TARIFF_CONSTANTS = {
    DEFAULT_RBU: 470,
    MIN_RBU: 100,
    MAX_RBU: 2000,
    DEFAULT_CURRENCY: 'USD',
    DEFAULT_LOCALE: 'es-EC',
    MAX_PERCENTAGE: 100,
    MIN_PERCENTAGE: 0,
    DEFAULT_TIME_LIMIT_HOURS: 24,
    MAX_TIME_LIMIT_HOURS: 168, // 1 semana
} as const;

export const CALCULATION_PRECISION = {
    CURRENCY: 2,
    PERCENTAGE: 1,
    WEIGHT: 2,
    QUANTITY: 0,
} as const;

export const TARIFF_STATUS = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    DRAFT: 'DRAFT',
    ARCHIVED: 'ARCHIVED',
} as const;
