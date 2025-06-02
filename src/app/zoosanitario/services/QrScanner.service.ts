import { Injectable } from '@angular/core';
import {
    BarcodeScanner,
    BarcodeFormat,
    LensFacing,
} from '@capacitor-mlkit/barcode-scanning';
import { AlertController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { NativeCameraQRService } from './NativeCamara.service';

export interface QRScanOptions {
    method?: 'native' | 'custom' | 'image';
    imagePath?: string;
    lensFacing?: 'front' | 'back';
    resolution?: '640x480' | '1280x720' | '1920x1080' | '3840x2160';
    formats?: BarcodeFormat[];
}

export interface QRScanResult {
    success: boolean;
    data?: string;
    format?: string;
    error?: string;
    barcodes?: any[];
}

@Injectable({
    providedIn: 'root',
})
export class QrScannerService {
    private isScanning = false;
    private webScannerInstance: any = null;
    private listeners: any[] = [];
    private readonly MODULE_STATUS_KEY = 'barcode_module_status';
    private readonly INSTALL_COOLDOWN = 5 * 60 * 1000; // 5 minutos

    constructor(
        private alertController: AlertController,
        private nativeCameraQRService: NativeCameraQRService
    ) {}

    public isNativePlatform(): boolean {
        return Capacitor.isNativePlatform();
    }

    async checkPermissions(): Promise<boolean> {
        if (!this.isNativePlatform()) {
            return !!(
                navigator.mediaDevices && navigator.mediaDevices.getUserMedia
            );
        }

        try {
            const { camera } = await BarcodeScanner.checkPermissions();
            return camera === 'granted';
        } catch (error) {
            console.error('Error checking camera permissions:', error);
            return false;
        }
    }

    async requestPermissions(): Promise<boolean> {
        if (!this.isNativePlatform()) return true;

        try {
            const { camera } = await BarcodeScanner.requestPermissions();
            return camera === 'granted';
        } catch (error) {
            console.error('Error requesting camera permissions:', error);
            return false;
        }
    }

    // Método principal de escaneo
    async scanQR(options: QRScanOptions = {}): Promise<QRScanResult> {
        if (this.isScanning) {
            return { success: false, error: 'Ya hay un escaneo en progreso' };
        }

        if (!this.isNativePlatform()) {
            return await this.scanQRWeb();
        }

        try {
            // Verificar soporte del dispositivo

            return this.nativeCameraQRService.scanQRWithNativeCamera();
            /*const { supported } = await BarcodeScanner.isSupported();
            if (!supported) {
                return {
                    success: false,
                    error: 'El dispositivo no soporta escaneo de códigos',
                };
            }

            // Determinar método de escaneo
            const method = await this.determineMethod(options.method);

            switch (method) {
                case 'native':
                    return await this.scanWithNativeInterface(options);
                case 'custom':
                    return await this.scanWithCustomView(options);
                case 'image':
                    return await this.scanFromImage(options);
                default:
                    return {
                        success: false,
                        error: 'Método de escaneo no válido',
                    };
            }*/
        } catch (error) {
            return {
                success: false,
                error: `Error en scanQR: ${error.message}`,
            };
        }
    }

    // Determinar el mejor método disponible
    private async determineMethod(preferredMethod?: string): Promise<string> {
        if (preferredMethod === 'image') return 'image';

        try {
            const { available } =
                await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
            if (
                available &&
                (preferredMethod === 'native' || !preferredMethod)
            ) {
                return 'native';
            }
            return 'custom';
        } catch (error) {
            return 'custom';
        }
    }

    // Escaneo con interfaz nativa (Google Barcode Scanner)
    private async scanWithNativeInterface(
        options: QRScanOptions
    ): Promise<QRScanResult> {
        try {
            const { available } =
                await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
            if (!available) {
                const installed = await this.ensureGoogleModule();
                if (!installed) {
                    return {
                        success: false,
                        error: 'No se pudo instalar Google Barcode Scanner',
                    };
                }
            }

            const result = await BarcodeScanner.scan({
                formats: options.formats || [BarcodeFormat.QrCode],
            });

            if (result.barcodes && result.barcodes.length > 0) {
                const barcode = result.barcodes[0];
                return {
                    success: true,
                    data: barcode.rawValue || barcode.displayValue,
                    format: barcode.format,
                    barcodes: result.barcodes,
                };
            }

            return { success: false, error: 'No se detectaron códigos QR' };
        } catch (error) {
            return {
                success: false,
                error: `Error en escaneo nativo: ${error.message}`,
            };
        }
    }

    // Escaneo con vista personalizada
    private async scanWithCustomView(
        options: QRScanOptions
    ): Promise<QRScanResult> {
        try {
            const permissionResult = await this.checkAndRequestPermissions();
            if (!permissionResult.success) return permissionResult;

            this.isScanning = true;

            const scanOptions = {
                formats: options.formats || [BarcodeFormat.QrCode],
                lensFacing:
                    options.lensFacing === 'front'
                        ? LensFacing.Front
                        : LensFacing.Back,
                //resolution: this.getResolution(options.resolution),
            };

            await BarcodeScanner.startScan(scanOptions);

            return new Promise((resolve) => {
                const cleanup = () => {
                    this.stopScan();
                    this.listeners.forEach((listener) => listener.remove());
                    this.listeners = [];
                };

                const successListener = BarcodeScanner.addListener(
                    'barcodesScanned',
                    (event) => {
                        cleanup();
                        if (event.barcodes && event.barcodes.length > 0) {
                            const barcode = event.barcodes[0];
                            resolve({
                                success: true,
                                data: barcode.rawValue || barcode.displayValue,
                                format: barcode.format,
                                barcodes: event.barcodes,
                            });
                        } else {
                            resolve({
                                success: false,
                                error: 'No se detectaron códigos QR',
                            });
                        }
                    }
                );

                const errorListener = BarcodeScanner.addListener(
                    'scanError',
                    (event) => {
                        cleanup();
                        resolve({
                            success: false,
                            error: `Error de escaneo: ${event.message}`,
                        });
                    }
                );

                this.listeners.push(successListener, errorListener);

                // Timeout de 30 segundos
                setTimeout(() => {
                    if (this.isScanning) {
                        cleanup();
                        resolve({
                            success: false,
                            error: 'Timeout: Escaneo cancelado por tiempo límite',
                        });
                    }
                }, 30000);
            });
        } catch (error) {
            this.isScanning = false;
            return {
                success: false,
                error: `Error en vista personalizada: ${error.message}`,
            };
        }
    }

    // Escaneo desde imagen
    private async scanFromImage(options: QRScanOptions): Promise<QRScanResult> {
        try {
            if (!options.imagePath) {
                return { success: false, error: 'Ruta de imagen requerida' };
            }

            const result = await BarcodeScanner.readBarcodesFromImage({
                path: options.imagePath,
                formats: options.formats || [BarcodeFormat.QrCode],
            });

            if (result.barcodes && result.barcodes.length > 0) {
                const barcode = result.barcodes[0];
                return {
                    success: true,
                    data: barcode.rawValue || barcode.displayValue,
                    format: barcode.format,
                    barcodes: result.barcodes,
                };
            }

            return {
                success: false,
                error: 'No se encontraron códigos QR en la imagen',
            };
        } catch (error) {
            return {
                success: false,
                error: `Error leyendo imagen: ${error.message}`,
            };
        }
    }

    // Verificar y solicitar permisos
    private async checkAndRequestPermissions(): Promise<QRScanResult> {
        try {
            const status = await BarcodeScanner.checkPermissions();

            if (status.camera === 'granted') {
                return { success: true };
            }

            if (status.camera === 'denied') {
                await BarcodeScanner.openSettings();
                return {
                    success: false,
                    error: 'Permiso de cámara denegado. Abre configuración.',
                };
            }

            const requestResult = await BarcodeScanner.requestPermissions();
            if (requestResult.camera === 'granted') {
                return { success: true };
            }

            return { success: false, error: 'Permiso de cámara requerido' };
        } catch (error) {
            return {
                success: false,
                error: `Error de permisos: ${error.message}`,
            };
        }
    }

    // Asegurar que el módulo Google está disponible
    private async ensureGoogleModule(): Promise<boolean> {
        try {
            await BarcodeScanner.installGoogleBarcodeScannerModule();

            return new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(false), 30000);

                BarcodeScanner.addListener(
                    'googleBarcodeScannerModuleInstallProgress',
                    async (event) => {
                        if (event.state === 4) {
                            // COMPLETED
                            clearTimeout(timeout);
                            resolve(true);
                        } else if (event.state === 5 || event.state === 3) {
                            // FAILED or CANCELED
                            clearTimeout(timeout);
                            resolve(false);
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Error instalando Google Module:', error);
            return false;
        }
    }

    // Detener escaneo
    async stopScan(): Promise<void> {
        if (!this.isScanning) return;

        try {
            if (this.isNativePlatform()) {
                await BarcodeScanner.stopScan();
            } else {
                this.cleanupWebScanner();
            }
            this.isScanning = false;
            this.listeners.forEach((listener) => listener.remove());
            this.listeners = [];
        } catch (error) {
            console.error('Error deteniendo escaneo:', error);
        }
    }

    // Controles de flash
    async toggleTorch(): Promise<boolean> {
        try {
            const { available } = await BarcodeScanner.isTorchAvailable();
            if (!available) return false;

            await BarcodeScanner.toggleTorch();
            const { enabled } = await BarcodeScanner.isTorchEnabled();
            return enabled;
        } catch (error) {
            console.error('Error con flash:', error);
            return false;
        }
    }

    // Configurar zoom
    async setZoom(ratio: number): Promise<boolean> {
        try {
            const maxZoom = await BarcodeScanner.getMaxZoomRatio();
            const minZoom = await BarcodeScanner.getMinZoomRatio();
            const clampedRatio = Math.max(
                minZoom.zoomRatio,
                Math.min(maxZoom.zoomRatio, ratio)
            );
            await BarcodeScanner.setZoomRatio({ zoomRatio: clampedRatio });
            return true;
        } catch (error) {
            console.error('Error configurando zoom:', error);
            return false;
        }
    }

    // Obtener resolución enum
    /*private getResolution(resolution?: string): Resolution {
        switch (resolution) {
            case '640x480':
                return Resolution['640x480'];
            case '1920x1080':
                return Resolution['1920x1080'];
            case '3840x2160':
                return Resolution['3840x2160'];
            default:
                return Resolution['1280x720'];
        }
    }*/

    // Escaneo Web
    private async scanQRWeb(): Promise<QRScanResult> {
        return new Promise(async (resolve) => {
            try {
                if (
                    location.protocol !== 'https:' &&
                    location.hostname !== 'localhost'
                ) {
                    await this.showErrorAlert(
                        'El escáner requiere HTTPS para funcionar en web'
                    );
                    resolve({ success: false, error: 'HTTPS requerido' });
                    return;
                }

                const QrScanner = (await import('qr-scanner')).default;

                if (!QrScanner.hasCamera()) {
                    await this.showErrorAlert(
                        'No se detectó cámara disponible'
                    );
                    resolve({ success: false, error: 'Sin cámara' });
                    return;
                }

                this.isScanning = true;
                const modal = this.createScannerModal();
                const videoElement = modal.querySelector(
                    'video'
                ) as HTMLVideoElement;

                this.webScannerInstance = new QrScanner(
                    videoElement,
                    (result: any) => {
                        this.cleanupWebScanner();
                        resolve({ success: true, data: result.data || result });
                    },
                    {
                        returnDetailedScanResult: true,
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                        preferredCamera: 'environment',
                    }
                );

                await this.webScannerInstance.start();

                // Timeout de 30 segundos
                setTimeout(() => {
                    if (this.isScanning) {
                        this.cleanupWebScanner();
                        resolve({ success: false, error: 'Timeout' });
                    }
                }, 30000);

                // Botones del modal
                modal
                    .querySelector('.close-scanner')
                    ?.addEventListener('click', () => {
                        this.cleanupWebScanner();
                        resolve({
                            success: false,
                            error: 'Cancelado por usuario',
                        });
                    });

                modal
                    .querySelector('.file-scanner')
                    ?.addEventListener('click', async () => {
                        const qrResult = await this.scanFromFileWeb();
                        if (qrResult) {
                            this.cleanupWebScanner();
                            resolve({ success: true, data: qrResult });
                        }
                    });
            } catch (error) {
                this.isScanning = false;
                await this.showErrorAlert('Error con el escáner web');
                resolve({ success: false, error: error.message });
            }
        });
    }

    // Escaneo desde archivo web
    public async scanFromFileWeb(): Promise<string | null> {
        return new Promise(async (resolve) => {
            try {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.style.display = 'none';

                input.onchange = async (event: any) => {
                    const file = event.target.files[0];
                    if (!file) {
                        resolve(null);
                        return;
                    }

                    try {
                        const QrScanner = (await import('qr-scanner')).default;
                        const result = await QrScanner.scanImage(file);
                        resolve(result);
                    } catch (error) {
                        console.error('Error scanning from file:', error);
                        await this.showErrorAlert(
                            'No se pudo leer el código QR de la imagen'
                        );
                        resolve(null);
                    }
                };

                document.body.appendChild(input);
                input.click();
                document.body.removeChild(input);
            } catch (error) {
                console.error('Error creating file input:', error);
                resolve(null);
            }
        });
    }

    // Crear modal del escáner web
    private createScannerModal(): HTMLElement {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); z-index: 10000; display: flex;
            flex-direction: column; align-items: center; justify-content: center;
        `;

        modal.innerHTML = `
            <div style="position: relative; width: 300px; height: 300px; border: 2px solid #fff; border-radius: 10px; overflow: hidden;">
                <video style="width: 100%; height: 100%; object-fit: cover;"></video>
                <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 10px;">
                    <button class="file-scanner" style="background: #007bff; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 16px;" title="Cargar imagen">📁</button>
                    <button class="close-scanner" style="background: #fff; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 20px;">×</button>
                </div>
            </div>
            <p style="color: white; margin-top: 20px; text-align: center;">Apunte la cámara hacia el código QR</p>
        `;

        document.body.appendChild(modal);
        return modal;
    }

    // Limpiar escáner web
    private cleanupWebScanner(): void {
        this.isScanning = false;

        if (this.webScannerInstance) {
            try {
                this.webScannerInstance.stop();
                this.webScannerInstance.destroy();
            } catch (e) {
                console.warn('Error stopping scanner:', e);
            }
            this.webScannerInstance = null;
        }

        const modal = document.querySelector('[style*="z-index: 10000"]');
        if (modal) {
            document.body.removeChild(modal);
        }
    }

    // Entrada manual
    async manualEntry(): Promise<string | null> {
        return new Promise(async (resolve) => {
            const alert = await this.alertController.create({
                header: 'Ingreso Manual',
                message: 'Ingrese el número del certificado zoosanitario:',
                inputs: [
                    {
                        name: 'certificateNumber',
                        type: 'text',
                        placeholder: 'Número del certificado',
                    },
                ],
                buttons: [
                    {
                        text: 'Cancelar',
                        role: 'cancel',
                        handler: () => resolve(null),
                    },
                    {
                        text: 'Confirmar',
                        handler: (data) => {
                            resolve(data.certificateNumber?.trim() || null);
                        },
                    },
                ],
            });
            await alert.present();
        });
    }

    // Alertas
    private async showErrorAlert(message: string): Promise<void> {
        const alert = await this.alertController.create({
            header: 'Error',
            message: message,
            buttons: ['OK'],
        });
        await alert.present();
    }

    // Verificaciones de estado
    isCurrentlyScanning(): boolean {
        return this.isScanning;
    }

    isScannerAvailable(): boolean {
        if (this.isNativePlatform()) return true;
        return !!(
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia &&
            (location.protocol === 'https:' ||
                location.hostname === 'localhost')
        );
    }

    // Limpiar recursos
    async ngOnDestroy(): Promise<void> {
        await this.stopScan();
        await BarcodeScanner.removeAllListeners();
    }
}
