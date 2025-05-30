// ===== SLAUGHTER RECORD COMPONENT TS =====
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
import { SlaughterRecordService } from '../../services/SlaughterRecord.service';

interface ProcessingRecord {
    animalId: string;
    startTime: Date;
    endTime: Date;
    processingMethod: string;
    processTemperature: number;
    obtainedProducts: any[];
    confiscations: any[];
    yieldPercentage: number; // Cambiado de 'yield' a 'yieldPercentage'
    observations: string;
}

@Component({
    selector: 'app-slaughter-record',
    templateUrl: './slaughter-record.component.html',
    styleUrls: ['./slaughter-record.component.scss'],
})
export class SlaughterRecordComponent implements OnInit, OnDestroy {
    @Input() externalSheetData: any;
    @Output() stepCompleted = new EventEmitter<any>();

    private destroy$ = new Subject<void>();

    slaughterForm: FormGroup;
    isLoading = false;
    currentProcessingIndex = 0;
    suitableAnimals: any[] = [];

    // Opciones para dropdowns
    processingMethods = [
        { label: 'Aturdimiento Eléctrico', value: 'ELECTRICAL_STUNNING' },
        { label: 'Aturdimiento por Pistola', value: 'CAPTIVE_BOLT' },
        { label: 'Aturdimiento por CO2', value: 'CO2_STUNNING' },
        { label: 'Degüello', value: 'BLEEDING' },
        { label: 'Otro', value: 'OTHER' },
    ];

    productTypes = [
        { label: 'Carne', value: 'meat' },
        { label: 'Vísceras', value: 'organs' },
        { label: 'Cuero', value: 'hide' },
        { label: 'Huesos', value: 'bones' },
        { label: 'Grasa', value: 'fat' },
    ];

    qualityGrades = [
        { label: 'Extra', value: 'EXTRA' },
        { label: 'Primera', value: 'FIRST' },
        { label: 'Segunda', value: 'SECOND' },
        { label: 'Industrial', value: 'INDUSTRIAL' },
    ];

    confiscationReasons = [
        { label: 'Lesión Patológica', value: 'PATHOLOGICAL_LESION' },
        { label: 'Contaminación', value: 'CONTAMINATION' },
        { label: 'Parasitosis', value: 'PARASITOSIS' },
        { label: 'Absceso', value: 'ABSCESS' },
        { label: 'Otro', value: 'OTHER' },
    ];

    // Summary data
    processingSummary = {
        processedAnimals: 0,
        liveWeight: 0,
        carcassWeight: 0,
        averageYield: 0,
        totalConfiscations: 0,
    };

