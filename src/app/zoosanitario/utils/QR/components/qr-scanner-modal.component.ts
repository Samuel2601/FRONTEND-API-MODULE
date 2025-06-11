// src/app/shared/components/qr-scanner-modal/qr-scanner-modal.component.ts
import {
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';

import { ImportsModule } from 'src/app/demo/services/import';
import {
    AnimalHealthCertificate,
    QRScanEvent,
    QRScanMethod,
    QRScanOptions,
} from '../types/qr.types';
import { QrScannerService } from '../QrScanner.service';

interface ScanMethodOption {
    label: string;
    value: QRScanMethod;
    icon: string;
    description: string;
    available: boolean;
}

@Component({
    selector: 'app-qr-scanner-modal',
    standalone: true,
    imports: [ImportsModule],
    template: `
        <p-dialog
            [(visible)]="visible"
            [header]="header"
            [modal]="true"
            [closable]="!isScanning"
            [draggable]="false"
            [resizable]="false"
            [style]="{ width: '90vw', 'max-width': '500px' }"
            (onShow)="onShow()"
            (onHide)="onHide()"
        >
            <div class="qr-scanner-content">
                <!-- Selección de Método -->
                <div
                    *ngIf="!isScanning && !showManualInput"
                    class="method-selection"
                >
                    <h5 class="text-center mb-4">
                        Seleccione el método de escaneo
                    </h5>

                    <div class="methods-grid">
                        <div
                            *ngFor="let method of availableMethods"
                            class="method-card"
                            [class.disabled]="!method.available"
                            (click)="selectMethod(method.value)"
                        >
                            <div class="method-icon">
                                <i [class]="method.icon"></i>
                            </div>
                            <h6>{{ method.label }}</h6>
                            <p>{{ method.description }}</p>
                        </div>
                    </div>

                    <div class="text-center mt-4">
                        <p-button
                            label="Entrada Manual"
                            icon="pi pi-pencil"
                            severity="secondary"
                            [outlined]="true"
                            (onClick)="showManualInput = true"
                        >
                        </p-button>
                    </div>
                </div>

                <!-- Estado de Escaneo -->
                <div *ngIf="isScanning" class="scanning-state">
                    <div class="scanning-animation">
                        <i
                            class="pi pi-spin pi-spinner text-primary text-6xl"
                        ></i>
                    </div>
                    <h5 class="text-center">{{ getScanningMessage() }}</h5>
                    <p class="text-center text-600">
                        {{ getScanningDescription() }}
                    </p>

                    <!-- Botón cancelar para ciertos métodos -->
                    <div
                        class="text-center mt-4"
                        *ngIf="canCancelCurrentScan()"
                    >
                        <p-button
                            label="Cancelar"
                            icon="pi pi-times"
                            severity="secondary"
                            (onClick)="cancelScan()"
                        >
                        </p-button>
                    </div>
                </div>

                <!-- Entrada Manual -->
                <div
                    *ngIf="showManualInput && !isScanning"
                    class="manual-input"
                >
                    <h5 class="text-center mb-4">
                        Ingreso Manual del Certificado
                    </h5>

                    <form
                        [formGroup]="manualForm"
                        (ngSubmit)="processManualInput()"
                    >
                        <div class="field">
                            <label for="numeroCZPM">CZPM No *</label>
                            <input
                                type="text"
                                pInputText
                                id="numeroCZPM"
                                formControlName="numeroCZPM"
                                placeholder="Ej: 2023-05-9765837433"
                                class="w-full"
                            />
                            <small
                                class="p-error"
                                *ngIf="
                                    manualForm.get('numeroCZPM')?.invalid &&
                                    manualForm.get('numeroCZPM')?.touched
                                "
                            >
                                CZPM es requerido
                            </small>
                        </div>

                        <div class="field">
                            <label for="autorizadoA">Autorizado A *</label>
                            <input
                                type="text"
                                pInputText
                                id="autorizadoA"
                                formControlName="autorizadoA"
                                placeholder="Ej: 0801921727"
                                class="w-full"
                            />
                            <small
                                class="p-error"
                                *ngIf="
                                    manualForm.get('autorizadoA')?.invalid &&
                                    manualForm.get('autorizadoA')?.touched
                                "
                            >
                                Este campo es requerido
                            </small>
                        </div>

                        <div class="field">
                            <label for="codigoAreaOrigen"
                                >Código Área Origen *</label
                            >
                            <input
                                type="text"
                                pInputText
                                id="codigoAreaOrigen"
                                formControlName="codigoAreaOrigen"
                                placeholder="Ej: 03-0062-00436-00374833"
                                class="w-full"
                            />
                        </div>

                        <div class="field">
                            <label for="codigoAreaDestino"
                                >Código Área Destino *</label
                            >
                            <input
                                type="text"
                                pInputText
                                id="codigoAreaDestino"
                                formControlName="codigoAreaDestino"
                                placeholder="Ej: 03-0062-00438-00160206"
                                class="w-full"
                            />
                        </div>

                        <div class="grid">
                            <div class="col-6">
                                <div class="field">
                                    <label for="totalProductos"
                                        >Total Productos *</label
                                    >
                                    <p-inputNumber
                                        id="totalProductos"
                                        formControlName="totalProductos"
                                        [min]="1"
                                        class="w-full"
                                    >
                                    </p-inputNumber>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="field">
                                    <label for="vehiculo">Vehículo</label>
                                    <input
                                        type="text"
                                        pInputText
                                        id="vehiculo"
                                        formControlName="vehiculo"
                                        placeholder="Ej: JBE0076"
                                        class="w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        <div class="field">
                            <label for="validoHasta">Válido Hasta *</label>
                            <p-calendar
                                id="validoHasta"
                                formControlName="validoHasta"
                                [showTime]="true"
                                [showIcon]="true"
                                dateFormat="dd/mm/yy"
                                placeholder="Seleccione fecha y hora"
                                class="w-full"
                            >
                            </p-calendar>
                        </div>

                        <div class="flex gap-2 justify-content-center mt-4">
                            <p-button
                                label="Volver"
                                icon="pi pi-arrow-left"
                                severity="secondary"
                                [outlined]="true"
                                (onClick)="showManualInput = false"
                            >
                            </p-button>
                            <p-button
                                label="Crear Certificado"
                                icon="pi pi-check"
                                type="submit"
                                [disabled]="manualForm.invalid"
                            >
                            </p-button>
                        </div>
                    </form>
                </div>

                <!-- Resultado de Escaneo -->
                <div *ngIf="scanResult && !isScanning" class="scan-result">
                    <div class="result-header">
                        <i
                            class="pi pi-check-circle text-green-500 text-4xl"
                        ></i>
                        <h5 class="text-green-600">¡Certificado Escaneado!</h5>
                    </div>

                    <div class="certificate-preview">
                        <div class="preview-item">
                            <label>CZPM:</label>
                            <span>{{ scanResult.numeroCZPM }}</span>
                        </div>
                        <div class="preview-item">
                            <label>Autorizado A:</label>
                            <span>{{ scanResult.autorizadoA }}</span>
                        </div>
                        <div class="preview-item">
                            <label>Vehículo:</label>
                            <span>{{ scanResult.vehiculo }}</span>
                        </div>
                        <div class="preview-item">
                            <label>Total Productos:</label>
                            <span>{{ scanResult.totalProductos }}</span>
                        </div>
                    </div>

                    <div class="flex gap-2 justify-content-center mt-4">
                        <p-button
                            label="Escanear Otro"
                            icon="pi pi-refresh"
                            severity="secondary"
                            [outlined]="true"
                            (onClick)="resetScanner()"
                        >
                        </p-button>
                        <p-button
                            label="Usar Certificado"
                            icon="pi pi-check"
                            (onClick)="confirmResult()"
                        >
                        </p-button>
                    </div>
                </div>
            </div>

            <ng-template pTemplate="footer">
                <div class="dialog-footer">
                    <p-button
                        *ngIf="!isScanning"
                        label="Cerrar"
                        icon="pi pi-times"
                        severity="secondary"
                        (onClick)="closeDialog()"
                    >
                    </p-button>
                </div>
            </ng-template>
        </p-dialog>
    `,
    styles: [
        `
            .qr-scanner-content {
                min-height: 300px;
                padding: 1rem;
            }

            .methods-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                gap: 1rem;
                margin-bottom: 1rem;
            }

            .method-card {
                text-align: center;
                padding: 1.5rem 1rem;
                border: 2px solid var(--surface-border);
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                background: var(--surface-card);
            }

            .method-card:hover:not(.disabled) {
                border-color: var(--primary-color);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .method-card.disabled {
                opacity: 0.5;
                cursor: not-allowed;
                background: var(--surface-ground);
            }

            .method-icon {
                font-size: 2.5rem;
                color: var(--primary-color);
                margin-bottom: 0.5rem;
            }

            .method-card h6 {
                margin: 0.5rem 0 0.25rem;
                color: var(--text-color);
            }

            .method-card p {
                margin: 0;
                font-size: 0.85rem;
                color: var(--text-color-secondary);
                line-height: 1.3;
            }

            .scanning-state {
                text-align: center;
                padding: 2rem 1rem;
            }

            .scanning-animation {
                margin-bottom: 1.5rem;
            }

            .manual-input .field {
                margin-bottom: 1rem;
            }

            .manual-input label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 600;
                color: var(--text-color);
            }

            .scan-result {
                text-align: center;
                padding: 1rem;
            }

            .result-header {
                margin-bottom: 1.5rem;
            }

            .result-header h5 {
                margin: 0.5rem 0 0;
            }

            .certificate-preview {
                background: var(--surface-section);
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 1.5rem;
            }

            .preview-item {
                display: flex;
                justify-content: space-between;
                padding: 0.5rem 0;
                border-bottom: 1px solid var(--surface-border);
            }

            .preview-item:last-child {
                border-bottom: none;
            }

            .preview-item label {
                font-weight: 600;
                color: var(--text-color-secondary);
            }

            .preview-item span {
                color: var(--text-color);
                font-weight: 500;
            }

            .dialog-footer {
                display: flex;
                justify-content: flex-end;
            }

            @media (max-width: 768px) {
                .methods-grid {
                    grid-template-columns: 1fr;
                }

                .method-card {
                    padding: 1rem;
                }
            }
        `,
    ],
})
export class QrScannerModalComponent implements OnInit, OnDestroy {
    @Input() visible = false;
    @Input() header = 'Escanear Certificado Zoosanitario';
    @Input() options: QRScanOptions = {};

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() certificateScanned = new EventEmitter<AnimalHealthCertificate>();
    @Output() scanCancelled = new EventEmitter<void>();

    private destroy$ = new Subject<void>();

    // Estados del componente
    isScanning = false;
    showManualInput = false;
    scanResult: AnimalHealthCertificate | null = null;
    currentMethod: QRScanMethod | null = null;

    // Formulario manual
    manualForm!: FormGroup;

    // Métodos disponibles
    availableMethods: ScanMethodOption[] = [];

    constructor(
        private qrService: QrScannerService,
        private messageService: MessageService,
        private fb: FormBuilder
    ) {
        this.initializeManualForm();
    }

    ngOnInit(): void {
        this.loadAvailableMethods();
        this.subscribeToScanEvents();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onShow(): void {
        this.resetScanner();
    }

    onHide(): void {
        if (this.isScanning) {
            this.cancelScan();
        }
        this.visibleChange.emit(false);
    }

    /**
     * Inicializa el formulario manual
     */
    private initializeManualForm(): void {
        this.manualForm = this.fb.group({
            numeroCZPM: ['', Validators.required],
            autorizadoA: ['', Validators.required],
            codigoAreaOrigen: ['', Validators.required],
            codigoAreaDestino: ['', Validators.required],
            totalProductos: [1, [Validators.required, Validators.min(1)]],
            validoHasta: ['', Validators.required],
            vehiculo: [''],
        });
    }

    /**
     * Carga los métodos disponibles según la plataforma
     */
    private loadAvailableMethods(): void {
        const platform = this.qrService.getPlatform();
        const availableMethodValues = this.qrService.getAvailableMethods();

        const allMethods: ScanMethodOption[] = [
            {
                label: 'Cámara',
                value: platform === 'web' ? 'camera-web' : 'camera-capacitor',
                icon: 'pi pi-camera',
                description: 'Escanear con la cámara del dispositivo',
                available: true,
            },
            {
                label: 'Archivo',
                value: 'file-upload',
                icon: 'pi pi-image',
                description: 'Seleccionar imagen con código QR',
                available: true,
            },
            {
                label: 'Portapapeles',
                value:
                    platform === 'web' ? 'clipboard-manual' : 'clipboard-auto',
                icon: 'pi pi-clipboard',
                description:
                    platform === 'web'
                        ? 'Pegar contenido copiado'
                        : 'Detectar contenido automáticamente',
                available: true,
            },
        ];

        this.availableMethods = allMethods.filter((method) =>
            availableMethodValues.includes(method.value)
        );
    }

    /**
     * Suscribe a eventos del scanner
     */
    private subscribeToScanEvents(): void {
        this.qrService.isScanning$
            .pipe(takeUntil(this.destroy$))
            .subscribe((scanning) => {
                this.isScanning = scanning;
            });

        this.qrService.events$
            .pipe(takeUntil(this.destroy$))
            .subscribe((event) => {
                this.handleScanEvent(event);
            });
    }

    /**
     * Maneja eventos del scanner
     */
    private handleScanEvent(event: QRScanEvent): void {
        switch (event.type) {
            case 'scan-success':
                if (event.data?.certificate) {
                    this.scanResult = event.data.certificate;
                }
                break;

            case 'scan-error':
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error de Escaneo',
                    detail: event.error || 'Error desconocido',
                });
                break;

            case 'scan-cancel':
                this.messageService.add({
                    severity: 'info',
                    summary: 'Escaneo Cancelado',
                    detail: 'El escaneo fue cancelado',
                });
                break;
        }
    }

    /**
     * Selecciona y ejecuta un método de escaneo
     */
    async selectMethod(method: QRScanMethod): Promise<void> {
        if (this.isScanning) return;

        this.currentMethod = method;

        try {
            const result = await this.qrService.scanWithMethod(
                method,
                this.options
            );

            if (result.success && result.data) {
                this.scanResult = result.data;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Escaneo Exitoso',
                    detail: `Certificado ${result.data.numeroCZPM} escaneado correctamente`,
                });
            } else if (result.error) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error de Escaneo',
                    detail: result.error,
                });
            }
        } catch (error: any) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: error.message || 'Error inesperado durante el escaneo',
            });
        }
    }

    /**
     * Procesa entrada manual
     */
    processManualInput(): void {
        if (this.manualForm.invalid) {
            this.markFormGroupTouched(this.manualForm);
            return;
        }

        const formValue = this.manualForm.value;
        console.log('Entrada manual:', formValue);
        const result =
            this.qrService.createCertificateFromManualInput(formValue);
        console.log('Resultado:', result);
        if (result.success && result.data) {
            this.scanResult = result.data;
            this.showManualInput = false;
            this.messageService.add({
                severity: 'success',
                summary: 'Certificado Creado',
                detail: 'Certificado creado exitosamente desde entrada manual',
            });
        } else {
            this.messageService.add({
                severity: 'error',
                summary: 'Error en Validación',
                detail:
                    result.error || 'Error validando los datos del certificado',
            });
        }
    }

    /**
     * Confirma el resultado y cierra el modal
     */
    confirmResult(): void {
        if (this.scanResult) {
            this.certificateScanned.emit(this.scanResult);
            this.closeDialog();
        }
    }

    /**
     * Cancela el escaneo actual
     */
    cancelScan(): void {
        this.qrService.cancelScan();
    }

    /**
     * Resetea el scanner
     */
    resetScanner(): void {
        this.scanResult = null;
        this.showManualInput = false;
        this.currentMethod = null;
        this.manualForm.reset({ totalProductos: 1 });
    }

    /**
     * Cierra el diálogo
     */
    closeDialog(): void {
        if (this.isScanning) {
            this.cancelScan();
        }
        this.resetScanner();
        this.visible = false;
        this.visibleChange.emit(false);
    }

    /**
     * Obtiene mensaje de escaneo según el método
     */
    getScanningMessage(): string {
        switch (this.currentMethod) {
            case 'camera-capacitor':
            case 'camera-web':
                return 'Escaneando con cámara...';
            case 'file-upload':
                return 'Procesando archivo...';
            case 'clipboard-auto':
                return 'Esperando contenido del portapapeles...';
            case 'clipboard-manual':
                return 'Procesando contenido del portapapeles...';
            default:
                return 'Escaneando...';
        }
    }

    /**
     * Obtiene descripción de escaneo según el método
     */
    getScanningDescription(): string {
        switch (this.currentMethod) {
            case 'camera-capacitor':
                return 'Apunte la cámara hacia el código QR del certificado';
            case 'camera-web':
                return 'Posicione el código QR dentro del área de escaneo';
            case 'clipboard-auto':
                return 'Escanee el QR con otra app y regrese aquí';
            case 'clipboard-manual':
                return 'Analizando el contenido copiado...';
            default:
                return 'Por favor espere...';
        }
    }

    /**
     * Verifica si se puede cancelar el escaneo actual
     */
    canCancelCurrentScan(): boolean {
        return this.currentMethod === 'clipboard-auto';
    }

    /**
     * Marca todos los campos del formulario como tocados
     */
    private markFormGroupTouched(formGroup: FormGroup): void {
        Object.keys(formGroup.controls).forEach((key) => {
            const control = formGroup.get(key);
            control?.markAsTouched();
        });
    }
}
