// ===== ZOOSANITARY CERTIFICATE INTERFACES =====

import { BaseDocument } from './base.interface';

export interface ZoosanitaryCertificate extends BaseDocument {
    certificateNumber: string;
    authorizedTo: string;
    originAreaCode: string;
    destinationAreaCode: string;
    totalProducts: number;
    validUntil: Date;
    vehicle: string;
    issueDate: Date;
    validFromDate: Date;
    origin: OriginData;
    destination: DestinationData;
    driver: DriverData;
    vehicleDetails: VehicleDetails;
    status: CertificateStatus;
    products: DeclaredProduct[];
    registeredBy?: string;
    notes?: string;
    verificationCode?: string;
    documentHash?: string;
}

export interface OriginData {
    owner: {
        name?: string;
        idNumber?: string;
        code?: string;
    };
    location: {
        province?: string;
        canton?: string;
        parish?: string;
        address?: string;
    };
    premises: {
        type?: string;
        description?: string;
    };
}

export interface DestinationData {
    slaughterhouse?: string;
    municipality?: string;
    owner: {
        name?: string;
        code?: string;
    };
    location: {
        province?: string;
        canton?: string;
        parish?: string;
        address?: string;
    };
}

export interface DriverData {
    name?: string;
    idNumber?: string;
}

export interface VehicleDetails {
    licensePlate?: string;
    type?: string;
    brand?: string;
    model?: string;
}

export interface DeclaredProduct {
    type: string;
    quantity: number;
    unit: string;
    description?: string;
}

export type CertificateStatus =
    | 'ACTIVE'
    | 'EXPIRED'
    | 'PROCESSED'
    | 'CANCELLED';
