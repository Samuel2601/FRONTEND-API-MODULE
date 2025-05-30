// ===== QR SCANNER MODAL COMPONENT TS =====
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

    constructor(
        private qrService: QrScannerService,
        private messageService: MessageService
    ) {}

    ngOnInit() {}

    ngOnDestroy() {
        if (this.isScanning) {
            this.stopScanning();
        }
    }

    async onShow() {
        // Modal se ha mostrado, iniciar scanner automáticamente
        await this.startScanning();
    }

    onHide() {
        this.stopScanning();
        this.resetState();
        this.visibleChange.emit(false);
    }

    async startScanning() {
        if (this.isScanning) return;

        try {
            this.isScanning = true;
            this.error = '';
            this.scanResult = '';

            // Verificar permisos primero
            const hasPermissions = await this.qrService.checkPermissions();
            if (!hasPermissions) {
                const granted = await this.qrService.requestPermissions();
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

            if (result) {
                this.scanResult = result;
                this.onScanSuccess(result);
            } else {
                this.isScanning = false;
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
            detail: `Código detectado: ${result}`,
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
        } else {
            this.startScanning();
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
