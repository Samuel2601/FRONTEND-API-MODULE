export interface Proyecto {
    _id?: string;
    numero: number;
    nombre: string;
    descripcion: string;
    mensajeInicial: string;
    estado: 'activo' | 'inactivo' | 'en_proceso';
    totalNominados: number;
    tagTotalNominados: string;
    tagLisado: string;
    imagen?: Imagen;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Nominado {
    _id?: string;
    numero: number;
    persona: {
        nombre: string;
        apellidos?: string;
        nombreCompleto?: string;
    };
    titulo: string;
    biografia: {
        aspectosPositivos: string;
        logros?: string[];
        reconocimientos?: {
            tipo: string;
            descripcion: string;
            anio?: number;
        }[];
        legado?: string;
    };
    proyecto: string;
    estado: 'activo' | 'inactivo' | 'revision';
    imagen?: Imagen;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Imagen {
    url?: string;
    nombre?: string;
    descripcion?: string;
    tamaño?: number;
    tipo?: string;
    fechaSubida?: Date;
}
