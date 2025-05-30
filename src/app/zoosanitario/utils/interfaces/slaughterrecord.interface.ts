// ===== SLAUGHTER RECORD INTERFACES =====

import { BaseDocument } from './base.interface';

export interface SlaughterRecord extends BaseDocument {
    externalSheetId: string;
    recordNumber: string;
    slaughterDate: Date;
    operator: string;
    responsibleVeterinarian: string;
    processings: ProcessingRecord[];
    summary: ProcessingSummary;
    status: ProcessingStatus;
}

export interface ProcessingRecord {
    animalId: string;
    startTime?: Date;
    endTime?: Date;
    processingMethod: string;
    processTemperature?: number;
    obtainedProducts: ObtainedProduct[];
    confiscations: Confiscation[];
    yield?: number;
    observations?: string;
}

export interface ObtainedProduct {
    type: string;
    weight: number;
    quality: ProductQuality;
    observations?: string;
}

export interface Confiscation {
    part: string;
    reason: string;
    weight: number;
    finalDisposition: string;
}

export interface ProcessingSummary {
    processedAnimals: number;
    liveWeight: number;
    carcassWeight: number;
    averageYield: number;
    totalConfiscations: number;
}

export type ProductQuality = 'EXTRA' | 'FIRST' | 'SECOND' | 'INDUSTRIAL';
export type ProcessingStatus = 'IN_PROGRESS' | 'COMPLETED' | 'SUSPENDED';
