import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    AnimalEvaluationParams,
    SlaughterProcess,
    SlaughterProcessService,
} from '../../services/slaughter-process.service';

interface AnimalEvaluation {
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

interface InspectionSummary {
    totalAnimals: number;
    suitableForSlaughter: number;
    unfitConfiscation: number;
    unfitReturn: number;
    inQuarantine: number;
}

@Component({
    selector: 'app-external-inspection',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './external-inspection.component.html',
    styleUrls: ['./external-inspection.component.scss'],
    providers: [ConfirmationService],
})
export class ExternalInspectionComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    // Estados de carga
    loading = true;
    saving = false;
    startingInspection = false;
    completingInspection = false;

    // Datos del proceso
    processId!: string;
    process: SlaughterProcess | null = null;

    // Formularios
    inspectionForm!: FormGroup;
    environmentalForm!: FormGroup;

    // Estados de la inspección
    canStartInspection = false;
    inspectionStarted = false;
    inspectionCompleted = false;

    // Animales y evaluaciones
    animals: any[] = [];
    currentAnimalIndex = 0;
    evaluatedAnimals: AnimalEvaluation[] = [];

    // Resumen
    inspectionSummary: InspectionSummary = {
        totalAnimals: 0,
        suitableForSlaughter: 0,
        unfitConfiscation: 0,
        unfitReturn: 0,
        inQuarantine: 0,
    };

    // Opciones para dropdowns
    sexOptions = [
        { label: 'Macho', value: 'MALE' },
        { label: 'Hembra', value: 'FEMALE' },
        { label: 'Castrado', value: 'CASTRATED' },
    ];

    conditionOptions = [
        { label: 'Excelente', value: 'EXCELLENT', color: '#10b981' },
        { label: 'Bueno', value: 'GOOD', color: '#3b82f6' },
        { label: 'Regular', value: 'FAIR', color: '#f59e0b' },
        { label: 'Deficiente', value: 'POOR', color: '#ef4444' },
    ];

