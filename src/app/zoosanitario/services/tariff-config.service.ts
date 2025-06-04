import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { AuthService } from 'src/app/demo/services/auth.service';

//TariffConfig interface Actualización aplicada
export interface TariffConfig {
    _id?: string;
    name: string;
    // Nuevos campos de versionado
    validFrom?: Date;
    validTo?: Date;
    version?: number;
    tariffGroup?: string;
    supersedes?: string;
    changeReason?: string;

    type:
        | 'INSCRIPTION'
        | 'SLAUGHTER_FEE'
        | 'ADDITIONAL_SERVICE'
        | 'PROLONGED_USE'
        | 'EXTERNAL_PRODUCTS'
        | 'POULTRY'
        | 'PRIVATE_ESTABLISHMENT'
        | 'FINE_CLANDESTINE'
        | 'FINE_UNAUTHORIZED_ACCESS';
    category:
        | 'BOVINE'
        | 'PORCINE'
        | 'MIXED'
        | 'GENERAL'
        | 'PRIVATE_ESTABLISHMENT'
        | 'POULTRY';
    calculationType:
        | 'FIXED_AMOUNT'
        | 'PERCENTAGE_RBU'
        | 'PER_UNIT'
        | 'PER_KG'
        | 'PERCENTAGE_WEIGHT';
    fixedAmount: number;
    percentageRBU: number;
    unitPrice: number;
    pricePerKg: number;
    minPercentage: number;
    maxPercentage: number;
    currentRBU: number;
    description?: string;
    isActive: boolean;
    specialConditions?: {
        requiresTimeLimit: boolean;
        timeLimitHours: number;
        appliesAfterHours: boolean;
    };
    createdBy?: string;
    approvedBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

//ApiResponse interface nueva
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    pagination?: {
        current: number;
        pages: number;
        total: number;
        limit: number;
    };
}

export interface TariffCalculation {
    amount: number;
    details: {
        baseAmount?: number;
        rbuAmount?: number;
        quantity?: number;
        weight?: number;
        hours?: number;
        percentage?: number;
    };
    tariffConfig: TariffConfig;
}

export interface SlaughterCalculationParams {
    species: 'BOVINE' | 'PORCINE';
    weight?: number;
    quantity: number;
    introducerType?: 'BOVINE_MAJOR' | 'PORCINE_MINOR' | 'MIXED';
}

export interface AdditionalServicesParams {
    totalSlaughterAmount: number;
    services: Array<{
        type: string;
        percentage: number;
    }>;
}

export interface ProlongedUseParams {
    species: 'BOVINE' | 'PORCINE';
    arrivalTime: Date;
    slaughterTime: Date;
    quantity: number;
}

export interface InscriptionCalculationParams {
    introducerType: 'BOVINE_MAJOR' | 'PORCINE_MINOR' | 'MIXED';
    year: number;
}

export interface FineCalculationParams {
    fineType: 'FINE_CLANDESTINE' | 'FINE_UNAUTHORIZED_ACCESS';
    category?: 'BOVINE' | 'PORCINE' | 'MIXED';
    quantity?: number;
    percentage?: number;
}

@Injectable({
    providedIn: 'root',
})
export class TariffConfigService {
    private apiUrl = `${GLOBAL.url_zoosanitario}tariff-config`;

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
     * Obtener todas las configuraciones de tarifas
     */
    getAllTariffs(
        page: number = 1,
        limit: number = 10,
        filters?: any
    ): Observable<{ data: TariffConfig[]; pagination: any }> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('limit', limit.toString());

        if (filters) {
            Object.keys(filters).forEach((key) => {
                if (filters[key] !== null && filters[key] !== undefined) {
                    params = params.set(key, filters[key]);
                }
            });
        }