    constructor(
        private fb: FormBuilder,
        private slaughterService: SlaughterRecordService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {
        this.initForm();
    }

    ngOnInit() {
        if (this.externalSheetData) {
            this.loadSuitableAnimals();
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private initForm() {
        this.slaughterForm = this.fb.group({
            externalSheetId: ['', Validators.required],
            recordNumber: [this.generateRecordNumber(), Validators.required],
            slaughterDate: [new Date(), Validators.required],
            processings: this.fb.array([]),
        });
    }

    get processings(): FormArray {
        return this.slaughterForm.get('processings') as FormArray;
    }

    private generateRecordNumber(): string {
        const now = new Date();
        const timestamp =
            now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0');
        return `SLA-${timestamp}`;
    }

    private loadSuitableAnimals() {
        // Obtener solo los animales aptos del external sheet
        if (this.externalSheetData?.externalSheetData?.productEvaluations) {
            this.suitableAnimals =
                this.externalSheetData.externalSheetData.productEvaluations.filter(
                    (evaluation: any) =>
                        evaluation.result === 'SUITABLE_FOR_SLAUGHTER' // Cambiado de 'eval' a 'evaluation'
                );

            this.slaughterForm.patchValue({
                externalSheetId: this.externalSheetData.externalSheetId,
            });

            // Crear registros de procesamiento para cada animal apto
            this.suitableAnimals.forEach((animal) => {
                this.addProcessingRecord(animal);
            });
        }
    }

    private addProcessingRecord(animalData?: any) {
        const processing = this.fb.group({
            animalId: [animalData?.identification || '', Validators.required],
            startTime: [null],
            endTime: [null],
            processingMethod: ['ELECTRICAL_STUNNING', Validators.required],
            processTemperature: [
                null,
                [Validators.min(-10), Validators.max(50)],
            ],
            obtainedProducts: this.fb.array([]),
            confiscations: this.fb.array([]),
            yieldPercentage: [null, [Validators.min(0), Validators.max(100)]], // Cambiado de 'yield' a 'yieldPercentage'
            observations: [''],
        });

        // Agregar productos por defecto
        this.addObtainedProduct(
            this.processings.length,
            animalData?.weight || 0
        );

        this.processings.push(processing);
    }

    getProcessing(index: number): FormGroup {
        return this.processings.at(index) as FormGroup;
    }

    getCurrentProcessing(): FormGroup {
        return this.getProcessing(this.currentProcessingIndex);
    }

    navigateToProcessing(index: number) {
        this.currentProcessingIndex = index;
    }

    // Gestión de Productos Obtenidos
    getObtainedProducts(processingIndex: number): FormArray {
        return this.getProcessing(processingIndex).get(
            'obtainedProducts'
        ) as FormArray;
    }

    addObtainedProduct(processingIndex: number, estimatedWeight?: number) {
        const products = this.getObtainedProducts(processingIndex);
        const product = this.fb.group({
            type: ['meat', Validators.required],
            weight: [
                estimatedWeight ? estimatedWeight * 0.6 : null,
                [Validators.required, Validators.min(0)],
            ],
            quality: ['FIRST', Validators.required],
            observations: [''],
        });
        products.push(product);
    }

    removeObtainedProduct(processingIndex: number, productIndex: number) {
        const products = this.getObtainedProducts(processingIndex);
        products.removeAt(productIndex);
        this.updateSummary();
    }

    // Gestión de Decomisos
    getConfiscations(processingIndex: number): FormArray {
        return this.getProcessing(processingIndex).get(
            'confiscations'
        ) as FormArray;
    }

    addConfiscation(processingIndex: number) {
        const confiscations = this.getConfiscations(processingIndex);
        const confiscation = this.fb.group({
            part: ['', Validators.required],
            reason: ['PATHOLOGICAL_LESION', Validators.required],
            weight: [null, [Validators.required, Validators.min(0)]],
            finalDisposition: ['DESTRUCTION', Validators.required],
        });
        confiscations.push(confiscation);
    }

    removeConfiscation(processingIndex: number, confiscationIndex: number) {
        const confiscations = this.getConfiscations(processingIndex);
        confiscations.removeAt(confiscationIndex);
        this.updateSummary();
    }

    // Control de Tiempo
    startProcessing(index: number) {
        const processing = this.getProcessing(index);
        processing.patchValue({
            startTime: new Date(),
        });

        this.messageService.add({
            severity: 'info',
            summary: 'Iniciado',
            detail: `Procesamiento iniciado para ${
                processing.get('animalId')?.value
            }`,
        });
    }

    endProcessing(index: number) {
        const processing = this.getProcessing(index);
        const startTime = processing.get('startTime')?.value;

        if (!startTime) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Debe iniciar el procesamiento primero',
            });
            return;
        }

        processing.patchValue({
            endTime: new Date(),
        });

        this.calculateYield(index);
        this.updateSummary();

        this.messageService.add({
            severity: 'success',
            summary: 'Completado',
            detail: `Procesamiento completado para ${
                processing.get('animalId')?.value
            }`,
        });
    }

    calculateYield(processingIndex: number) {
        const processing = this.getProcessing(processingIndex);
        const animalData = this.suitableAnimals[processingIndex];

        if (!animalData?.weight) return;

        const obtainedProducts =
            this.getObtainedProducts(processingIndex).value;
        const totalProductWeight = obtainedProducts.reduce(
            (sum: number, product: any) => sum + (product.weight || 0),
            0
        );

        const yieldValue = (totalProductWeight / animalData.weight) * 100; // Cambiado de 'yield' a 'yieldValue'
        processing.patchValue({
            yieldPercentage: Math.round(yieldValue * 100) / 100, // Cambiado de 'yield' a 'yieldPercentage'
        });
    }

    getProcessingDuration(index: number): string {
        const processing = this.getProcessing(index);
        const startTime = processing.get('startTime')?.value;
        const endTime = processing.get('endTime')?.value;

        if (!startTime || !endTime) return '--';

        const duration =
            (new Date(endTime).getTime() - new Date(startTime).getTime()) /
            (1000 * 60);
        return `${Math.round(duration)} min`;
    }

