// src/app/demo/models/rate.interface.ts

export interface AnimalType {
    _id: string;
    name: string;
    description?: string;
}

export interface User {
    _id: string;
    name: string;
    email: string;
}

export interface Rate {
    _id?: string;
    type: 'TASA' | 'TARIFA' | 'SERVICIOS';
    description: string;
    rubroxAtributo: string;
    code: string;
    position: number;
    animalTypes: AnimalType[];
    personType: ('Natural' | 'Jurídica')[];
    isActive: boolean;
    validFrom?: Date | string;
    validTo?: Date | string;
    metadata?: {
        category?: string;
        subcategory?: string;
        unit?: string;
        minimumAmount?: number;
        maximumAmount?: number | null;
    };
    createdAt?: Date;
    updatedAt?: Date;
}

export interface RateFilters {
    type?: 'TASA' | 'TARIFA' | 'SERVICIOS';
    animalType?: string;
    personType?: 'Natural' | 'Jurídica';
    code?: string;
    isActive?: boolean;
}

export interface RateSearchParams {
    type: 'TASA' | 'TARIFA' | 'SERVICIOS';
    animalTypeId: string;
    personType: 'Natural' | 'Jurídica';
}

export interface PaginationOptions {
    page?: number;
    limit?: number;
    sort?: Record<string, 1 | -1>;
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
