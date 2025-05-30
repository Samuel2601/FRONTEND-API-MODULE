// ===== NOTIFICATION INTERFACES =====

export interface NotificationConfig {
    severity: 'success' | 'info' | 'warn' | 'error';
    summary: string;
    detail?: string;
    life?: number;
    sticky?: boolean;
    closable?: boolean;
}

export interface SystemNotification {
    id: string;
    type:
        | 'WORKFLOW_STEP_COMPLETED'
        | 'CERTIFICATE_EXPIRED'
        | 'INSPECTION_REQUIRED'
        | 'SYSTEM_ALERT';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    userId: string;
    data?: any;
}
