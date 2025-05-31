// ===== EXTERNAL VERIFICATION COMPONENT TS =====
import {
    Component,
    OnInit,
    Input,
    Output,
    EventEmitter,
    OnDestroy,
} from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ExternalVerificationSheetService } from '../../services/ExternalVerificationSheet.service';

interface ProductEvaluation {
    identification: string;
    type: string;
    species: string;
    breed: string;
    sex: 'MALE' | 'FEMALE' | 'CASTRATED';
    age: number;
    weight: number;
    generalCondition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    physicalInspection: {
        temperature: number;
        heartRate: number;
        respiratoryRate: number;
        hydrationStatus: string;
        bodyCondition: number;
        visibleLesions: boolean;
        lesionDescription: string;
    };
    completeDocumentation: boolean;
    vaccinationsUpToDate: boolean;
    veterinaryTreatments: string[];
    result:
        | 'SUITABLE_FOR_SLAUGHTER'
        | 'UNFIT_CONFISCATION'
        | 'UNFIT_RETURN'
        | 'QUARANTINE';
    reason: string;
    observations: string;
}

@Component({
    standalone: false,
    selector: 'app-external-verification',
    templateUrl: './external-verification.component.html',
    styleUrls: ['./external-verification.component.scss'],
})
export class ExternalVerificationComponent implements OnInit, OnDestroy {
    @Input() certificateData: any;
    @Output() stepCompleted = new EventEmitter<any>();

    private destroy$ = new Subject<void>();

    verificationForm: FormGroup;
    isLoading = false;
    currentProductIndex = 0;

    // Opciones para dropdowns
    sexOptions = [
        { label: 'Macho', value: 'MALE' },
        { label: 'Hembra', value: 'FEMALE' },
        { label: 'Castrado', value: 'CASTRATED' },
    ];

    conditionOptions = [
        { label: 'Excelente', value: 'EXCELLENT' },
        { label: 'Bueno', value: 'GOOD' },
        { label: 'Regular', value: 'FAIR' },
        { label: 'Malo', value: 'POOR' },
    ];

    resultOptions = [
        {
            label: 'Apto para Faenamiento',
            value: 'SUITABLE_FOR_SLAUGHTER',
            severity: 'success',
        },
        {
            label: 'No Apto - Decomiso',
            value: 'UNFIT_CONFISCATION',
            severity: 'danger',
        },
        {
            label: 'No Apto - Retorno',
            value: 'UNFIT_RETURN',
            severity: 'warn',
        },
        { label: 'Cuarentena', value: 'QUARANTINE', severity: 'info' },
    ];

    // Summary data
    evaluationSummary = {
        totalEvaluated: 0,
        suitableForSlaughter: 0,
        unfitConfiscation: 0,
        unfitReturn: 0,
        inQuarantine: 0,
    };

