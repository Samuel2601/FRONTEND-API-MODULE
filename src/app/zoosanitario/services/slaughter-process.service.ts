import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { AuthService } from 'src/app/demo/services/auth.service';

export interface SlaughterProcess {
    _id?: string;
    processNumber: string;
    zoosanitaryCertificateId: string;
    introducerId: string;

    // Etapa 1: Recepción
    reception: {
        receptionDate: Date;
        receptionMethod: 'QR_SCAN' | 'MANUAL_ENTRY';
        certificateValidation: {
            isValid: boolean;
            validationDate?: Date;
            validationErrors: string[];
            validatedBy?: string;
        };
        paymentVerification: {
            inscriptionStatus: 'PAID' | 'PENDING' | 'OVERDUE';
            finesStatus: 'NONE' | 'PAID' | 'PENDING';
            canProceedToNextStage: boolean;
            verificationDate?: Date;
            verifiedBy?: string;
            pendingAmount: number;
        };
        receivedAnimals: Array<{
            animalId: string;
            species: 'BOVINE' | 'PORCINE';
            weight?: number;
            arrivalTime: Date;
            condition?: string;
            observations?: string;
        }>;
        receptionNotes?: string;
    };

    // Etapa 2: Inspección Externa
    externalInspection: {
        canStart: boolean;
        startDate?: Date;
        endDate?: Date;
        inspector?: string;
        animalEvaluations: Array<{
            animalId: string;
            species: 'BOVINE' | 'PORCINE';
            identification: string;
            breed?: string;
            sex: 'MALE' | 'FEMALE' | 'CASTRATED';
            age?: number;
            weight?: number;
            physicalInspection: {
                temperature?: number;
                heartRate?: number;
                respiratoryRate?: number;
                generalCondition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
                visibleLesions: boolean;
                lesionDescription?: string;
            };
            evaluationResult:
                | 'SUITABLE_FOR_SLAUGHTER'
                | 'UNFIT_CONFISCATION'
                | 'UNFIT_RETURN'
                | 'QUARANTINE';
            reason?: string;
            observations?: string;
        }>;
        inspectionSummary: {
            totalAnimals: number;
            suitableForSlaughter: number;
            unfitConfiscation: number;
            unfitReturn: number;
            inQuarantine: number;
        };
        overallResult:
            | 'ALL_SUITABLE'
            | 'PARTIAL_SUITABLE'
            | 'ALL_UNSUITABLE'
            | 'PENDING';
        environmentalConditions?: {
            temperature?: number;
            humidity?: number;
            transportConditions?: string;
        };
        photographs: string[];
        inspectorSignature?: string;
        generalObservations?: string;
    };

    // Etapa 3: Faenamiento
    slaughter: {
        canStart: boolean;
        startDate?: Date;
        endDate?: Date;
        operator?: string;
        responsibleVeterinarian?: string;
        slaughterProcesses: Array<{
            animalId: string;
            startTime?: Date;
            endTime?: Date;
            processingMethod?: string;
            processTemperature?: number;
            obtainedProducts: Array<{
                type: string;
                weight: number;
                quality?: string;
                batch?: string;
                observations?: string;
            }>;
            confiscations: Array<{
                part: string;
                reason: string;
                weight: number;
                finalDisposition?: string;
            }>;
            yield?: number;
            observations?: string;
        }>;
        slaughterSummary: {
            processedAnimals: number;
            totalLiveWeight: number;
            totalCarcassWeight: number;
            averageYield: number;
            totalConfiscations: number;
        };
        status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SUSPENDED';
    };

