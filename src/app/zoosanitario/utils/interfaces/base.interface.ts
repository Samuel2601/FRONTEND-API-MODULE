// ===== BASE INTERFACES =====

export interface BaseDocument {
    _id?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface User {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
}

export type UserRole = 'ADMIN' | 'VETERINARIAN' | 'INSPECTOR' | 'OPERATOR';
