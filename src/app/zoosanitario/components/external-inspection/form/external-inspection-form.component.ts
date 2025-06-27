import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnInit,
    OnChanges,
    SimpleChanges,
    HostListener,
    ElementRef,
    ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import { AnimalTypeService } from 'src/app/zoosanitario/services/animal-type.service';
import {
    ExternalInspectionService,
    ExternalInspection,
} from 'src/app/zoosanitario/services/external-inspection.service';
import { FileSizePipe } from 'src/app/zoosanitario/utils/pipes/filesize.pipe';

interface PhotoFile {
    file: File;
    name: string;
    size: number;
    preview?: string;
}

interface SwipeState {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
    threshold: number;
    direction: 'left' | 'right' | null;
}

@Component({
    selector: 'app-external-inspection-form',
    standalone: true,
    imports: [ImportsModule, FileSizePipe],
    templateUrl: './external-inspection-form.component.html',
    styleUrls: ['./external-inspection-form.component.scss'],
})
export class ExternalInspectionFormComponent implements OnInit, OnChanges {
    @Input() visible = false;
    @Input() inspectionId: string | null = null;
    @Input() receptionId?: string;
    @Input() processId?: string;
    @Input() phase: 'recepcion' | 'anteMortem' = null;

    // Nuevos inputs para navegación
    @Input() inspectionsList: ExternalInspection[] = [];
    @Input() currentIndex: number = -1;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() inspectionSaved = new EventEmitter<any>();
    @Output() dialogClosed = new EventEmitter<void>();
    @Output() navigationChanged = new EventEmitter<'prev' | 'next'>();

    @ViewChild('swipeContainer', { static: false }) swipeContainer!: ElementRef;

    inspectionForm!: FormGroup;
    loading = false;
    submitting = false;

    // Datos de referencia para ante mortem
    receptionData: any = null;
    currentInspection: any = null;

    // Gestión de archivos
    selectedFiles: PhotoFile[] = [];
    existingPhotos: string[] = [];
    existingPhotosUrls: Map<string, string> = new Map();
    loadingImages: Set<string> = new Set();
    maxFileSize = 5 * 1024 * 1024; // 5MB
    maxFiles = 10;

    showPhotoViewer = false;
    selectedPhoto: string | null = null;

    // Estado del swipe
    swipeState: SwipeState = {
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        isDragging: false,
        threshold: 100,
        direction: null,
    };

    // Indicador visual del swipe
    swipeIndicator = {
        visible: false,
        direction: '',
        text: '',
        progress: 0,
    };

    // Opciones para formulario
    speciesOptions: any[] = [];
    sexOptions = [
        { label: 'Macho', value: 'Macho' },
        { label: 'Hembra', value: 'Hembra' },
        { label: 'Pendiente', value: 'Pendiente' },
    ];

    resultOptions = [
        { label: 'Pendiente', value: 'Pendiente' },
        { label: 'Apto', value: 'Apto' },
        { label: 'Devolución', value: 'Devolución' },
        { label: 'Cuarentena', value: 'Cuarentena' },
        { label: 'Comisión', value: 'Comisión' },
    ];

    constructor(
        private fb: FormBuilder,
        private inspectionService: ExternalInspectionService,
        private animalTypeService: AnimalTypeService,
        private messageService: MessageService,
        private elementRef: ElementRef
    ) {}

