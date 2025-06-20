import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import { AnimalTypeService } from 'src/app/zoosanitario/services/animal-type.service';
import { ExternalInspectionService } from 'src/app/zoosanitario/services/external-inspection.service';
import { FileSizePipe } from 'src/app/zoosanitario/utils/pipes/filesize.pipe';

interface PhotoFile {
    file: File;
    name: string;
    size: number;
    preview?: string;
}

@Component({
    selector: 'app-external-inspection-form',
    standalone: true,
    imports: [ImportsModule, FileSizePipe],
    templateUrl: './external-inspection-form.component.html',
    styleUrls: ['./external-inspection-form.component.scss'],
})
export class ExternalInspectionFormComponent implements OnInit {
    @Input() visible = false;
    @Input() inspectionId: string | null = null;
    @Input() receptionId?: string;
    @Input() processId?: string;
    @Input() phase: 'recepcion' | 'anteMortem' = null;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() inspectionSaved = new EventEmitter<any>();
    @Output() dialogClosed = new EventEmitter<void>();

    inspectionForm!: FormGroup;
    loading = false;
    submitting = false;

    openPhotoViewer(_t370: string) {
        throw new Error('Method not implemented.');
    }

    // Datos de referencia para ante mortem
    receptionData: any = null;
    currentInspection: any = null;

    // Gestión de archivos
    selectedFiles: PhotoFile[] = [];
    existingPhotos: string[] = [];
    maxFileSize = 5 * 1024 * 1024; // 5MB
    maxFiles = 10;

    showPhotoViewer = false;
    selectedPhoto: string | null = null;

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
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.initializeForm();
        this.loadAnimalTypes();

        if (this.inspectionId) {
            this.loadInspection();
        }
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
                    caracteristicas:
                        inspection.inspeccionRecepcion.caracteristicas || {},
                });
            }
        } else {
            // Para ante mortem, solo llenar los datos específicos de ante mortem
            if (inspection.examenAnteMortem) {
                this.inspectionForm.patchValue({
                    ...inspection.examenAnteMortem,
                });
            }
        }
    }

    extractExistingPhotos(inspection: any): void {
        this.existingPhotos = [];

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
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Inspección actualizada correctamente',
                    });
                    this.inspectionSaved.emit(response);
                    this.closeDialog();
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
        this.selectedFiles = [];
        this.existingPhotos = [];
        this.receptionData = null;
        this.currentInspection = null;
        this.submitting = false;
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
}