    isProcessingActive(index: number): boolean {
        const processing = this.getProcessing(index);
        const startTime = processing.get('startTime')?.value;
        const endTime = processing.get('endTime')?.value;

        return !!startTime && !endTime;
    }

    isProcessingCompleted(index: number): boolean {
        const processing = this.getProcessing(index);
        const startTime = processing.get('startTime')?.value;
        const endTime = processing.get('endTime')?.value;

        return !!startTime && !!endTime;
    }

    updateSummary() {
        const processings = this.processings.value;

        this.processingSummary = {
            processedAnimals: processings.filter(
                (p: any) => p.startTime && p.endTime
            ).length,
            liveWeight: this.suitableAnimals.reduce(
                (sum, animal) => sum + (animal.weight || 0),
                0
            ),
            carcassWeight: processings.reduce(
                (sum: number, processing: any) => {
                    const productWeight = processing.obtainedProducts.reduce(
                        (pSum: number, product: any) =>
                            pSum + (product.weight || 0),
                        0
                    );
                    return sum + productWeight;
                },
                0
            ),
            averageYield: 0,
            totalConfiscations: processings.reduce(
                (sum: number, processing: any) =>
                    sum + processing.confiscations.length,
                0
            ),
        };

        if (this.processingSummary.liveWeight > 0) {
            this.processingSummary.averageYield =
                (this.processingSummary.carcassWeight /
                    this.processingSummary.liveWeight) *
                100;
        }
    }

    async saveAndContinue() {
        if (this.slaughterForm.invalid) {
            this.markFormGroupTouched(this.slaughterForm);
            this.messageService.add({
                severity: 'error',
                summary: 'Error de Validación',
                detail: 'Por favor complete todos los campos requeridos',
            });
            return;
        }

        // Verificar que al menos un procesamiento esté completo
        const completedProcessings = this.processings.value.filter(
            (p: any) => p.startTime && p.endTime
        );
        if (completedProcessings.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Debe completar al menos un procesamiento',
            });
            return;
        }

        this.confirmationService.confirm({
            message:
                '¿Confirma que desea guardar el registro de faenamiento y continuar?',
            header: 'Confirmar Registro de Faenamiento',
            icon: 'pi pi-check-circle',
            accept: async () => {
                try {
                    this.isLoading = true;

                    const formData = {
                        ...this.slaughterForm.value,
                        summary: this.processingSummary,
                        status: 'COMPLETED',
                    };

                    const response = await this.slaughterService
                        .create(formData)
                        .toPromise();

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Registro de faenamiento completado correctamente',
                    });

                    this.stepCompleted.emit({
                        slaughterRecordId: response._id,
                        slaughterRecordData: response,
                        processedProducts: completedProcessings.reduce(
                            (products: any[], processing: any) => {
                                return products.concat(
                                    processing.obtainedProducts.map(
                                        (product: any) => ({
                                            ...product,
                                            animalId: processing.animalId,
                                            processingDate: new Date(),
                                        })
                                    )
                                );
                            },
                            []
                        ),
                    });
                } catch (error) {
                    console.error('Error saving slaughter record:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al guardar el registro de faenamiento',
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

    getAnimalData(animalId: string): any {
        return this.suitableAnimals.find(
            (animal) => animal.identification === animalId
        );
    }

    getProgressValue(): number {
        const total = this.processings.length;
        if (total === 0) return 0;
        return ((this.currentProcessingIndex + 1) / total) * 100;
    }

    getProcessingStatus(index: number): string {
        if (this.isProcessingCompleted(index)) return 'Completado';
        if (this.isProcessingActive(index)) return 'En Proceso';
        return 'Pendiente';
    }

    getProcessingStatusSeverity(
        index: number
    ): 'success' | 'warning' | 'secondary' {
        if (this.isProcessingCompleted(index)) return 'success';
        if (this.isProcessingActive(index)) return 'warning';
        return 'secondary';
    }

    // Métodos helper para calcular valores en el template
    getTotalProductWeight(processingIndex: number): number {
        const products = this.getObtainedProducts(processingIndex).value;
        return products.reduce(
            (sum: number, product: any) => sum + (product.weight || 0),
            0
        );
    }

    getCurrentYieldPercentage(): number {
        return this.getCurrentProcessing().get('yieldPercentage')?.value || 0;
    }

    getCurrentAnimalWeight(): number {
        const animalId = this.getCurrentProcessing().get('animalId')?.value;
        const animalData = this.getAnimalData(animalId);
        return animalData?.weight || 0;
    }
}
