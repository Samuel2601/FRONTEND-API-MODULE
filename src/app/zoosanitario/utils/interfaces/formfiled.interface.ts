// ===== FORM INTERFACES =====

export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea';
    required: boolean;
    options?: Array<{ label: string; value: any }>;
    validators?: any[];
    placeholder?: string;
    helpText?: string;
    conditionalDisplay?: {
        field: string;
        value: any;
        operator: '==' | '!=' | '>' | '<' | 'includes';
    };
}

export interface DynamicForm {
    title: string;
    description?: string;
    sections: Array<{
        title: string;
        fields: FormField[];
    }>;
    submitText: string;
    cancelText?: string;
}
