// src/app/shared/types/qr.types.ts

export interface AnimalHealthCertificate {
    _id?: string;
    numeroCZPM: string;
    autorizadoA: string;
    codigoAreaOrigen: string;
    codigoAreaDestino: string;
    totalProductos: number;
    validoHasta: Date;
    vehiculo?: string;
}

export interface QRScanResult {
    success: boolean;
    data?: AnimalHealthCertificate | null;
    rawData?: string;
    error?: string;
    method?: QRScanMethod;
    timestamp?: Date;
}

export type QRScanMethod =
    | 'camera-capacitor'
    | 'camera-web'
    | 'file-upload'
    | 'clipboard-auto'
    | 'clipboard-manual'
    | 'manual-input';

export type Platform = 'web' | 'ios' | 'android';

export interface QRScanOptions {
    preferredMethod?: QRScanMethod;
    timeout?: number;
    allowManualInput?: boolean;
    autoDetectClipboard?: boolean;
    showInstructions?: boolean;
}

export interface QRValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    score: number;
}

export interface QRParseResult {
    certificate?: AnimalHealthCertificate;
    validation: QRValidationResult;
    rawData: string;
}

// Eventos del scanner
export interface QRScanEvent {
    type: 'scan-start' | 'scan-success' | 'scan-error' | 'scan-cancel';
    method: QRScanMethod;
    data?: any;
    error?: string;
}
