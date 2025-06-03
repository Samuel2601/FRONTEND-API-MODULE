import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { AuthService } from 'src/app/demo/services/auth.service';

export interface TariffConfig {
    _id?: string;
    name: string;
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
    createdAt?: Date;
    updatedAt?: Date;
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
    getAllTariffs(): Observable<TariffConfig[]> {
        return this.http
            .get<TariffConfig[]>(this.apiUrl, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener configuración de tarifa por ID
     */
    getTariffById(id: string): Observable<TariffConfig> {
        return this.http
            .get<TariffConfig>(`${this.apiUrl}/${id}`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener tarifas activas
     */
    getActiveTariffs(): Observable<TariffConfig[]> {
        return this.http
            .get<TariffConfig[]>(`${this.apiUrl}/active`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener tarifas por tipo y categoría
     */
    getTariffsByType(
        type: string,
        category?: string
    ): Observable<TariffConfig[]> {
        const url = category
            ? `${this.apiUrl}/type/${type}/${category}`
            : `${this.apiUrl}/type/${type}`;

        return this.http
            .get<TariffConfig[]>(url, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Crear nueva configuración de tarifa
     */
    createTariff(tariff: Partial<TariffConfig>): Observable<TariffConfig> {
        return this.http
            .post<TariffConfig>(this.apiUrl, tariff, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Inicializar tarifas por defecto (solo admin)
     */
    initializeDefaults(): Observable<{ message: string; created: number }> {
        return this.http
            .post<{ message: string; created: number }>(
                `${this.apiUrl}/admin/initialize-defaults`,
                {},
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Calcular tarifa de faenamiento
     */
    calculateSlaughterFee(
        params: SlaughterCalculationParams
    ): Observable<TariffCalculation> {
        return this.http
            .post<TariffCalculation>(
                `${this.apiUrl}/calculate/slaughter`,
                params,
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
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
            .post<TariffCalculation>(
                `${this.apiUrl}/calculate/inscription`,
                params,
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
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
            .put<TariffConfig>(`${this.apiUrl}/${id}`, tariff, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
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
            .put<{
                message: string;
                oldRBU: number;
                newRBU: number;
                updatedConfigs: number;
            }>(
                `${this.apiUrl}/admin/update-rbu`,
                { currentRBU: newRBU },
                {
                    headers: this.getHeaders(this.token()),
                }
            )
            .pipe(catchError(this.handleError));
    }

    /**
     * Eliminar configuración de tarifa
     */
    deleteTariff(id: string): Observable<void> {
        return this.http
            .delete<void>(`${this.apiUrl}/${id}`, {
                headers: this.getHeaders(this.token()),
            })
            .pipe(catchError(this.handleError));
    }

    /**
     * Obtener valor actual del RBU
     */
    getCurrentRBU(): Observable<{ currentRBU: number }> {
        return this.getActiveTariffs().pipe(
            map((tariffs: any) => {
                console.log('Tariffs:', tariffs);
                const tariff = tariffs.data.find((t: any) => t.currentRBU > 0);
                return { currentRBU: tariff?.currentRBU || 470 };
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Obtener tarifas de inscripción disponibles
     */
    getInscriptionTariffs(): Observable<TariffConfig[]> {
        return this.getTariffsByType('INSCRIPTION').pipe(
            catchError(this.handleError)
        );
    }

    /**
     * Obtener tarifas de faenamiento disponibles
     */
    getSlaughterTariffs(): Observable<TariffConfig[]> {
        return this.getTariffsByType('SLAUGHTER_FEE').pipe(
            catchError(this.handleError)
        );
    }

    /**
     * Obtener configuración de multas
     */
    getFineTariffs(): Observable<TariffConfig[]> {
        return this.getAllTariffs().pipe(
            map((tariffs) =>
                tariffs.filter(
                    (t) =>
                        t.type === 'FINE_CLANDESTINE' ||
                        t.type === 'FINE_UNAUTHORIZED_ACCESS'
                )
            ),
            catchError(this.handleError)
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