    ngOnInit(): void {
        this.initializeForm();
        this.loadAnimalTypes();

        if (this.inspectionId) {
            this.loadInspection();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        // Cuando cambia el índice de navegación, cargar la nueva inspección
        if (changes['currentIndex'] && !changes['currentIndex'].firstChange) {
            this.loadInspectionFromList();
        }

        // Cuando cambia la lista de inspecciones
        if (
            changes['inspectionsList'] &&
            !changes['inspectionsList'].firstChange
        ) {
            this.loadInspectionFromList();
        }

        // Cuando cambia el inspectionId desde el componente padre
        if (changes['inspectionId'] && !changes['inspectionId'].firstChange) {
            if (this.inspectionId) {
                this.loadInspection();
            } else {
                this.resetForm();
                this.initializeForm();
            }
        }
    }

    // NUEVOS MÉTODOS PARA SWIPE FUNCTIONALITY

    @HostListener('touchstart', ['$event'])
    @HostListener('mousedown', ['$event'])
    onSwipeStart(event: TouchEvent | MouseEvent): void {
        if (!this.showNavigation) return;

        const clientX = this.getClientX(event);
        const clientY = this.getClientY(event);

        this.swipeState = {
            ...this.swipeState,
            startX: clientX,
            startY: clientY,
            currentX: clientX,
            currentY: clientY,
            isDragging: true,
            direction: null,
        };

        this.swipeIndicator.visible = false;

        if (event instanceof MouseEvent) {
            event.preventDefault();
        }
    }

    @HostListener('touchmove', ['$event'])
    @HostListener('mousemove', ['$event'])
    onSwipeMove(event: TouchEvent | MouseEvent): void {
        if (!this.swipeState.isDragging || !this.showNavigation) return;

        const clientX = this.getClientX(event);
        const clientY = this.getClientY(event);

        this.swipeState.currentX = clientX;
        this.swipeState.currentY = clientY;

        const deltaX = clientX - this.swipeState.startX;
        const deltaY = Math.abs(clientY - this.swipeState.startY);

        // Verificar si es un swipe horizontal válido
        if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > deltaY * 2) {
            const direction = deltaX > 0 ? 'right' : 'left';
            const canNavigate =
                (direction === 'left' && this.canNavigateNext()) ||
                (direction === 'right' && this.canNavigatePrev());

            if (canNavigate) {
                this.swipeState.direction = direction;
                this.updateSwipeIndicator(deltaX, direction);
            }

            if (event instanceof TouchEvent) {
                event.preventDefault();
            }
        }
    }

    @HostListener('touchend', ['$event'])
    @HostListener('mouseup', ['$event'])
    onSwipeEnd(event: TouchEvent | MouseEvent): void {
        if (!this.swipeState.isDragging) return;

        const deltaX = this.swipeState.currentX - this.swipeState.startX;
        const deltaY = Math.abs(
            this.swipeState.currentY - this.swipeState.startY
        );

        // Verificar si cumple los criterios para un swipe válido
        if (
            Math.abs(deltaX) > this.swipeState.threshold &&
            Math.abs(deltaX) > deltaY * 2 &&
            this.swipeState.direction
        ) {
            this.executeSwipeNavigation(this.swipeState.direction);
        }

        this.resetSwipeState();
    }

    @HostListener('mouseleave', ['$event'])
    onMouseLeave(event: MouseEvent): void {
        this.resetSwipeState();
    }

    private getClientX(event: TouchEvent | MouseEvent): number {
        return event instanceof TouchEvent
            ? event.touches[0]?.clientX || 0
            : event.clientX;
    }

    private getClientY(event: TouchEvent | MouseEvent): number {
        return event instanceof TouchEvent
            ? event.touches[0]?.clientY || 0
            : event.clientY;
    }

    private updateSwipeIndicator(
        deltaX: number,
        direction: 'left' | 'right'
    ): void {
        const progress = Math.min(
            Math.abs(deltaX) / this.swipeState.threshold,
            1
        );

        this.swipeIndicator = {
            visible: true,
            direction: direction,
            text: direction === 'left' ? 'Siguiente →' : '← Anterior',
            progress: progress,
        };
    }

    private executeSwipeNavigation(direction: 'left' | 'right'): void {
        const navigationDirection = direction === 'left' ? 'next' : 'prev';

        // Mostrar feedback visual de éxito
        this.swipeIndicator = {
            ...this.swipeIndicator,
            visible: true,
            progress: 1,
        };

        // Ejecutar navegación después de un breve delay para mostrar el feedback
        setTimeout(() => {
            this.navigateToInspection(navigationDirection);
            this.resetSwipeState();
        }, 200);
    }

    private resetSwipeState(): void {
        this.swipeState = {
            ...this.swipeState,
            isDragging: false,
            direction: null,
        };
        this.swipeIndicator.visible = false;
    }

    // MÉTODOS PARA COLORES DINÁMICOS

