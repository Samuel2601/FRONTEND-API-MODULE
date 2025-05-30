// ===== UTILITY TYPES =====

import { ApiResponse } from '../interfaces/apiresponse.interface';
import { WorkflowStepId } from './export.type';

export type Partial<T> = {
    [P in keyof T]?: T[P];
};

export type Required<T> = {
    [P in keyof T]-?: T[P];
};

export type Pick<T, K extends keyof T> = {
    [P in K]: T[P];
};

export type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

// Tipo para manejar respuestas de API de forma type-safe
export type AsyncResponse<T> = Promise<ApiResponse<T>>;

// Tipo para eventos del workflow
export type WorkflowEvent = {
    step: WorkflowStepId;
    action: 'started' | 'completed' | 'cancelled' | 'error';
    data?: any;
    timestamp: Date;
    user: string;
};
