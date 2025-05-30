// ===== PREFERENCE INTERFACES =====

export interface UserPreferences {
    language: 'es' | 'en';
    dateFormat: string;
    timeFormat: '12h' | '24h';
    temperatureUnit: 'celsius' | 'fahrenheit';
    weightUnit: 'kg' | 'lb';
    theme: 'light' | 'dark' | 'auto';
    notifications: {
        email: boolean;
        push: boolean;
        inApp: boolean;
    };
    autoSave: boolean;
    defaultView: 'dashboard' | 'workflow' | 'certificates';
}
