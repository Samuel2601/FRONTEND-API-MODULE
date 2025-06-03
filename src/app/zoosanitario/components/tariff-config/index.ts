// ===== BARREL EXPORTS PARA EL MÓDULO DE TARIFAS =====

// Tipos e interfaces
export * from './tariff.types';

// Utilidades
export * from './tariff.utils';

// ===== RE-EXPORTACIONES ESPECÍFICAS =====

// Interfaces principales más utilizadas
export type {
    TariffConfig,
    TariffCalculation,
    SlaughterCalculationParams,
    AdditionalServicesParams,
    ProlongedUseParams,
    InscriptionCalculationParams,
    FineCalculationParams,
    TotalCostCalculationParams,
    RBUUpdateResponse,
    CurrentRBUResponse,
    DashboardStats,
    TariffFilters,
    ValidationError,
} from './tariff.types';

// Funciones de utilidad más utilizadas
export {
    formatCurrency,
    formatPercentage,
    formatDate,
    formatDateTime,
    calculateRBUAmount,
    calculatePercentageChange,
    validateTariffConfig,
    getTariffTypeLabel,
    getCategoryLabel,
    getCalculationTypeLabel,
    filterTariffs,
    sortTariffs,
    tariffsToCsv,
    downloadFile,
} from './tariff.utils';

import { TariffConfigService } from '../../services/tariff-config.service';
import { TariffCalculatorComponent } from './calculator/tariff-calculator.component';
import { TariffDashboardComponent } from './dashboard/tariff-dashboard.component';
import { TariffConfigFormComponent } from './form/tariff-config-form.component';
import { TariffConfigListComponent } from './list/tariff-config-list.component';
import { RbuManagementComponent } from './rbu/rbu-management.component';
// ===== CONFIGURACIONES PREDEFINIDAS =====

import {
    TariffTypeOption,
    CategoryOption,
    CalculationTypeOption,
    DropdownOption,
    AdditionalService,
} from './tariff.types';

/**
 * Opciones predefinidas para tipos de tarifa
 */
export const TARIFF_TYPE_OPTIONS: TariffTypeOption[] = [
    {
        label: 'Inscripción',
        value: 'INSCRIPTION',
        icon: 'pi pi-id-card',
        color: 'blue',
        description: 'Inscripciones anuales de introductores',
    },
    {
        label: 'Tarifa de Faenamiento',
        value: 'SLAUGHTER_FEE',
        icon: 'pi pi-home',
        color: 'green',
        description: 'Tarifas por servicios de faenamiento',
    },
    {
        label: 'Servicios Adicionales',
        value: 'ADDITIONAL_SERVICE',
        icon: 'pi pi-plus-circle',
        color: 'purple',
        description: 'Servicios complementarios (5%-12%)',
    },
    {
        label: 'Uso Prolongado',
        value: 'PROLONGED_USE',
        icon: 'pi pi-clock',
        color: 'orange',
        description: 'Cargos por uso prolongado de corrales',
    },
    {
        label: 'Productos Externos',
        value: 'EXTERNAL_PRODUCTS',
        icon: 'pi pi-external-link',
        color: 'secondary',
        description: 'Productos faenados en otros centros',
    },
    {
        label: 'Avícola',
        value: 'POULTRY',
        icon: 'pi pi-heart',
        color: 'info',
        description: 'Productos avícolas',
    },
    {
        label: 'Establecimiento Privado',
        value: 'PRIVATE_ESTABLISHMENT',
        icon: 'pi pi-building',
        color: 'secondary',
        description: 'Establecimientos privados',
    },
    {
        label: 'Multa Clandestino',
        value: 'FINE_CLANDESTINE',
        icon: 'pi pi-exclamation-triangle',
        color: 'red',
        description: 'Multas por faenamiento clandestino',
    },
    {
        label: 'Multa Acceso No Autorizado',
        value: 'FINE_UNAUTHORIZED_ACCESS',
        icon: 'pi pi-ban',
        color: 'red',
        description: 'Multas por acceso no autorizado',
    },
];

/**
 * Opciones predefinidas para categorías
 */
export const CATEGORY_OPTIONS: CategoryOption[] = [
    { label: 'Bovino', value: 'BOVINE', icon: 'pi pi-heart' },
    { label: 'Porcino', value: 'PORCINE', icon: 'pi pi-heart' },
    { label: 'Mixto', value: 'MIXED', icon: 'pi pi-tags' },
    { label: 'General', value: 'GENERAL', icon: 'pi pi-globe' },
    {
        label: 'Establecimiento Privado',
        value: 'PRIVATE_ESTABLISHMENT',
        icon: 'pi pi-building',
    },
    { label: 'Avícola', value: 'POULTRY', icon: 'pi pi-star' },
];

