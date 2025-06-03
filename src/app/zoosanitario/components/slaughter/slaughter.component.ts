import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    SlaughterProcess,
    SlaughterProcessService,
} from '../../services/slaughter-process.service';

interface SlaughterAnimal {
    animalId: string;
    species: 'BOVINE' | 'PORCINE';
    identification: string;
    weight?: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'EXCLUDED';
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
}

interface SlaughterSummary {
    totalAnimals: number;
    processedAnimals: number;
    pendingAnimals: number;
    totalLiveWeight: number;
    totalCarcassWeight: number;
    averageYield: number;
    totalConfiscations: number;
}

@Component({
    selector: 'app-slaughter',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './slaughter.component.html',
    styleUrls: ['./slaughter.component.scss'],
    providers: [ConfirmationService],
})
export class SlaughterComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    // Estados de carga
    loading = true;
    saving = false;
    startingSlaughter = false;
    completingSlaughter = false;

    // Datos del proceso
    processId!: string;
    process: SlaughterProcess | null = null;

    // Formularios
    slaughterForm!: FormGroup;
    currentAnimalForm!: FormGroup;

    // Estados del faenamiento
    canStartSlaughter = false;
    slaughterStarted = false;
    slaughterCompleted = false;

    // Animales y procesos
    animals: SlaughterAnimal[] = [];
    currentAnimalIndex = 0;
    processedAnimals: SlaughterAnimal[] = [];

    // Resumen
    slaughterSummary: SlaughterSummary = {
        totalAnimals: 0,
        processedAnimals: 0,
        pendingAnimals: 0,
        totalLiveWeight: 0,
        totalCarcassWeight: 0,
        averageYield: 0,
        totalConfiscations: 0,
    };

    // Opciones para dropdowns
    processingMethodOptions = [
        { label: 'Sacrificio Humanitario', value: 'HUMANE_SLAUGHTER' },
        { label: 'Aturdimiento Eléctrico', value: 'ELECTRIC_STUNNING' },
        { label: 'Aturdimiento por Pistola', value: 'CAPTIVE_BOLT' },
        { label: 'Sacrificio Halal', value: 'HALAL_SLAUGHTER' },
        { label: 'Sacrificio Kosher', value: 'KOSHER_SLAUGHTER' },
    ];

    productTypeOptions = [
        { label: 'Carne de Primera', value: 'PRIME_MEAT' },
        { label: 'Carne de Segunda', value: 'SECOND_MEAT' },
        { label: 'Carne de Tercera', value: 'THIRD_MEAT' },
        { label: 'Vísceras Comestibles', value: 'EDIBLE_ORGANS' },
        { label: 'Vísceras no Comestibles', value: 'NON_EDIBLE_ORGANS' },
        { label: 'Piel/Cuero', value: 'HIDE_LEATHER' },
        { label: 'Huesos', value: 'BONES' },
        { label: 'Grasa', value: 'FAT' },
        { label: 'Sangre', value: 'BLOOD' },
    ];

    qualityOptions = [
        { label: 'Excelente', value: 'EXCELLENT', color: '#10b981' },
        { label: 'Buena', value: 'GOOD', color: '#3b82f6' },
        { label: 'Regular', value: 'FAIR', color: '#f59e0b' },
        { label: 'Deficiente', value: 'POOR', color: '#ef4444' },
    ];

    confiscationReasons = [
        { label: 'Enfermedad', value: 'DISEASE' },
        { label: 'Parásitos', value: 'PARASITES' },
        { label: 'Lesiones', value: 'INJURIES' },
        { label: 'Contaminación', value: 'CONTAMINATION' },
        { label: 'Alteración', value: 'ALTERATION' },
        { label: 'Decomposición', value: 'DECOMPOSITION' },
        { label: 'Otros', value: 'OTHER' },
    ];

    dispositionOptions = [
        { label: 'Destrucción', value: 'DESTRUCTION' },
        { label: 'Incineración', value: 'INCINERATION' },
        { label: 'Compostaje', value: 'COMPOSTING' },
        { label: 'Uso Industrial', value: 'INDUSTRIAL_USE' },
        { label: 'Otros', value: 'OTHER' },
    ];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private fb: FormBuilder,
        private slaughterService: SlaughterProcessService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {
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
        this.slaughterForm = this.fb.group({
            operator: ['', Validators.required],
            responsibleVeterinarian: ['', Validators.required],
            startDate: [new Date(), Validators.required],
        });

        this.currentAnimalForm = this.fb.group({
            animalId: ['', Validators.required],
            startTime: [new Date(), Validators.required],
            endTime: [''],
            processingMethod: ['', Validators.required],
            processTemperature: [
                null,
                [Validators.min(-10), Validators.max(50)],
            ],

            // Productos obtenidos
            products: this.fb.array([]),

            // Decomisos
            confiscations: this.fb.array([]),

            yield: [null, [Validators.min(0), Validators.max(100)]],
            observations: [''],
        });
    }

    /**
     * Getter para el FormArray de productos
     */
    get productsFormArray(): FormArray {
        return this.currentAnimalForm.get('products') as FormArray;
    }

    /**
     * Getter para el FormArray de decomisos
     */
    get confiscationsFormArray(): FormArray {
        return this.currentAnimalForm.get('confiscations') as FormArray;
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
                    this.checkSlaughterStatus();
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
     * Verificar estado del faenamiento
     */
    private checkSlaughterStatus(): void {
        if (!this.process) return;

        // Verificar si se puede iniciar el faenamiento
        this.canStartSlaughter =
            (this.process.overallStatus === 'SLAUGHTER' &&
                this.process.externalInspection.overallResult ===
                    'ALL_SUITABLE') ||
            this.process.externalInspection.overallResult ===
                'PARTIAL_SUITABLE';

        // Verificar si el faenamiento ya está iniciado
        this.slaughterStarted = this.process.slaughter.canStart;

        // Verificar si el faenamiento está completado
        this.slaughterCompleted = this.process.slaughter.status === 'COMPLETED';

        // Cargar datos existentes del faenamiento
        if (
            this.process.slaughter.operator ||
            this.process.slaughter.responsibleVeterinarian
        ) {
            this.slaughterForm.patchValue({
                operator: this.process.slaughter.operator,
                responsibleVeterinarian:
                    this.process.slaughter.responsibleVeterinarian,
                startDate: this.process.slaughter.startDate,
            });
        }

        // Cargar procesos existentes
        if (this.process.slaughter.slaughterProcesses) {
            this.loadExistingSlaughterProcesses();
        }
    }

    /**
     * Cargar procesos de faenamiento existentes
     */
    private loadExistingSlaughterProcesses(): void {
        if (!this.process?.slaughter.slaughterProcesses) return;

        this.processedAnimals = this.process.slaughter.slaughterProcesses.map(
            (sp) => ({
                animalId: sp.animalId,
                species: this.getAnimalSpecies(sp.animalId),
                identification: this.getAnimalIdentification(sp.animalId),
                weight: this.getAnimalWeight(sp.animalId),
                status: 'COMPLETED',
                startTime: sp.startTime,
                endTime: sp.endTime,
                processingMethod: sp.processingMethod,
                processTemperature: sp.processTemperature,
                obtainedProducts: sp.obtainedProducts || [],
                confiscations: sp.confiscations || [],
                yield: sp.yield,
                observations: sp.observations,
            })
        );

        this.calculateSummary();
    }

    /**
     * Cargar animales aptos para faenamiento
     */
    private loadAnimals(): void {
        if (!this.process?.externalInspection.animalEvaluations) return;

        // Filtrar solo animales aptos para faenamiento
        const suitableAnimals =
            this.process.externalInspection.animalEvaluations.filter(
                (evalu) => evalu.evaluationResult === 'SUITABLE_FOR_SLAUGHTER'
            );

        this.animals = suitableAnimals.map((animal) => ({
            animalId: animal.animalId,
            species: animal.species,
            identification: animal.identification,
            weight: animal.weight,
            status: this.processedAnimals.some(
                (pa) => pa.animalId === animal.animalId
            )
                ? 'COMPLETED'
                : 'PENDING',
            obtainedProducts: [],
            confiscations: [],
        }));

        this.slaughterSummary.totalAnimals = this.animals.length;
        this.calculateSummary();
    }

    /**
     * Iniciar proceso de faenamiento
     */
    startSlaughter(): void {
        if (this.slaughterForm.invalid) {
            this.markFormGroupTouched(this.slaughterForm);
            this.messageService.add({
                severity: 'error',
                summary: 'Formulario Inválido',
                detail: 'Por favor complete todos los campos requeridos',
            });
            return;
        }

        this.confirmationService.confirm({
            message:
                '¿Está seguro de que desea iniciar el proceso de faenamiento?',
            header: 'Iniciar Faenamiento',
            icon: 'pi pi-question-circle',
            accept: () => {
                this.performStartSlaughter();
            },
        });
    }

    /**
     * Ejecutar inicio de faenamiento
     */
    private performStartSlaughter(): void {
        this.startingSlaughter = true;

        const formValue = this.slaughterForm.value;

        const data = {
            operator: formValue.operator,
            responsibleVeterinarian: formValue.responsibleVeterinarian,
            startDate: formValue.startDate,
        };

        this.slaughterService
            .startSlaughter(this.processId, data)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.startingSlaughter = false))
            )
            .subscribe({
                next: (process) => {
                    this.process = process;
                    this.slaughterStarted = true;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Faenamiento Iniciado',
                        detail: 'El proceso de faenamiento ha sido iniciado correctamente',
                    });
                },
                error: (error) => {
                    console.error('Error iniciando faenamiento:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo iniciar el proceso de faenamiento',
                    });
                },
            });
    }

    /**
     * Seleccionar animal para procesar
     */
    selectAnimal(index: number): void {
        if (this.animals[index].status === 'COMPLETED') {
            // Cargar datos existentes
            const processedAnimal = this.processedAnimals.find(
                (pa) => pa.animalId === this.animals[index].animalId
            );
            if (processedAnimal) {
                this.loadAnimalToForm(processedAnimal);
            }
        } else {
            // Nuevo animal
            this.resetCurrentAnimalForm();
            this.currentAnimalForm.patchValue({
                animalId: this.animals[index].animalId,
                startTime: new Date(),
            });
        }
        this.currentAnimalIndex = index;
    }

    /**
     * Cargar animal procesado al formulario
     */
    private loadAnimalToForm(animal: SlaughterAnimal): void {
        // Limpiar arrays
        while (this.productsFormArray.length > 0) {
            this.productsFormArray.removeAt(0);
        }
        while (this.confiscationsFormArray.length > 0) {
            this.confiscationsFormArray.removeAt(0);
        }

        // Cargar datos básicos
        this.currentAnimalForm.patchValue({
            animalId: animal.animalId,
            startTime: animal.startTime,
            endTime: animal.endTime,
            processingMethod: animal.processingMethod,
            processTemperature: animal.processTemperature,
            yield: animal.yield,
            observations: animal.observations,
        });

        // Cargar productos
        animal.obtainedProducts.forEach((product) => {
            this.addProduct(product);
        });

        // Cargar decomisos
        animal.confiscations.forEach((confiscation) => {
            this.addConfiscation(confiscation);
        });
    }

    /**
     * Resetear formulario del animal actual
     */
    resetCurrentAnimalForm(): void {
        this.currentAnimalForm.reset();

        // Limpiar arrays
        while (this.productsFormArray.length > 0) {
            this.productsFormArray.removeAt(0);
        }
        while (this.confiscationsFormArray.length > 0) {
            this.confiscationsFormArray.removeAt(0);
        }

        // Valores por defecto
        this.currentAnimalForm.patchValue({
            startTime: new Date(),
        });
    }

    /**
     * Agregar producto obtenido
     */
    addProduct(product?: any): void {
        const productForm = this.fb.group({
            type: [product?.type || '', Validators.required],
            weight: [
                product?.weight || null,
                [Validators.required, Validators.min(0)],
            ],
            quality: [product?.quality || 'GOOD'],
            batch: [product?.batch || ''],
            observations: [product?.observations || ''],
        });

        this.productsFormArray.push(productForm);
    }

    /**
     * Remover producto
     */
    removeProduct(index: number): void {
        this.productsFormArray.removeAt(index);
    }

    /**
     * Agregar decomiso
     */
    addConfiscation(confiscation?: any): void {
        const confiscationForm = this.fb.group({
            part: [confiscation?.part || '', Validators.required],
            reason: [confiscation?.reason || '', Validators.required],
            weight: [
                confiscation?.weight || null,
                [Validators.required, Validators.min(0)],
            ],
            finalDisposition: [
                confiscation?.finalDisposition || '',
                Validators.required,
            ],
        });

        this.confiscationsFormArray.push(confiscationForm);
    }

    /**
     * Remover decomiso
     */
    removeConfiscation(index: number): void {
        this.confiscationsFormArray.removeAt(index);
    }

    /**
     * Registrar proceso de faenamiento del animal
     */
    recordAnimalSlaughter(): void {
        if (this.currentAnimalForm.invalid) {
            this.markFormGroupTouched(this.currentAnimalForm);
            this.messageService.add({
                severity: 'error',
                summary: 'Formulario Inválido',
                detail: 'Por favor complete todos los campos requeridos',
            });
            return;
        }

        const formValue = this.currentAnimalForm.value;

        const data = {
            animalId: formValue.animalId,
            startTime: formValue.startTime,
            endTime: formValue.endTime || new Date(),
            processingMethod: formValue.processingMethod,
            processTemperature: formValue.processTemperature,
            obtainedProducts: formValue.products,
            confiscations: formValue.confiscations,
            yield: formValue.yield,
            observations: formValue.observations,
        };

        this.saving = true;

        this.slaughterService
            .recordSlaughterProcess(this.processId, data)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.saving = false))
            )
            .subscribe({
                next: (process) => {
                    this.process = process;
                    this.updateLocalAnimal(data);
                    this.animals[this.currentAnimalIndex].status = 'COMPLETED';
                    this.calculateSummary();

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Animal Procesado',
                        detail: `El animal ${data.animalId} ha sido procesado correctamente`,
                    });

                    // Ir al siguiente animal pendiente
                    this.goToNextAnimal();
                },
                error: (error) => {
                    console.error('Error procesando animal:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo procesar el animal',
                    });
                },
            });
    }

    /**
     * Actualizar animal local
     */
    private updateLocalAnimal(data: any): void {
        const existingIndex = this.processedAnimals.findIndex(
            (pa) => pa.animalId === data.animalId
        );

        const animalData: SlaughterAnimal = {
            animalId: data.animalId,
            species: this.getAnimalSpecies(data.animalId),
            identification: this.getAnimalIdentification(data.animalId),
            weight: this.getAnimalWeight(data.animalId),
            status: 'COMPLETED',
            startTime: data.startTime,
            endTime: data.endTime,
            processingMethod: data.processingMethod,
            processTemperature: data.processTemperature,
            obtainedProducts: data.obtainedProducts,
            confiscations: data.confiscations,
            yield: data.yield,
            observations: data.observations,
        };

        if (existingIndex >= 0) {
            this.processedAnimals[existingIndex] = animalData;
        } else {
            this.processedAnimals.push(animalData);
        }
    }

    /**
     * Ir al siguiente animal
     */
    private goToNextAnimal(): void {
        const nextIndex = this.animals.findIndex(
            (animal, index) =>
                index > this.currentAnimalIndex && animal.status === 'PENDING'
        );

        if (nextIndex >= 0) {
            this.selectAnimal(nextIndex);
        } else {
            // Todos los animales procesados
            this.resetCurrentAnimalForm();
        }
    }

    /**
     * Completar proceso de faenamiento
     */
    completeSlaughter(): void {
        if (this.animals.some((animal) => animal.status === 'PENDING')) {
            this.messageService.add({
                severity: 'error',
                summary: 'Faenamiento Incompleto',
                detail: 'Debe procesar todos los animales antes de completar el faenamiento',
            });
            return;
        }

        this.confirmationService.confirm({
            message:
                '¿Está seguro de que desea completar el proceso de faenamiento?',
            header: 'Completar Faenamiento',
            icon: 'pi pi-question-circle',
            accept: () => {
                this.performCompleteSlaughter();
            },
        });
    }

    /**
     * Ejecutar completar faenamiento
     */
    private performCompleteSlaughter(): void {
        this.completingSlaughter = true;

        this.slaughterService
            .completeSlaughter(this.processId)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.completingSlaughter = false))
            )
            .subscribe({
                next: (process) => {
                    this.process = process;
                    this.slaughterCompleted = true;

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Faenamiento Completado',
                        detail: 'El proceso de faenamiento ha sido completado correctamente',
                    });

                    // Redirigir a inspección interna
                    this.confirmationService.confirm({
                        message: '¿Desea continuar con la inspección interna?',
                        header: 'Continuar Proceso',
                        icon: 'pi pi-question-circle',
                        accept: () => {
                            this.router.navigate([
                                '/faenamiento/procesos',
                                this.processId,
                                'inspeccion-interna',
                            ]);
                        },
                        reject: () => {
                            this.router.navigate([
                                '/faenamiento/procesos',
                                this.processId,
                            ]);
                        },
                    });
                },
                error: (error) => {
                    console.error('Error completando faenamiento:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo completar el proceso de faenamiento',
                    });
                },
            });
    }

    /**
     * Calcular resumen del faenamiento
     */
    private calculateSummary(): void {
        this.slaughterSummary = {
            totalAnimals: this.animals.length,
            processedAnimals: this.processedAnimals.length,
            pendingAnimals: this.animals.filter((a) => a.status === 'PENDING')
                .length,
            totalLiveWeight: this.animals.reduce(
                (sum, animal) => sum + (animal.weight || 0),
                0
            ),
            totalCarcassWeight: this.processedAnimals.reduce(
                (sum, animal) =>
                    sum +
                    animal.obtainedProducts.reduce(
                        (productSum, product) => productSum + product.weight,
                        0
                    ),
                0
            ),
            averageYield:
                this.processedAnimals.length > 0
                    ? this.processedAnimals.reduce(
                          (sum, animal) => sum + (animal.yield || 0),
                          0
                      ) / this.processedAnimals.length
                    : 0,
            totalConfiscations: this.processedAnimals.reduce(
                (sum, animal) =>
                    sum +
                    animal.confiscations.reduce(
                        (confSum, conf) => confSum + conf.weight,
                        0
                    ),
                0
            ),
        };
    }

    /**
     * Obtener datos del animal por ID
     */
    private getAnimalSpecies(animalId: string): 'BOVINE' | 'PORCINE' {
        const animal = this.process?.reception.receivedAnimals.find(
            (a) => a.animalId === animalId
        );
        return animal?.species || 'BOVINE';
    }

    private getAnimalIdentification(animalId: string): string {
        const evaluation =
            this.process?.externalInspection.animalEvaluations.find(
                (e) => e.animalId === animalId
            );
        return evaluation?.identification || animalId;
    }

    private getAnimalWeight(animalId: string): number | undefined {
        const animal = this.process?.reception.receivedAnimals.find(
            (a) => a.animalId === animalId
        );
        return animal?.weight;
    }

    /**
     * Marcar formulario como tocado
     */
    private markFormGroupTouched(formGroup: FormGroup): void {
        Object.keys(formGroup.controls).forEach((key) => {
            const control = formGroup.get(key);
            control?.markAsTouched();

            if (control instanceof FormArray) {
                control.controls.forEach((arrayControl) => {
                    if (arrayControl instanceof FormGroup) {
                        this.markFormGroupTouched(arrayControl);
                    }
                });
            }
        });
    }

    /**
     * Verificar si todos los animales están procesados
     */
    allAnimalsProcessed(): boolean {
        return (
            this.animals.length > 0 &&
            this.animals.every((animal) => animal.status === 'COMPLETED')
        );
    }

    /**
     * Obtener progreso del faenamiento
     */
    getSlaughterProgress(): number {
        if (this.animals.length === 0) return 0;
        return (this.processedAnimals.length / this.animals.length) * 100;
    }

    /**
     * Obtener color para calidad
     */
    getQualityColor(quality: string): string {
        const option = this.qualityOptions.find((opt) => opt.value === quality);
        return option?.color || '#6b7280';
    }

    /**
     * Formatear tiempo de procesamiento
     */
    getProcessingTime(animal: SlaughterAnimal): string {
        if (!animal.startTime || !animal.endTime) return 'N/A';

        const diff =
            new Date(animal.endTime).getTime() -
            new Date(animal.startTime).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else {
            return `${minutes}m`;
        }
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
     * Método auxiliar para obtener un FormGroup desde el FormArray
     * Esto resuelve el problema de tipos en el template
     */
    getAnimalFormGroup(index: number, formArray: FormArray): FormGroup {
        return formArray.at(index) as FormGroup;
    }

    // Agregar estos métodos al final de la clase SlaughterComponent

    /**
     * Calcular peso total de productos obtenidos de un animal
     */
    getTotalCarcassWeight(animal: SlaughterAnimal): number {
        if (!animal.obtainedProducts || animal.obtainedProducts.length === 0) {
            return 0;
        }
        return animal.obtainedProducts.reduce(
            (sum, product) => sum + (product.weight || 0),
            0
        );
    }

    /**
     * Formatear peso con unidad
     */
    formatWeight(weight: number): string {
        if (weight === 0) return 'N/A';
        return `${weight.toFixed(1)} kg`;
    }

    /**
     * Obtener clase CSS para el estado del animal
     */
    getAnimalStatusClass(animal: SlaughterAnimal): string {
        switch (animal.status) {
            case 'COMPLETED':
                return 'animal-completed';
            case 'IN_PROGRESS':
                return 'animal-in-progress';
            case 'PENDING':
                return 'animal-pending';
            default:
                return 'animal-pending';
        }
    }

    /**
     * Obtener icono para el estado del animal
     */
    getAnimalStatusIcon(animal: SlaughterAnimal): string {
        switch (animal.status) {
            case 'COMPLETED':
                return 'pi-check-circle';
            case 'IN_PROGRESS':
                return 'pi-clock';
            case 'PENDING':
                return 'pi-circle';
            default:
                return 'pi-circle';
        }
    }

    /**
     * Obtener severity para el tag de confiscaciones
     */
    getConfiscationSeverity(
        count: number
    ): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
        return count > 0 ? 'danger' : 'success';
    }
}