    // Etapa 4: Inspección Interna
    internalInspection: {
        canStart: boolean;
        startDate?: Date;
        endDate?: Date;
        qualityInspector?: string;
        productInspections: Array<{
            productId: string;
            productType: string;
            batch?: string;
            organolepticInspection: {
                color?: string;
                odor?: string;
                texture?: string;
                appearance?: string;
                ph?: number;
                temperature?: number;
            };
            sanitaryInspection: {
                parasitePresence: boolean;
                pathologicalLesions: boolean;
                visibleContamination: boolean;
                findingsDescription?: string;
            };
            finalClassification:
                | 'SUITABLE_FOR_CONSUMPTION'
                | 'SUITABLE_FOR_PROCESSING'
                | 'TOTAL_CONFISCATION'
                | 'PARTIAL_CONFISCATION';
            destination?:
                | 'DIRECT_SALE'
                | 'PROCESSING'
                | 'EXPORT'
                | 'CONFISCATION'
                | 'RETURN';
            classificationReason?: string;
            observations?: string;
        }>;
        storageConditions?: {
            temperature?: number;
            humidity?: number;
            storageTime?: number;
            hygienicConditions?: string;
        };
        inspectionResult: {
            suitableProducts: number;
            confiscatedProducts: number;
            approvalPercentage: number;
        };
        status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REQUIRES_REVIEW';
        generalObservations?: string;
        recommendations?: string;
        inspectorSignature?: string;
    };

    // Etapa 5: Despacho
    dispatch: {
        canStart: boolean;
        dispatchDate?: Date;
        dispatchResponsible?: string;
        shipments: Array<{
            shipmentType:
                | 'REFRIGERATED_PRODUCTS'
                | 'RETURNED_PRODUCTS'
                | 'CONFISCATIONS';
            guideNumber: string;
            vehicle: {
                type: 'REFRIGERATED' | 'NORMAL_CARGO' | 'SPECIALIZED';
                licensePlate?: string;
                capacity?: number;
                operatingTemperature?: number;
                driver: {
                    name?: string;
                    idNumber?: string;
                    license?: string;
                };
            };
            destination: {
                destinationType?: string;
                name?: string;
                address?: string;
                contact?: string;
                phone?: string;
            };
            shippedProducts: Array<{
                productId: string;
                productType: string;
                quantity: number;
                weight: number;
                unit?: string;
                departureTemperature?: number;
                packaging?: string;
                batch?: string;
                expirationDate?: Date;
            }>;
            shipmentStatus:
                | 'PREPARATION'
                | 'IN_TRANSIT'
                | 'DELIVERED'
                | 'RETURNED'
                | 'INCIDENT';
            delivery?: {
                deliveryDate?: Date;
                receiverName?: string;
                receiverIdNumber?: string;
                deliveryObservations?: string;
                receiverSignature?: string;
            };
        }>;
        dispatchSummary: {
            totalShipments: number;
            refrigeratedShipments: number;
            returnedShipments: number;
            confiscationShipments: number;
        };
    };

    // Datos financieros
    financialData: {
        appliedTariffs: Array<{
            tariffType: string;
            description: string;
            quantity: number;
            unitPrice: number;
            totalAmount: number;
            tariffConfigId?: string;
        }>;
        animalCosts: Array<{
            animalId: string;
            species: 'BOVINE' | 'PORCINE';
            slaughterFee: number;
            additionalServices: number;
            prolongedUseFee: number;
            weight: number;
            arrivalTime: Date;
            slaughterTime?: Date;
            prolongedHours: number;
        }>;
        totalCosts: {
            slaughterFees: number;
            additionalServices: number;
            prolongedUseFees: number;
            otherFees: number;
            subtotal: number;
            taxes: number;
            totalAmount: number;
        };
        paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
        invoiceId?: string;
    };

    // Estado general
    overallStatus:
        | 'RECEPTION'
        | 'PAYMENT_VERIFICATION'
        | 'EXTERNAL_INSPECTION'
        | 'SLAUGHTER'
        | 'INTERNAL_INSPECTION'
        | 'DISPATCH'
        | 'COMPLETED'
        | 'CANCELLED'
        | 'SUSPENDED';

    processTimeline: Array<{
        stage: string;
        startTime?: Date;
        endTime?: Date;
        duration?: number;
        responsible?: string;
        status: string;
        notes?: string;
    }>;