        return this.http
            .get<ApiResponse<TariffConfig[]>>(this.apiUrl, {
                headers: this.getHeaders(this.token()),
                params,
            })
            .pipe(
                map((response) => ({
                    data: response.data,
                    pagination: response.pagination,
                })),
                catchError(this.handleError)
            );
    }

    /**
     * Obtener configuración de tarifa por ID
     */
    getTariffById(id: string): Observable<TariffConfig> {
        return this.http
            .get<ApiResponse<TariffConfig>>(`${this.apiUrl}/${id}`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(
                map((response) => response.data),
                catchError(this.handleError)
            );
    }
    /**
     * Obtener tarifas activas
     */
    getActiveTariffs(): Observable<TariffConfig[]> {
        return this.http
            .get<ApiResponse<TariffConfig[]>>(`${this.apiUrl}/active`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(
                map((response) => response.data),
                catchError(this.handleError)
            );
    }

    /**
     * Obtener tarifas por tipo y categoría
     */
    getTariffsByType(
        type: string,
        category?: string,
        targetDate?: Date
    ): Observable<TariffConfig> {
        const url = category
            ? `${this.apiUrl}/type/${type}/${category}`
            : `${this.apiUrl}/type/${type}`;

        let params = new HttpParams();
        if (targetDate) {
            params = params.set('targetDate', targetDate.toISOString());
        }

        return this.http
            .get<ApiResponse<TariffConfig>>(url, {
                headers: this.getHeaders(this.token()),
                params,
            })
            .pipe(
                map((response) => response.data),
                catchError(this.handleError)
            );
    }

    /**
     * Crear nueva configuración de tarifa
     */
    createTariff(tariff: Partial<TariffConfig>): Observable<TariffConfig> {
        return this.http
            .post<ApiResponse<TariffConfig>>(this.apiUrl, tariff, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(
                map((response) => response.data),
                catchError(this.handleError)
            );
    }

    /**
     * Inicializar tarifas por defecto (solo admin)
     */
    initializeDefaults(): Observable<{ message: string; created: number }> {
        return this.http
            .post<ApiResponse<TariffConfig[]>>(
                `${this.apiUrl}/admin/initialize-defaults`,
                {},
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(
                map((response) => ({
                    message: response.message || 'Tarifas inicializadas',
                    created: response.data?.length || 0,
                })),
                catchError(this.handleError)
            );
    }

    /**
     * Calcular tarifa de faenamiento
     */
    calculateSlaughterFee(
        params: SlaughterCalculationParams
    ): Observable<TariffCalculation> {
        return this.http
            .post<ApiResponse<any>>(
                `${this.apiUrl}/calculate/slaughter`,
                { animals: [params] },
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(
                map((response) => ({
                    amount: response.data.totalAmount,
                    details: {
                        quantity: params.quantity,
                        weight: params.weight,
                    },
                    tariffConfig: response.data.details[0]?.tariffConfig,
                })),
                catchError(this.handleError)
            );
    }

    /**
     * Calcular servicios adicionales
     */
    calculateAdditionalServices(
        params: AdditionalServicesParams
    ): Observable<TariffCalculation> {
        return this.http
            .post<TariffCalculation>(
                `${this.apiUrl}/calculate/additional-services`,
                params,
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Calcular tarifa por uso prolongado
     */
    calculateProlongedUse(
        params: ProlongedUseParams
    ): Observable<TariffCalculation> {
        return this.http
            .post<TariffCalculation>(
                `${this.apiUrl}/calculate/prolonged-use`,
                params,
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Calcular tarifa de inscripción
     */
    calculateInscription(
        params: InscriptionCalculationParams
    ): Observable<TariffCalculation> {
        return this.http
            .post<ApiResponse<any>>(
                `${this.apiUrl}/calculate/inscription`,
                { introducerType: params.introducerType },
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(
                map((response) => ({
                    amount: response.data.amount,
                    details: {},
                    tariffConfig: response.data.tariffConfig,
                })),
                catchError(this.handleError)
            );
    }

    /**
     * Calcular multa
     */
    calculateFine(
        params: FineCalculationParams
    ): Observable<TariffCalculation> {
        return this.http
            .post<TariffCalculation>(`${this.apiUrl}/calculate/fine`, params, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Actualizar configuración de tarifa
     */
    updateTariff(
        id: string,
        tariff: Partial<TariffConfig>
    ): Observable<TariffConfig> {
        return this.http
            .put<ApiResponse<TariffConfig>>(`${this.apiUrl}/${id}`, tariff, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(
                map((response) => response.data),
                catchError(this.handleError)
            );
    }

    /**
     * Actualizar RBU (Remuneración Básica Unificada) - solo admin
     */
    updateRBU(newRBU: number): Observable<{
        message: string;
        oldRBU: number;
        newRBU: number;
        updatedConfigs: number;
    }> {
        return this.http
            .put<ApiResponse<any>>(
                `${this.apiUrl}/admin/update-rbu`,
                { newRBU },
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(
                map((response) => ({
                    message: response.message || 'RBU actualizado',
                    oldRBU: 0,
                    newRBU: newRBU,
                    updatedConfigs: response.data?.modifiedCount || 0,
                })),
                catchError(this.handleError)
            );
    }

    /**
     * Eliminar configuración de tarifa
     */
    deleteTariff(id: string): Observable<string> {
        return this.http
            .delete<ApiResponse<void>>(`${this.apiUrl}/${id}`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(
                map(
                    (response) =>
                        response.message || 'Tarifa eliminada exitosamente'
                ),
                catchError(this.handleError)
            );
    }

    /**
     * Obtener valor actual del RBU
     */
    getCurrentRBU(): Observable<{ currentRBU: number }> {
        return this.getActiveTariffs().pipe(
            map((tariffs: TariffConfig[]) => {
                const tariff = tariffs.find((t) => t.currentRBU > 0);
                return { currentRBU: tariff?.currentRBU || 470 };
            }),
            catchError(this.handleError)
        );
    }

    //getTariffHistory nuevo
    getTariffHistory(tariffGroup: string): Observable<TariffConfig[]> {
        return this.http
            .get<ApiResponse<TariffConfig[]>>(
                `${this.apiUrl}/history/${tariffGroup}`,
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(
                map((response) => response.data),
                catchError(this.handleError)
            );
    }

    //createNewVersion nuevo
    createNewVersion(
        id: string,
        newData: Partial<TariffConfig>
    ): Observable<TariffConfig> {
        return this.http
            .post<ApiResponse<TariffConfig>>(
                `${this.apiUrl}/${id}/new-version`,
                newData,
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(
                map((response) => response.data),
                catchError(this.handleError)
            );
    }

    //getValidTariffAt nuevo
    getValidTariffAt(
        type: string,
        category: string,
        targetDate: Date
    ): Observable<TariffConfig | null> {
        return this.getTariffsByType(type, category, targetDate).pipe(
            catchError(() => of(null))
        );
    }

    /**
     * Calcular costo total para un proceso de faenamiento
     */
    calculateTotalCost(params: {
        species: 'BOVINE' | 'PORCINE';
        quantity: number;
        weight?: number;
        arrivalTime: Date;
        slaughterTime: Date;
        additionalServices?: Array<{ type: string; percentage: number }>;
        introducerType: 'BOVINE_MAJOR' | 'PORCINE_MINOR' | 'MIXED';
    }): Observable<{
        slaughterFee: TariffCalculation;
        additionalServices?: TariffCalculation;
        prolongedUse?: TariffCalculation;
        totalAmount: number;
    }> {
        // Calculamos cada componente
        const slaughterParams: SlaughterCalculationParams = {
            species: params.species,
            weight: params.weight,
            quantity: params.quantity,
            introducerType: params.introducerType,
        };

        return this.calculateSlaughterFee(slaughterParams).pipe(
            map((slaughterFee) => {
                const result: any = {
                    slaughterFee,
                    totalAmount: slaughterFee.amount,
                };

                // Aquí podrías agregar lógica para calcular servicios adicionales y uso prolongado
                // según sea necesario

                return result;
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Manejo de errores
     */
    private handleError(error: any): Observable<never> {
        console.error('Error en TariffConfigService:', error);

        let errorMessage = 'Error desconocido';

        if (error.error?.message) {
            errorMessage = error.error.message;
        } else if (error.message) {
            errorMessage = error.message;
        } else if (error.status) {
            switch (error.status) {
                case 400:
                    errorMessage = 'Datos de tarifa inválidos';
                    break;
                case 401:
                    errorMessage = 'No autorizado';
                    break;
                case 403:
                    errorMessage = 'Acceso denegado - permisos insuficientes';
                    break;
                case 404:
                    errorMessage = 'Configuración de tarifa no encontrada';
                    break;
                case 409:
                    errorMessage = 'Conflicto - configuración ya existe';
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
