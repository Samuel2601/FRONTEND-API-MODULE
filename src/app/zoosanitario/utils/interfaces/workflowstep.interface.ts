// ===== WORKFLOW INTERFACES =====

import { ExternalVerificationSheet } from './extrenalverificaionsheet.interface';
import {
    InternalVerificationSheet,
    ProductClassification,
    ProductDestination,
} from './internalverificationsheet.interface';
import { ProductQuality, SlaughterRecord } from './slaughterrecord.interface';
import { ZoosanitaryCertificate } from './zoosanitarycertificate.interface';

export interface WorkflowStep {
    id: string;
    name: string;
    icon: string;
    completed: boolean;
    data?: any;
}

export interface WorkflowData {
    reception?: {
        certificateNumber: string;
        certificateId: string;
        certificateData: ZoosanitaryCertificate;
        receptionDate: Date;
        receptionNotes?: string;
        validationStatus: string;
    };
    external?: {
        externalSheetId: string;
        externalSheetData: ExternalVerificationSheet;
        suitableProducts: number;
    };
    slaughter?: {
        slaughterRecordId: string;
        slaughterRecordData: SlaughterRecord;
        processedProducts: ProcessedProductInfo[];
    };
    internal?: {
        internalSheetId: string;
        internalSheetData: InternalVerificationSheet;
        approvedProducts: ApprovedProductInfo[];
    };
    shipping?: {
        shippingCompleted: boolean;
        deliveryDate: Date;
        finalStatus: string;
    };
}

export interface ProcessedProductInfo {
    animalId: string;
    type: string;
    weight: number;
    quality: ProductQuality;
    processingDate: Date;
}

export interface ApprovedProductInfo {
    productId: string;
    type: string;
    classification: ProductClassification;
    destination: ProductDestination;
    weight?: number;
}

// ===== REPORT INTERFACES =====

export interface ReportRequest {
    type: ReportType;
    dateFrom: Date;
    dateTo: Date;
    filters?: ReportFilters;
    format: ReportFormat;
}

export interface ReportFilters {
    certificateNumbers?: string[];
    inspectors?: string[];
    status?: string[];
    productTypes?: string[];
    destinations?: string[];
}

export interface ReportData {
    title: string;
    generatedAt: Date;
    period: {
        from: Date;
        to: Date;
    };
    summary: ReportSummary;
    details: any[];
    charts?: ChartData[];
}

export interface ReportSummary {
    totalCertificates: number;
    totalAnimals: number;
    totalWeight: number;
    approvalRate: number;
    averageProcessingTime: number;
    topDestinations: Array<{
        name: string;
        count: number;
        percentage: number;
    }>;
}

export interface ChartData {
    type: 'line' | 'bar' | 'pie' | 'doughnut';
    title: string;
    labels: string[];
    datasets: Array<{
        label: string;
        data: number[];
        backgroundColor?: string | string[];
        borderColor?: string | string[];
    }>;
}

export type ReportType =
    | 'DAILY'
    | 'WEEKLY'
    | 'MONTHLY'
    | 'CUSTOM'
    | 'CERTIFICATE_SUMMARY'
    | 'INSPECTION_REPORT'
    | 'PRODUCTION_REPORT';
export type ReportFormat = 'PDF' | 'EXCEL' | 'JSON';
