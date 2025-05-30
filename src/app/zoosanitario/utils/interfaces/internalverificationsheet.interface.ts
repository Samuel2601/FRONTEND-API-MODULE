// ===== INTERNAL VERIFICATION SHEET INTERFACES =====

import { BaseDocument } from './base.interface';

export interface InternalVerificationSheet extends BaseDocument {
    slaughterRecordId: string;
    sheetNumber: string;
    inspectionDate: Date;
    qualityInspector: string;
    productInspections: ProductInspection[];
    storageConditions: StorageConditions;
    generalResult: GeneralResult;
    status: InternalVerificationStatus;
    generalObservations?: string;
    recommendations?: string;
    inspectorSignature?: string;
    signatureDate?: Date;
}

export interface ProductInspection {
    productId: string;
    type: string;
    organoleptlcInspection: OrganoleptlcInspection;
    sanitaryInspection: SanitaryInspection;
    laboratoryTests: LaboratoryTest[];
    classification: ProductClassification;
    destination: ProductDestination;
    classificationReason?: string;
    observations?: string;
}

export interface OrganoleptlcInspection {
    color: string;
    odor: string;
    texture: string;
    appearance: string;
    ph?: number;
    temperature?: number;
}

export interface SanitaryInspection {
    parasitePresence: boolean;
    pathologicalLesions: boolean;
    visibleContamination: boolean;
    findingsDescription?: string;
}

export interface LaboratoryTest {
    testType: string;
    result: string;
    numericValue?: number;
    unit?: string;
    testDate: Date;
}

export interface StorageConditions {
    temperature?: number;
    humidity?: number;
    storageTime?: number;
    hygienicConditions?: string;
}

export interface GeneralResult {
    suitableProducts: number;
    confiscatedProducts: number;
    approvalPercentage: number;
}

export type ProductClassification =
    | 'SUITABLE_FOR_CONSUMPTION'
    | 'SUITABLE_FOR_PROCESSING'
    | 'TOTAL_CONFISCATION'
    | 'PARTIAL_CONFISCATION';
export type ProductDestination =
    | 'DIRECT_SALE'
    | 'PROCESSING'
    | 'EXPORT'
    | 'CONFISCATION'
    | 'RETURN';
export type InternalVerificationStatus =
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'REQUIRES_REVIEW';