    getFormThemeClass(): string {
        if (this.phase !== 'recepcion' || !this.receptionData?.resultado) {
            return 'theme-default';
        }

        const resultado = this.receptionData.resultado;
        if (resultado === 'Pendiente') {
            return 'theme-default';
        }

        const themeMap: { [key: string]: string } = {
            Apto: 'theme-approved',
            Devolución: 'theme-returned',
            Cuarentena: 'theme-quarantine',
            Comisión: 'theme-commission',
        };

        return themeMap[resultado] || 'theme-default';
    }

    getResultThemeInfo(): {
        color: 'success' | 'warning' | 'danger' | 'info' | 'secondary';
        icon: string;
        text: string;
    } {
        if (this.phase !== 'recepcion' || !this.receptionData?.resultado) {
            return { color: 'secondary', icon: 'pi-circle', text: 'Pendiente' };
        }

        const resultado = this.receptionData.resultado;
        const themeInfo: {
            [key: string]: {
                color: 'success' | 'warning' | 'danger' | 'info' | 'secondary';
                icon: string;
                text: string;
            };
        } = {
            Apto: {
                color: 'success',
                icon: 'pi-check-circle',
                text: 'Aprobado',
            },
            Devolución: {
                color: 'danger',
                icon: 'pi-times-circle',
                text: 'Devuelto',
            },
            Cuarentena: {
                color: 'warning',
                icon: 'pi-exclamation-triangle',
                text: 'Cuarentena',
            },
            Comisión: {
                color: 'info',
                icon: 'pi-info-circle',
                text: 'En Comisión',
            },
        };

        return (
            themeInfo[resultado] || {
                color: 'secondary',
                icon: 'pi-circle',
                text: 'Pendiente',
            }
        );
    }

    // Propiedades para la navegación
    get showNavigation(): boolean {
        return this.inspectionsList.length > 0 && this.currentIndex >= 0;
    }

    get totalInspections(): number {
        return this.inspectionsList.length;
    }

    get currentInspectionNumber(): string {
        if (
            this.currentIndex >= 0 &&
            this.currentIndex < this.inspectionsList.length
        ) {
            return this.inspectionsList[this.currentIndex]?.numero || '';
        }
        return '';
    }

    // Métodos de navegación
    canNavigatePrev(): boolean {
        return this.currentIndex > 0;
    }

    canNavigateNext(): boolean {
        return this.currentIndex < this.inspectionsList.length - 1;
    }

    // Agrega esta propiedad
    currentAnimation = '';

    // Modifica tu función de navegación
    navigateToInspection(direction: 'prev' | 'next') {
        this.currentAnimation =
            direction === 'next' ? 'slide-out-left' : 'slide-out-right';

        setTimeout(() => {
            if (this.inspectionForm.dirty) {
                this.confirmNavigationWithUnsavedChanges(direction);
            } else {
                this.performNavigation(direction);
            }
            // Después de cambiar el registro
            this.currentAnimation =
                direction === 'next' ? 'slide-in-right' : 'slide-in-left';

            // Remueve la animación después de que termine
            setTimeout(() => (this.currentAnimation = ''), 500);
        }, 50);
    }

    private confirmNavigationWithUnsavedChanges(
        direction: 'prev' | 'next'
    ): void {
        if (
            confirm(
                'Tienes cambios sin guardar. ¿Deseas continuar sin guardar?'
            )
        ) {
            this.performNavigation(direction);
        }
    }

    private performNavigation(direction: 'prev' | 'next'): void {
        this.navigationChanged.emit(direction);
    }

    private loadInspectionFromList(): void {
        if (
            this.currentIndex >= 0 &&
            this.currentIndex < this.inspectionsList.length
        ) {
            const inspection = this.inspectionsList[this.currentIndex];
            this.currentInspection = inspection;
            this.inspectionId = inspection._id || null;

            // Resetear el formulario y cargar nuevos datos
            this.resetFormData();
            this.fillForm(inspection);
            this.extractExistingPhotos(inspection);

            // Si estamos en ante mortem, cargar datos de recepción como referencia
            if (this.phase === 'anteMortem') {
                this.receptionData = inspection.inspeccionRecepcion;
            }
        }
    }

    returnToList(): void {
        if (this.inspectionForm.dirty) {
            if (
                confirm(
                    'Tienes cambios sin guardar. ¿Deseas continuar sin guardar?'
                )
            ) {
                this.closeDialog();
            }
        } else {
            this.closeDialog();
        }
    }

