// ===== INTERNAL VERIFICATION COMPONENT TS =====
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
import { InternalVerificationSheetService } from '../../services/InternalVerificationSheet.service';

interface ProductInspection {
    productId: string;
    type: string;
    organoleptlcInspection: {
        color: string;
        odor: string;
        texture: string;
        appearance: string;
        ph: number;
        temperature: number;
    };
    sanitaryInspection: {
        parasitePresence: boolean;
        pathologicalLesions: boolean;
        visibleContamination: boolean;
        findingsDescription: string;
    };
    laboratoryTests: any[];
    classification:
        | 'SUITABLE_FOR_CONSUMPTION'
        | 'SUITABLE_FOR_PROCESSING'
        | 'TOTAL_CONFISCATION'
        | 'PARTIAL_CONFISCATION';
    destination:
        | 'DIRECT_SALE'
        | 'PROCESSING'
        | 'EXPORT'
        | 'CONFISCATION'
        | 'RETURN';
    classificationReason: string;
    observations: string;
}

@Component({
    selector: 'app-internal-verification',
    templateUrl: './internal-verification.component.html',
    styleUrls: ['./internal-verification.component.scss'],
})
export class InternalVerificationComponent implements OnInit, OnDestroy {
    @Input() slaughterRecordData: any;
    @Output() stepCompleted = new EventEmitter<any>();

    private destroy$ = new Subject<void>();

    verificationForm: FormGroup;
    isLoading = false;
    currentProductIndex = 0;
    processedProducts: any[] = [];

    // Opciones para dropdowns
    classificationOptions = [
        {
            label: 'Apto para Consumo',
            value: 'SUITABLE_FOR_CONSUMPTION',
            severity: 'success',
        },
        {
            label: 'Apto para Procesamiento',
            value: 'SUITABLE_FOR_PROCESSING',
            severity: 'info',
        },
        {
            label: 'Decomiso Total',
            value: 'TOTAL_CONFISCATION',
            severity: 'danger',
        },
        {
            label: 'Decomiso Parcial',
            value: 'PARTIAL_CONFISCATION',
            severity: 'warning',
        },
    ];

    destinationOptions = [
        { label: 'Venta Directa', value: 'DIRECT_SALE' },
        { label: 'Procesamiento', value: 'PROCESSING' },
        { label: 'Exportación', value: 'EXPORT' },
        { label: 'Decomiso', value: 'CONFISCATION' },
        { label: 'Retorno', value: 'RETURN' },
    ];

    testTypes = [
        { label: 'pH', value: 'PH' },
        { label: 'Temperatura', value: 'TEMPERATURE' },
        { label: 'Microbiológico', value: 'MICROBIOLOGICAL' },
        { label: 'Residuos Químicos', value: 'CHEMICAL_RESIDUES' },
        { label: 'Histopatológico', value: 'HISTOPATHOLOGICAL' },
    ];

    // Summary data
    inspectionSummary = {
        suitableProducts: 0,
        confiscatedProducts: 0,
        approvalPercentage: 0,
    };

