import { Injectable } from '@angular/core';
import { Observable, tap, catchError, of, map } from 'rxjs';
import { BaseService } from './base.service';

export interface RateDetail {
    _id?: string;
    rate: string;
    description: string;
    unit: 'Unidad' | 'Peso';
    isFormula: boolean;
    formulaText?: string;
    fixedValue?: number;
    isActive: boolean;
    effectiveDate: Date;
    expirationDate?: Date;
    version: number;
    applicationConditions?: ApplicationCondition[];
    usedReferences?: UsedReferences;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ApplicationCondition {
    field: string;
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

export interface UsedReferences {
    referenceValues: string[];
    rateDetails: string[];
    invoiceFields: string[];
}

export interface CalculationRequest {
    rateDetailId: string;
    amount: number;
    context?: Record<string, any>;
}

export interface CalculationByCodeRequest {
    rateCode: string;
    amount: number;
    context?: Record<string, any>;
}

export interface CalculationResult {
    rateDetail: {
        id: string;
        description: string;
        unit: string;
        isFormula: boolean;
    };
    calculation: {
        amount: number;
        unitValue: number;
        totalValue: number;
        unit: string;
        applicable: boolean;
        currency: string;
        message: string;
    };
    details: any;
}

export interface CalculationByCodeResult {
    rateCode: string;
    amount: number;
    context: Record<string, any>;
    calculations: CalculationResult[];
    summary: {
        totalAmount: number;
        applicableDetails: number;
        currency: string;
        message: string;
    };
}

export interface FormulaValidationRequest {
    formulaText: string;
}

export interface FormulaValidationResult {
    valid: boolean;
    ast?: any;
    message: string;
}

export interface FormulaTestRequest {
    formulaText: string;
    testCases?: Array<{
        name: string;
        context: Record<string, any>;
    }>;
}

export interface FormulaTestResult {
    formula: string;
    ast: any;
    testResults: Array<{
        name: string;
        context: Record<string, any>;
        result?: number;
        error?: string;
        success: boolean;
    }>;
}

export interface RateDetailStatistics {
    total: number;
    active: number;
    formulas: number;
    fixedValues: number;
    unitBreakdown: {
        unidad: number;
        peso: number;
    };
    avgFixedValue: number;
    withConditions: number;
    percentageFormulas: number;
}

@Injectable({
    providedIn: 'root',
})
export class RateDetailService extends BaseService<RateDetail> {
    constructor() {
        super('rate-details');
    }

    // ========== MÉTODOS DE CÁLCULO ==========

    calculateValue(
        request: CalculationRequest
    ): Observable<{ success: boolean; data: CalculationResult }> {
        return this.http
            .post<{ success: boolean; data: CalculationResult }>(
                `${this.url}${this.endpoint}/calculate`,
                request,
                { headers: this.getHeaders() }
            )
            .pipe(
                tap(() => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Cálculo realizado correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al calcular el valor',
                    });
                    throw error;
                })
            );
    }

    calculateByCode(
        request: CalculationByCodeRequest
    ): Observable<{ success: boolean; data: CalculationByCodeResult }> {
        return this.http
            .post<{ success: boolean; data: CalculationByCodeResult }>(
                `${this.url}${this.endpoint}/calculate-by-code`,
                request,
                { headers: this.getHeaders() }
            )
            .pipe(
                tap(() => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Cálculo por código realizado correctamente',
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al calcular por código',
                    });
                    throw error;
                })
            );
    }

    // ========== MÉTODOS ESPECÍFICOS ==========

    getByRate(
        rateId: string
    ): Observable<{ success: boolean; data: RateDetail[] }> {
        const cacheKey = `${this.endpoint}_by_rate_${rateId}`;
        const cachedData = this.cacheService.get<{
            success: boolean;
            data: RateDetail[];
        }>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        return this.http
            .get<{ success: boolean; data: RateDetail[] }>(
                `${this.url}${this.endpoint}/by-rate/${rateId}`,
                { headers: this.getHeaders() }
            )
            .pipe(
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener detalles por tarifa',
                    });
                    throw error;
                })
            );
    }

    toggleStatus(
        id: string,
        isActive: boolean
    ): Observable<{ success: boolean; data: RateDetail; message: string }> {
        return this.http
            .post<{ success: boolean; data: RateDetail; message: string }>(
                `${this.url}${this.endpoint}/${id}/toggle-status`,
                { isActive },
                { headers: this.getHeaders() }
            )
            .pipe(
                tap(() => {
                    this.cacheService.clearByPrefix(this.endpoint);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: `Detalle ${
                            isActive ? 'activado' : 'desactivado'
                        } correctamente`,
                    });
                }),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cambiar estado',
                    });
                    throw error;
                })
            );
    }

    // ========== VALIDACIÓN DE FÓRMULAS ==========

    validateFormula(
        request: FormulaValidationRequest
    ): Observable<{ success: boolean; data: FormulaValidationResult }> {
        return this.http
            .post<{ success: boolean; data: FormulaValidationResult }>(
                `${this.url}${this.endpoint}/validate-formula`,
                request,
                { headers: this.getHeaders() }
            )
            .pipe(
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al validar fórmula',
                    });
                    throw error;
                })
            );
    }

    testFormula(
        request: FormulaTestRequest
    ): Observable<{ success: boolean; data: FormulaTestResult }> {
        return this.http
            .post<{ success: boolean; data: FormulaTestResult }>(
                `${this.url}${this.endpoint}/test-formula`,
                request,
                { headers: this.getHeaders() }
            )
            .pipe(
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al probar fórmula',
                    });
                    throw error;
                })
            );
    }

    // ========== ESTADÍSTICAS ==========

    getStatistics(): Observable<{
        success: boolean;
        data: RateDetailStatistics;
    }> {
        const cacheKey = `${this.endpoint}_statistics`;
        const cachedData = this.cacheService.get<{
            success: boolean;
            data: RateDetailStatistics;
        }>(cacheKey);

        if (cachedData) {
            return of(cachedData);
        }

        return this.http
            .get<{ success: boolean; data: RateDetailStatistics }>(
                `${this.url}${this.endpoint}/statistics`,
                { headers: this.getHeaders() }
            )
            .pipe(
                tap((data) =>
                    this.cacheService.set(cacheKey, data, this.cacheExpiry)
                ),
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener estadísticas',
                    });
                    throw error;
                })
            );
    }

    getRateDetailInvoiceStats(
        rateDetailId: string
    ): Observable<{ success: boolean; data: any }> {
        return this.http
            .get<{ success: boolean; data: any }>(
                `${this.url}${this.endpoint}/${rateDetailId}/invoice-stats`,
                { headers: this.getHeaders() }
            )
            .pipe(
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener estadísticas',
                    });
                    throw error;
                })
            );
    }

    getAllRateDetailsRevenueStats(): Observable<{
        success: boolean;
        data: any;
    }> {
        return this.http
            .get<{ success: boolean; data: any }>(
                `${this.url}${this.endpoint}/revenue-stats`,
                { headers: this.getHeaders() }
            )
            .pipe(
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener estadísticas',
                    });
                    throw error;
                })
            );
    }

    getRevenueExecutiveSummary(): Observable<{
        success: boolean;
        data: any;
    }> {
        return this.http
            .get<{ success: boolean; data: any }>(
                `${this.url}${this.endpoint}/revenue-executive-summary`,
                { headers: this.getHeaders() }
            )
            .pipe(
                catchError((error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al obtener estadísticas',
                    });
                    throw error;
                })
            );
    }

    // ========== MÉTODOS DE UTILIDAD ==========

    /**
     * Calcula rápidamente un valor por ID
     */
    quickCalculate(
        rateDetailId: string,
        amount: number,
        context?: Record<string, any>
    ): Observable<number> {
        return this.calculateValue({ rateDetailId, amount, context }).pipe(
            // Map the response to only the totalValue (number)
            map((response) => response.data.calculation.totalValue),
            catchError(() => of(0))
        );
    }

    /**
     * Obtiene solo detalles activos por tarifa
     */
    getActiveByRate(rateId: string): Observable<RateDetail[]> {
        return this.getByRate(rateId).pipe(
            map((response) => response.data.filter((detail) => detail.isActive))
        );
    }

    /**
     * Valida si una fórmula es correcta
     */
    isFormulaValid(formulaText: string): Observable<boolean> {
        return this.validateFormula({ formulaText }).pipe(
            map((response) => response.data.valid),
            catchError(() => of(false))
        );
    }
}
