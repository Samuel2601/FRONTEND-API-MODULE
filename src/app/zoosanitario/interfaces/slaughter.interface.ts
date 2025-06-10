// ====================================
// INTERFACES Y MODELOS
// ====================================

// === INTERFACES BASE ===
export interface BaseEntity {
    _id: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
    deletedBy?: string;
    deletedAt?: Date;
}

// === INTERFACES DE FACTURACIÓN ===
export interface Invoice extends BaseEntity {
    invoiceNumber: string;
    issueDate: Date;
    dueDate?: Date;
    status: 'Generated' | 'Issued' | 'Paid' | 'Cancelled';
    integration?: {
        issued: boolean;
        externalIssueDate?: Date;
        externalPaymentId?: string;
        externalReference?: string;
    };
    introducer: Introducer;
    items: InvoiceItem[];
    totalAmount: number;
    type: 'inscription' | 'slaughter_services' | 'penalties' | 'permits';
    metadata?: {
        slaughterProcessId?: string;
        serviceType?: string;
        animalType?: string;
    };
}

export interface InvoiceItem {
    rate: string;
    rateDetail: string;
    rateSnapshot?: any;
    rateDetailSnapshot?: any;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
    calculationDetails?: any;
}

export interface Rate extends BaseEntity {
    code: string;
    name: string;
    description: string;
    type:
        | 'INSCRIPTION'
        | 'SLAUGHTER_SERVICES'
        | 'ADDITIONAL_SERVICES'
        | 'PENALTIES'
        | 'PERMITS';
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
    effectiveFrom: Date;
    effectiveUntil?: Date;
    priority: number;
    applicabilityRules?: any;
}

export interface RateDetail extends BaseEntity {
    rate: string;
    description: string;
    unitType: 'FIXED' | 'PERCENTAGE' | 'PER_UNIT' | 'PER_KG' | 'PER_DAY';
    calculationFormula?: any;
    applicationConditions?: ApplicationCondition[];
    defaultValue?: number;
    minimumValue?: number;
    maximumValue?: number;
    isActive: boolean;
}

export interface ApplicationCondition {
    field:
        | 'personType'
        | 'animalType'
        | 'quantity'
        | 'date'
        | 'introducer'
        | 'invoiceTotal';
    operator:
        | 'eq'
        | 'ne'
        | 'gt'
        | 'gte'
        | 'lt'
        | 'lte'
        | 'in'
        | 'nin'
        | 'between';
    value: any;
    logicalOperator: 'AND' | 'OR';
}

export interface ReferenceValue extends BaseEntity {
    code: string;
    name: string;
    description: string;
    valueType: 'MONETARY' | 'PERCENTAGE' | 'NUMERIC' | 'LIMIT_CONFIG';
    value: number | any;
    currency?: 'USD' | 'EUR';
    isActive: boolean;
    startDate: Date;
    endDate?: Date;
    applicabilityRules?: any;
    calculationFormula?: any;
    priority: number;
}

// === INTERFACES DE INTRODUCTORES ===
export interface Introducer {
    data?: any;
    warnings?: any[];
    recentInvoices?: any[];
    statistics?: any;
    introducer?: Introducer;
    _id: string;
    idNumber: string;
    ruc: string;
    name: string;
    email: string;
    phone: string;
    personType: string;
    cattleTypes: {
        _id: string;
        species: string;
        category: string;
        slaughter: boolean;
        createdBy: string;
        updatedBy: string;
        createdAt: string;
        updatedAt: string;
        __v: number;
        deletedAt: string | null;
    }[];
    companyName: string;
    createdBy: string;
    updatedBy: string;
    registrationStatus: string;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
    __v: number;
    id?: string;
}

// === INTERFACES DE CERTIFICADOS ===
export interface AnimalHealthCertificate extends BaseEntity {
    numeroCZPM: string;
    issueDate: Date;
    expirationDate: Date;
    status: 'ACTIVE' | 'EXPIRED' | 'ANNULLED' | 'USED';
    issuer: {
        name: string;
        title: string;
        signature?: string;
    };
    animals: CertificateAnimal[];
    origin: {
        farm: string;
        address: string;
        coordinates?: { lat: number; lng: number };
    };
    destination: {
        slaughterhouse: string;
        address: string;
    };
    transport: {
        vehicle: string;
        driver: string;
        license: string;
    };
    veterinaryObservations?: string;
    qrCode?: string;
    validationResults?: any;
}

