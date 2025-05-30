// ===== SHIPPING SHEET INTERFACES =====

import { BaseDocument } from './base.interface';

export interface ShippingSheet extends BaseDocument {
    internalSheetId: string;
    guideNumber: string;
    dispatchDate: Date;
    dispatchResponsible: string;
    shippingType: ShippingType;
    vehicle: ShippingVehicle;
    destination: ShippingDestination;
    shippingProducts: ShippingProduct[];
    transportConditions: TransportConditions;
    documentation: ShippingDocumentation;
    status: ShippingStatus;
    tracking: TrackingUpdate[];
    delivery?: DeliveryInfo;
    generalObservations?: string;
}

export interface ShippingVehicle {
    type: VehicleType;
    licensePlate: string;
    capacity: number;
    operatingTemperature?: number;
    driver: {
        name: string;
        idNumber: string;
        license: string;
    };
    vehicleDocuments: {
        insurance?: string;
        technicalCertificate?: string;
        operationPermit?: string;
    };
}

export interface ShippingDestination {
    type: string;
    name: string;
    address: string;
    contact: string;
    phone: string;
}

export interface ShippingProduct {
    productId: string;
    type: string;
    quantity: number;
    weight: number;
    unit: string;
    departureTemperature?: number;
    packaging: string;
    labeling: string;
    batch: string;
    expirationDate: Date;
    observations?: string;
}

export interface TransportConditions {
    initialTemperature?: number;
    initialHumidity?: number;
    estimatedTravelTime?: number;
    transportRoute?: string;
    specialPrecautions: string[];
}

export interface ShippingDocumentation {
    qualityCertificate?: string;
    transportPermit?: string;
    commercialInvoice?: string;
    remissionGuide?: string;
    otherDocuments: string[];
}

export interface TrackingUpdate {
    date: Date;
    status: string;
    location: string;
    temperature?: number;
    observations?: string;
    responsible: string;
}

export interface DeliveryInfo {
    deliveryDate: Date;
    receiverName: string;
    receiverIdNumber: string;
    deliveryObservations?: string;
    receiverSignature?: string;
    deliveryPhoto?: string;
}

export type ShippingType =
    | 'SLAUGHTERED_PRODUCTS'
    | 'RETURN_PRODUCTS'
    | 'CONFISCATIONS';
export type VehicleType = 'REFRIGERATED' | 'NORMAL_CARGO' | 'SPECIALIZED';
export type ShippingStatus =
    | 'PREPARATION'
    | 'IN_TRANSIT'
    | 'DELIVERED'
    | 'RETURNED'
    | 'INCIDENT';