    constructor(
        private fb: FormBuilder,
        private internalVerificationService: InternalVerificationSheetService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {
        this.initForm();
    }

    ngOnInit() {
        if (this.slaughterRecordData) {
            this.loadProcessedProducts();
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private initForm() {
        this.verificationForm = this.fb.group({
            slaughterRecordId: ['', Validators.required],
            sheetNumber: [this.generateSheetNumber(), Validators.required],
            inspectionDate: [new Date(), Validators.required],
            storageConditions: this.fb.group({
                temperature: [null, [Validators.min(-10), Validators.max(10)]],
                humidity: [null, [Validators.min(0), Validators.max(100)]],
                storageTime: [null, [Validators.min(0)]],
                hygienicConditions: [''],
            }),
            productInspections: this.fb.array([]),
            generalObservations: [''],
            recommendations: [''],
        });
    }

    get productInspections(): FormArray {
        return this.verificationForm.get('productInspections') as FormArray;
    }

    private generateSheetNumber(): string {
        const now = new Date();
        const timestamp =
            now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0');
        return `INT-${timestamp}`;
    }

    private loadProcessedProducts() {
        if (!this.slaughterRecordData?.processedProducts) return;

        this.processedProducts = this.slaughterRecordData.processedProducts;

        this.verificationForm.patchValue({
            slaughterRecordId: this.slaughterRecordData.slaughterRecordId,
        });

        // Crear inspecciones para cada producto procesado
        this.processedProducts.forEach((product, index) => {
            this.addProductInspection(product, index);
        });

        this.updateSummary();
    }

    private addProductInspection(productData?: any, index?: number) {
        const inspection = this.fb.group({
            productId: [
                productData
                    ? `${productData.animalId}-${productData.type}-${index + 1}`
                    : '',
                Validators.required,
            ],
            type: [productData?.type || '', Validators.required],
            organoleptlcInspection: this.fb.group({
                color: ['', Validators.required],
                odor: ['', Validators.required],
                texture: ['', Validators.required],
                appearance: ['', Validators.required],
                ph: [null, [Validators.min(4), Validators.max(8)]],
                temperature: [null, [Validators.min(-10), Validators.max(10)]],
            }),
            sanitaryInspection: this.fb.group({
                parasitePresence: [false],
                pathologicalLesions: [false],
                visibleContamination: [false],
                findingsDescription: [''],
            }),
            laboratoryTests: this.fb.array([]),
            classification: ['SUITABLE_FOR_CONSUMPTION', Validators.required],
            destination: ['DIRECT_SALE', Validators.required],
            classificationReason: [''],
            observations: [''],
        });

        this.productInspections.push(inspection);
    }

    addNewProduct() {
        this.addProductInspection();
        this.currentProductIndex = this.productInspections.length - 1;
        this.updateSummary();
    }

    removeProduct(index: number) {
        this.confirmationService.confirm({
            message: '¿Está seguro que desea eliminar esta inspección?',
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.productInspections.removeAt(index);
                if (
                    this.currentProductIndex >= this.productInspections.length
                ) {
                    this.currentProductIndex = Math.max(
                        0,
                        this.productInspections.length - 1
                    );
                }
                this.updateSummary();
                this.messageService.add({
                    severity: 'info',
                    summary: 'Eliminado',
                    detail: 'Inspección eliminada correctamente',
                });
            },
        });
    }

    navigateToProduct(index: number) {
        this.currentProductIndex = index;
    }

    getCurrentProduct(): FormGroup {
        return this.productInspections.at(
            this.currentProductIndex
        ) as FormGroup;
    }

    // Gestión de Pruebas de Laboratorio
    getLaboratoryTests(productIndex: number): FormArray {
        return this.productInspections
            .at(productIndex)
            .get('laboratoryTests') as FormArray;
    }

    addLaboratoryTest(productIndex: number) {
        const tests = this.getLaboratoryTests(productIndex);
        const test = this.fb.group({
            testType: ['PH', Validators.required],
            result: ['', Validators.required],
            numericValue: [null],
            unit: [''],
            testDate: [new Date(), Validators.required],
        });
        tests.push(test);
    }

    removeLaboratoryTest(productIndex: number, testIndex: number) {
        const tests = this.getLaboratoryTests(productIndex);
        tests.removeAt(testIndex);
    }

    onClassificationChange(index: number) {
        const inspection = this.productInspections.at(index);
        const classification = inspection.get('classification')?.value;

        // Actualizar destino automáticamente según clasificación
        let destination = 'DIRECT_SALE';

        switch (classification) {
            case 'SUITABLE_FOR_CONSUMPTION':
                destination = 'DIRECT_SALE';
                break;
            case 'SUITABLE_FOR_PROCESSING':
                destination = 'PROCESSING';
                break;
            case 'TOTAL_CONFISCATION':
            case 'PARTIAL_CONFISCATION':
                destination = 'CONFISCATION';
                break;
        }

        inspection.patchValue({ destination });

        // Requerir razón si no es apto para consumo
        if (classification !== 'SUITABLE_FOR_CONSUMPTION') {
            inspection
                .get('classificationReason')
                ?.setValidators([Validators.required]);
        } else {
            inspection.get('classificationReason')?.clearValidators();
            inspection.get('classificationReason')?.setValue('');
        }

        inspection.get('classificationReason')?.updateValueAndValidity();
        this.updateSummary();
    }

    onSanitaryFindingChange(productIndex: number) {
        const inspection = this.productInspections.at(productIndex);
        const sanitaryInspection = inspection.get(
            'sanitaryInspection'
        ) as FormGroup;

        const hasFindings =
            sanitaryInspection.get('parasitePresence')?.value ||
            sanitaryInspection.get('pathologicalLesions')?.value ||
            sanitaryInspection.get('visibleContamination')?.value;

        if (hasFindings) {
            sanitaryInspection
                .get('findingsDescription')
                ?.setValidators([Validators.required]);
            // Cambiar clasificación automáticamente si hay hallazgos
            inspection.patchValue({
                classification: 'PARTIAL_CONFISCATION',
                destination: 'CONFISCATION',
            });
        } else {
            sanitaryInspection.get('findingsDescription')?.clearValidators();
            sanitaryInspection.get('findingsDescription')?.setValue('');
        }

        sanitaryInspection.get('findingsDescription')?.updateValueAndValidity();
    }

    updateSummary() {
        const inspections = this.productInspections.value;
        const total = inspections.length;

        const suitable = inspections.filter(
            (i: any) =>
                i.classification === 'SUITABLE_FOR_CONSUMPTION' ||
                i.classification === 'SUITABLE_FOR_PROCESSING'
        ).length;

        const confiscated = inspections.filter(
            (i: any) =>
                i.classification === 'TOTAL_CONFISCATION' ||
                i.classification === 'PARTIAL_CONFISCATION'
        ).length;

        this.inspectionSummary = {
            suitableProducts: suitable,
            confiscatedProducts: confiscated,
            approvalPercentage: total > 0 ? (suitable / total) * 100 : 0,
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

        if (this.productInspections.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Debe agregar al menos una inspección de producto',
            });
            return;
        }

        this.confirmationService.confirm({
            message:
                '¿Confirma que desea guardar la verificación interna y continuar?',
            header: 'Confirmar Verificación Interna',
            icon: 'pi pi-check-circle',
            accept: async () => {
                try {
                    this.isLoading = true;

                    const formData = {
                        ...this.verificationForm.value,
                        generalResult: this.inspectionSummary,
                        status: 'COMPLETED',
                    };

                    const response = await this.internalVerificationService
                        .create(formData)
                        .toPromise();

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Verificación interna completada correctamente',
                    });

                    this.stepCompleted.emit({
                        internalSheetId: response._id,
                        internalSheetData: response,
                        approvedProducts: this.productInspections.value.filter(
                            (p: any) =>
                                p.classification ===
                                    'SUITABLE_FOR_CONSUMPTION' ||
                                p.classification === 'SUITABLE_FOR_PROCESSING'
                        ),
                    });
                } catch (error) {
                    console.error('Error saving internal verification:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al guardar la verificación interna',
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

    getClassificationSeverity(
        classification: string
    ): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
        const option = this.classificationOptions.find(
            (opt) => opt.value === classification
        );
        return (
            (option?.severity as
                | 'success'
                | 'secondary'
                | 'info'
                | 'warning'
                | 'danger'
                | 'contrast') || 'info'
        );
    }

    getProgressValue(): number {
        const total = this.productInspections.length;
        if (total === 0) return 0;
        return ((this.currentProductIndex + 1) / total) * 100;
    }

    getProductData(productId: string): any {
        return this.processedProducts.find(
            (product) =>
                `${product.animalId}-${product.type}` ===
                productId.substring(0, productId.lastIndexOf('-'))
        );
    }

    generateQualityReport() {
        const reportData = {
            sheetNumber: this.verificationForm.get('sheetNumber')?.value,
            inspectionDate: this.verificationForm.get('inspectionDate')?.value,
            summary: this.inspectionSummary,
            products: this.productInspections.value,
        };

        // Crear reporte en formato JSON para descargar
        const dataStr = JSON.stringify(reportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_calidad_${reportData.sheetNumber}.json`;
        link.click();

        URL.revokeObjectURL(url);

        this.messageService.add({
            severity: 'info',
            summary: 'Reporte Generado',
            detail: 'El reporte de calidad ha sido descargado',
        });
    }
}
