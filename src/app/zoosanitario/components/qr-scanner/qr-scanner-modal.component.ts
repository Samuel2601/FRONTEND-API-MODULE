import {
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
    ViewChild,
    ElementRef,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { QrScannerService } from '../../services/QrScanner.service';
import {
    QrDataParserService,
    QRCertificateData,
} from '../../services/QrDataParser.service';

@Component({
    selector: 'app-qr-scanner-modal',
    templateUrl: './qr-scanner-modal.component.html',
    styleUrls: ['./qr-scanner-modal.component.scss'],
})
export class QrScannerModalComponent implements OnInit, OnDestroy {
    @Input() visible = false;
    @Input() header = 'Escanear Código QR';
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() qrScanned = new EventEmitter<string>();
    @Output() scanCancelled = new EventEmitter<void>();
    @Output() certificateData = new EventEmitter<QRCertificateData>();

    @ViewChild('manualInputField') manualInputField?: ElementRef;

    // Estados del componente
    isLoading = false;
    scanResult = '';
    error = '';
    manualMode = false;
    manualInput = '';
    scannerAvailable = true;
    processingResult = false;
    showSuccessAnimation = false;

    constructor(
        private qrService: QrScannerService,
        private qrParser: QrDataParserService,
        private messageService: MessageService
    ) {}

    async ngOnInit() {
        // Verificar disponibilidad del escáner
        this.scannerAvailable = await this.qrService.isScannerAvailable();

        // Si no está disponible en móvil, activar modo manual por defecto
        if (!this.scannerAvailable && this.qrService.isNativePlatform()) {
            this.manualMode = true;
        }
    }

    ngOnDestroy() {
        // Limpiar estado
        this.resetState();
    }

    /**
     * Se ejecuta cuando el modal se muestra
     */
    async onShow() {
        // Resetear estado
        this.resetState();

        // En plataforma nativa, iniciar escaneo automáticamente
        if (
            this.qrService.isNativePlatform() &&
            this.scannerAvailable &&
            !this.manualMode
        ) {
            // Dar un pequeño delay para que la animación del modal se complete
            setTimeout(() => {
                this.startNativeScanning();
            }, 300);
        } else if (!this.scannerAvailable) {
            // Mostrar mensaje informativo
            this.messageService.add({
                severity: 'info',
                summary: 'Información',
                detail: 'El escáner requiere HTTPS en web. Use entrada manual.',
                life: 5000,
            });
            this.manualMode = true;
        }

        // Enfocar el campo de entrada manual si está en modo manual
        if (this.manualMode) {
            setTimeout(() => {
                this.manualInputField?.nativeElement?.focus();
            }, 100);
        }
    }

    /**
     * Se ejecuta cuando el modal se oculta
     */
    onHide() {
        this.resetState();
        this.visibleChange.emit(false);
    }

    /**
     * Inicia el escaneo nativo con ML Kit
     */
    private async startNativeScanning() {
        try {
            this.isLoading = true;
            this.error = '';

            // Verificar permisos
            const hasPermissions = await this.qrService.checkPermissions();
            if (!hasPermissions) {
                const granted = await this.qrService.scanQR();
                if (!granted) {
                    this.error =
                        'Se requieren permisos de cámara para escanear';
                    this.isLoading = false;
                    this.manualMode = true;
                    return;
                }
            }

            // Cerrar modal antes de abrir el escáner nativo
            this.visible = false;
            this.visibleChange.emit(false);

            // Iniciar escaneo
            const result = await this.qrService.scanQR();

            if (result) {
                // Procesar resultado
                this.onScanSuccess(result);
            } else {
                // Usuario canceló
                this.scanCancelled.emit();
            }
        } catch (error: any) {
            console.error('Error en escaneo nativo:', error);

            // Reabrir modal con error
            this.visible = true;
            this.visibleChange.emit(true);
            this.error = 'Error al escanear. Intente con entrada manual.';
            this.manualMode = true;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Procesa el resultado exitoso del escaneo
     */
    private async onScanSuccess(qrText: string) {
        this.scanResult = qrText;
        this.processingResult = true;

        // Verificar si es un certificado zoosanitario válido
        const isValidCertificate = this.qrParser.isValidCertificateQR(qrText);

        if (isValidCertificate) {
            // Parsear datos del certificado
            const certificateData = this.qrParser.parseQRData(qrText);

            if (certificateData) {
                // Mostrar mensaje de éxito
                this.messageService.add({
                    severity: 'success',
                    summary: 'Certificado Escaneado',
                    detail: `Certificado ${certificateData.certificateNumber} detectado exitosamente`,
                    life: 3000,
                });

                // Emitir datos parseados
                this.certificateData.emit(certificateData);

                // Mostrar animación de éxito
                this.showSuccessAnimation = true;

                // Cerrar modal después de un delay
                setTimeout(() => {
                    this.qrScanned.emit(qrText);
                    this.closeModal();
                }, 1500);
            } else {
                // QR válido pero no se pudo parsear
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Advertencia',
                    detail: 'El QR parece ser un certificado pero no se pudo leer correctamente',
                    life: 5000,
                });

                // Permitir reintento o entrada manual
                this.processingResult = false;
                this.error = 'No se pudo leer el contenido del certificado';
            }
        } else {
            // No es un certificado válido
            this.messageService.add({
                severity: 'warn',
                summary: 'QR No Válido',
                detail: 'El código QR escaneado no es un certificado zoosanitario',
                life: 5000,
            });

            // Permitir reintento
            this.processingResult = false;
            this.error =
                'El QR escaneado no es un certificado zoosanitario válido';
        }
    }

    /**
     * Maneja el envío manual del certificado
     */
    onManualSubmit() {
        const value = this.manualInput.trim().toUpperCase();

        if (!value) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Por favor ingrese un número de certificado',
                life: 3000,
            });
            return;
        }

        // Construir un QR sintético con el número ingresado
        const syntheticQR = `CERTIFICADO ZOOSANITARIO
CZPM Nº: ${value}
AUTORIZADO A: MANUAL
VALIDO HASTA: ${new Date().toISOString().split('T')[0]}`;

        this.onScanSuccess(syntheticQR);
    }

    /**
     * Alterna entre modo manual y escáner
     */
    async toggleManualMode() {
        this.manualMode = !this.manualMode;
        this.error = '';

        if (this.manualMode) {
            // Enfocar campo de entrada
            setTimeout(() => {
                this.manualInputField?.nativeElement?.focus();
            }, 100);
        } else if (this.qrService.isNativePlatform() && this.scannerAvailable) {
            // Iniciar escaneo nativo
            await this.startNativeScanning();
        } else {
            // En web o si no está disponible, mantener modo manual
            this.manualMode = true;
            this.messageService.add({
                severity: 'info',
                summary: 'Información',
                detail: 'Escáner no disponible en esta plataforma',
                life: 3000,
            });
        }
    }

    /**
     * Reintentar escaneo
     */
    async retry() {
        this.error = '';
        this.scanResult = '';
        this.processingResult = false;
        this.showSuccessAnimation = false;

        if (this.qrService.isNativePlatform() && !this.manualMode) {
            await this.startNativeScanning();
        }
    }

    /**
     * Cierra el modal
     */
    closeModal() {
        this.resetState();
        this.visible = false;
        this.visibleChange.emit(false);
    }

    /**
     * Cancela el escaneo
     */
    cancel() {
        this.scanCancelled.emit();
        this.closeModal();
    }

    /**
     * Resetea el estado del componente
     */
    private resetState() {
        this.isLoading = false;
        this.scanResult = '';
        this.error = '';
        this.manualMode = false;
        this.manualInput = '';
        this.processingResult = false;
        this.showSuccessAnimation = false;
    }
}
