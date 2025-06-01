import { Injectable } from '@angular/core';
import {
    BarcodeScanner,
    BarcodeFormat,
    LensFacing,
    Resolution,
    GoogleBarcodeScannerModuleInstallState,
} from '@capacitor-mlkit/barcode-scanning';
import { AlertController, Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

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
    private moduleInstallAttempted = false;
    private lastInstallAttempt = 0;
    private readonly INSTALL_COOLDOWN = 5 * 60 * 1000; // 5 minutos
    private readonly MODULE_STATUS_KEY = 'barcode_module_status';
    private readonly LAST_INSTALL_KEY = 'last_install_attempt';

    private listeners: any[] = [];

    constructor(
        private alertController: AlertController,
        private platform: Platform
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
        if (!this.isNativePlatform()) {
            return true;
        }

        try {
            const { camera } = await BarcodeScanner.requestPermissions();
            return camera === 'granted';
        } catch (error) {
            console.error('Error requesting camera permissions:', error);
            return false;
        }
    }

    // Verificar estado persistente del módulo
    private async getModuleStatus(): Promise<{
        status: 'unknown' | 'available' | 'failed' | 'installing';
        lastAttempt: number;
    }> {
        try {
            const statusResult = await Preferences.get({
                key: this.MODULE_STATUS_KEY,
            });
            const attemptResult = await Preferences.get({
                key: this.LAST_INSTALL_KEY,
            });

            return {
                status: (statusResult.value as any) || 'unknown',
                lastAttempt: parseInt(attemptResult.value || '0'),
            };
        } catch {
            return { status: 'unknown', lastAttempt: 0 };
        }
    }

    private async setModuleStatus(
        status: 'unknown' | 'available' | 'failed' | 'installing'
    ): Promise<void> {
        try {
            await Preferences.set({
                key: this.MODULE_STATUS_KEY,
                value: status,
            });
            if (status === 'failed' || status === 'installing') {
                await Preferences.set({
                    key: this.LAST_INSTALL_KEY,
                    value: Date.now().toString(),
                });
            }
        } catch (error) {
            console.warn('Error saving module status:', error);
        }
    }

    // Verificación inteligente del módulo con cache
    private async ensureBarcodeScannerModule(): Promise<boolean> {
        if (!this.isNativePlatform()) return true;

        try {
            // Verificar disponibilidad actual
            const { available } =
                await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();

            if (available) {
                console.log('Módulo Google Barcode Scanner ya disponible');
                await this.setModuleStatus('available');
                return true;
            }

            // Verificar estado persistente y cooldown
            const moduleStatus = await this.getModuleStatus();
            const now = Date.now();
            const timeSinceLastAttempt = now - moduleStatus.lastAttempt;

            console.log(
                `Estado del módulo: ${moduleStatus.status}, última instalación: ${timeSinceLastAttempt}ms atrás`
            );

            // Si falló recientemente, esperar cooldown antes de reintentar
            if (
                moduleStatus.status === 'failed' &&
                timeSinceLastAttempt < this.INSTALL_COOLDOWN
            ) {
                console.log(
                    `Módulo falló recientemente. Esperando ${Math.round(
                        (this.INSTALL_COOLDOWN - timeSinceLastAttempt) / 1000
                    )}s antes de reintentar`
                );
                return false;
            }

            // Si ya se intentó instalar en esta sesión y no está disponible, no reintentar
            if (
                this.moduleInstallAttempted &&
                moduleStatus.status !== 'available'
            ) {
                console.log(
                    'Ya se intentó instalar el módulo en esta sesión sin éxito'
                );
                return false;
            }

            // Intentar instalación solo si es necesario
            if (moduleStatus.status !== 'installing') {
                console.log(
                    'Intentando instalar módulo Google Barcode Scanner...'
                );
                return await this.attemptModuleInstallation();
            }

            return false;
        } catch (error) {
            console.error('Error verificando módulo:', error);
            return false;
        }
    }

    private async attemptModuleInstallation(): Promise<boolean> {
        this.moduleInstallAttempted = true;
        await this.setModuleStatus('installing');

        return new Promise(async (resolve) => {
            let installationCompleted = false;
            let installationFailed = false;
            const timeout = 30000; // Reducido a 30 segundos

            // Configurar listener con timeout más corto
            const listener = await BarcodeScanner.addListener(
                'googleBarcodeScannerModuleInstallProgress',
                (event) => {
                    console.log(
                        `Estado instalación: ${
                            event.state
                        } (${this.getInstallStateDescription(
                            event.state
                        )}), Progreso: ${event.progress}`
                    );

                    if (
                        event.state ===
                        GoogleBarcodeScannerModuleInstallState.COMPLETED
                    ) {
                        installationCompleted = true;
                    } else if (
                        event.state ===
                            GoogleBarcodeScannerModuleInstallState.FAILED ||
                        event.state ===
                            GoogleBarcodeScannerModuleInstallState.CANCELED
                    ) {
                        installationFailed = true;
                    }
                }
            );

            // Timeout de instalación
            const timeoutId = setTimeout(async () => {
                if (!installationCompleted && !installationFailed) {
                    console.log('Timeout de instalación del módulo');
                    installationFailed = true;
                }
            }, timeout);

            try {
                await BarcodeScanner.installGoogleBarcodeScannerModule();
                console.log('Solicitud de instalación enviada');

                // Esperar resultado con verificaciones periódicas más frecuentes
                const checkInterval = 1000; // 1 segundo
                const maxChecks = timeout / checkInterval;
                let checks = 0;

                const checkLoop = setInterval(async () => {
                    checks++;

                    if (installationCompleted) {
                        clearInterval(checkLoop);
                        clearTimeout(timeoutId);
                        await listener.remove();
                        await this.setModuleStatus('available');
                        console.log('Módulo instalado exitosamente');
                        resolve(true);
                        return;
                    }

                    if (installationFailed) {
                        clearInterval(checkLoop);
                        clearTimeout(timeoutId);
                        await listener.remove();
                        await this.setModuleStatus('failed');
                        console.error('Instalación del módulo falló');
                        resolve(false);
                        return;
                    }

                    // Verificación adicional de disponibilidad
                    if (checks % 3 === 0) {
                        // Cada 3 segundos
                        try {
                            const { available } =
                                await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
                            if (available) {
                                clearInterval(checkLoop);
                                clearTimeout(timeoutId);
                                await listener.remove();
                                await this.setModuleStatus('available');
                                console.log(
                                    'Módulo disponible (verificación directa)'
                                );
                                resolve(true);
                                return;
                            }
                        } catch {}
                    }

                    if (checks >= maxChecks) {
                        clearInterval(checkLoop);
                        clearTimeout(timeoutId);
                        await listener.remove();
                        await this.setModuleStatus('failed');
                        console.error('Timeout agotado para instalación');
                        resolve(false);
                    }
                }, checkInterval);
            } catch (error) {
                clearTimeout(timeoutId);
                await listener.remove();
                await this.setModuleStatus('failed');
                console.error('Error al solicitar instalación:', error);
                resolve(false);
            }
        });
    }

    private getInstallStateDescription(
        state: GoogleBarcodeScannerModuleInstallState
    ): string {
        switch (state) {
            case GoogleBarcodeScannerModuleInstallState.UNKNOWN:
                return 'Desconocido';
            case GoogleBarcodeScannerModuleInstallState.PENDING:
                return 'Pendiente';
            case GoogleBarcodeScannerModuleInstallState.DOWNLOADING:
                return 'Descargando';
            case GoogleBarcodeScannerModuleInstallState.CANCELED:
                return 'Cancelado';
            case GoogleBarcodeScannerModuleInstallState.COMPLETED:
                return 'Completado';
            case GoogleBarcodeScannerModuleInstallState.FAILED:
                return 'Fallido';
            case GoogleBarcodeScannerModuleInstallState.INSTALLING:
                return 'Instalando';
            case GoogleBarcodeScannerModuleInstallState.DOWNLOAD_PAUSED:
                return 'Descarga pausada';
            default:
                return 'Estado no reconocido';
        }
    }

    async isDeviceSupported(): Promise<boolean> {
        if (!this.isNativePlatform()) {
            return true;
        }

        try {
            const { supported } = await BarcodeScanner.isSupported();
            console.log('Hardware compatible con escáner:', supported);
            return supported;
        } catch (error) {
            console.error(
                'Error al verificar compatibilidad del dispositivo:',
                error
            );
            return false;
        }
    }

    async scanQR(options: QRScanOptions = {}): Promise<any | null> {
        if (this.isScanning) {
            console.log('Ya hay un escaneo en progreso');
            return null;
        }

        if (!this.isNativePlatform()) {
            return await this.scanQRWeb();
        }

        try {
            // 1. Verificar soporte del dispositivo
            const supported = await this.checkDeviceSupport();
            if (!supported.success) {
                return supported;
            }

            // 2. Determinar método de escaneo
            const method = await this.determineMethod(options.method);

            // 3. Ejecutar escaneo según método
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
            }
        } catch (error) {
            return {
                success: false,
                error: `Error en scanQR: ${error.message}`,
            };
        }
    }

    /**
     * Verificar soporte del dispositivo
     */
    private async checkDeviceSupport(): Promise<QRScanResult> {
        try {
            const { supported } = await BarcodeScanner.isSupported();

            if (!supported) {
                return {
                    success: false,
                    error: 'El dispositivo no soporta escaneo de códigos',
                };
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Error verificando soporte: ${error.message}`,
            };
        }
    }

    /**
     * Determinar el mejor método disponible
     */
    private async determineMethod(preferredMethod?: string): Promise<string> {
        if (preferredMethod === 'image') return 'image';

        try {
            // Verificar si Google Barcode Scanner está disponible
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
            console.warn(
                'Error verificando Google Barcode Scanner, usando vista personalizada'
            );
            return 'custom';
        }
    }

    /**
     * Escaneo con interfaz nativa (Google Barcode Scanner)
     */
    private async scanWithNativeInterface(
        options: QRScanOptions
    ): Promise<QRScanResult> {
        try {
            // Verificar disponibilidad del módulo
            const { available } =
                await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();

            if (!available) {
                const installed = await this.installGoogleModule();
                if (!installed) {
                    return {
                        success: false,
                        error: 'No se pudo instalar Google Barcode Scanner',
                    };
                }
            }

            // Ejecutar escaneo nativo
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

    /**
     * Escaneo con vista personalizada
     */
    private async scanWithCustomView(
        options: QRScanOptions
    ): Promise<QRScanResult> {
        try {
            // Verificar y solicitar permisos
            const permissionResult = await this.checkAndRequestPermissions();
            if (!permissionResult.success) {
                return permissionResult;
            }

            this.isScanning = true;

            // Configurar opciones de escaneo
            const scanOptions = {
                formats: options.formats || [BarcodeFormat.QrCode],
                lensFacing:
                    options.lensFacing === 'front'
                        ? LensFacing.Front
                        : LensFacing.Back,
                resolution: this.getResolution(options.resolution),
            };

            // Iniciar escaneo
            await BarcodeScanner.startScan(scanOptions);

            // Configurar listeners
            return new Promise((resolve) => {
                const successListener = BarcodeScanner.addListener(
                    'barcodesScanned',
                    (event) => {
                        this.stopScan();
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
                        this.stopScan();
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
                        this.stopScan();
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

    /**
     * Escaneo desde imagen
     */
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

    /**
     * Verificar y solicitar permisos de cámara
     */
    private async checkAndRequestPermissions(): Promise<QRScanResult> {
        try {
            // Verificar permisos actuales
            const status = await BarcodeScanner.checkPermissions();

            if (status.camera === 'granted') {
                return { success: true };
            }

            if (status.camera === 'denied') {
                // Abrir configuración si está denegado permanentemente
                await BarcodeScanner.openSettings();
                return {
                    success: false,
                    error: 'Permiso de cámara denegado. Abre configuración.',
                };
            }

            // Solicitar permisos
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

    /**
     * Instalar Google Barcode Scanner Module
     */
    private async installGoogleModule(): Promise<boolean> {
        try {
            await BarcodeScanner.installGoogleBarcodeScannerModule();

            return new Promise((resolve) => {
                BarcodeScanner.addListener(
                    'googleBarcodeScannerModuleInstallProgress',
                    async (event) => {
                        console.log(
                            `Instalación: ${event.state}, Progreso: ${event.progress}%`
                        );

                        // Get the listener handle to remove it
                        const listenerHandle = await BarcodeScanner.addListener(
                            'googleBarcodeScannerModuleInstallProgress',
                            () => {}
                        );

                        if (event.state === 4) {
                            // COMPLETED
                            await listenerHandle.remove();
                            resolve(true);
                        } else if (event.state === 5 || event.state === 3) {
                            // FAILED or CANCELED
                            await listenerHandle.remove();
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

    /**
     * Detener escaneo activo
     */
    async stopScan(): Promise<void> {
        if (!this.isScanning) return;

        try {
            await BarcodeScanner.stopScan();
            this.isScanning = false;

            // Limpiar listeners
            this.listeners.forEach((listener) => listener.remove());
            this.listeners = [];
        } catch (error) {
            console.error('Error deteniendo escaneo:', error);
        }

        if (!this.isNativePlatform()) {
            this.cleanupWebScanner();
            return;
        }

        try {
            await BarcodeScanner.stopScan();
            this.isScanning = false;
        } catch (error) {
            console.error('Error stopping scan:', error);
        }
    }

    /**
     * Controles de flash
     */
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

    /**
     * Configurar zoom
     */
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

    /**
     * Obtener resolución enum
     */
    private getResolution(resolution?: string): Resolution {
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
    }

    /**
     * Limpiar recursos al destruir el servicio
     */
    async ngOnDestroy(): Promise<void> {
        await this.stopScan();
        await BarcodeScanner.removeAllListeners();
    }

    // Método separado para escaneo con startScan() (no requiere módulo Google)
    private async scanWithStartScan(): Promise<any | null> {
        return new Promise<any | null>(async (resolve) => {
            const timeout = setTimeout(() => {
                console.log('Timeout del escaneo con startScan');
                BarcodeScanner.removeAllListeners().catch(() => {});
                BarcodeScanner.stopScan().catch(() => {});
                resolve(null);
            }, 20000);

            try {
                const listener = await BarcodeScanner.addListener(
                    'barcodesScanned',
                    async (result) => {
                        console.log('=== DEBUGGING QR SCAN RESULT ===');
                        console.log(
                            'Resultado completo:',
                            JSON.stringify(result, null, 2)
                        );
                        console.log('Tipo de resultado:', typeof result);
                        console.log('result.barcodes:', result.barcodes);
                        console.log(
                            'Tipo de barcodes:',
                            typeof result.barcodes
                        );
                        console.log(
                            '¿Es array?:',
                            Array.isArray(result.barcodes)
                        );
                        console.log('Longitud:', result.barcodes?.length);

                        if (result.barcodes && result.barcodes.length > 0) {
                            result.barcodes.forEach((barcode, index) => {
                                console.log(`--- Barcode ${index} ---`);
                                console.log(
                                    'Barcode completo:',
                                    JSON.stringify(barcode, null, 2)
                                );
                                console.log(
                                    'displayValue:',
                                    barcode.displayValue
                                );
                                console.log('rawValue:', barcode.rawValue);
                                console.log('format:', barcode.format);
                                console.log('valueType:', barcode.valueType);
                                console.log('bytes:', barcode.bytes);
                            });
                        }
                        console.log('=== END DEBUG ===');

                        clearTimeout(timeout);
                        await listener.remove();
                        await BarcodeScanner.stopScan().catch(() => {});
                        resolve(result.barcodes);
                    }
                );

                await BarcodeScanner.startScan({
                    formats: [BarcodeFormat.QrCode],
                });
            } catch (startError) {
                clearTimeout(timeout);
                console.error('Error iniciando startScan:', startError);
                resolve(null);
            }
        });
    }

    // Método separado para escaneo con módulo Google
    private async scanWithGoogleModule(): Promise<any | null> {
        return new Promise<any | null>(async (resolve) => {
            const timeout = setTimeout(() => {
                console.log('Timeout del escaneo con módulo Google');
                BarcodeScanner.removeAllListeners().catch(() => {});
                BarcodeScanner.stopScan().catch(() => {});
                resolve(null);
            }, 20000); // 20 segundos para Google module

            try {
                const listener = await BarcodeScanner.addListener(
                    'barcodesScanned',
                    async (result) => {
                        console.log(
                            'Código detectado (módulo Google):',
                            JSON.stringify(result)
                        );
                        clearTimeout(timeout);
                        await listener.remove();
                        await BarcodeScanner.stopScan().catch(() => {});
                        resolve(result.barcodes);
                    }
                );

                await BarcodeScanner.startScan({
                    formats: [BarcodeFormat.QrCode],
                });
            } catch (startError) {
                clearTimeout(timeout);
                console.error(
                    'Error iniciando escaneo con módulo Google:',
                    startError
                );
                resolve(null);
            }
        });
    }

    private async scanQRWeb(): Promise<string | null> {
        return new Promise(async (resolve) => {
            try {
                if (
                    location.protocol !== 'https:' &&
                    location.hostname !== 'localhost'
                ) {
                    await this.showErrorAlert(
                        'El escáner requiere HTTPS para funcionar en web'
                    );
                    resolve(null);
                    return;
                }

                const QrScanner = (await import('qr-scanner')).default;

                if (!QrScanner.hasCamera()) {
                    await this.showErrorAlert(
                        'No se detectó cámara disponible'
                    );
                    resolve(null);
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
                        console.log('QR detectado:', result);
                        this.cleanupWebScanner();
                        resolve(result.data || result);
                    },
                    {
                        returnDetailedScanResult: true,
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                        preferredCamera: 'environment',
                    }
                );

                try {
                    await this.webScannerInstance.start();

                    setTimeout(() => {
                        if (this.isScanning) {
                            this.cleanupWebScanner();
                            resolve(null);
                        }
                    }, 30000);

                    const closeBtn = modal.querySelector('.close-scanner');
                    closeBtn?.addEventListener('click', () => {
                        this.cleanupWebScanner();
                        resolve(null);
                    });

                    const fileBtn = modal.querySelector('.file-scanner');
                    fileBtn?.addEventListener('click', async () => {
                        const qrResult = await this.scanFromFile();
                        if (qrResult) {
                            this.cleanupWebScanner();
                            resolve(qrResult);
                        }
                    });
                } catch (startError) {
                    console.error('Error starting scanner:', startError);
                    this.cleanupWebScanner();
                    await this.showErrorAlert('Error al acceder a la cámara');
                    resolve(null);
                }
            } catch (error) {
                console.error('Error with web scanner:', error);
                this.isScanning = false;
                await this.showErrorAlert(
                    'Escáner no disponible. Use entrada manual.'
                );
                resolve(null);
            }
        });
    }

    async scanFromFile(): Promise<string | null> {
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
                        console.log('QR desde archivo:', result);
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

    private createScannerModal(): HTMLElement {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
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
            <p style="color: #ccc; margin-top: 10px; text-align: center; font-size: 14px;">O toque 📁 para cargar una imagen</p>
        `;

        document.body.appendChild(modal);
        return modal;
    }

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

    // Método para resetear el estado del módulo (útil para debugging o configuración)
    async resetModuleStatus(): Promise<void> {
        try {
            await Preferences.remove({ key: this.MODULE_STATUS_KEY });
            await Preferences.remove({ key: this.LAST_INSTALL_KEY });
            this.moduleInstallAttempted = false;
            console.log('Estado del módulo reseteado');
        } catch (error) {
            console.warn('Error resetting module status:', error);
        }
    }

    // Método para verificar el estado actual del módulo
    async getModuleStatusInfo(): Promise<any> {
        const status = await this.getModuleStatus();
        const isAvailable = this.isNativePlatform()
            ? (await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable())
                  .available
            : true;

        return {
            ...status,
            currentlyAvailable: isAvailable,
            cooldownRemaining: Math.max(
                0,
                this.INSTALL_COOLDOWN - (Date.now() - status.lastAttempt)
            ),
        };
    }

    private async showPermissionAlert(): Promise<void> {
        const alert = await this.alertController.create({
            header: 'Permisos de Cámara',
            message:
                'Se requieren permisos de cámara para escanear códigos QR.',
            buttons: ['OK'],
        });
        await alert.present();
    }

    private async showErrorAlert(message: string): Promise<void> {
        const alert = await this.alertController.create({
            header: 'Error',
            message: message,
            buttons: ['OK'],
        });
        await alert.present();
    }

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

    async scanQRFromFile(): Promise<string | null> {
        return await this.scanFromFileWithCrop();
    }

    async scanFromFileWithCrop(): Promise<string | null> {
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
                        const croppedImage = await this.showCropTool(file);
                        if (!croppedImage) {
                            resolve(null);
                            return;
                        }

                        const QrScanner = (await import('qr-scanner')).default;
                        const result = await QrScanner.scanImage(croppedImage);
                        console.log('QR desde área recortada:', result);
                        resolve(result);
                    } catch (error) {
                        console.error('Error scanning cropped area:', error);
                        await this.showErrorAlert(
                            'No se pudo leer el código QR del área seleccionada'
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

    private async showCropTool(file: File): Promise<File | null> {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                z-index: 10001;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
            `;

            const reader = new FileReader();
            reader.onload = (e) => {
                const imageUrl = e.target?.result as string;

                modal.innerHTML = `
                    <div style="background: white; border-radius: 10px; padding: 20px; max-width: 90vw; max-height: 90vh; overflow: auto;">
                        <h3 style="margin: 0 0 15px 0; text-align: center;">Seleccione el área del código QR</h3>
                        <div style="position: relative; display: inline-block;">
                            <img id="cropImage" src="${imageUrl}" style="max-width: 70vw; max-height: 60vh; object-fit: contain;">
                            <div id="cropBox" style="
                                position: absolute;
                                border: 3px solid #007bff;
                                background: rgba(0,123,255,0.1);
                                cursor: move;
                                min-width: 80px;
                                min-height: 80px;
                                top: 20%;
                                left: 20%;
                                width: 250px;
                                height: 250px;
                            ">
                                <div style="position: absolute; top: -5px; left: -5px; width: 10px; height: 10px; background: #007bff; cursor: nw-resize;"></div>
                                <div style="position: absolute; top: -5px; right: -5px; width: 10px; height: 10px; background: #007bff; cursor: ne-resize;"></div>
                                <div style="position: absolute; bottom: -5px; left: -5px; width: 10px; height: 10px; background: #007bff; cursor: sw-resize;"></div>
                                <div style="position: absolute; bottom: -5px; right: -5px; width: 10px; height: 10px; background: #007bff; cursor: se-resize;"></div>
                            </div>
                        </div>
                        <div style="text-align: center; margin-top: 15px;">
                            <button id="cropConfirm" style="background: #28a745; color: white; border: none; padding: 10px 20px; margin: 0 10px; border-radius: 5px; cursor: pointer;">Escanear Área</button>
                            <button id="cropCancel" style="background: #dc3545; color: white; border: none; padding: 10px 20px; margin: 0 10px; border-radius: 5px; cursor: pointer;">Cancelar</button>
                        </div>
                        <p style="text-align: center; color: #666; font-size: 14px; margin: 10px 0 0 0;">
                            <strong>Importante:</strong> Asegúrese de que el cuadro azul cubra completamente el código QR<br>
                            Incluya un poco de espacio blanco alrededor del código
                        </p>
                    </div>
                `;

                document.body.appendChild(modal);
                this.addCropFunctionality(modal);

                const confirmBtn = modal.querySelector('#cropConfirm');
                const cancelBtn = modal.querySelector('#cropCancel');

                confirmBtn?.addEventListener('click', async () => {
                    const croppedFile = await this.cropImage(imageUrl, modal);
                    document.body.removeChild(modal);
                    resolve(croppedFile);
                });

                cancelBtn?.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    resolve(null);
                });
            };

            reader.readAsDataURL(file);
        });
    }

    private addCropFunctionality(modal: HTMLElement) {
        const cropBox = modal.querySelector('#cropBox') as HTMLElement;
        let isDragging = false;
        let isResizing = false;
        let startX = 0;
        let startY = 0;
        let startWidth = 0;
        let startHeight = 0;
        let startLeft = 0;
        let startTop = 0;

        cropBox.addEventListener('mousedown', (e: MouseEvent) => {
            if ((e.target as HTMLElement).style.cursor.includes('resize'))
                return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = cropBox.offsetLeft;
            startTop = cropBox.offsetTop;
            e.preventDefault();
        });

        const resizers = cropBox.querySelectorAll('div');
        resizers.forEach((resizer) => {
            resizer.addEventListener('mousedown', (e: MouseEvent) => {
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = cropBox.offsetWidth;
                startHeight = cropBox.offsetHeight;
                startLeft = cropBox.offsetLeft;
                startTop = cropBox.offsetTop;
                e.stopPropagation();
                e.preventDefault();
            });
        });

        document.addEventListener('mousemove', (e: MouseEvent) => {
            if (isDragging) {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                cropBox.style.left = startLeft + deltaX + 'px';
                cropBox.style.top = startTop + deltaY + 'px';
            } else if (isResizing) {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                cropBox.style.width = Math.max(50, startWidth + deltaX) + 'px';
                cropBox.style.height =
                    Math.max(50, startHeight + deltaY) + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            isResizing = false;
        });
    }

    private async cropImage(
        imageUrl: string,
        modal: HTMLElement
    ): Promise<File> {
        const img = modal.querySelector('#cropImage') as HTMLImageElement;
        const cropBox = modal.querySelector('#cropBox') as HTMLElement;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        const tempImg = new Image();
        tempImg.src = imageUrl;

        return new Promise((resolve) => {
            tempImg.onload = () => {
                const scaleX = tempImg.naturalWidth / img.offsetWidth;
                const scaleY = tempImg.naturalHeight / img.offsetHeight;

                const cropX = cropBox.offsetLeft * scaleX;
                const cropY = cropBox.offsetTop * scaleY;
                const cropWidth = cropBox.offsetWidth * scaleX;
                const cropHeight = cropBox.offsetHeight * scaleY;

                canvas.width = cropWidth;
                canvas.height = cropHeight;

                ctx.drawImage(
                    tempImg,
                    cropX,
                    cropY,
                    cropWidth,
                    cropHeight,
                    0,
                    0,
                    cropWidth,
                    cropHeight
                );

                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], 'cropped-qr.png', {
                            type: 'image/png',
                        });
                        resolve(file);
                    }
                }, 'image/png');
            };
        });
    }

    isCurrentlyScanning(): boolean {
        return this.isScanning;
    }

    isScannerAvailable(): boolean {
        if (this.isNativePlatform()) {
            return true;
        }
        return !!(
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia &&
            (location.protocol === 'https:' ||
                location.hostname === 'localhost')
        );
    }
}
