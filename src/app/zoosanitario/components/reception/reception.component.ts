// src/app/components/reception/reception.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';

// Nuevos imports del sistema QR refactorizado

// Servicios existentes
import { ReceptionService } from '../../services/reception.service';
import { IntroducerService } from '../../services/introducer.service';
import { QrScannerModalComponent } from '../../utils/QR/components/qr-scanner-modal.component';
import {
    AnimalHealthCertificate,
    QRScanOptions,
} from '../../utils/QR/types/qr.types';
import { QrScannerService } from '../../utils/QR/QrScanner.service';

interface TransportData {
    temperatura: number;
    humedadAmbiental: number;
    condicionesHigienicas: 'Óptimas' | 'Aceptables' | 'Deficientes';
    condicionAnimales: string;
    observaciones?: string;
    fotografias?: File[];
    inspeccionadoPor: string;
    fechaInspeccion: Date;
}

interface CertificateValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

@Component({
    selector: 'app-reception',
    standalone: true,
    imports: [ImportsModule, QrScannerModalComponent],
    templateUrl: './reception.component.html',
    styleUrls: ['./reception.component.scss'],
    providers: [ConfirmationService],
})
export class ReceptionComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    // Estados de carga
    loading = false;
    submitting = false;
    uploadingFiles = false;

    // Formularios
    receptionForm!: FormGroup;

    // Datos del certificado (usando nueva interfaz)
    certificateData: AnimalHealthCertificate | null = null;
    certificateValidation: CertificateValidationResult | null = null;

    // Estados del proceso
    currentStep = 1;
    totalSteps = 3;

    // Variables para el QR Scanner Modal
    showQRScannerModal = false;
    qrScanOptions: QRScanOptions = {
        timeout: 60000, // 1 minuto
        showInstructions: true,
        allowManualInput: true,
    };

    // Archivos de fotografías
    selectedPhotos: File[] = [];
    maxPhotos = 10;
    maxFileSize = 5 * 1024 * 1024; // 5MB

    // Opciones para dropdowns
    receptionMethodOptions = [
        { label: 'Escaneo QR', value: 'QR_SCAN' },
        { label: 'Entrada Manual', value: 'MANUAL_ENTRY' },
    ];

    hygienicConditionOptions = [
        { label: 'Óptimas', value: 'Óptimas' },
        { label: 'Aceptables', value: 'Aceptables' },
        { label: 'Deficientes', value: 'Deficientes' },
    ];

    // Control de pasos
    steps = [
        {
            label: 'Certificado',
            icon: 'pi pi-qrcode',
            description: 'Escanear o ingresar certificado zoosanitario',
        },
        {
            label: 'Transporte',
            icon: 'pi pi-truck',
            description: 'Registrar condiciones de transporte',
        },
        {
            label: 'Confirmación',
            icon: 'pi pi-check',
            description: 'Confirmar y crear recepción',
        },
    ];

    // Datos de introductores
    intruders: any[] = [];

    constructor(
        private fb: FormBuilder,
        private receptionService: ReceptionService,
        private qrScannerService: QrScannerService, // Nuevo servicio refactorizado
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private router: Router,
        private introducerService: IntroducerService
    ) {
        this.initializeForm();
    }

    getPlatform(): string {
        return this.qrScannerService.getPlatform();
    }

    getAvailableMethods(): string[] {
        return this.qrScannerService.getAvailableMethods();
    }

    getMethodLabel(method: string): string {
        return this.qrScannerService.getMethodLabel(method);
    }

    getReceptionMethodLabel(): string {
        return this.receptionForm.get('receptionMethod')?.value;
    }

    ngOnInit(): void {
        this.loadIntroducer();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Cargar introductores
     */
    async loadIntroducer(): Promise<void> {
        this.loading = true;
        this.introducerService
            .getAll() //{ registrationStatus: 'ACTIVE' }
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (introducers: any) => {
                    console.log(introducers);
                    this.intruders = introducers.data.introducers;
                },
                error: (error) => {
                    console.error('Error cargando introductores:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudieron cargar los introductores',
                    });
                },
            });
    }

    /**
     * Inicializar formulario completo
     */
    private initializeForm(): void {
        this.receptionForm = this.fb.group({
            // === MÉTODO DE RECEPCIÓN ===
            receptionMethod: ['QR_SCAN', Validators.required],

            // === DATOS DEL CERTIFICADO ZOOSANITARIO ===
            animalHealthCertificate: this.fb.group({
                numeroCZPM: [''],
                autorizadoA: ['', Validators.required],
                codigoAreaOrigen: ['', Validators.required],
                codigoAreaDestino: ['', Validators.required],
                totalProductos: [1, [Validators.required, Validators.min(1)]],
                validoHasta: ['', Validators.required],
                vehiculo: ['', Validators.required],
            }),

            // === DATOS DE TRANSPORTE ===
            transporte: this.fb.group({
                temperatura: [
                    null,
                    [
                        Validators.required,
                        Validators.min(-10),
                        Validators.max(50),
                    ],
                ],
                humedadAmbiental: [
                    null,
                    [
                        Validators.required,
                        Validators.min(0),
                        Validators.max(100),
                    ],
                ],
                condicionesHigienicas: ['', Validators.required],
                condicionAnimales: [
                    '',
                    [Validators.required, Validators.maxLength(500)],
                ],
                observaciones: ['', Validators.maxLength(1000)],
                fechaInspeccion: [new Date(), Validators.required],
            }),

            introducer: [''],

            // === DATOS GENERALES DE RECEPCIÓN ===
            prioridad: [0, [Validators.min(0), Validators.max(10)]],
            fechaProgramada: [''],
            observaciones: ['', Validators.maxLength(1000)],
        });

        // Agregar validaciones condicionales
        this.receptionForm
            .get('receptionMethod')
            ?.valueChanges.subscribe((method) => {
                this.updateValidators(method);
            });
    }

    /**
     * Actualizar validadores según el método de recepción
     */
    private updateValidators(method: string): void {
        const certificateGroup = this.receptionForm.get(
            'animalHealthCertificate'
        ) as FormGroup;
        const certificateFields = [
            'autorizadoA',
            'codigoAreaOrigen',
            'codigoAreaDestino',
            'vehiculo',
            'validoHasta',
        ];

        if (method === 'MANUAL_ENTRY') {
            // Hacer campos requeridos para entrada manual
            certificateFields.forEach((field) => {
                const control = certificateGroup.get(field);
                control?.setValidators([Validators.required]);
                control?.updateValueAndValidity();
            });
        } else {
            // Para QR, solo validar si hay datos
            certificateFields.forEach((field) => {
                const control = certificateGroup.get(field);
                control?.setValidators([]);
                control?.updateValueAndValidity();
            });
        }
    }

    // === MÉTODOS DE ESCANEO QR (REFACTORIZADOS) ===

    /**
     * Abre el modal de escaneo QR
     */
    openQRScanner(): void {
        this.showQRScannerModal = true;
    }

    /**
     * Maneja el resultado del escaneo exitoso
     */
    onCertificateScanned(certificate: AnimalHealthCertificate): void {
        this.certificateData = certificate;
        this.fillCertificateFromData(certificate);
        this.validateCertificate();

        this.messageService.add({
            severity: 'success',
            summary: 'Certificado Escaneado',
            detail: `Certificado ${certificate.numeroCZPM} procesado correctamente`,
        });

        // Cambiar automáticamente al método QR_SCAN
        this.receptionForm.get('receptionMethod')?.setValue('QR_SCAN');
    }

    /**
     * Maneja la cancelación del escaneo
     */
    onQRScanCancelled(): void {
        this.messageService.add({
            severity: 'info',
            summary: 'Escaneo Cancelado',
            detail: 'El escaneo del certificado fue cancelado',
        });
    }

    /**
     * Llena el formulario con datos del certificado
     */
    private fillCertificateFromData(
        certificate: AnimalHealthCertificate
    ): void {
        const certificateGroup = this.receptionForm.get(
            'animalHealthCertificate'
        ) as FormGroup;

        certificateGroup.patchValue({
            numeroCZPM: certificate.numeroCZPM || '',
            autorizadoA: certificate.autorizadoA || '',
            codigoAreaOrigen: certificate.codigoAreaOrigen || '',
            codigoAreaDestino: certificate.codigoAreaDestino || '',
            vehiculo: certificate.vehiculo || '',
            totalProductos: certificate.totalProductos || 1,
            validoHasta: certificate.validoHasta || new Date(),
        });
    }

    // === MÉTODOS EXISTENTES (MANTENIDOS) ===

    /**
     * Manejar cambio en el método de recepción
     */
    onReceptionMethodChange(): void {
        // Limpiar datos del certificado
        this.certificateData = null;
        this.certificateValidation = null;

        // Limpiar formulario de certificado
        const certificateGroup = this.receptionForm.get(
            'animalHealthCertificate'
        ) as FormGroup;
        certificateGroup.reset({
            totalProductos: 1,
        });
    }

    /**
     * Procesar entrada manual del certificado
     */
    processManualEntry(): void {
        if (
            this.receptionForm.get('receptionMethod')?.value !== 'MANUAL_ENTRY'
        ) {
            return;
        }

        const certificateData = this.receptionForm.get(
            'animalHealthCertificate'
        )?.value;

        // Validar campos requeridos para entrada manual
        const requiredFields = [
            'autorizadoA',
            'codigoAreaOrigen',
            'codigoAreaDestino',
            'vehiculo',
            'validoHasta',
        ];

        const missingFields = requiredFields.filter(
            (field) => !certificateData[field]
        );

        if (missingFields.length > 0) {
            this.messageService.add({
                severity: 'error',
                summary: 'Campos Requeridos',
                detail: 'Complete todos los campos obligatorios del certificado',
            });
            return;
        }

        // Crear certificado desde entrada manual
        const manualCertificate: AnimalHealthCertificate = {
            numeroCZPM: certificateData.numeroCZPM || `MANUAL-${Date.now()}`,
            autorizadoA: certificateData.autorizadoA,
            codigoAreaOrigen: certificateData.codigoAreaOrigen,
            codigoAreaDestino: certificateData.codigoAreaDestino,
            totalProductos: certificateData.totalProductos,
            validoHasta: certificateData.validoHasta,
            vehiculo: certificateData.vehiculo,
        };

        this.certificateData = manualCertificate;
        this.validateCertificate();
    }

    /**
     * Validar certificado zoosanitario
     */
    async validateCertificate(): Promise<void> {
        if (!this.certificateData) {
            return;
        }

        try {
            const errors: string[] = [];
            const warnings: string[] = [];

            // Validar fecha de expiración
            if (this.certificateData.validoHasta) {
                const expiration = new Date(this.certificateData.validoHasta);
                const today = new Date();

                // Ignorar la hora para ambas fechas
                expiration.setHours(0, 0, 0, 0);
                today.setHours(0, 0, 0, 0);

                const diffDays = this.daysBetween(today, expiration);

                if (diffDays < 0) {
                    errors.push('El certificado zoosanitario ha expirado');
                } else if (diffDays < 3) {
                    warnings.push('El certificado expira en menos de 3 días');
                }
            }

            // Validar campos requeridos
            if (!this.certificateData.autorizadoA) {
                errors.push('Campo "Autorizado a" es requerido');
            }
            if (!this.certificateData.codigoAreaOrigen) {
                errors.push('Código de área origen es requerido');
            }
            if (!this.certificateData.codigoAreaDestino) {
                errors.push('Código de área destino es requerido');
            }
            if (!this.certificateData.vehiculo) {
                errors.push('Vehículo es requerido');
            }

            this.certificateValidation = {
                isValid: errors.length === 0,
                errors,
                warnings,
            };
        } catch (error) {
            this.certificateValidation = {
                isValid: false,
                errors: ['Error validando certificado'],
                warnings: [],
            };
        }
    }

    // === MÉTODOS DE NAVEGACIÓN Y VALIDACIÓN ===

    /**
     * Navegar entre pasos
     */
    nextStep(): void {
        if (this.currentStep < this.totalSteps && this.canProceedToNextStep()) {
            this.currentStep++;
        }
    }

    previousStep(): void {
        if (this.currentStep > 1) {
            this.currentStep--;
        }
    }

    goToStep(step: number): void {
        if (step >= 1 && step <= this.totalSteps) {
            this.currentStep = step;
        }
    }

    /**
     * Verificar si se puede proceder al siguiente paso
     */
    canProceedToNextStep(): boolean {
        switch (this.currentStep) {
            case 1: // Certificado
                return this.certificateValidation?.isValid || false;
            case 2: // Transporte
                return this.receptionForm.get('transporte')?.valid || false;
            default:
                return true;
        }
    }

    /**
     * Obtener clase CSS para el paso actual
     */
    getStepClass(stepIndex: number): string {
        if (stepIndex + 1 < this.currentStep) {
            return 'completed';
        } else if (stepIndex + 1 === this.currentStep) {
            return 'active';
        } else {
            return 'pending';
        }
    }

    // === MÉTODOS DE ARCHIVOS ===

    /**
     * Manejar selección de fotografías
     */
    onPhotosSelected(event: any): void {
        const files = Array.from(event.files) as File[];

        // Validar número máximo de archivos
        if (this.selectedPhotos.length + files.length > this.maxPhotos) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Límite Excedido',
                detail: `Solo se permiten máximo ${this.maxPhotos} fotografías`,
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
        this.selectedPhotos.push(...files);

        this.messageService.add({
            severity: 'success',
            summary: 'Fotografías Agregadas',
            detail: `${files.length} fotografía(s) agregada(s) exitosamente`,
        });
    }

    /**
     * Remover fotografía
     */
    removePhoto(index: number): void {
        this.selectedPhotos.splice(index, 1);
        this.messageService.add({
            severity: 'info',
            summary: 'Fotografía Removida',
            detail: 'La fotografía ha sido removida',
        });
    }

    // === ENVÍO DEL FORMULARIO ===

    /**
     * Enviar formulario de recepción completo
     */
    onSubmit(): void {
        if (this.receptionForm.invalid) {
            this.markFormGroupTouched();
            this.messageService.add({
                severity: 'error',
                summary: 'Formulario Inválido',
                detail: 'Por favor complete todos los campos requeridos',
            });
            return;
        }

        this.confirmationService.confirm({
            message:
                '¿Está seguro de que desea crear la recepción? Esto iniciará automáticamente el proceso de faenamiento.',
            header: 'Confirmar Recepción',
            icon: 'pi pi-question-circle',
            accept: () => {
                this.submitReception();
            },
        });
    }

    /**
     * Enviar datos de recepción al backend
     */
    private submitReception(): void {
        this.submitting = true;

        const formValue = this.receptionForm.value;

        // Preparar datos para el backend (usando certificateData si está disponible)
        const receptionData = {
            animalHealthCertificate:
                this.certificateData || formValue.animalHealthCertificate,
            transporte: {
                ...formValue.transporte,
                fotografias: [], // Las fotos se envían por separado
                inspeccionadoPor: '', // Se asignará en el backend
            },
            introducer: formValue.introducer,
            prioridad: formValue.prioridad || 0,
            fechaProgramada: formValue.fechaProgramada,
            observaciones: formValue.observaciones,
            fechaHoraRecepcion: new Date(),
        };

        this.receptionService
            .createWithFiles(receptionData, this.selectedPhotos)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.submitting = false))
            )
            .subscribe({
                next: (reception: any) => {
                    console.log('Recepción:', reception);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Recepción Creada',
                        detail: 'La recepción se ha registrado exitosamente y se han creado las inspecciones correspondientes',
                    });

                    // Navegar al dashboard o a la vista de la recepción
                    this.router.navigate([
                        '/zoosanitario/workflow/external-inspection/',
                        reception.data.slaughterProcess.numeroOrden,
                    ]);
                },
                error: (error) => {
                    console.error('Error en recepción:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error en Recepción',
                        detail:
                            error.error?.message ||
                            'No se pudo completar la recepción',
                    });
                },
            });
    }

    /**
     * Cancelar proceso
     */
    cancelReception(): void {
        this.confirmationService.confirm({
            message:
                '¿Está seguro de que desea cancelar la recepción? Se perderán todos los datos ingresados.',
            header: 'Cancelar Recepción',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.router.navigate(['/faenamiento/dashboard']);
            },
        });
    }

    // === UTILIDADES ===

    /**
     * Marcar todos los campos como tocados
     */
    private markFormGroupTouched(): void {
        Object.keys(this.receptionForm.controls).forEach((key) => {
            const control = this.receptionForm.get(key);
            if (control instanceof FormGroup) {
                Object.keys(control.controls).forEach((subKey) => {
                    control.get(subKey)?.markAsTouched();
                });
            } else {
                control?.markAsTouched();
            }
        });
    }

    /**
     * Calcular días entre fechas
     */
    daysBetween(date1: Date, date2: Date): number {
        const oneDay = 1000 * 60 * 60 * 24;
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        d1.setHours(0, 0, 0, 0);
        d2.setHours(0, 0, 0, 0);
        return Math.floor((d2.getTime() - d1.getTime()) / oneDay);
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
