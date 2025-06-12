// src/app/components/external-inspection-form/external-inspection-form.component.ts
import {
    Component,
    OnInit,
    OnDestroy,
    Input,
    Output,
    EventEmitter,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    ExternalInspection,
    ExternalInspectionService,
} from 'src/app/zoosanitario/services/external-inspection.service';
import { AnimalTypeService } from 'src/app/zoosanitario/services/animal-type.service';

@Component({
    selector: 'app-external-inspection-form',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './external-inspection-form.component.html',
    styleUrls: ['./external-inspection-form.component.scss'],
})
export class ExternalInspectionFormComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    // Inputs y Outputs
    @Input() visible = false;
    @Input() inspectionId: string | null = null;
    @Input() receptionId?: string;
    @Input() processId?: string;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() inspectionSaved = new EventEmitter<ExternalInspection>();
    @Output() dialogClosed = new EventEmitter<void>();

    // Estados
    loading = false;
    submitting = false;
    submitted = false;

    // Formulario
    inspectionForm!: FormGroup;

    // Fotografías
    existingPhotos: string[] = [];
    newPhotos: File[] = [];
    maxPhotos = 10;
    maxFileSize = 5 * 1024 * 1024; // 5MB

    // Justificación para nuevas inspecciones
    justification = '';

    // Visor de fotografías
    showPhotoViewer = false;
    selectedPhoto = '';

    // Opciones para dropdowns
    speciesOptions: any = [];

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
        private externalInspectionService: ExternalInspectionService,
        private animalType: AnimalTypeService,
        private messageService: MessageService
    ) {
        this.initializeForm();
    }

    ngOnInit(): void {
        console.log(
            'INICIALIZANDO COMPONENTE DE EXTERNAL INSPECTIONS',
            this.inspectionId,
            this.visible
        );
        // Observar cambios en el visible para cargar datos cuando se abre
        if (this.visible && this.inspectionId) {
            this.loadInspection();
            this.loadAnimalTypes();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Título del diálogo
     */
    get dialogTitle(): string {
        if (this.inspectionId) {
            return 'Editar Inspección Externa';
        }
        return 'Nueva Inspección Externa';
    }

    /**
     * Inicializar formulario
     */
    private initializeForm(): void {
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
            estadoGeneral: ['', Validators.maxLength(1000)],
            lesionesVisibles: ['', Validators.maxLength(1000)],
            resultado: ['Pendiente', Validators.required],
            motivoDictamen: ['', Validators.maxLength(2000)],
            //veterinarioResponsable: [''],
        });

        // Agregar validación condicional para motivo del dictamen
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
                        Validators.maxLength(2000),
                    ]);
                } else {
                    motivoControl?.setValidators([Validators.maxLength(2000)]);
                }
                motivoControl?.updateValueAndValidity();
            });
    }

    /**
     * Cargar inspección existente
     */
    private loadInspection(): void {
        if (!this.inspectionId) return;

        this.loading = true;
        this.externalInspectionService
            .getById(this.inspectionId)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (inspection: any) => {
                    console.log('Inspección cargada:', inspection);
                    const inspectionData = inspection.data || inspection;
                    this.fillForm(inspectionData);
                    this.existingPhotos = inspectionData.fotografias || [];
                },
                error: (error) => {
                    console.error('Error cargando inspección:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo cargar la inspección',
                    });
                    this.onCancel();
                },
            });
    }

    loadAnimalTypes(): void {
        this.animalType
            .getAll({
                limit: 100,
                slaughter: true,
                fields: 'species,category',
            })
            .subscribe({
                next: (response: any) => {
                    console.log('Tipos de animales cargados:', response);
                    this.speciesOptions = response.data.animalTypes
                        .filter((a: any) => a.species && a.category)
                        .map((a: any) => ({
                            label: `${a.species} (${a.category})`,
                            value: a.id,
                        }));
                },
                error: (error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cargar tipos de animales',
                    });
                    this.loading = false;
                },
            });
    }

    /**
     * Llenar formulario con datos existentes
     */
    private fillForm(inspection: ExternalInspection): void {
        this.inspectionForm.patchValue({
            numero: inspection.numero,
            especie: inspection.especie || '',
            sexo: inspection.sexo || 'Pendiente',
            edad: inspection.edad || null,
            peso: inspection.peso || null,
            temperatura: inspection.temperatura || null,
            frecuenciaCardiaca: inspection.frecuenciaCardiaca || null,
            frecuenciaRespiratoria: inspection.frecuenciaRespiratoria || null,
            horaChequeo: inspection.horaChequeo
                ? new Date(inspection.horaChequeo)
                : new Date(),
            estadoGeneral: inspection.estadoGeneral || '',
            lesionesVisibles: inspection.lesionesVisibles || '',
            resultado: inspection.resultado || 'Pendiente',
            motivoDictamen: inspection.motivoDictamen || '',
            //veterinarioResponsable: inspection.veterinarioResponsable || '',
        });
    }

    /**
     * Manejar selección de fotografías
     */
    onPhotosSelected(event: any): void {
        const files = Array.from(event.files) as File[];

        // Validar número máximo de archivos
        const totalPhotos =
            this.existingPhotos.length + this.newPhotos.length + files.length;
        if (totalPhotos > this.maxPhotos) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Límite Excedido',
                detail: `Solo se permiten máximo ${this.maxPhotos} fotografías en total`,
            });
            return;
        }

        // Validar tamaño de archivos
        const invalidFiles = files.filter(
            (file) => file.size > this.maxFileSize
        );
        if (invalidFiles.length > 0) {
            this.messageService.add({
                severity: 'error',
                summary: 'Archivo Muy Grande',
                detail: 'Cada fotografía debe ser menor a 5MB',
            });
            return;
        }

        // Validar tipos de archivo
        const validTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
        ];
        const invalidTypes = files.filter(
            (file) => !validTypes.includes(file.type)
        );
        if (invalidTypes.length > 0) {
            this.messageService.add({
                severity: 'error',
                summary: 'Tipo de Archivo Inválido',
                detail: 'Solo se permiten imágenes JPG, PNG o WebP',
            });
            return;
        }

        // Agregar archivos válidos
        this.newPhotos.push(...files);

        this.messageService.add({
            severity: 'success',
            summary: 'Fotografías Agregadas',
            detail: `${files.length} fotografía(s) agregada(s) exitosamente`,
        });
    }

    /**
     * Remover fotografía existente
     */
    removeExistingPhoto(index: number): void {
        this.existingPhotos.splice(index, 1);
        this.messageService.add({
            severity: 'info',
            summary: 'Fotografía Removida',
            detail: 'La fotografía ha sido removida',
        });
    }

    /**
     * Remover fotografía nueva
     */
    removeNewPhoto(index: number): void {
        this.newPhotos.splice(index, 1);
        this.messageService.add({
            severity: 'info',
            summary: 'Fotografía Removida',
            detail: 'La fotografía ha sido removida',
        });
    }

    /**
     * Abrir visor de fotografías
     */
    openPhotoViewer(photo: string): void {
        this.selectedPhoto = photo;
        this.showPhotoViewer = true;
    }

    /**
     * Verificar si se puede enviar el formulario
     */
    canSubmit(): boolean {
        if (this.inspectionForm.invalid || this.submitting) {
            return false;
        }

        // Si es nueva inspección, requiere justificación
        if (
            !this.inspectionId &&
            (!this.justification || this.justification.trim().length === 0)
        ) {
            return false;
        }

        return true;
    }

    /**
     * Enviar formulario
     */
    onSubmit(): void {
        this.submitted = true;

        if (!this.canSubmit()) {
            this.markFormGroupTouched();
            this.messageService.add({
                severity: 'error',
                summary: 'Formulario Inválido',
                detail: 'Por favor complete todos los campos requeridos',
            });
            return;
        }

        this.submitting = true;

        if (this.inspectionId) {
            this.updateInspection();
        } else {
            this.createInspection();
        }
    }

    /**
     * Crear nueva inspección
     */
    private createInspection(): void {
        const inspectionData: Partial<ExternalInspection> = {
            ...this.inspectionForm.value,
            recepcion: this.receptionId,
        };

        this.externalInspectionService
            .createForcedInspection(
                inspectionData,
                this.newPhotos,
                this.justification
            )
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.submitting = false))
            )
            .subscribe({
                next: (inspection: any) => {
                    const savedInspection = inspection.data || inspection;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Inspección creada correctamente',
                    });
                    this.inspectionSaved.emit(savedInspection);
                    this.closeDialog();
                },
                error: (error) => {
                    console.error('Error creando inspección:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail:
                            error.error?.message ||
                            'No se pudo crear la inspección',
                    });
                },
            });
    }

    /**
     * Actualizar inspección existente
     */
    private updateInspection(): void {
        if (!this.inspectionId) return;

        const inspectionData: Partial<ExternalInspection> = {
            ...this.inspectionForm.value,
        };

        this.externalInspectionService
            .updateInspectionWithFiles(
                this.inspectionId,
                inspectionData,
                this.newPhotos
            )
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.submitting = false))
            )
            .subscribe({
                next: (inspection: any) => {
                    const updatedInspection = inspection.data || inspection;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Inspección actualizada correctamente',
                    });
                    this.inspectionSaved.emit(updatedInspection);
                    this.closeDialog();
                },
                error: (error) => {
                    console.error('Error actualizando inspección:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail:
                            error.error?.message ||
                            'No se pudo actualizar la inspección',
                    });
                },
            });
    }

    /**
     * Guardar y continuar (crear otra inspección)
     */
    saveAndContinue(): void {
        this.submitted = true;

        if (!this.canSubmit()) {
            this.markFormGroupTouched();
            this.messageService.add({
                severity: 'error',
                summary: 'Formulario Inválido',
                detail: 'Por favor complete todos los campos requeridos',
            });
            return;
        }

        this.submitting = true;

        const inspectionData: Partial<ExternalInspection> = {
            ...this.inspectionForm.value,
            recepcion: this.receptionId,
        };

        this.externalInspectionService
            .createForcedInspection(
                inspectionData,
                this.newPhotos,
                this.justification
            )
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.submitting = false))
            )
            .subscribe({
                next: (inspection: any) => {
                    const savedInspection = inspection.data || inspection;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Inspección creada correctamente',
                    });
                    this.inspectionSaved.emit(savedInspection);

                    // Resetear formulario para siguiente inspección
                    this.resetForm();
                    this.submitted = false;
                },
                error: (error) => {
                    console.error('Error creando inspección:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail:
                            error.error?.message ||
                            'No se pudo crear la inspección',
                    });
                },
            });
    }

    /**
     * Cancelar y cerrar diálogo
     */
    onCancel(): void {
        this.closeDialog();
    }

    /**
     * Cerrar diálogo
     */
    private closeDialog(): void {
        this.visible = false;
        this.visibleChange.emit(false);
        this.resetForm();
    }

    /**
     * Manejar evento de ocultar diálogo
     */
    onDialogHide(): void {
        this.dialogClosed.emit();
        this.resetForm();
    }

    /**
     * Resetear formulario
     */
    private resetForm(): void {
        this.inspectionForm.reset({
            sexo: 'Pendiente',
            resultado: 'Pendiente',
            horaChequeo: new Date(),
        });
        this.existingPhotos = [];
        this.newPhotos = [];
        this.justification = '';
        this.submitted = false;
    }

    /**
     * Marcar todos los campos como tocados
     */
    private markFormGroupTouched(): void {
        Object.keys(this.inspectionForm.controls).forEach((key) => {
            const control = this.inspectionForm.get(key);
            control?.markAsTouched();
        });
    }

    // === UTILIDADES PARA SIGNOS VITALES ===

    /**
     * Obtener clase CSS para temperatura
     */
    getTemperatureClass(temp: number): string {
        if (!temp) return 'info';
        if (temp >= 38.5 && temp <= 39.5) return 'normal';
        if ((temp >= 37.5 && temp < 38.5) || (temp > 39.5 && temp <= 40.5))
            return 'warning';
        return 'danger';
    }

    /**
     * Obtener estado de temperatura
     */
    getTemperatureStatus(temp: number): string {
        if (!temp) return 'Sin datos';
        if (temp >= 38.5 && temp <= 39.5) return 'Normal';
        if ((temp >= 37.5 && temp < 38.5) || (temp > 39.5 && temp <= 40.5))
            return 'Atención';
        return 'Anormal';
    }

    /**
     * Obtener clase CSS para frecuencia cardíaca
     */
    getHeartRateClass(hr: number): string {
        if (!hr) return 'info';
        if (hr >= 60 && hr <= 80) return 'normal';
        if ((hr >= 50 && hr < 60) || (hr > 80 && hr <= 100)) return 'warning';
        return 'danger';
    }

    /**
     * Obtener estado de frecuencia cardíaca
     */
    getHeartRateStatus(hr: number): string {
        if (!hr) return 'Sin datos';
        if (hr >= 60 && hr <= 80) return 'Normal';
        if ((hr >= 50 && hr < 60) || (hr > 80 && hr <= 100)) return 'Atención';
        return 'Anormal';
    }

    /**
     * Obtener clase CSS para frecuencia respiratoria
     */
    getRespiratoryRateClass(rr: number): string {
        if (!rr) return 'info';
        if (rr >= 12 && rr <= 24) return 'normal';
        if ((rr >= 10 && rr < 12) || (rr > 24 && rr <= 30)) return 'warning';
        return 'danger';
    }

    /**
     * Obtener estado de frecuencia respiratoria
     */
    getRespiratoryRateStatus(rr: number): string {
        if (!rr) return 'Sin datos';
        if (rr >= 12 && rr <= 24) return 'Normal';
        if ((rr >= 10 && rr < 12) || (rr > 24 && rr <= 30)) return 'Atención';
        return 'Anormal';
    }

    // === UTILIDADES PARA OPCIONES ===

    /**
     * Obtener icono para especie
     */
    getSpeciesIcon(species: string): string {
        switch (species) {
            case 'Bovino (Mayor)':
                return 'pi pi-circle';
            case 'Porcino (Menor)':
                return 'pi pi-circle-fill';
            case 'Ovino':
                return 'pi pi-star';
            case 'Caprino':
                return 'pi pi-star-fill';
            case 'Equino':
                return 'pi pi-bookmark';
            case 'Aves (Menor)':
                return 'pi pi-send';
            default:
                return 'pi pi-question-circle';
        }
    }

    /**
     * Obtener icono para resultado
     */
    getResultIcon(result: string): string {
        switch (result) {
            case 'Apto':
                return 'pi pi-check-circle';
            case 'Devolución':
                return 'pi pi-times-circle';
            case 'Cuarentena':
                return 'pi pi-exclamation-triangle';
            case 'Comisión':
                return 'pi pi-send';
            case 'Pendiente':
            default:
                return 'pi pi-clock';
        }
    }

    /**
     * Obtener color para resultado
     */
    getResultColor(result: string): string {
        switch (result) {
            case 'Apto':
                return 'var(--green-500)';
            case 'Devolución':
                return 'var(--red-500)';
            case 'Cuarentena':
                return 'var(--orange-500)';
            case 'Comisión':
                return 'var(--blue-500)';
            case 'Pendiente':
            default:
                return 'var(--yellow-500)';
        }
    }

    /**
     * Formatear tamaño de archivo
     */
    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
