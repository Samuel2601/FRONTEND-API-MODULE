// ===== EXPORT TYPES =====

export type CertificateValidationStatus =
    | 'pending'
    | 'valid'
    | 'invalid'
    | 'expired';

export type WorkflowStepId =
    | 'reception'
    | 'external'
    | 'slaughter'
    | 'internal'
    | 'shipping';

export type DocumentStatus =
    | 'DRAFT'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'EXPIRED';

export type QualityGrade = 'EXTRA' | 'FIRST' | 'SECOND' | 'INDUSTRIAL';

export type TemperatureRange = {
    min: number;
    max: number;
    unit: 'celsius' | 'fahrenheit';
};

export type WeightRange = {
    min: number;
    max: number;
    unit: 'kg' | 'lb';
};