    qualityControl: {
        totalAnimalsReceived: number;
        totalAnimalsProcessed: number;
        totalProductsApproved: number;
        totalProductsConfiscated: number;
        overallYield: number;
        processEfficiency: number;
    };

    generalNotes?: string;
    createdBy?: string;
    lastModifiedBy?: string;
    createdAt?: Date;
    updatedAt?: Date;

    // Información expandida (populate)
    introducer?: {
        _id: string;
        firstName?: string;
        lastName?: string;
        companyName?: string;
        idNumber: string;
        type: 'NATURAL' | 'JURIDICAL';
        introducerType: string;
    };
    zoosanitaryCertificate?: {
        _id: string;
        certificateNumber: string;
        issueDate: Date;
        expirationDate: Date;
        status: string;
    };
}

export interface SlaughterProcessDashboard {
    totalProcesses: number;
    processesByStatus: {
        reception: number;
        paymentVerification: number;
        externalInspection: number;
        slaughter: number;
        internalInspection: number;
        dispatch: number;
        completed: number;
        cancelled: number;
        suspended: number;
    };
    todayProcesses: number;
    pendingPaymentVerification: number;
    avgProcessingTime: number;
    totalRevenue: number;
    alertsAndNotifications: {
        overdueProcesses: number;
        suspendedProcesses: number;
        pendingPayments: number;
        lowQualityAlerts: number;
    };
}

export interface SlaughterStatistics {
    totalAnimalsProcessed: number;
    animalsBySpecies: {
        bovine: number;
        porcine: number;
    };
    avgYield: number;
    confiscationRate: number;
    processEfficiency: number;
    revenueByMonth: Array<{
        month: string;
        revenue: number;
        processes: number;
    }>;
    qualityMetrics: {
        avgExternalInspectionTime: number;
        avgSlaughterTime: number;
        avgInternalInspectionTime: number;
        avgTotalProcessTime: number;
    };
}

export interface ReceptionParams {
    zoosanitaryCertificateId: string;
    introducerId: string;
    receptionMethod: 'QR_SCAN' | 'MANUAL_ENTRY';
    receivedAnimals: Array<{
        animalId: string;
        species: 'BOVINE' | 'PORCINE';
        weight?: number;
        condition?: string;
        observations?: string;
    }>;
    receptionNotes?: string;
}

export interface AnimalEvaluationParams {
    animalId: string;
    species: 'BOVINE' | 'PORCINE';
    identification: string;
    breed?: string;
    sex: 'MALE' | 'FEMALE' | 'CASTRATED';
    age?: number;
    weight?: number;
    physicalInspection: {
        temperature?: number;
        heartRate?: number;
        respiratoryRate?: number;
        generalCondition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
        visibleLesions: boolean;
        lesionDescription?: string;
    };
    evaluationResult:
        | 'SUITABLE_FOR_SLAUGHTER'
        | 'UNFIT_CONFISCATION'
        | 'UNFIT_RETURN'
        | 'QUARANTINE';
    reason?: string;
    observations?: string;
}

export interface ShipmentParams {
    shipmentType:
        | 'REFRIGERATED_PRODUCTS'
        | 'RETURNED_PRODUCTS'
        | 'CONFISCATIONS';
    vehicle: {
        type: 'REFRIGERATED' | 'NORMAL_CARGO' | 'SPECIALIZED';
        licensePlate?: string;
        capacity?: number;
        operatingTemperature?: number;
        driver: {
            name?: string;
            idNumber?: string;
            license?: string;
        };
    };
    destination: {
        destinationType?: string;
        name?: string;
        address?: string;
        contact?: string;
        phone?: string;
    };
    shippedProducts: Array<{
        productId: string;
        productType: string;
        quantity: number;
        weight: number;
        unit?: string;
        departureTemperature?: number;
        packaging?: string;
        batch?: string;
        expirationDate?: Date;
    }>;
}

