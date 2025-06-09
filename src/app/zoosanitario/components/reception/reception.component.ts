import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    ReceptionParams,
    SlaughterProcessService,
} from '../../services/slaughter-process.service';
import {
    Introducer,
    IntroducerService,
} from '../../services/introducer.service';
import {
    QrScannerService,
    QRScanResult,
} from '../../services/QrScanner.service';
import {
    ZoosanitaryCertificate,
    ZoosanitaryCertificateService,
} from '../../services/animal-health-certificate.service';

interface AnimalData {
    animalId: string;
    species: 'BOVINE' | 'PORCINE';
    weight?: number;
    condition: string;
    observations?: string;
}

interface CertificateValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

@Component({
    selector: 'app-reception',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './reception.component.html',
    styleUrls: ['./reception.component.scss'],
    providers: [ConfirmationService],
})
export class ReceptionComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    // Estados de carga
    loading = false;
    scanning = false;
    validatingCertificate = false;
    validatingPayments = false;
    submitting = false;
    creatingCertificate = false;

    // Formularios
    receptionForm!: FormGroup;

    // Datos
    introducers: Introducer[] = [];
    selectedIntroducer: Introducer | null = null;
    certificateData: ZoosanitaryCertificate | null = null;

    // Estados del proceso
    currentStep = 1;
    totalSteps = 4;

    // Validaciones
    certificateValidation: CertificateValidationResult | null = null;
    paymentValidation: {
        canProceed: boolean;
        inscriptionStatus: string;
        finesStatus: string;
        pendingAmount: number;
        reason?: string;
    } | null = null;

    // Opciones para dropdowns
    speciesOptions = [
        { label: 'Bovino', value: 'BOVINE' },
        { label: 'Porcino', value: 'PORCINE' },
    ];

    conditionOptions = [
        { label: 'Excelente', value: 'EXCELLENT' },
        { label: 'Bueno', value: 'GOOD' },
        { label: 'Regular', value: 'FAIR' },
        { label: 'Deficiente', value: 'POOR' },
    ];

    receptionMethodOptions = [
        { label: 'Escaneo QR', value: 'QR_SCAN' },
        { label: 'Entrada Manual', value: 'MANUAL_ENTRY' },
    ];

    // Control de pasos
    steps = [
        {
            label: 'Certificado',
            icon: 'pi pi-qrcode',
            description: 'Escanear o ingresar certificado zoosanitario',
        },
        {
            label: 'Introductor',
            icon: 'pi pi-user',
            description: 'Seleccionar y validar introductor',
        },
        {
            label: 'Animales',
            icon: 'pi pi-list',
            description: 'Registrar animales recibidos',
        },
        {
            label: 'Confirmación',
            icon: 'pi pi-check',
            description: 'Revisar y confirmar recepción',
        },
    ];

    constructor(
        private fb: FormBuilder,
        private slaughterService: SlaughterProcessService,
        private introducerService: IntroducerService,
        private certificateService: ZoosanitaryCertificateService,
        private qrService: QrScannerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private router: Router
    ) {
        this.initializeForm();
    }

    ngOnInit(): void {
        this.loadIntroducers();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Inicializar formulario
     */
    private initializeForm(): void {
        this.receptionForm = this.fb.group({
            // Método de recepción
            receptionMethod: ['QR_SCAN', Validators.required],

            // Datos del certificado zoosanitario
            czpmNumber: [''],
            authorizedTo: ['', Validators.required],
            originAreaCode: ['', Validators.required],
            destinationAreaCode: ['', Validators.required],
            vehiclePlate: ['', Validators.required],
            totalProducts: [1, [Validators.required, Validators.min(1)]],
            validTo: ['', Validators.required],
            certificateNumber: [''],

            // Datos del introductor
            introducerId: ['', Validators.required],

            // Datos de recepción
            receptionDate: [new Date(), Validators.required],
            receptionNotes: [''],

            // Animales
            animals: this.fb.array([]),
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
        const certificateFields = [
            'czpmNumber',
            'authorizedTo',
            'originAreaCode',
            'destinationAreaCode',
            'vehiclePlate',
            'totalProducts',
            'validTo',
        ];

        if (method === 'MANUAL_ENTRY') {
            // Hacer campos requeridos para entrada manual
            certificateFields.forEach((field) => {
                const control = this.receptionForm.get(field);
                if (field === 'czpmNumber') {
                    control?.setValidators([]);
                } else {
                    control?.setValidators([Validators.required]);
                }
                control?.updateValueAndValidity();
            });
        } else {
            // Quitar validaciones para escáner QR
            certificateFields.forEach((field) => {
                const control = this.receptionForm.get(field);
                control?.setValidators([]);
                control?.updateValueAndValidity();
            });
        }
    }

    /**
     * Getter para el FormArray de animales
     */
    get animalsFormArray(): FormArray {
        return this.receptionForm.get('animals') as FormArray;
    }

    /**
     * Método auxiliar para obtener un FormGroup desde el FormArray
     */
    getAnimalFormGroup(index: number): FormGroup {
        return this.animalsFormArray.at(index) as FormGroup;
    }

    /**
     * Cargar lista de introductores
     */
    private loadIntroducers(): void {
        this.loading = true;
        this.introducerService
            .getAllIntroducers()
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (introducers: any) => {
                    this.introducers = introducers.data.filter(
                        (i) => i.registrationStatus === 'ACTIVE'
                    );
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
     * Escanear código QR
     */
    async scanQRCode(): Promise<void> {
        try {
            this.scanning = true;

            const permissionsGranted =
                await this.qrService.requestPermissions();
            if (!permissionsGranted) {
                throw new Error('Permisos de cámara denegados');
            }

            const result = await this.qrService.scanQR();

            if (result.success && result.data) {
                // Parsear datos del QR y llenar el formulario
                this.parseQRData(result.data);

                this.messageService.add({
                    severity: 'success',
                    summary: 'QR Escaneado',
                    detail: 'Certificado leído correctamente',
                });

                // Validar certificado
                await this.validateCertificate();
            } else {
                throw new Error(
                    result.error || 'Error desconocido al escanear QR'
                );
            }
        } catch (error: any) {
            console.error('Error en escaneo QR:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error de Escaneo',
                detail: error.message || 'No se pudo escanear el código QR',
            });
        } finally {
            this.scanning = false;
        }
    }

    /**
     * Parsear datos del QR
     */
    private parseQRData(qrData: any): void {
        // Asumir que el QR contiene la información en formato JSON o texto estructurado
        try {
            let parsedData;
            if (typeof qrData === 'string') {
                // Si es string, intentar parsearlo como JSON o extraer campos
                parsedData = this.extractDataFromQRString(qrData);
            } else {
                parsedData = qrData;
            }

            this.receptionForm.patchValue({
                czpmNumber: parsedData.czpmNumber || '',
                authorizedTo: parsedData.authorizedTo || '',
                originAreaCode: parsedData.originAreaCode || '',
                destinationAreaCode: parsedData.destinationAreaCode || '',
                vehiclePlate: parsedData.vehiclePlate || '',
                totalProducts: parsedData.totalProducts || 1,
                validTo: parsedData.validTo || '',
                certificateNumber: parsedData.certificateNumber || '',
            });
        } catch (error) {
            console.error('Error parseando QR:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo interpretar la información del QR',
            });
        }
    }

    /**
     * Extraer datos del string QR
     */
    private extractDataFromQRString(qrString: string): any {
        const data: any = {};
        const lines = qrString.split('\n');

        lines.forEach((line) => {
            if (line.includes('CZPM No:')) {
                data.czpmNumber = line.split(':')[1]?.trim();
            } else if (line.includes('AUTORIZADO A:')) {
                data.authorizedTo = line.split(':')[1]?.trim();
            } else if (line.includes('CODIGÓ ÁREA ORIGEN:')) {
                data.originAreaCode = line.split(':')[1]?.trim();
            } else if (line.includes('CODIGÓ ÁREA DESTINO:')) {
                data.destinationAreaCode = line.split(':')[1]?.trim();
            } else if (line.includes('TOTAL PRODUCTOS:')) {
                data.totalProducts = parseInt(line.split(':')[1]?.trim()) || 1;
            } else if (line.includes('VALIDO HASTA:')) {
                data.validTo = line.split(':')[1]?.trim();
            } else if (line.includes('VEHICULO:')) {
                data.vehiclePlate = line.split(':')[1]?.trim();
            }
        });

        return data;
    }

    /**
     * Crear certificado zoosanitario
     */
    async createCertificate(): Promise<void> {
        const formValue = this.receptionForm.value;

        this.creatingCertificate = true;

        const certificateData: Partial<ZoosanitaryCertificate> = {
            czpmNumber: formValue.czpmNumber,
            authorizedTo: formValue.authorizedTo,
            originAreaCode: formValue.originAreaCode,
            destinationAreaCode: formValue.destinationAreaCode,
            vehiclePlate: formValue.vehiclePlate,
            totalProducts: formValue.totalProducts,
            validTo: new Date(formValue.validTo),
            certificateNumber:
                formValue.certificateNumber || this.generateCertificateNumber(),
            introducerId: formValue.introducerId,
        };

        this.certificateService
            .createCertificate(certificateData)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.creatingCertificate = false))
            )
            .subscribe({
                next: (certificate) => {
                    this.certificateData = certificate;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Certificado Creado',
                        detail: `Certificado ${certificate.certificateNumber} creado exitosamente`,
                    });

                    // Actualizar el número de certificado en el formulario
                    this.receptionForm.patchValue({
                        certificateNumber: certificate.certificateNumber,
                    });

                    // Validar certificado recién creado
                    this.validateCertificate();
                },
                error: (error) => {
                    console.error('Error creando certificado:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo crear el certificado zoosanitario',
                    });
                },
            });
    }

    /**
     * Generar número de certificado automático
     */
    private generateCertificateNumber(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, '0');
        return `ZOO-${year}${month}-${random}`;
    }

    /**
     * Validar certificado zoosanitario
     */
    async validateCertificate(): Promise<void> {
        const formValue = this.receptionForm.value;

        this.validatingCertificate = true;

        try {
            const errors: string[] = [];
            const warnings: string[] = [];

            // Validar fecha de expiración
            if (formValue.validTo) {
                const expiration = new Date(formValue.validTo);
                const today = new Date();

                if (expiration < today) {
                    errors.push('El certificado zoosanitario ha expirado');
                } else if (this.daysBetween(today, expiration) < 3) {
                    warnings.push('El certificado expira en menos de 3 días');
                }
            }

            // Validar campos requeridos
            if (!formValue.authorizedTo) {
                errors.push('Campo "Autorizado a" es requerido');
            }
            if (!formValue.originAreaCode) {
                errors.push('Código de área origen es requerido');
            }
            if (!formValue.destinationAreaCode) {
                errors.push('Código de área destino es requerido');
            }
            if (!formValue.vehiclePlate) {
                errors.push('Placa del vehículo es requerida');
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
        } finally {
            this.validatingCertificate = false;
        }
    }

    /**
     * Manejar cambio en el método de recepción
     */
    onReceptionMethodChange(): void {
        const method = this.receptionForm.get('receptionMethod')?.value;

        // Limpiar datos del certificado
        this.certificateData = null;
        this.certificateValidation = null;

        // Limpiar formulario de certificado
        this.receptionForm.patchValue({
            czpmNumber: '',
            authorizedTo: '',
            originAreaCode: '',
            destinationAreaCode: '',
            vehiclePlate: '',
            totalProducts: 1,
            validTo: '',
            certificateNumber: '',
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

        // Validar campos requeridos para entrada manual
        const requiredFields = [
            'authorizedTo',
            'originAreaCode',
            'destinationAreaCode',
            'vehiclePlate',
            'validTo',
        ];
        const missingFields = requiredFields.filter(
            (field) => !this.receptionForm.get(field)?.value
        );

        if (missingFields.length > 0) {
            this.messageService.add({
                severity: 'error',
                summary: 'Campos Requeridos',
                detail: 'Complete todos los campos obligatorios del certificado',
            });
            return;
        }

        // Validar certificado
        this.validateCertificate();
    }

    private daysBetween(date1: Date, date2: Date): number {
        const diff = date2.getTime() - date1.getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    }

    /**
     * Manejar selección de introductor
     */
    onIntroducerSelect(): void {
        const introducerId = this.receptionForm.get('introducerId')?.value;
        this.selectedIntroducer =
            this.introducers.find((i) => i._id === introducerId) || null;

        if (this.selectedIntroducer) {
            this.validatePayments();
        }
    }

    /**
     * Validar estado de pagos del introductor
     */
    private validatePayments(): void {
        if (!this.selectedIntroducer) return;

        this.validatingPayments = true;

        this.introducerService
            .validateSlaughter(this.selectedIntroducer._id!)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.validatingPayments = false))
            )
            .subscribe({
                next: (validation) => {
                    this.paymentValidation = {
                        canProceed: validation.canSlaughter,
                        inscriptionStatus: validation.canSlaughter
                            ? 'PAID'
                            : 'PENDING',
                        finesStatus:
                            validation.pendingAmount &&
                            validation.pendingAmount > 0
                                ? 'PENDING'
                                : 'NONE',
                        pendingAmount: validation.pendingAmount || 0,
                        reason: validation.reason,
                    };

                    if (!validation.canSlaughter) {
                        this.messageService.add({
                            severity: 'warn',
                            summary: 'Pagos Pendientes',
                            detail:
                                validation.reason ||
                                'El introductor tiene pagos pendientes',
                        });
                    }
                },
                error: (error) => {
                    console.error('Error validando pagos:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo validar el estado de pagos',
                    });
                },
            });
    }

    /**
     * Agregar animal al formulario
     */
    addAnimal(): void {
        const animalForm = this.fb.group({
            animalId: ['', Validators.required],
            species: ['', Validators.required],
            weight: [null, [Validators.min(1)]],
            condition: ['GOOD', Validators.required],
            observations: [''],
        });

        this.animalsFormArray.push(animalForm);
    }

    /**
     * Remover animal del formulario
     */
    removeAnimal(index: number): void {
        this.confirmationService.confirm({
            message: '¿Está seguro de que desea eliminar este animal?',
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.animalsFormArray.removeAt(index);
                this.messageService.add({
                    severity: 'info',
                    summary: 'Animal Eliminado',
                    detail: 'El animal ha sido removido de la lista',
                });
            },
        });
    }

    /**
     * Auto-llenar animales desde certificado
     */
    autoFillAnimalsFromCertificate(): void {
        const totalProducts = this.receptionForm.get('totalProducts')?.value;

        if (!totalProducts || totalProducts < 1) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Sin Productos',
                detail: 'No hay productos especificados en el certificado',
            });
            return;
        }

        this.confirmationService.confirm({
            message: `¿Desea auto-llenar ${totalProducts} animales según el certificado?`,
            header: 'Auto-llenar Animales',
            icon: 'pi pi-question-circle',
            accept: () => {
                // Limpiar animales existentes
                while (this.animalsFormArray.length > 0) {
                    this.animalsFormArray.removeAt(0);
                }

                // Agregar animales según certificado
                for (let i = 1; i <= totalProducts; i++) {
                    const animalForm = this.fb.group({
                        animalId: [
                            `ANI-${String(i).padStart(3, '0')}`,
                            Validators.required,
                        ],
                        species: ['BOVINE', Validators.required], // Por defecto bovino
                        weight: [null, [Validators.min(1)]],
                        condition: ['GOOD', Validators.required],
                        observations: [''],
                    });
                    this.animalsFormArray.push(animalForm);
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Animales Auto-llenados',
                    detail: `Se agregaron ${totalProducts} animales`,
                });
            },
        });
    }

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
            case 2: // Introductor
                return this.paymentValidation?.canProceed || false;
            case 3: // Animales
                return (
                    this.animalsFormArray.length > 0 &&
                    this.animalsFormArray.valid
                );
            default:
                return true;
        }
    }

    /**
     * Enviar formulario de recepción
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

        // Crear certificado si es entrada manual y no existe
        if (
            this.receptionForm.get('receptionMethod')?.value ===
                'MANUAL_ENTRY' &&
            !this.certificateData
        ) {
            this.confirmationService.confirm({
                message:
                    '¿Desea crear el certificado zoosanitario con los datos ingresados?',
                header: 'Crear Certificado',
                icon: 'pi pi-question-circle',
                accept: async () => {
                    await this.createCertificate();
                    if (this.certificateData) {
                        this.proceedWithReception();
                    }
                },
            });
        } else {
            this.proceedWithReception();
        }
    }

    /**
     * Proceder con la recepción
     */
    private proceedWithReception(): void {
        this.confirmationService.confirm({
            message:
                '¿Está seguro de que desea iniciar el proceso de recepción?',
            header: 'Confirmar Recepción',
            icon: 'pi pi-question-circle',
            accept: () => {
                this.submitReception();
            },
        });
    }

    /**
     * Enviar datos de recepción
     */
    private submitReception(): void {
        this.submitting = true;

        const formValue = this.receptionForm.value;

        const receptionParams: ReceptionParams = {
            zoosanitaryCertificateId:
                this.certificateData?._id || 'temp-cert-id',
            introducerId: formValue.introducerId,
            receptionMethod: formValue.receptionMethod,
            receivedAnimals: formValue.animals.map((animal: any) => ({
                animalId: animal.animalId,
                species: animal.species,
                weight: animal.weight,
                condition: animal.condition,
                observations: animal.observations,
            })),
            receptionNotes: formValue.receptionNotes,
        };

        this.slaughterService
            .startReception(receptionParams)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.submitting = false))
            )
            .subscribe({
                next: (process) => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Recepción Exitosa',
                        detail: `Proceso ${process.processNumber} iniciado correctamente`,
                    });

                    this.router.navigate([
                        '/faenamiento/procesos',
                        process._id,
                    ]);
                },
                error: (error) => {
                    console.error('Error en recepción:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error en Recepción',
                        detail:
                            error.message ||
                            'No se pudo completar la recepción',
                    });
                },
            });
    }

    /**
     * Marcar todos los campos como tocados
     */
    private markFormGroupTouched(): void {
        Object.keys(this.receptionForm.controls).forEach((key) => {
            const control = this.receptionForm.get(key);
            control?.markAsTouched();
        });

        this.animalsFormArray.controls.forEach((control) => {
            Object.keys((control as FormGroup).controls).forEach((key) => {
                control.get(key)?.markAsTouched();
            });
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

    /**
     * Obtener nombre del introductor para mostrar
     */
    getIntroducerDisplayName(introducer: Introducer): string {
        if (introducer.type === 'Natural') {
            return introducer.name;
        } else {
            return introducer.companyName || 'Sin nombre';
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

    /**
     * Contar animales por especie
     */
    getAnimalCountBySpecies(species: string): number {
        return this.animalsFormArray.value.filter(
            (animal: any) => animal.species === species
        ).length;
    }
}
