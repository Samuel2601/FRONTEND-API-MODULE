// ===== VALIDATION INTERFACES =====

export interface ValidationRule {
    field: string;
    rules: Array<{
        type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
        value?: any;
        message: string;
        validator?: (value: any) => boolean;
    }>;
}

export interface ValidationResult {
    isValid: boolean;
    errors: Array<{
        field: string;
        message: string;
    }>;
}
