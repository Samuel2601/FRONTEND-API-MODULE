import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import { AnimalTypeService } from 'src/app/zoosanitario/services/animal-type.service';
import { ExternalInspectionService } from 'src/app/zoosanitario/services/external-inspection.service';
import { FileSizePipe } from 'src/app/zoosanitario/utils/pipes/filesize.pipe';

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
    @Input() phase: 'recepcion' | 'anteMortem' = 'recepcion';
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() inspectionSaved = new EventEmitter<any>();
    @Output() dialogClosed = new EventEmitter<void>();

    inspectionForm!: FormGroup;
    loading = false;
    submitting = false;

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
        if (this.inspectionId) {
            this.loadInspection();
        }
        this.loadAnimalTypes();
    }

    loadAnimalTypes(): void {
        this.animalTypeService
            .getAll({ limit: 100, fields: 'species,category', slaughter: true })
            .subscribe({
                next: (response: any) => {
                    console.log(response);
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
                    this.loading = false;
                },
            });
    }

    initializeForm(): void {
        if (this.phase === 'recepcion') {
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
                }),
                resultado: ['Pendiente', Validators.required],
                motivoDictamen: ['', Validators.maxLength(1000)],
                veterinarioResponsable: [''],
            });
        } else {
            // Formulario para Ante Mortem
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

    loadInspection(): void {
        if (!this.inspectionId) return;

        this.loading = true;
        this.inspectionService.getById(this.inspectionId, false).subscribe({
            next: (inspection: any) => {
                console.log('Inspection:', inspection);
                this.fillForm(inspection.data);
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
            this.inspectionForm.patchValue({
                numero: inspection.numero,
                especie: inspection.especie,
                sexo: inspection.sexo,
                edad: inspection.edad,
                peso: inspection.peso,
                ...inspection.inspeccionRecepcion,
            });
        } else {
            this.inspectionForm.patchValue({
                ...inspection.examenAnteMortem,
            });
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
        const formData = this.inspectionForm.value;

        if (this.inspectionId) {
            this.updateInspection(formData);
        } else {
            this.createInspection(formData);
        }
    }

    createInspection(formData: any): void {
        const inspectionData = {
            ...formData,
            recepcion: this.receptionId,
            processId: this.processId,
        };

        this.inspectionService
            .createForcedInspection(
                inspectionData,
                [], // files
                'Justificación', // justification
                this.phase
            )
            .subscribe({
                next: (inspection) => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Inspección actualizada correctamente',
                    });
                    this.inspectionSaved.emit(inspection);
                    this.closeDialog();
                },
                error: (error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al actualizar inspección',
                    });
                    this.submitting = false;
                },
            });
    }

    updateInspection(formData: any): void {
        if (!this.inspectionId) return;
        if (this.phase === 'recepcion') {
            formData.inspeccionRecepcion = {
                temperatura: formData.temperatura,
                frecuenciaCardiaca: formData.frecuenciaCardiaca,
                frecuenciaRespiratoria: formData.frecuenciaRespiratoria,
                horaChequeo: formData.horaChequeo,
                estadoGeneral: formData.estadoGeneral,
                lesionesVisibles: formData.lesionesVisibles,
                caracteristicasAnimal: formData.caracteristicasAnimal,
                resultado: formData.resultado,
                motivoDictamen: formData.motivoDictamen,
            };
        } else {
            formData.examenAnteMortem = {
                temperatura: formData.temperatura,
                frecuenciaCardiaca: formData.frecuenciaCardiaca,
                frecuenciaRespiratoria: formData.frecuenciaRespiratoria,
                horaChequeo: formData.horaChequeo,
                estadoGeneralOptimo: formData.estadoGeneralOptimo,
                estadoGeneralPeligro: formData.estadoGeneralPeligro,
                lesiones: formData.lesiones,
                parasito: formData.parasito,
                secreciones: formData.secreciones,
                signos: formData.signos,
                caracteristicasAnimal: formData.caracteristicasAnimal,
                resultado: formData.resultado,
                motivoDictamen: formData.motivoDictamen,
            };
        }
        this.inspectionService
            .updateInspectionWithFiles(
                this.inspectionId,
                formData,
                [], // files
                this.phase
            )
            .subscribe({
                next: (inspection) => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Inspección actualizada correctamente',
                    });
                    this.inspectionSaved.emit(inspection);
                    this.closeDialog();
                },
                error: (error) => {
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
        this.inspectionForm.reset();
    }

    markFormGroupTouched(): void {
        Object.values(this.inspectionForm.controls).forEach((control) => {
            control.markAsTouched();
            if (control instanceof FormGroup) {
                this.markFormGroupTouched();
            }
        });
    }

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
}
