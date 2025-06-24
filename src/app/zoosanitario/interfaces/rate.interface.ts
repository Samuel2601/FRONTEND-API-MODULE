// src/app/demo/models/rate.interface.ts

export interface AnimalType {
    _id: string;
    species: string;
    category: string;
}

export interface User {
    _id: string;
    name: string;
    email: string;
}

// rate.interface.ts - Interface actualizada
export interface Rate {
    _id?: string;

    // Campos básicos
    type: 'TASA' | 'TARIFA' | 'SERVICIOS';
    description: string;
    rubroxAtributo: string;
    code: string;
    code_tributo?: string;
    position: number;
    maxQuantity?: number;
    status?: boolean;

    // Relaciones
    animalTypes: string[] | AnimalType[];
    personType: ('Natural' | 'Jurídica')[];

    // Campos complejos nuevos
    baseLegalRate?: any;

    quantityConfig?: {
        maxQuantity?: number;
        isUnlimited?: boolean;
        maxQuantityBasedOnRate?: string;
    };

    invoiceConfig?: {
        allowInvoice?: boolean;
        alwaysInclude?: boolean;
        automaticCharge?: boolean;
        chargeFrequency?:
            | 'NONE'
            | 'YEARLY'
            | 'FISCAL_YEAR'
            | 'PER_SLAUGHTER_PROCESS';
        uniqueByIntroducerYear?: boolean;
    };

    dependencies?: {
        requiresPreviousRate?: string;
        requiresSlaughterProcess?: boolean;
        standaloneAllowed?: boolean;
    };

    validationRules?: {
        prerequisiteRates?: string[];
        quantityValidationRate?: string;
        quantityValidationType?:
            | 'NONE'
            | 'MAX_BASED_ON'
            | 'EXACT_MATCH'
            | 'PROPORTIONAL';
    };

    // Auditoría
    createdBy?: string;
    updatedBy?: string;
    deletedBy?: string;
    deletedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface RateFilters {
    type?: string;
    personType?: string;
    status?: boolean;
    search?: string;
    sort?: any;
}

export interface PaginationOptions {
    page: number;
    limit: number;
    sort?: any;
}

export interface RateSearchParams {
    type: 'TASA' | 'TARIFA' | 'SERVICIOS';
    animalTypeId: string;
    personType: 'Natural' | 'Jurídica';
}

export interface PaginatedResponse<T> {
    success: boolean;
    message: string;
    data: T[];
    pagination: {
        totalDocs: number;
        limit: number;
        totalPages: number;
        page: number;
        pagingCounter: number;
        hasPrevPage: boolean;
        hasNextPage: boolean;
        prevPage: number | null;
        nextPage: number | null;
    };
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    count?: number;
}
