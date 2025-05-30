// ===== EXTERNAL VERIFICATION SHEET INTERFACES =====

import { BaseDocument } from './base.interface';

export interface ExternalVerificationSheet extends BaseDocument {
    certificateId: string;
    sheetNumber: string;
    inspectionDate: Date;
    inspector: string;
    productEvaluations: ProductEvaluation[];
    summary: EvaluationSummary;
    environmentalConditions: EnvironmentalConditions;
    status: VerificationStatus;
    generalObservations?: string;
    photographs?: string[];
    inspectorSignature?: string;
    signatureDate?: Date;
}

export interface ProductEvaluation {
    identification: string;
    type: string;
    species?: string;
    breed?: string;
    sex: AnimalSex;
    age?: number;
    weight?: number;
    generalCondition: GeneralCondition;
    physicalInspection: PhysicalInspection;
    completeDocumentation: boolean;
    vaccinationsUpToDate: boolean;
    veterinaryTreatments: string[];
    result: EvaluationResult;
    reason?: string;
    observations?: string;
}

export interface PhysicalInspection {
    temperature?: number;
    heartRate?: number;
    respiratoryRate?: number;
    hydrationStatus?: string;
    bodyCondition?: number;
    visibleLesions: boolean;
    lesionDescription?: string;
}

export interface EvaluationSummary {
    totalEvaluated: number;
    suitableForSlaughter: number;
    unfitConfiscation: number;
    unfitReturn: number;
    inQuarantine: number;
}

export interface EnvironmentalConditions {
    temperature?: number;
    humidity?: number;
    transportConditions?: string;
}

export type AnimalSex = 'MALE' | 'FEMALE' | 'CASTRATED';
export type GeneralCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
export type EvaluationResult =
    | 'SUITABLE_FOR_SLAUGHTER'
    | 'UNFIT_CONFISCATION'
    | 'UNFIT_RETURN'
    | 'QUARANTINE';
export type VerificationStatus = 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