/**
 * Opciones predefinidas para tipos de cálculo
 */
export const CALCULATION_TYPE_OPTIONS: CalculationTypeOption[] = [
    {
        label: 'Monto Fijo',
        value: 'FIXED_AMOUNT',
        description: 'Cantidad fija en dólares',
    },
    {
        label: 'Porcentaje RBU',
        value: 'PERCENTAGE_RBU',
        description: 'Porcentaje de la Remuneración Básica Unificada',
    },
    {
        label: 'Por Unidad',
        value: 'PER_UNIT',
        description: 'Precio fijo por cada unidad',
    },
    {
        label: 'Por Kilogramo',
        value: 'PER_KG',
        description: 'Precio por kilogramo de peso',
    },
    {
        label: 'Porcentaje por Peso',
        value: 'PERCENTAGE_WEIGHT',
        description: 'Porcentaje variable según peso',
    },
];

/**
 * Opciones predefinidas para especies
 */
export const SPECIES_OPTIONS: DropdownOption[] = [
    { label: 'Bovino', value: 'BOVINE' },
    { label: 'Porcino', value: 'PORCINE' },
];

/**
 * Opciones predefinidas para tipos de introductor
 */
export const INTRODUCER_TYPE_OPTIONS: DropdownOption[] = [
    { label: 'Bovino Mayor', value: 'BOVINE_MAJOR' },
    { label: 'Porcino Menor', value: 'PORCINE_MINOR' },
    { label: 'Mixto', value: 'MIXED' },
];

/**
 * Opciones predefinidas para tipos de multa
 */
export const FINE_TYPE_OPTIONS: DropdownOption[] = [
    { label: 'Faenamiento Clandestino', value: 'FINE_CLANDESTINE' },
    { label: 'Acceso No Autorizado', value: 'FINE_UNAUTHORIZED_ACCESS' },
];

/**
 * Servicios adicionales predefinidos
 */
export const DEFAULT_ADDITIONAL_SERVICES: AdditionalService[] = [
    {
        label: 'Lavado y Desinfección',
        type: 'WASHING',
        percentage: 5,
        description: 'Servicio de lavado y desinfección de instalaciones',
        isDefault: true,
    },
    {
        label: 'Refrigeración Adicional',
        type: 'ADDITIONAL_COOLING',
        percentage: 8,
        description: 'Servicio de refrigeración extendida',
        isDefault: true,
    },
    {
        label: 'Procesamiento Especial',
        type: 'SPECIAL_PROCESSING',
        percentage: 12,
        description: 'Procesamiento especializado de productos',
        isDefault: true,
    },
    {
        label: 'Almacenamiento Prolongado',
        type: 'EXTENDED_STORAGE',
        percentage: 7,
        description: 'Almacenamiento por más de 48 horas',
        isDefault: false,
    },
    {
        label: 'Servicio Veterinario',
        type: 'VETERINARY_SERVICE',
        percentage: 10,
        description: 'Servicios veterinarios especializados',
        isDefault: false,
    },
];

/**
 * Valores RBU predefinidos
 */
export const PREDEFINED_RBU_VALUES: DropdownOption[] = [
    { label: 'RBU 2024 - $470', value: 470 },
    { label: 'RBU 2023 - $450', value: 450 },
    { label: 'RBU 2022 - $430', value: 430 },
    { label: 'RBU 2021 - $400', value: 400 },
    { label: 'Personalizado', value: null },
];

// ===== CONFIGURACIÓN COMPLETA =====

/**
 * Configuración completa del sistema de tarifas
 */
export const TARIFF_SYSTEM_CONFIG = {
    types: TARIFF_TYPE_OPTIONS,
    categories: CATEGORY_OPTIONS,
    calculationTypes: CALCULATION_TYPE_OPTIONS,
    species: SPECIES_OPTIONS,
    introducerTypes: INTRODUCER_TYPE_OPTIONS,
    fineTypes: FINE_TYPE_OPTIONS,
    additionalServices: DEFAULT_ADDITIONAL_SERVICES,
    rbuValues: PREDEFINED_RBU_VALUES,
};

// ===== MÓDULO ANGULAR HELPER =====

/**
 * Array de componentes para importar en módulos Angular
 */
export const TARIFF_COMPONENTS = [
    TariffDashboardComponent,
    TariffConfigListComponent,
    TariffConfigFormComponent,
    TariffCalculatorComponent,
    RbuManagementComponent,
] as const;

/**
 * Array de servicios para providers
 */
export const TARIFF_SERVICES = [TariffConfigService] as const;
