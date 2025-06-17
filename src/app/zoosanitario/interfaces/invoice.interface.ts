// src/app/demo/interfaces/invoice.interface.ts

export interface Invoice {
    _id?: string;
    invoiceNumber: string;
    issueDate: Date | string;
    dueDate?: Date | string;
    payDate?: Date | string;
    status: InvoiceStatus;
    introducer: any;
    items: InvoiceItem[];
    totalAmount: number;
    notes?: string;
    oracleIntegration?: any;
    createdBy?: string;
    updatedBy?: string;
    deletedBy?: string;
    deletedAt?: Date | string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

export enum InvoiceStatus {
    GENERATED = 'Generated',
    ISSUED = 'Issued',
    PAID = 'Paid',
    CANCELLED = 'Cancelled',
}

export interface InvoiceItem {
    rate: any; // Rate interface from your rate.interface.ts
    quantity: number;
    description?: string;
    unitPrice: number;
    totalAmount: number;
    rateSnapshot?: any;
    rateDetailSnapshot?: any;
    calculationDate?: Date | string;
}

export interface Introducer {
    _id: string;
    name: string;
    documentType?: string;
    documentNumber?: string;
    personType?: 'Natural' | 'Jurídica';
    email?: string;
    phone?: string;
    address?: string;
    // Agrega más campos según tu schema de Introducer
}

export interface InvoiceFilters {
    status?: InvoiceStatus;
    introducerId?: string;
    dateFrom?: Date | string;
    dateTo?: Date | string;
    invoiceNumber?: string;
    minAmount?: number;
    maxAmount?: number;
}

export interface InvoiceSummary {
    introducerId: string;
    introducer?: Introducer;
    totalInvoices: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    invoicesByStatus: {
        generated: number;
        issued: number;
        paid: number;
        cancelled: number;
    };
}

export interface CreateInvoiceDto {
    introducer: string;
    items: CreateInvoiceItemDto[];
    notes?: string;
    dueDate?: Date | string;
}

export interface CreateInvoiceItemDto {
    rate: string;
    quantity: number;
    description?: string;
    unitPrice?: number;
}

export interface UpdateInvoiceDto {
    notes?: string;
    dueDate?: Date | string;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: any;
}

export interface PaginatedResponse<T> {
    docs: T[];
    totalDocs: number;
    limit: number;
    totalPages: number;
    page: number;
    pagingCounter: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    prevPage: number | null;
    nextPage: number | null;
}

export interface PaginationOptions {
    page?: number;
    limit?: number;
    sort?: { [key: string]: 1 | -1 };
}

export interface InvoiceStatistics {
    period: string;
    totalInvoices: number;
    totalAmount: number;
    averageAmount: number;
    statusDistribution: {
        status: InvoiceStatus;
        count: number;
        amount: number;
    }[];
    topIntroducers: {
        introducer: Introducer;
        invoiceCount: number;
        totalAmount: number;
    }[];
}