@Injectable({
    providedIn: 'root',
})
export class SlaughterProcessService {
    private apiUrl = `${GLOBAL.url_zoosanitario}slaughter-process`;

    constructor(private http: HttpClient, private auth: AuthService) {}

    token() {
        return this.auth.token();
    }

    getHeaders(token: string): HttpHeaders {
        return new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
    }

    /**
     * Obtener todos los procesos de faenamiento
     */
    getAllProcesses(params?: {
        page?: number;
        limit?: number;
        status?: string;
        introducerId?: string;
    }): Observable<{
        processes: SlaughterProcess[];
        total: number;
        page: number;
        limit: number;
    }> {
        let httpParams = new HttpParams();

        if (params?.page)
            httpParams = httpParams.set('page', params.page.toString());
        if (params?.limit)
            httpParams = httpParams.set('limit', params.limit.toString());
        if (params?.status)
            httpParams = httpParams.set('status', params.status);
        if (params?.introducerId)
            httpParams = httpParams.set('introducerId', params.introducerId);

        return this.http
            .get<{
                processes: SlaughterProcess[];
                total: number;
                page: number;
                limit: number;
            }>(this.apiUrl, {
                params: httpParams,
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener proceso por ID
     */
    getProcessById(id: string): Observable<SlaughterProcess> {
        return this.http
            .get<SlaughterProcess>(`${this.apiUrl}/${id}`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener dashboard de procesos
     */
    getDashboard(): Observable<SlaughterProcessDashboard> {
        return this.http
            .get<SlaughterProcessDashboard>(`${this.apiUrl}/dashboard`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener estadísticas de procesos
     */
    getStatistics(params?: {
        startDate?: Date;
        endDate?: Date;
        species?: string;
    }): Observable<SlaughterStatistics> {
        let httpParams = new HttpParams();

        if (params?.startDate)
            httpParams = httpParams.set(
                'startDate',
                params.startDate.toISOString()
            );
        if (params?.endDate)
            httpParams = httpParams.set(
                'endDate',
                params.endDate.toISOString()
            );
        if (params?.species)
            httpParams = httpParams.set('species', params.species);

        return this.http
            .get<SlaughterStatistics>(`${this.apiUrl}/statistics`, {
                params: httpParams,
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener procesos por estado
     */
    getProcessesByStatus(status: string): Observable<SlaughterProcess[]> {
        return this.http
            .get<SlaughterProcess[]>(`${this.apiUrl}/status/${status}`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * ETAPA 1: Iniciar recepción
     */
    startReception(params: ReceptionParams): Observable<SlaughterProcess> {
        return this.http
            .post<SlaughterProcess>(`${this.apiUrl}/reception/start`, params, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * ETAPA 1: Validar certificado zoosanitario
     */
    validateCertificate(
        id: string,
        certificateData: {
            certificateNumber: string;
            issueDate: Date;
            expirationDate: Date;
            observations?: string;
        }
    ): Observable<SlaughterProcess> {
        return this.http
            .put<SlaughterProcess>(
                `${this.apiUrl}/${id}/reception/validate-certificate`,
                certificateData,
                { headers: this.getHeaders(this.token()) }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * ETAPA 2: Iniciar inspección externa
     */
    startExternalInspection(id: string): Observable<SlaughterProcess> {
        return this.http
            .put<SlaughterProcess>(
                `${this.apiUrl}/${id}/external-inspection/start`,
                {},
                { headers: this.getHeaders(this.token()) }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * ETAPA 2: Evaluar animal en inspección externa
     */
    evaluateAnimal(
        id: string,
        evaluation: AnimalEvaluationParams
    ): Observable<SlaughterProcess> {
        return this.http
            .put<SlaughterProcess>(
                `${this.apiUrl}/${id}/external-inspection/evaluate-animal`,
                evaluation,
                { headers: this.getHeaders(this.token()) }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * ETAPA 2: Completar inspección externa
     */
    completeExternalInspection(
        id: string,
        data: {
            environmentalConditions?: {
                temperature?: number;
                humidity?: number;
                transportConditions?: string;
            };
            generalObservations?: string;
            photographs?: string[];
        }
    ): Observable<SlaughterProcess> {
        return this.http
            .put<SlaughterProcess>(
                `${this.apiUrl}/${id}/external-inspection/complete`,
                data,
                { headers: this.getHeaders(this.token()) }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * ETAPA 3: Iniciar faenamiento
     */
    startSlaughter(
        id: string,
        data: {
            operator?: string;
            responsibleVeterinarian?: string;
            startDate?: Date;
        }
    ): Observable<SlaughterProcess> {
        return this.http
            .put<SlaughterProcess>(
                `${this.apiUrl}/${id}/slaughter/start`,
                data,
                { headers: this.getHeaders(this.token()) }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * ETAPA 3: Registrar proceso de faenamiento
     */
    recordSlaughterProcess(
        id: string,
        data: {
            animalId: string;
            startTime?: Date;
            endTime?: Date;
            processingMethod?: string;
            processTemperature?: number;
            obtainedProducts: Array<{
                type: string;
                weight: number;
                quality?: string;
                batch?: string;
                observations?: string;
            }>;
            confiscations?: Array<{
                part: string;
                reason: string;
                weight: number;
                finalDisposition?: string;
            }>;
            yield?: number;
            observations?: string;
        }
    ): Observable<SlaughterProcess> {
        return this.http
            .put<SlaughterProcess>(
                `${this.apiUrl}/${id}/slaughter/record`,
                data,
                { headers: this.getHeaders(this.token()) }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * ETAPA 3: Completar faenamiento
     */
    completeSlaughter(id: string): Observable<SlaughterProcess> {
        return this.http
            .put<SlaughterProcess>(
                `${this.apiUrl}/${id}/slaughter/complete`,
                {},
                { headers: this.getHeaders(this.token()) }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * ETAPA 4: Iniciar inspección interna
     */
    startInternalInspection(id: string): Observable<SlaughterProcess> {
        return this.http
            .put<SlaughterProcess>(
                `${this.apiUrl}/${id}/internal-inspection/start`,
                {},
                { headers: this.getHeaders(this.token()) }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * ETAPA 4: Inspeccionar producto
     */
    inspectProduct(
        id: string,
        inspection: {
            productId: string;
            productType: string;
            batch?: string;
            organolepticInspection: {
                color?: string;
                odor?: string;
                texture?: string;
                appearance?: string;
                ph?: number;
                temperature?: number;
            };
            sanitaryInspection: {
                parasitePresence: boolean;
                pathologicalLesions: boolean;
                visibleContamination: boolean;
                findingsDescription?: string;
            };
            finalClassification:
                | 'SUITABLE_FOR_CONSUMPTION'
                | 'SUITABLE_FOR_PROCESSING'
                | 'TOTAL_CONFISCATION'
                | 'PARTIAL_CONFISCATION';
            destination?:
                | 'DIRECT_SALE'
                | 'PROCESSING'
                | 'EXPORT'
                | 'CONFISCATION'
                | 'RETURN';
            classificationReason?: string;
            observations?: string;
        }
    ): Observable<SlaughterProcess> {
        return this.http
            .put<SlaughterProcess>(
                `${this.apiUrl}/${id}/internal-inspection/inspect-product`,
                inspection,
                { headers: this.getHeaders(this.token()) }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * ETAPA 4: Completar inspección interna
     */
    completeInternalInspection(
        id: string,
        data: {
            storageConditions?: {
                temperature?: number;
                humidity?: number;
                storageTime?: number;
                hygienicConditions?: string;
            };
            generalObservations?: string;
            recommendations?: string;
        }
    ): Observable<SlaughterProcess> {
        return this.http
            .put<SlaughterProcess>(
                `${this.apiUrl}/${id}/internal-inspection/complete`,
                data,
                { headers: this.getHeaders(this.token()) }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * ETAPA 5: Crear envío para despacho
     */
    createShipment(
        id: string,
        shipment: ShipmentParams
    ): Observable<SlaughterProcess> {
        return this.http
            .post<SlaughterProcess>(
                `${this.apiUrl}/${id}/dispatch/create-shipment`,
                shipment,
                { headers: this.getHeaders(this.token()) }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Completar proceso completo
     */
    completeProcess(id: string): Observable<SlaughterProcess> {
        return this.http
            .put<SlaughterProcess>(
                `${this.apiUrl}/${id}/complete`,
                {},
                { headers: this.getHeaders(this.token()) }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Buscar procesos con filtros
     */
    searchProcesses(filters: {
        processNumber?: string;
        introducerId?: string;
        introducerName?: string;
        status?: string;
        species?: string;
        dateFrom?: Date;
        dateTo?: Date;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Observable<{
        processes: SlaughterProcess[];
        total: number;
        page: number;
        limit: number;
    }> {
        let params = new HttpParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (value instanceof Date) {
                    params = params.set(key, value.toISOString());
                } else {
                    params = params.set(key, value.toString());
                }
            }
        });

        return this.http
            .get<{
                processes: SlaughterProcess[];
                total: number;
                page: number;
                limit: number;
            }>(`${this.apiUrl}/search`, {
                params,
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener procesos pendientes de verificación de pago
     */
    getPendingPaymentVerification(): Observable<SlaughterProcess[]> {
        return this.getProcessesByStatus('PAYMENT_VERIFICATION').pipe(
            catchError(this.handleError)
        );
    }

    /**
     * Obtener procesos listos para siguiente etapa
     */
    getReadyForNextStage(): Observable<{
        readyForExternalInspection: SlaughterProcess[];
        readyForSlaughter: SlaughterProcess[];
        readyForInternalInspection: SlaughterProcess[];
        readyForDispatch: SlaughterProcess[];
    }> {
        return this.getAllProcesses().pipe(
            map((response) => {
                const processes = response.processes;
                return {
                    readyForExternalInspection: processes.filter(
                        (p) =>
                            p.overallStatus === 'PAYMENT_VERIFICATION' &&
                            p.reception.paymentVerification
                                .canProceedToNextStage
                    ),
                    readyForSlaughter: processes.filter(
                        (p) =>
                            p.overallStatus === 'EXTERNAL_INSPECTION' &&
                            p.externalInspection.overallResult ===
                                'ALL_SUITABLE'
                    ),
                    readyForInternalInspection: processes.filter(
                        (p) =>
                            p.overallStatus === 'SLAUGHTER' &&
                            p.slaughter.status === 'COMPLETED'
                    ),
                    readyForDispatch: processes.filter(
                        (p) =>
                            p.overallStatus === 'INTERNAL_INSPECTION' &&
                            p.internalInspection.status === 'COMPLETED'
                    ),
                };
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Obtener procesos por introductor
     */
    getProcessesByIntroducer(
        introducerId: string
    ): Observable<SlaughterProcess[]> {
        return this.getAllProcesses({ introducerId }).pipe(
            map((response) => response.processes),
            catchError(this.handleError)
        );
    }

    /**
     * Obtener estado del proceso en español
     */
    getStatusLabel(status: string): string {
        const labels: { [key: string]: string } = {
            RECEPTION: 'Recepción',
            PAYMENT_VERIFICATION: 'Verificación de Pagos',
            EXTERNAL_INSPECTION: 'Inspección Externa',
            SLAUGHTER: 'Faenamiento',
            INTERNAL_INSPECTION: 'Inspección Interna',
            DISPATCH: 'Despacho',
            COMPLETED: 'Completado',
            CANCELLED: 'Cancelado',
            SUSPENDED: 'Suspendido',
        };
        return labels[status] || status;
    }

    /**
     * Obtener especies en español
     */
    getSpeciesLabel(species: string): string {
        const labels: { [key: string]: string } = {
            BOVINE: 'Bovino',
            PORCINE: 'Porcino',
        };
        return labels[species] || species;
    }

    /**
     * Obtener resultado de evaluación en español
     */
    getEvaluationResultLabel(result: string): string {
        const labels: { [key: string]: string } = {
            SUITABLE_FOR_SLAUGHTER: 'Apto para Faenamiento',
            UNFIT_CONFISCATION: 'No Apto - Decomiso',
            UNFIT_RETURN: 'No Apto - Devolución',
            QUARANTINE: 'Cuarentena',
        };
        return labels[result] || result;
    }

    /**
     * Calcular progreso del proceso (porcentaje)
     */
    calculateProcessProgress(status: string): number {
        const progressMap: { [key: string]: number } = {
            RECEPTION: 10,
            PAYMENT_VERIFICATION: 20,
            EXTERNAL_INSPECTION: 40,
            SLAUGHTER: 60,
            INTERNAL_INSPECTION: 80,
            DISPATCH: 90,
            COMPLETED: 100,
            CANCELLED: 0,
            SUSPENDED: 0,
        };
        return progressMap[status] || 0;
    }

    /**
     * Validar si se puede proceder a la siguiente etapa
     */
    canProceedToNextStage(process: SlaughterProcess): {
        canProceed: boolean;
        reason?: string;
    } {
        switch (process.overallStatus) {
            case 'RECEPTION':
                if (!process.reception.certificateValidation.isValid) {
                    return {
                        canProceed: false,
                        reason: 'Certificado zoosanitario no válido',
                    };
                }
                return { canProceed: true };

            case 'PAYMENT_VERIFICATION':
                if (
                    !process.reception.paymentVerification.canProceedToNextStage
                ) {
                    return {
                        canProceed: false,
                        reason: 'Pagos pendientes por verificar',
                    };
                }
                return { canProceed: true };

            case 'EXTERNAL_INSPECTION':
                if (process.externalInspection.overallResult === 'PENDING') {
                    return {
                        canProceed: false,
                        reason: 'Inspección externa pendiente',
                    };
                }
                if (
                    process.externalInspection.overallResult ===
                    'ALL_UNSUITABLE'
                ) {
                    return {
                        canProceed: false,
                        reason: 'Todos los animales no aptos para faenamiento',
                    };
                }
                return { canProceed: true };

            case 'SLAUGHTER':
                if (process.slaughter.status !== 'COMPLETED') {
                    return {
                        canProceed: false,
                        reason: 'Proceso de faenamiento no completado',
                    };
                }
                return { canProceed: true };

            case 'INTERNAL_INSPECTION':
                if (process.internalInspection.status !== 'COMPLETED') {
                    return {
                        canProceed: false,
                        reason: 'Inspección interna no completada',
                    };
                }
                return { canProceed: true };

            default:
                return {
                    canProceed: false,
                    reason: 'Estado del proceso no válido',
                };
        }
    }

    /**
     * Manejo de errores
     */
    private handleError(error: any): Observable<never> {
        console.error('Error en SlaughterProcessService:', error);

        let errorMessage = 'Error desconocido';

        if (error.error?.message) {
            errorMessage = error.error.message;
        } else if (error.message) {
            errorMessage = error.message;
        } else if (error.status) {
            switch (error.status) {
                case 400:
                    errorMessage = 'Datos de proceso inválidos';
                    break;
                case 401:
                    errorMessage = 'No autorizado';
                    break;
                case 403:
                    errorMessage = 'Acceso denegado';
                    break;
                case 404:
                    errorMessage = 'Proceso de faenamiento no encontrado';
                    break;
                case 409:
                    errorMessage = 'Conflicto en el estado del proceso';
                    break;
                case 422:
                    errorMessage =
                        'No se puede proceder - requisitos no cumplidos';
                    break;
                case 500:
                    errorMessage = 'Error interno del servidor';
                    break;
                default:
                    errorMessage = `Error ${error.status}: ${error.statusText}`;
            }
        }

        return throwError(() => new Error(errorMessage));
    }
}
