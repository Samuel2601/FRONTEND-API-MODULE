import {
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
} from '@angular/core';
import { MessageService } from 'primeng/api';
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

    isScanning = false;
    scanResult = '';
    error = '';
    manualMode = false;
    manualInput = '';
    scannerAvailable = true;

    constructor(
        private qrService: QrScannerService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        this.scannerAvailable = this.qrService.isScannerAvailable();
    }

    ngOnDestroy() {
        if (this.isScanning) {
            this.stopScanning();
        }
    }

    async onShow() {
        // Verificar si el escáner está disponible
        if (!this.scannerAvailable) {
            this.manualMode = true;
            this.messageService.add({
                severity: 'info',
                summary: 'Información',
                detail: 'Escáner requiere HTTPS en web. Use entrada manual.',
            });
            return;
        }

        // Modal se ha mostrado, iniciar scanner automáticamente
        await this.startScanning();
    }

    onHide() {
        this.stopScanning();
        this.resetState();
        this.visibleChange.emit(false);
    }

    async startScanning() {
        if (this.isScanning || !this.scannerAvailable) return;

        try {
            this.isScanning = true;
            this.error = '';
            this.scanResult = '';

            // Verificar permisos primero (método actualizado)
            const hasPermissions =
                await this.qrService.checkCameraPermissions();
            if (!hasPermissions) {
                const granted = await this.qrService.requestCameraPermissions();
                if (!granted) {
                    this.error =
                        'Se requieren permisos de cámara para escanear códigos QR';
                    this.isScanning = false;
                    this.manualMode = true;
                    return;
                }
            }

            // Iniciar el escaneo
            const result = await this.qrService.scanQR();
            console.log('QR Result:', result);

            if (result) {
                this.scanResult = result;
                this.onScanSuccess(result);
            } else {
                this.isScanning = false;
                // Si no hay resultado, el usuario canceló o hubo error
                // No forzar modo manual automáticamente
            }
        } catch (error) {
            console.error('Error starting scanner:', error);
            this.error =
                'Error al inicializar el escáner. Intente con ingreso manual.';
            this.isScanning = false;
            this.manualMode = true;
        }
    }

    async stopScanning() {
        if (!this.isScanning) return;

        try {
            await this.qrService.stopScan();
        } catch (error) {
            console.error('Error stopping scanner:', error);
        } finally {
            this.isScanning = false;
        }
    }

    onScanSuccess(result: string) {
        this.scanResult = result;
        this.isScanning = false;

        this.messageService.add({
            severity: 'success',
            summary: 'QR Escaneado',
            detail: `Código detectado exitosamente`,
        });

        // Emitir el resultado después de un breve delay para mostrar el mensaje
        setTimeout(() => {
            this.qrScanned.emit(result);
            this.closeModal();
        }, 1500);
    }

    onManualSubmit() {
        if (!this.manualInput.trim()) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Ingrese un código válido',
            });
            return;
        }

        this.onScanSuccess(this.manualInput.trim());
    }

    toggleManualMode() {
        this.manualMode = !this.manualMode;

        if (this.manualMode) {
            this.stopScanning();
        } else if (this.scannerAvailable) {
            this.startScanning();
        } else {
            // Si el escáner no está disponible, forzar modo manual
            this.manualMode = true;
            this.messageService.add({
                severity: 'info',
                summary: 'Información',
                detail: 'Escáner no disponible en esta plataforma',
            });
        }
    }

    // Método adicional para escanear desde archivo
    async scanFromFile() {
        try {
            this.isScanning = true;
            this.error = '';

            const result = await this.qrService.scanQRFromFile();

            if (result) {
                this.onScanSuccess(result);
            } else {
                this.messageService.add({
                    severity: 'info',
                    summary: 'Información',
                    detail: 'No se detectó código QR en la imagen seleccionada',
                });
            }
        } catch (error) {
            console.error('Error scanning from file:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al procesar la imagen',
            });
        } finally {
            this.isScanning = false;
        }
    }

    closeModal() {
        this.stopScanning();
        this.resetState();
        this.visibleChange.emit(false);
    }

    cancel() {
        this.stopScanning();
        this.scanCancelled.emit();
        this.closeModal();
    }

    private resetState() {
        this.isScanning = false;
        this.scanResult = '';
        this.error = '';
        this.manualMode = false;
        this.manualInput = '';
    }
}