    constructor(
        private fb: FormBuilder,
        private externalVerificationService: ExternalVerificationSheetService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {
        this.initForm();
    }

    ngOnInit() {
        if (this.certificateData) {
            this.generateProductsFromCertificate();
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private initForm() {
        this.verificationForm = this.fb.group({
            certificateId: ['', Validators.required],
            sheetNumber: [this.generateSheetNumber(), Validators.required],
            inspectionDate: [new Date(), Validators.required],
            environmentalConditions: this.fb.group({
                temperature: [null, [Validators.min(-10), Validators.max(50)]],
                humidity: [null, [Validators.min(0), Validators.max(100)]],
                transportConditions: [''],
            }),
            productEvaluations: this.fb.array([]),
            generalObservations: [''],
        });
    }

    get productEvaluations(): FormArray {
        return this.verificationForm.get('productEvaluations') as FormArray;
    }

    private generateSheetNumber(): string {
        const now = new Date();
        const timestamp =
            now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0');
        return `EXT-${timestamp}`;
    }

    private generateProductsFromCertificate() {
        if (!this.certificateData?.certificateData?.products) return;

        this.verificationForm.patchValue({
            certificateId: this.certificateData.certificateId,
        });

        const products = this.certificateData.certificateData.products;

        // Generar evaluaciones basadas en la cantidad de productos
        products.forEach((product: any, index: number) => {
            for (let i = 0; i < product.quantity; i++) {
                this.addProductEvaluation(product, index + 1, i + 1);
            }
        });

        this.updateSummary();
    }

    private addProductEvaluation(
        productData?: any,
        productIndex?: number,
        itemIndex?: number
    ) {
        const evaluation = this.fb.group({
            identification: [
                productData
                    ? `${productData.type}-${productIndex}-${itemIndex}`
                    : '',
                Validators.required,
            ],
            type: [productData?.type || '', Validators.required],
            species: ['', Validators.required],
            breed: [''],
            sex: ['MALE', Validators.required],
            age: [null, [Validators.min(0), Validators.max(50)]],
            weight: [null, [Validators.min(1), Validators.max(2000)]],
            generalCondition: ['GOOD', Validators.required],
            physicalInspection: this.fb.group({
                temperature: [null, [Validators.min(35), Validators.max(42)]],
                heartRate: [null, [Validators.min(40), Validators.max(120)]],
                respiratoryRate: [
                    null,
                    [Validators.min(10), Validators.max(40)],
                ],
                hydrationStatus: ['Normal'],
                bodyCondition: [3, [Validators.min(1), Validators.max(5)]],
                visibleLesions: [false],
                lesionDescription: [''],
            }),
            completeDocumentation: [true],
            vaccinationsUpToDate: [true],
            veterinaryTreatments: this.fb.array([]),
            result: ['SUITABLE_FOR_SLAUGHTER', Validators.required],
            reason: [''],
            observations: [''],
        });

        this.productEvaluations.push(evaluation);
    }

    addNewProduct() {
        this.addProductEvaluation();
        this.currentProductIndex = this.productEvaluations.length - 1;
        this.updateSummary();
    }

    removeProduct(index: number) {
        this.confirmationService.confirm({
            message: '¿Está seguro que desea eliminar esta evaluación?',
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.productEvaluations.removeAt(index);
                if (
                    this.currentProductIndex >= this.productEvaluations.length
                ) {
                    this.currentProductIndex = Math.max(
                        0,
                        this.productEvaluations.length - 1
                    );
                }
                this.updateSummary();
                this.messageService.add({
                    severity: 'info',
                    summary: 'Eliminado',
                    detail: 'Evaluación eliminada correctamente',
                });
            },
        });
    }

    navigateToProduct(index: number) {
        this.currentProductIndex = index;
    }

    onResultChange(index: number) {
        const evaluation = this.productEvaluations.at(index);
        const result = evaluation.get('result')?.value;

        // Si el resultado no es apto, requerir razón
        if (result !== 'SUITABLE_FOR_SLAUGHTER') {
            evaluation.get('reason')?.setValidators([Validators.required]);
        } else {
            evaluation.get('reason')?.clearValidators();
            evaluation.get('reason')?.setValue('');
        }

        evaluation.get('reason')?.updateValueAndValidity();
        this.updateSummary();
    }

    addVeterinaryTreatment(productIndex: number) {
        const treatments = this.productEvaluations
            .at(productIndex)
            .get('veterinaryTreatments') as FormArray;
        treatments.push(this.fb.control('', Validators.required));
    }

    removeVeterinaryTreatment(productIndex: number, treatmentIndex: number) {
        const treatments = this.productEvaluations
            .at(productIndex)
            .get('veterinaryTreatments') as FormArray;
        treatments.removeAt(treatmentIndex);
    }

    getVeterinaryTreatments(productIndex: number): FormArray {
        return this.productEvaluations
            .at(productIndex)
            .get('veterinaryTreatments') as FormArray;
    }

    updateSummary() {
        const evaluations = this.productEvaluations.value;

        this.evaluationSummary = {
            totalEvaluated: evaluations.length,
            suitableForSlaughter: evaluations.filter(
                (e: any) => e.result === 'SUITABLE_FOR_SLAUGHTER'
            ).length,
            unfitConfiscation: evaluations.filter(
                (e: any) => e.result === 'UNFIT_CONFISCATION'
            ).length,
            unfitReturn: evaluations.filter(
                (e: any) => e.result === 'UNFIT_RETURN'
            ).length,
            inQuarantine: evaluations.filter(
                (e: any) => e.result === 'QUARANTINE'
            ).length,
        };
    }

    async saveAndContinue() {
        if (this.verificationForm.invalid) {
            this.markFormGroupTouched(this.verificationForm);
            this.messageService.add({
                severity: 'error',
                summary: 'Error de Validación',
                detail: 'Por favor complete todos los campos requeridos',
            });
            return;
        }

        if (this.productEvaluations.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Debe agregar al menos una evaluación de producto',
            });
            return;
        }

        this.confirmationService.confirm({
            message:
                '¿Confirma que desea guardar la verificación externa y continuar?',
            header: 'Confirmar Verificación Externa',
            icon: 'pi pi-check-circle',
            accept: async () => {
                try {
                    this.isLoading = true;

                    const formData = {
                        ...this.verificationForm.value,
                        summary: this.evaluationSummary,
                        status: 'COMPLETED',
                    };

                    const response = await this.externalVerificationService
                        .create(formData)
                        .toPromise();

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Verificación externa completada correctamente',
                    });

                    this.stepCompleted.emit({
                        externalSheetId: response._id,
                        externalSheetData: response,
                        suitableProducts:
                            this.evaluationSummary.suitableForSlaughter,
                    });
                } catch (error) {
                    console.error('Error saving external verification:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al guardar la verificación externa',
                    });
                } finally {
                    this.isLoading = false;
                }
            },
        });
    }

    private markFormGroupTouched(formGroup: FormGroup) {
        Object.keys(formGroup.controls).forEach((key) => {
            const control = formGroup.get(key);
            control?.markAsTouched();

            if (control instanceof FormGroup) {
                this.markFormGroupTouched(control);
            } else if (control instanceof FormArray) {
                control.controls.forEach((arrayControl) => {
                    if (arrayControl instanceof FormGroup) {
                        this.markFormGroupTouched(arrayControl);
                    } else {
                        arrayControl.markAsTouched();
                    }
                });
            }
        });
    }

    getCurrentProduct(): FormGroup {
        return this.productEvaluations.at(
            this.currentProductIndex
        ) as FormGroup;
    }

    getResultSeverity(
        result: string
    ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
        const option = this.resultOptions.find((opt) => opt.value === result);
        return (
            (option?.severity as
                | 'success'
                | 'danger'
                | 'warn'
                | 'info'
                | 'secondary'
                | 'contrast') || 'info'
        );
    }

    getProgressValue(): number {
        const total = this.productEvaluations.length;
        if (total === 0) return 0;
        return ((this.currentProductIndex + 1) / total) * 100;
    }
}