    evaluationResultOptions = [
        {
            label: 'Apto para Faenamiento',
            value: 'SUITABLE_FOR_SLAUGHTER',
            severity: 'success' as
                | 'success'
                | 'secondary'
                | 'info'
                | 'warning'
                | 'danger'
                | 'contrast',
            icon: 'pi pi-check-circle',
        },
        {
            label: 'No Apto - Decomiso',
            value: 'UNFIT_CONFISCATION',
            severity: 'danger' as
                | 'success'
                | 'secondary'
                | 'info'
                | 'warning'
                | 'danger'
                | 'contrast',
            icon: 'pi pi-times-circle',
        },
        {
            label: 'No Apto - Devolución',
            value: 'UNFIT_RETURN',
            severity: 'warning' as
                | 'success'
                | 'secondary'
                | 'info'
                | 'warning'
                | 'danger'
                | 'contrast',
            icon: 'pi pi-arrow-circle-left',
        },
        {
            label: 'Cuarentena',
            value: 'QUARANTINE',
            severity: 'info' as
                | 'success'
                | 'secondary'
                | 'info'
                | 'warning'
                | 'danger'
                | 'contrast',
            icon: 'pi pi-pause-circle',
        },
    ];
    // Fotografías
    photographs: string[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private fb: FormBuilder,
        private slaughterService: SlaughterProcessService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {
        // Inicializar los formularios vacíos primero
        this.inspectionForm = this.fb.group({});
        this.environmentalForm = this.fb.group({});

        // Luego llenarlos con los campos necesarios
        this.initializeForms();
    }

    ngOnInit(): void {
        this.processId = this.route.snapshot.params['id'];
        this.loadProcess();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Inicializar formularios
     */
    private initializeForms(): void {
        this.inspectionForm = this.fb.group({
            animalId: ['', Validators.required],
            species: ['', Validators.required],
            identification: ['', Validators.required],
            breed: [''],
            sex: ['', Validators.required],
            age: [null, [Validators.min(0)]],
            weight: [null, [Validators.min(0)]],

            // Inspección física
            temperature: [null, [Validators.min(35), Validators.max(42)]],
            heartRate: [null, [Validators.min(40), Validators.max(120)]],
            respiratoryRate: [null, [Validators.min(10), Validators.max(40)]],
            generalCondition: ['GOOD', Validators.required],
            visibleLesions: [false],
            lesionDescription: [''],

            // Resultado
            evaluationResult: ['', Validators.required],
            reason: [''],
            observations: [''],
        });

        this.environmentalForm = this.fb.group({
            temperature: [null, [Validators.min(-10), Validators.max(50)]],
            humidity: [null, [Validators.min(0), Validators.max(100)]],
            transportConditions: [''],
            generalObservations: [''],
        });
    }

    /**
     * Cargar datos del proceso
     */
    private loadProcess(): void {
        this.loading = true;

        this.slaughterService
            .getProcessById(this.processId)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (process) => {
                    this.process = process;
                    this.checkInspectionStatus();
                    this.loadAnimals();
                },
                error: (error) => {
                    console.error('Error cargando proceso:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo cargar el proceso',
                    });
                    this.router.navigate(['/faenamiento/procesos']);
                },
            });
    }

    /**
     * Verificar estado de la inspección
     */
    private checkInspectionStatus(): void {
        if (!this.process) return;

        // Verificar si se puede iniciar la inspección
        this.canStartInspection =
            this.process.overallStatus === 'EXTERNAL_INSPECTION' &&
            this.process.reception.paymentVerification.canProceedToNextStage;

        // Verificar si la inspección ya está iniciada
        this.inspectionStarted = this.process.externalInspection.canStart;

        // Verificar si la inspección está completada
        this.inspectionCompleted =
            this.process.externalInspection.overallResult !== 'PENDING' &&
            this.process.externalInspection.endDate !== undefined;

        // Cargar evaluaciones existentes
        if (this.process.externalInspection.animalEvaluations) {
            this.evaluatedAnimals =
                this.process.externalInspection.animalEvaluations;
            this.calculateSummary();
        }

        // Cargar condiciones ambientales
        if (this.process.externalInspection.environmentalConditions) {
            this.environmentalForm.patchValue(
                this.process.externalInspection.environmentalConditions
            );
        }
    }

    /**
     * Cargar animales del proceso
     */
    private loadAnimals(): void {
        if (!this.process?.reception.receivedAnimals) return;

        this.animals = this.process.reception.receivedAnimals.map((animal) => ({
            ...animal,
            evaluated: this.evaluatedAnimals.some(
                (evaluation) => evaluation.animalId === animal.animalId
            ),
        }));

        this.inspectionSummary.totalAnimals = this.animals.length;
    }

    /**
     * Iniciar inspección externa
     */
    startInspection(): void {
        this.confirmationService.confirm({
            message: '¿Está seguro de que desea iniciar la inspección externa?',
            header: 'Iniciar Inspección Externa',
            icon: 'pi pi-question-circle',
            accept: () => {
                this.performStartInspection();
            },
        });
    }

    /**
     * Ejecutar inicio de inspección
     */
    private performStartInspection(): void {
        this.startingInspection = true;

        this.slaughterService
            .startExternalInspection(this.processId)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.startingInspection = false))
            )
            .subscribe({
                next: (process) => {
                    this.process = process;
                    this.inspectionStarted = true;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Inspección Iniciada',
                        detail: 'La inspección externa ha sido iniciada correctamente',
                    });
                },
                error: (error) => {
                    console.error('Error iniciando inspección:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo iniciar la inspección externa',
                    });
                },
            });
    }

    /**
     * Seleccionar animal para evaluar
     */
    selectAnimal(index: number): void {
        if (this.animals[index].evaluated) {
            // Cargar datos existentes
            const evaluation = this.evaluatedAnimals.find(
                (evaluation) =>
                    evaluation.animalId === this.animals[index].animalId
            );
            if (evaluation) {
                this.loadEvaluationToForm(evaluation);
            }
        } else {
            // Nuevo animal
            this.resetForm();
            this.inspectionForm.patchValue({
                animalId: this.animals[index].animalId,
                species: this.animals[index].species,
            });
        }
        this.currentAnimalIndex = index;
    }

    /**
     * Cargar evaluación existente al formulario
     */
    private loadEvaluationToForm(evaluation: AnimalEvaluation): void {
        this.inspectionForm.patchValue({
            animalId: evaluation.animalId,
            species: evaluation.species,
            identification: evaluation.identification,
            breed: evaluation.breed,
            sex: evaluation.sex,
            age: evaluation.age,
            weight: evaluation.weight,
            temperature: evaluation.physicalInspection.temperature,
            heartRate: evaluation.physicalInspection.heartRate,
            respiratoryRate: evaluation.physicalInspection.respiratoryRate,
            generalCondition: evaluation.physicalInspection.generalCondition,
            visibleLesions: evaluation.physicalInspection.visibleLesions,
            lesionDescription: evaluation.physicalInspection.lesionDescription,
            evaluationResult: evaluation.evaluationResult,
            reason: evaluation.reason,
            observations: evaluation.observations,
        });
    }

    /**
     * Resetear formulario
     */
    resetForm(): void {
        // Cambiar de private a public
        this.inspectionForm.reset();
        this.inspectionForm.patchValue({
            generalCondition: 'GOOD',
            visibleLesions: false,
        });
    }

    /**
     * Evaluar animal
     */
    evaluateAnimal(): void {
        if (this.inspectionForm.invalid) {
            this.markFormGroupTouched();
            this.messageService.add({
                severity: 'error',
                summary: 'Formulario Inválido',
                detail: 'Por favor complete todos los campos requeridos',
            });
            return;
        }

        const formValue = this.inspectionForm.value;

        const evaluation: AnimalEvaluationParams = {
            animalId: formValue.animalId,
            species: formValue.species,
            identification: formValue.identification,
            breed: formValue.breed,
            sex: formValue.sex,
            age: formValue.age,
            weight: formValue.weight,
            physicalInspection: {
                temperature: formValue.temperature,
                heartRate: formValue.heartRate,
                respiratoryRate: formValue.respiratoryRate,
                generalCondition: formValue.generalCondition,
                visibleLesions: formValue.visibleLesions,
                lesionDescription: formValue.lesionDescription,
            },
            evaluationResult: formValue.evaluationResult,
            reason: formValue.reason,
            observations: formValue.observations,
        };

        this.saving = true;

        this.slaughterService
            .evaluateAnimal(this.processId, evaluation)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.saving = false))
            )
            .subscribe({
                next: (process) => {
                    this.process = process;
                    this.updateLocalEvaluation(evaluation);
                    this.animals[this.currentAnimalIndex].evaluated = true;
                    this.calculateSummary();

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Animal Evaluado',
                        detail: `El animal ${evaluation.identification} ha sido evaluado correctamente`,
                    });

                    // Ir al siguiente animal no evaluado
                    this.goToNextAnimal();
                },
                error: (error) => {
                    console.error('Error evaluando animal:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo evaluar el animal',
                    });
                },
            });
    }

    /**
     * Actualizar evaluación local
     */
    private updateLocalEvaluation(evaluation: AnimalEvaluationParams): void {
        const existingIndex = this.evaluatedAnimals.findIndex(
            (evaluated) => evaluated.animalId === evaluation.animalId
        );

        if (existingIndex >= 0) {
            this.evaluatedAnimals[existingIndex] =
                evaluation as AnimalEvaluation;
        } else {
            this.evaluatedAnimals.push(evaluation as AnimalEvaluation);
        }
    }

    /**
     * Ir al siguiente animal
     */
    private goToNextAnimal(): void {
        const nextIndex = this.animals.findIndex(
            (animal, index) =>
                index > this.currentAnimalIndex && !animal.evaluated
        );

        if (nextIndex >= 0) {
            this.selectAnimal(nextIndex);
        } else {
            // Todos los animales evaluados
            this.resetForm();
        }
    }

    /**
     * Calcular resumen de la inspección
     */
    private calculateSummary(): void {
        this.inspectionSummary = {
            totalAnimals: this.animals.length,
            suitableForSlaughter: this.evaluatedAnimals.filter(
                (evaluated) =>
                    evaluated.evaluationResult === 'SUITABLE_FOR_SLAUGHTER'
            ).length,
            unfitConfiscation: this.evaluatedAnimals.filter(
                (evaluated) =>
                    evaluated.evaluationResult === 'UNFIT_CONFISCATION'
            ).length,
            unfitReturn: this.evaluatedAnimals.filter(
                (evaluated) => evaluated.evaluationResult === 'UNFIT_RETURN'
            ).length,
            inQuarantine: this.evaluatedAnimals.filter(
                (evaluated) => evaluated.evaluationResult === 'QUARANTINE'
            ).length,
        };
    }

    /**
     * Completar inspección externa
     */
    completeInspection(): void {
        if (this.evaluatedAnimals.length < this.animals.length) {
            this.messageService.add({
                severity: 'error',
                summary: 'Inspección Incompleta',
                detail: 'Debe evaluar todos los animales antes de completar la inspección',
            });
            return;
        }

        this.confirmationService.confirm({
            message:
                '¿Está seguro de que desea completar la inspección externa?',
            header: 'Completar Inspección',
            icon: 'pi pi-question-circle',
            accept: () => {
                this.performCompleteInspection();
            },
        });
    }

    /**
     * Ejecutar completar inspección
     */
    private performCompleteInspection(): void {
        this.completingInspection = true;

        const environmentalData = this.environmentalForm.value;

        const data = {
            environmentalConditions: {
                temperature: environmentalData.temperature,
                humidity: environmentalData.humidity,
                transportConditions: environmentalData.transportConditions,
            },
            generalObservations: environmentalData.generalObservations,
            photographs: this.photographs,
        };

        this.slaughterService
            .completeExternalInspection(this.processId, data)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.completingInspection = false))
            )
            .subscribe({
                next: (process) => {
                    this.process = process;
                    this.inspectionCompleted = true;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Inspección Completada',
                        detail: 'La inspección externa ha sido completada correctamente',
                    });

                    // Redirigir según el resultado
                    if (this.inspectionSummary.suitableForSlaughter > 0) {
                        this.confirmationService.confirm({
                            message:
                                '¿Desea continuar con el proceso de faenamiento?',
                            header: 'Continuar Proceso',
                            icon: 'pi pi-question-circle',
                            accept: () => {
                                this.router.navigate([
                                    '/faenamiento/procesos',
                                    this.processId,
                                    'faenamiento',
                                ]);
                            },
                            reject: () => {
                                this.router.navigate([
                                    '/faenamiento/procesos',
                                    this.processId,
                                ]);
                            },
                        });
                    } else {
                        this.router.navigate([
                            '/faenamiento/procesos',
                            this.processId,
                        ]);
                    }
                },
                error: (error) => {
                    console.error('Error completando inspección:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo completar la inspección externa',
                    });
                },
            });
    }

    /**
     * Agregar fotografía
     */
    addPhotograph(event: any): void {
        const files = event.files;
        if (files && files.length > 0) {
            // Simular carga de imagen
            const file = files[0];
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.photographs.push(e.target.result);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Fotografía Agregada',
                    detail: 'La fotografía ha sido agregada correctamente',
                });
            };
            reader.readAsDataURL(file);
        }
    }

    /**
     * Remover fotografía
     */
    removePhotograph(index: number): void {
        this.photographs.splice(index, 1);
        this.messageService.add({
            severity: 'info',
            summary: 'Fotografía Removida',
            detail: 'La fotografía ha sido removida',
        });
    }

    /**
     * Marcar formulario como tocado
     */
    private markFormGroupTouched(): void {
        Object.keys(this.inspectionForm.controls).forEach((key) => {
            this.inspectionForm.get(key)?.markAsTouched();
        });
    }

    /**
     * Obtener color para condición
     */
    getConditionColor(condition: string): string {
        const option = this.conditionOptions.find(
            (opt) => opt.value === condition
        );
        return option?.color || '#6b7280';
    }

    /**
     * Obtener etiqueta de resultado
     */
    getResultLabel(result?: string, array?: any[], campo?: string): string {
        if (array && campo) {
            const option = array.find((opt) => opt.value === result);
            return option?.[campo] || result;
        } else if (result) {
            const option = this.evaluationResultOptions.find(
                (opt) => opt.value === result
            );
            return option?.[campo] || result;
        }
        return 'Sin definir';
    }

    /**
     * Obtener severidad de resultado
     */
    getResultSeverity(
        result: string
    ): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
        const option = this.evaluationResultOptions.find(
            (opt) => opt.value === result
        );
        return option?.severity || 'secondary';
    }

    /**
     * Obtener ícono de resultado
     */
    getResultIcon(result: string): string {
        const option = this.evaluationResultOptions.find(
            (opt) => opt.value === result
        );
        return option?.icon || 'pi pi-circle';
    }

    /**
     * Verificar si todos los animales están evaluados
     */
    allAnimalsEvaluated(): boolean {
        return (
            this.evaluatedAnimals.length === this.animals.length &&
            this.animals.length > 0
        );
    }

    /**
     * Obtener progreso de evaluación
     */
    getEvaluationProgress(): number {
        if (this.animals.length === 0) return 0;
        return (this.evaluatedAnimals.length / this.animals.length) * 100;
    }

    /**
     * Volver a la lista de procesos
     */
    goBack(): void {
        this.router.navigate(['/faenamiento/procesos', this.processId]);
    }

    /**
     * Navegar a procesos
     */
    goToProcesses(): void {
        this.router.navigate(['/faenamiento/procesos']);
    }

    /**
     * Limpiar formulario (llamado desde template)
     */
    clearForm(): void {
        this.resetForm();
    }

    getAnimalEvaluationResult(animal: any): string {
        const evaluation = this.evaluatedAnimals.find(
            (item) => item.animalId === animal.animalId
        );
        return evaluation?.evaluationResult || '';
    }
}