    getDialogTitle(): string {
        let baseTitle =
            this.phase === 'recepcion'
                ? 'Inspección de Recepción'
                : 'Examen Ante Mortem';

        if (this.showNavigation) {
            baseTitle += ` (${this.currentIndex + 1}/${this.totalInspections})`;
        }

        return baseTitle;
    }

    loadAnimalTypes(): void {
        this.animalTypeService
            .getAll({ limit: 100, fields: 'species,category', slaughter: true })
            .subscribe({
                next: (response: any) => {
                    console.log('Tipos de animales:', response);
                    this.speciesOptions = response.data.animalTypes.map(
                        (type: any) => ({
                            label: type.species + ' (' + type.category + ')',
                            value: type._id,
                        })
                    );
                },
                error: (error) => {
                    console.error('Error loading animal types:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cargar tipos de animales',
                    });
                },
            });
    }

    initializeForm(): void {
        if (this.phase === 'recepcion') {
            this.initializeReceptionForm();
        } else {
            this.initializeAnteMortemForm();
        }

        // Validación condicional para motivo del dictamen
        this.inspectionForm
            .get('resultado')
            ?.valueChanges.subscribe((resultado) => {
                const motivoControl = this.inspectionForm.get('motivoDictamen');
                if (
                    resultado &&
                    resultado !== 'Apto' &&
                    resultado !== 'Pendiente'
                ) {
                    motivoControl?.setValidators([
                        Validators.required,
                        Validators.maxLength(1000),
                    ]);
                } else {
                    motivoControl?.setValidators([Validators.maxLength(1000)]);
                }
                motivoControl?.updateValueAndValidity();
            });
    }

    private initializeReceptionForm(): void {
        this.inspectionForm = this.fb.group({
            numero: ['', Validators.required],
            especie: [''],
            sexo: ['Pendiente'],
            edad: [null, [Validators.min(0), Validators.max(30)]],
            peso: [null, [Validators.min(0), Validators.max(2000)]],
            temperatura: [null, [Validators.min(35), Validators.max(45)]],
            frecuenciaCardiaca: [
                null,
                [Validators.min(30), Validators.max(200)],
            ],
            frecuenciaRespiratoria: [
                null,
                [Validators.min(5), Validators.max(80)],
            ],
            horaChequeo: [new Date()],
            estadoGeneral: ['', Validators.maxLength(500)],
            lesionesVisibles: ['', Validators.maxLength(500)],
            caracteristicas: this.fb.group({
                tamano: [''],
                parasitos: [null],
                movilidad: [''],
                destino: [''],
            }),
            resultado: ['Pendiente', Validators.required],
            motivoDictamen: ['', Validators.maxLength(1000)],
            veterinarioResponsable: [''],
        });
    }

    private initializeAnteMortemForm(): void {
        this.inspectionForm = this.fb.group({
            temperatura: [null, [Validators.min(35), Validators.max(45)]],
            frecuenciaCardiaca: [
                null,
                [Validators.min(30), Validators.max(200)],
            ],
            frecuenciaRespiratoria: [
                null,
                [Validators.min(5), Validators.max(80)],
            ],
            horaChequeo: [new Date()],
            estadoGeneralOptimo: [null],
            comportamientoNormal: [null],
            lesiones: [null],
            parasitos: [null],
            secreciones: this.fb.group({
                ocular: [null],
                nasal: [null],
            }),
            signos: this.fb.group({
                nervioso: [null],
                respiratorio: [null],
                digestivo: [null],
                vesicular: [null],
            }),
            caracteristicasAnimal: this.fb.group({
                color: [''],
                tamanoCacho: [''],
            }),
            resultado: ['Pendiente', Validators.required],
            motivoDictamen: ['', Validators.maxLength(1000)],
            veterinarioResponsable: [''],
        });
    }

    loadInspection(): void {
        if (!this.inspectionId) return;

        this.loading = true;
        this.inspectionService.getById(this.inspectionId, false).subscribe({
            next: (response: any) => {
                console.log('Inspección cargada:', response);
                this.currentInspection = response.data;
                this.fillForm(response.data);
                this.extractExistingPhotos(response.data);

                // Si estamos en ante mortem, cargar datos de recepción como referencia
                if (this.phase === 'anteMortem') {
                    this.receptionData = response.data.inspeccionRecepcion;
                }

                this.loading = false;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo cargar la inspección',
                });
                this.loading = false;
                this.onCancel();
            },
        });
    }

    fillForm(inspection: any): void {
        if (this.phase === 'recepcion') {
            // Llenar datos básicos del animal
            this.inspectionForm.patchValue({
                numero: inspection.numero,
                especie: inspection.especie?._id || inspection.especie,
                sexo: inspection.sexo,
                edad: inspection.edad,
                peso: inspection.peso,
            });

            // Llenar datos de inspección de recepción
            if (inspection.inspeccionRecepcion) {
                this.inspectionForm.patchValue({
                    ...inspection.inspeccionRecepcion,
                    horaChequeo: inspection.inspeccionRecepcion.horaChequeo
                        ? new Date(inspection.inspeccionRecepcion.horaChequeo)
                        : new Date(),
                    caracteristicas:
                        inspection.inspeccionRecepcion.caracteristicas || {},
                });
            }
        } else {
            // Para ante mortem, solo llenar los datos específicos de ante mortem
            if (inspection.examenAnteMortem) {
                this.inspectionForm.patchValue({
                    ...inspection.examenAnteMortem,
                    horaChequeo: inspection.examenAnteMortem.horaChequeo
                        ? new Date(inspection.examenAnteMortem.horaChequeo)
                        : new Date(),
                });
            }
        }
    }

    extractExistingPhotos(inspection: any): void {
        this.existingPhotos = [];
        this.existingPhotosUrls.clear(); // Limpiar URLs anteriores

        if (
            this.phase === 'recepcion' &&
            inspection.inspeccionRecepcion?.fotografias
        ) {
            this.existingPhotos = [
                ...inspection.inspeccionRecepcion.fotografias,
            ];
        } else if (
            this.phase === 'anteMortem' &&
            inspection.examenAnteMortem?.fotografias
        ) {
            this.existingPhotos = [...inspection.examenAnteMortem.fotografias];
        }

        // Cargar las URLs de las imágenes
        this.loadExistingPhotoUrls();
    }

    // NUEVO MÉTODO para cargar las URLs de las imágenes:
    private async loadExistingPhotoUrls(): Promise<void> {
        for (const photoId of this.existingPhotos) {
            if (
                !this.existingPhotosUrls.has(photoId) &&
                !this.loadingImages.has(photoId)
            ) {
                this.loadingImages.add(photoId);
                try {
                    const imageUrl = await this.inspectionService
                        .getImage(photoId)
                        .toPromise();
                    this.existingPhotosUrls.set(photoId, imageUrl);
                } catch (error) {
                    console.error(`Error loading image ${photoId}:`, error);
                    // Opcional: establecer una imagen de error o placeholder
                    this.existingPhotosUrls.set(
                        photoId,
                        'assets/images/image-error.png'
                    );
                } finally {
                    this.loadingImages.delete(photoId);
                }
            }
        }
    }

    // REEMPLAZAR el método getImgae por este:
    getImageUrl(photoId: string): string {
        const url = this.existingPhotosUrls.get(photoId);
        return url || 'assets/icon/imagen.jpg'; // Imagen placeholder mientras carga
    }

    // Método para verificar si una imagen está cargando
    isImageLoading(photoId: string): boolean {
        return this.loadingImages.has(photoId);
    }

    // Gestión de archivos
    onFileSelect(event: any): void {
        const files = event.files || event.target.files;

        for (let file of files) {
            if (this.validateFile(file)) {
                this.addFile(file);
            }
        }
    }

    private validateFile(file: File): boolean {
        // Validar tamaño
        if (file.size > this.maxFileSize) {
            this.messageService.add({
                severity: 'error',
                summary: 'Archivo muy grande',
                detail: `${file.name} excede el tamaño máximo de 5MB`,
            });
            return false;
        }

        // Validar tipo
        if (!file.type.startsWith('image/')) {
            this.messageService.add({
                severity: 'error',
                summary: 'Tipo inválido',
                detail: `${file.name} no es una imagen válida`,
            });
            return false;
        }

        // Validar cantidad máxima
        if (this.selectedFiles.length >= this.maxFiles) {
            this.messageService.add({
                severity: 'error',
                summary: 'Límite alcanzado',
                detail: `No se pueden subir más de ${this.maxFiles} archivos`,
            });
            return false;
        }

        return true;
    }

    private addFile(file: File): void {
        const photoFile: PhotoFile = {
            file,
            name: file.name,
            size: file.size,
        };

        // Crear preview
        const reader = new FileReader();
        reader.onload = (e) => {
            photoFile.preview = e.target?.result as string;
        };
        reader.readAsDataURL(file);

        this.selectedFiles.push(photoFile);
    }

    removeFile(index: number): void {
        this.selectedFiles.splice(index, 1);
    }

    removeExistingPhoto(photoUrl: string): void {
        const index = this.existingPhotos.indexOf(photoUrl);
        if (index > -1) {
            this.existingPhotos.splice(index, 1);
        }
    }

    openPhotoViewer(photo: string): void {
        this.selectedPhoto = photo;
        this.showPhotoViewer = true;
    }

    onSubmit(): void {
        if (this.inspectionForm.invalid) {
            this.markFormGroupTouched();
            this.messageService.add({
                severity: 'error',
                summary: 'Formulario Inválido',
                detail: 'Por favor complete todos los campos requeridos',
            });
            return;
        }

        this.submitting = true;
        const formData = this.prepareFormData();

        if (this.inspectionId) {
            this.updateInspection(formData);
        } else {
            this.createInspection(formData);
        }
    }

    private prepareFormData(): any {
        const formValue = this.inspectionForm.value;

        if (this.phase === 'recepcion') {
            return {
                numero: formValue.numero,
                especie: formValue.especie,
                sexo: formValue.sexo,
                edad: formValue.edad,
                peso: formValue.peso,
                inspeccionRecepcion: {
                    temperatura: formValue.temperatura,
                    frecuenciaCardiaca: formValue.frecuenciaCardiaca,
                    frecuenciaRespiratoria: formValue.frecuenciaRespiratoria,
                    horaChequeo: formValue.horaChequeo,
                    estadoGeneral: formValue.estadoGeneral,
                    lesionesVisibles: formValue.lesionesVisibles,
                    caracteristicas: formValue.caracteristicas,
                    resultado: formValue.resultado,
                    motivoDictamen: formValue.motivoDictamen,
                    veterinarioResponsable: formValue.veterinarioResponsable,
                },
            };
        } else {
            return {
                examenAnteMortem: {
                    temperatura: formValue.temperatura,
                    frecuenciaCardiaca: formValue.frecuenciaCardiaca,
                    frecuenciaRespiratoria: formValue.frecuenciaRespiratoria,
                    horaChequeo: formValue.horaChequeo,
                    estadoGeneralOptimo: formValue.estadoGeneralOptimo,
                    comportamientoNormal: formValue.comportamientoNormal,
                    lesiones: formValue.lesiones,
                    parasitos: formValue.parasitos,
                    secreciones: formValue.secreciones,
                    signos: formValue.signos,
                    caracteristicasAnimal: formValue.caracteristicasAnimal,
                    resultado: formValue.resultado,
                    motivoDictamen: formValue.motivoDictamen,
                    veterinarioResponsable: formValue.veterinarioResponsable,
                },
            };
        }
    }

    createInspection(data: any): void {
        // Agregar referencias según la fase
        if (this.phase === 'recepcion' && this.receptionId) {
            data.recepcion = this.receptionId;
        } else if (this.phase === 'anteMortem' && this.processId) {
            data.processId = this.processId;
        }

        const files = this.selectedFiles.map((pf) => pf.file);

        this.inspectionService
            .createForcedInspection(
                data,
                files,
                'Creación de inspección desde formulario',
                this.phase
            )
            .subscribe({
                next: (response) => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Inspección creada correctamente',
                    });
                    this.inspectionSaved.emit(response);
                    this.closeDialog();
                },
                error: (error) => {
                    console.error('Error creando inspección:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al crear inspección',
                    });
                    this.submitting = false;
                },
            });
    }

    updateInspection(data: any): void {
        if (!this.inspectionId) return;

        const files = this.selectedFiles.map((pf) => pf.file);

        this.inspectionService
            .updateInspectionWithFiles(
                this.inspectionId,
                data,
                files,
                this.phase
            )
            .subscribe({
                next: (response) => {
                    /*this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Inspección actualizada correctamente',
                    });*/
                    this.inspectionSaved.emit(response);

                    // Si estamos navegando, no cerramos el diálogo, solo refrescamos
                    if (this.showNavigation) {
                        this.markFormAsPristine();
                        this.submitting = false;
                    } else {
                        this.closeDialog();
                    }
                },
                error: (error) => {
                    console.error('Error actualizando inspección:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al actualizar inspección',
                    });
                    this.submitting = false;
                },
            });
    }

    onCancel(): void {
        this.closeDialog();
    }

    closeDialog(): void {
        this.visible = false;
        this.visibleChange.emit(false);
        this.dialogClosed.emit();
        this.resetForm();
    }

    private resetForm(): void {
        this.inspectionForm.reset();
        this.resetFormData();
        this.submitting = false;
    }

    private resetFormData(): void {
        this.selectedFiles = [];
        this.existingPhotos = [];
        this.receptionData = null;
        this.currentInspection = null;
        this.resetSwipeState();
    }

    private markFormAsPristine(): void {
        this.inspectionForm.markAsPristine();
        this.inspectionForm.markAsUntouched();
    }

    markFormGroupTouched(): void {
        this.markControlsAsTouched(this.inspectionForm);
    }

    private markControlsAsTouched(formGroup: FormGroup): void {
        Object.values(formGroup.controls).forEach((control) => {
            control.markAsTouched();
            if (control instanceof FormGroup) {
                this.markControlsAsTouched(control);
            }
        });
    }

    // Métodos para indicadores de signos vitales
    getTempIndicatorClass(temp: number): string {
        if (!temp) return '';
        if (temp < 37 || temp > 39) return 'danger';
        if (temp < 37.5 || temp > 38.5) return 'warning';
        return 'normal';
    }

    getTempIndicatorText(temp: number): string {
        if (!temp) return '';
        if (temp < 37) return 'Hipotermia';
        if (temp > 39) return 'Fiebre';
        if (temp < 37.5) return 'Ligeramente baja';
        if (temp > 38.5) return 'Ligeramente alta';
        return 'Normal';
    }

    getHeartRateIndicatorClass(rate: number): string {
        if (!rate) return '';
        if (rate < 60 || rate > 100) return 'danger';
        if (rate < 70 || rate > 90) return 'warning';
        return 'normal';
    }

    getHeartRateIndicatorText(rate: number): string {
        if (!rate) return '';
        if (rate < 60) return 'Bradicardia';
        if (rate > 100) return 'Taquicardia';
        if (rate < 70) return 'Ligeramente baja';
        if (rate > 90) return 'Ligeramente alta';
        return 'Normal';
    }

    getRespRateIndicatorClass(rate: number): string {
        if (!rate) return '';
        if (rate < 12 || rate > 30) return 'danger';
        if (rate < 15 || rate > 25) return 'warning';
        return 'normal';
    }

    getRespRateIndicatorText(rate: number): string {
        if (!rate) return '';
        if (rate < 12) return 'Bradipnea';
        if (rate > 30) return 'Taquipnea';
        if (rate < 15) return 'Ligeramente baja';
        if (rate > 25) return 'Ligeramente alta';
        return 'Normal';
    }

    // Métodos auxiliares para la vista
    getPhaseTitle(): string {
        return this.phase === 'recepcion'
            ? 'Inspección de Recepción'
            : 'Examen Ante Mortem';
    }

    hasReceptionData(): boolean {
        return this.receptionData && Object.keys(this.receptionData).length > 0;
    }

    formatDateTime(date: any): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString('es-ES');
    }

    formatValue(value: any, unit: string = ''): string {
        if (value === null || value === undefined) return 'N/A';
        return `${value}${unit}`;
    }

    getBooleanText(value: boolean | null): string {
        if (value === null || value === undefined) return 'N/A';
        return value ? 'Sí' : 'No';
    }

    async getImgae(imageId: string): Promise<string> {
        return await this.inspectionService.getImage(imageId).toPromise();
    }
}