export interface CertificateAnimal {
    identificacion: string;
    especie: string;
    raza?: string;
    sexo: 'Macho' | 'Hembra';
    edad: string;
    peso?: number;
    observaciones?: string;
}

// === INTERFACES DE RECEPCIÓN ===
export interface Reception extends BaseEntity {
    introducerId: string;
    certificadoZoosanitario: string;
    fechaHoraRecepcion: Date;
    animales: ReceptionAnimal[];
    transporte: {
        tipoVehiculo: string;
        placaVehiculo: string;
        conductor: string;
        licenciaConductor: string;
    };
    estado: 'RECIBIDO' | 'EN_INSPECCION' | 'APROBADO' | 'RECHAZADO';
    observaciones?: string;
    usuarioRecepcion: string;
}

export interface ReceptionAnimal {
    identificacionAnimal: string;
    especie: string;
    pesoEstimado?: number;
    estadoGeneral: 'BUENO' | 'REGULAR' | 'MALO';
    observaciones?: string;
}

// === INTERFACES DE INSPECCIONES ===
export interface ExternalInspection extends BaseEntity {
    receptionId: string;
    animalId: string;
    fechaInspeccion: Date;
    inspector: string;
    resultadoInspeccion: 'APTO' | 'NO_APTO' | 'CONDICIONAL';
    observaciones?: string;
    criteriosEvaluacion: InspectionCriteria[];
    firmaInspector?: string;
}

export interface InternalInspection extends BaseEntity {
    slaughterProcessId: string;
    animalId: string;
    fechaInspeccion: Date;
    inspector: string;
    resultadoInspeccion:
        | 'APTO'
        | 'NO_APTO'
        | 'DECOMISO_PARCIAL'
        | 'DECOMISO_TOTAL';
    observaciones?: string;
    criteriosEvaluacion: InspectionCriteria[];
    clasificacionFinal?: string;
    firmaInspector?: string;
}

export interface InspectionCriteria {
    criterio: string;
    resultado: 'CONFORME' | 'NO_CONFORME';
    observaciones?: string;
}

// === INTERFACES DE PROCESO DE FAENAMIENTO ===
export interface SlaughterProcess extends BaseEntity {
    numeroOrden: string;
    introductor: string;
    recepcion?: string;
    inspeccionesExternas: string[];
    inspeccionesInternas: string[];
    estado:
        | 'Iniciado'
        | 'PreFaenamiento'
        | 'Faenamiento'
        | 'PostFaenamiento'
        | 'Finalizado'
        | 'Anulado';
    factura?: string;
    fechaInicio: Date;
    fechaFinalizacion?: Date;
    resumenProceso?: {
        totalAnimales: number;
        animalesAptos: number;
        animalesRechazados: number;
        pesoTotalFaenado: number;
    };
}

// === INTERFACES DE DESPACHO ===
export interface Dispatch extends BaseEntity {
    slaughterProcessId: string;
    tipoDespacho:
        | 'PRODUCTOS_FAENADOS'
        | 'ANIMALES_DEVUELTOS'
        | 'PRODUCTOS_RECHAZADOS';
    fechaDespacho: Date;
    vehiculo: {
        tipo: 'REFRIGERADO' | 'CARGA_NORMAL';
        placa: string;
        conductor: string;
        licencia: string;
    };
    productos: DispatchProduct[];
    destino: {
        direccion: string;
        responsable: string;
        telefono?: string;
    };
    estado: 'PREPARADO' | 'EN_TRANSITO' | 'ENTREGADO';
    observaciones?: string;
}

export interface DispatchProduct {
    animalId: string;
    tipoProducto: 'CARNE' | 'SUBPRODUCTOS' | 'ANIMAL_VIVO';
    peso?: number;
    clasificacion?: string;
    observaciones?: string;
}

// === INTERFACES DE RESPUESTA DE API ===
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// === INTERFACES DE CÁLCULOS ===
export interface RateCalculationRequest {
    introducerId: string;
    serviceType: string;
    animals?: any[];
    additionalServices?: any[];
    penalties?: any[];
    permits?: any[];
    prolongedStayHours?: number;
    externalProducts?: any[];
    poultryProducts?: any[];
}

export interface RateCalculationResponse {
    items: CalculatedItem[];
    totalAmount: number;
    details: {
        baseAmount: number;
        additionalServices: number;
        penalties: number;
        permits: number;
        taxes: number;
    };
}

export interface CalculatedItem {
    rateDetail: string;
    description: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
    calculationDetails: any;
}
