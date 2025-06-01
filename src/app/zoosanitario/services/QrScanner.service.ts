import { Injectable } from '@angular/core';
import {
    AlertController,
    Platform,
    ActionSheetController,
} from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Injectable({
    providedIn: 'root',
})
export class QrScannerService {
    private isScanning = false;
    private webScannerInstance: any = null;

    constructor(
        private alertController: AlertController,
        private platform: Platform,
        private actionSheetController: ActionSheetController
    ) {}

    public isNativePlatform(): boolean {
        return Capacitor.isNativePlatform();
    }

    async checkCameraPermissions(): Promise<boolean> {
        if (!this.isNativePlatform()) {
            return !!(
                navigator.mediaDevices && navigator.mediaDevices.getUserMedia
            );
        }

        try {
            console.log('🔍 Verificando permisos de cámara (Capacitor)...');
            const permissions = await Camera.checkPermissions();
            console.log('📋 Permisos actuales:', permissions);
            return permissions.camera === 'granted';
        } catch (error) {
            console.error('❌ Error checking camera permissions:', error);
            return false;
        }
    }

    async requestCameraPermissions(): Promise<boolean> {
        if (!this.isNativePlatform()) {
            return true;
        }

        try {
            console.log('🔐 Solicitando permisos de cámara...');
            const permissions = await Camera.requestPermissions();
            console.log('✅ Permisos otorgados:', permissions);
            return permissions.camera === 'granted';
        } catch (error) {
            console.error('❌ Error requesting camera permissions:', error);
            return false;
        }
    }

    async scanQR(): Promise<string | null> {
        if (this.isScanning) {
            console.log('⚠️ Ya está escaneando, ignorando solicitud');
            return null;
        }

        console.log('📱 Plataforma nativa:', this.isNativePlatform());

        // En web, usar el escáner web directo
        if (!this.isNativePlatform()) {
            return await this.scanQRWeb();
        }

        // En móvil, mostrar opciones de escaneo
        return await this.showScanOptions();
    }

    private async showScanOptions(): Promise<string | null> {
        return new Promise(async (resolve) => {
            try {
                console.log('📋 Mostrando opciones de escaneo...');

                const actionSheet = await this.actionSheetController.create({
                    header: 'Escanear código QR',
                    cssClass: 'scan-action-sheet',
                    buttons: [
                        {
                            text: 'Usar cámara',
                            icon: 'camera',
                            handler: async () => {
                                console.log(
                                    '📸 Opción: Usar cámara seleccionada'
                                );
                                const result = await this.scanWithCamera();
                                resolve(result);
                            },
                        },
                        {
                            text: 'Cargar imagen',
                            icon: 'image',
                            handler: async () => {
                                console.log(
                                    '🖼️ Opción: Cargar imagen seleccionada'
                                );
                                const result = await this.scanFromGallery();
                                resolve(result);
                            },
                        },
                        {
                            text: 'Entrada manual',
                            icon: 'create',
                            handler: async () => {
                                console.log(
                                    '✏️ Opción: Entrada manual seleccionada'
                                );
                                const result = await this.manualEntry();
                                resolve(result);
                            },
                        },
                        {
                            text: 'Cancelar',
                            icon: 'close',
                            role: 'cancel',
                            handler: () => {
                                console.log('❌ Escaneo cancelado por usuario');
                                resolve(null);
                            },
                        },
                    ],
                });

                await actionSheet.present();
                console.log('✅ ActionSheet presentado');

                // Backup: si el ActionSheet no funciona, ir directo a cámara
                setTimeout(async () => {
                    const isStillPresent =
                        await this.actionSheetController.getTop();
                    if (!isStillPresent) {
                        console.log(
                            '⚠️ ActionSheet no visible, usando cámara directamente'
                        );
                        const result = await this.scanWithCamera();
                        resolve(result);
                    }
                }, 1000);
            } catch (error) {
                console.error('❌ Error showing action sheet:', error);
                // Fallback: ir directo a cámara
                const result = await this.scanWithCamera();
                resolve(result);
            }
        });
    }

    private async scanWithCamera(): Promise<string | null> {
        try {
            console.log('📸 Iniciando escaneo con cámara...');

            // Verificar permisos primero
            const hasPermission = await this.checkCameraPermissions();
            if (!hasPermission) {
                console.log('❌ Sin permisos, solicitando...');
                const permissionGranted = await this.requestCameraPermissions();
                if (!permissionGranted) {
                    console.error('❌ Permisos denegados por usuario');
                    await this.showPermissionAlert();
                    return null;
                }
            }

            console.log('✅ Permisos OK, abriendo cámara...');
            this.isScanning = true;

            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Camera,
                presentationStyle: 'fullscreen', // Añadido para mejor UX
                promptLabelHeader: 'Escanear QR',
                promptLabelPhoto: 'Tomar foto',
                promptLabelCancel: 'Cancelar',
            });

            this.isScanning = false;
            console.log('📷 Imagen capturada:', !!image.dataUrl);

            if (!image.dataUrl) {
                console.error('❌ No se obtuvo imagen de la cámara');
                return null;
            }

            console.log('🔍 Procesando imagen para QR...');
            return await this.processImageForQR(image.dataUrl);
        } catch (error: any) {
            this.isScanning = false;
            console.error('❌ Error tomando foto:', error);

            // Verificar si el usuario canceló
            if (
                error.message?.includes('cancelled') ||
                error.message?.includes('cancel') ||
                error.message?.includes('User cancelled')
            ) {
                console.log('ℹ️ Usuario canceló la captura');
                return null;
            }

            await this.showErrorAlert(
                'Error al acceder a la cámara: ' + error.message
            );
            return null;
        }
    }

    private async scanFromGallery(): Promise<string | null> {
        try {
            console.log('🖼️ Abriendo galería...');
            this.isScanning = true;

            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Photos,
                promptLabelHeader: 'Seleccionar imagen',
                promptLabelPhoto: 'Elegir imagen',
                promptLabelCancel: 'Cancelar',
            });

            this.isScanning = false;

            if (!image.dataUrl) {
                console.error('❌ No se seleccionó imagen');
                return null;
            }

            console.log('🔍 Procesando imagen de galería...');
            return await this.processImageForQR(image.dataUrl);
        } catch (error: any) {
            this.isScanning = false;
            console.error('❌ Error seleccionando imagen:', error);

            if (
                error.message?.includes('cancelled') ||
                error.message?.includes('cancel')
            ) {
                console.log('ℹ️ Usuario canceló la selección');
                return null;
            }

            await this.showErrorAlert(
                'Error al acceder a la galería: ' + error.message
            );
            return null;
        }
    }

    private async processImageForQR(dataUrl: string): Promise<string | null> {
        try {
            console.log('📦 Importando qr-scanner...');
            const QrScanner = (await import('qr-scanner')).default;

            // Convertir dataUrl a File para qr-scanner
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const file = new File([blob], 'qr-image.jpg', {
                type: 'image/jpeg',
            });

            console.log('🔍 Escaneando QR en imagen...');
            const result = await QrScanner.scanImage(file, {
                returnDetailedScanResult: true,
            });

            const qrText = this.extractQRText(result);

            if (qrText) {
                console.log(
                    '✅ QR detectado:',
                    qrText.substring(0, 100) + '...'
                );
                return qrText;
            } else {
                console.log('❌ No se encontró QR en imagen');
                await this.showErrorAlert(
                    'No se encontró código QR en la imagen'
                );
                return null;
            }
        } catch (error) {
            console.error('❌ Error procesando imagen:', error);
            await this.showErrorAlert(
                'No se pudo leer el código QR de la imagen'
            );
            return null;
        }
    }

    private async scanQRWeb(): Promise<string | null> {
        return new Promise(async (resolve) => {
            try {
                // Verificar HTTPS
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

                // Crear modal con video para el scanner
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

                    // Timeout de 30 segundos
                    setTimeout(() => {
                        if (this.isScanning) {
                            this.cleanupWebScanner();
                            resolve(null);
                        }
                    }, 30000);

                    // Botón cerrar
                    const closeBtn = modal.querySelector('.close-scanner');
                    closeBtn?.addEventListener('click', () => {
                        this.cleanupWebScanner();
                        resolve(null);
                    });

                    // Botón para cargar desde archivo
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

    // Método para escanear desde archivo (web)
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
                        const result = await QrScanner.scanImage(file, {
                            returnDetailedScanResult: true,
                        });
                        console.log('QR desde archivo:', result);

                        const qrText = this.extractQRText(result);
                        resolve(qrText || null);
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

    // Método helper para extraer texto del resultado
    private extractQRText(result: any): string {
        if (typeof result === 'string') {
            return result;
        }
        if (result && typeof result === 'object') {
            return result.data || result.text || result.rawValue || '';
        }
        return '';
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

        // Remover modal
        const modal = document.querySelector('[style*="z-index: 10000"]');
        if (modal) {
            document.body.removeChild(modal);
        }
    }

    async stopScan(): Promise<void> {
        console.log('🛑 Deteniendo escaneo...');
        if (!this.isNativePlatform()) {
            this.cleanupWebScanner();
            return;
        }

        this.isScanning = false;
    }

    private async showPermissionAlert(): Promise<void> {
        const alert = await this.alertController.create({
            header: 'Permisos de Cámara',
            message:
                'Se requieren permisos de cámara para escanear códigos QR. Por favor, otorgue los permisos en la configuración de la aplicación.',
            buttons: [
                {
                    text: 'Cancelar',
                    role: 'cancel',
                },
                {
                    text: 'Abrir Configuración',
                    handler: () => {
                        // Abrir configuración del dispositivo
                        if (Capacitor.getPlatform() === 'ios') {
                            window.open('app-settings:', '_system');
                        } else if (Capacitor.getPlatform() === 'android') {
                            // En Android, mostrar instrucciones
                            this.showAndroidPermissionInstructions();
                        }
                    },
                },
            ],
        });
        await alert.present();
    }

    private async showAndroidPermissionInstructions(): Promise<void> {
        const alert = await this.alertController.create({
            header: 'Configurar Permisos',
            message:
                'Para habilitar la cámara:\n1. Vaya a Configuración > Aplicaciones\n2. Busque esta app\n3. Toque "Permisos"\n4. Active "Cámara"',
            buttons: ['Entendido'],
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

    // Método para escanear desde archivo con recorte
    async scanQRFromFile(): Promise<string | null> {
        return await this.scanFromFileWithCrop();
    }

    private async scanFromFileWithCrop(): Promise<string | null> {
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
                        // Primero intentar detectar todos los QRs en la imagen
                        const allQRs = await this.scanAllQRsFromImage(file);

                        if (allQRs.length === 0) {
                            await this.showErrorAlert(
                                'No se encontró ningún código QR en la imagen'
                            );
                            resolve(null);
                            return;
                        }

                        if (allQRs.length === 1) {
                            // Solo un QR, verificar si es certificado
                            if (this.isLikelyCertificateQR(allQRs[0])) {
                                resolve(allQRs[0]);
                            } else {
                                // Mostrar herramienta de recorte manual
                                const croppedResult = await this.showCropTool(
                                    file
                                );
                                resolve(croppedResult);
                            }
                            return;
                        }

                        // Múltiples QRs: buscar el de certificado
                        const certificateQR = allQRs.find((qr) =>
                            this.isLikelyCertificateQR(qr)
                        );

                        if (certificateQR) {
                            resolve(certificateQR);
                            return;
                        }

                        // Ninguno parece certificado, mostrar selector
                        const selectedQR = await this.showQRSelector(allQRs);
                        if (selectedQR) {
                            resolve(selectedQR);
                        } else {
                            // Usuario canceló, mostrar herramienta de recorte
                            const croppedResult = await this.showCropTool(file);
                            resolve(croppedResult);
                        }
                    } catch (error) {
                        console.error('Error scanning from file:', error);
                        await this.showErrorAlert(
                            'Error al procesar la imagen'
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

    private async scanAllQRsFromImage(file: File): Promise<string[]> {
        try {
            const QrScanner = (await import('qr-scanner')).default;

            const results = await QrScanner.scanImage(file, {
                returnDetailedScanResult: true,
            });

            if (Array.isArray(results)) {
                return results
                    .map((r) => this.extractQRText(r))
                    .filter((text) => text);
            } else if (results) {
                const text = this.extractQRText(results);
                return text ? [text] : [];
            }

            return [];
        } catch (error) {
            console.log('Error scanning all QRs:', error);
            return [];
        }
    }

    private isLikelyCertificateQR(qrText: string): boolean {
        const upperText = qrText.toUpperCase();

        const hasCertificatePattern =
            upperText.includes('CZPM') ||
            upperText.includes('CERTIFICADO') ||
            upperText.includes('ZOOSANITARIO') ||
            upperText.includes('AUTORIZADO A:') ||
            upperText.includes('VALIDO HASTA') ||
            upperText.includes('VÁLIDO HASTA') ||
            upperText.includes('TOTAL PRODUCTOS') ||
            upperText.includes('ORIGEN:') ||
            upperText.includes('DESTINO:');

        const isNotCertificate =
            upperText.includes('PLAY.GOOGLE.COM') ||
            upperText.includes('APPS/DETAILS') ||
            upperText.includes('HTTP://') ||
            upperText.includes('HTTPS://') ||
            upperText.includes('WWW.') ||
            upperText.includes('.COM') ||
            upperText.includes('.ORG') ||
            upperText.includes('.NET');

        return hasCertificatePattern && !isNotCertificate;
    }

    private async showQRSelector(qrTexts: string[]): Promise<string | null> {
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
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

            const content = document.createElement('div');
            content.style.cssText = `
            background: white;
            border-radius: 10px;
            padding: 20px;
            max-width: 90vw;
            max-height: 90vh;
            overflow: auto;
        `;

            content.innerHTML = `
            <h3 style="margin: 0 0 15px 0; text-align: center;">Se encontraron múltiples códigos QR</h3>
            <p style="margin: 0 0 15px 0; color: #666; text-align: center;">Seleccione el código del certificado zoosanitario:</p>
            <div id="qrList"></div>
            <div style="text-align: center; margin-top: 15px;">
                <button id="qrCancel" style="background: #6c757d; color: white; border: none; padding: 10px 20px; margin: 0 10px; border-radius: 5px; cursor: pointer;">Recortar Manualmente</button>
            </div>
        `;

            const qrList = content.querySelector('#qrList');

            qrTexts.forEach((qrText, index) => {
                const item = document.createElement('div');
                item.style.cssText = `
                border: 1px solid #ddd;
                border-radius: 5px;
                padding: 10px;
                margin: 10px 0;
                cursor: pointer;
                transition: background-color 0.2s;
            `;

                const preview =
                    qrText.length > 100
                        ? qrText.substring(0, 100) + '...'
                        : qrText;
                const isCertificate = this.isLikelyCertificateQR(qrText);

                item.innerHTML = `
                <div style="font-weight: bold; color: ${
                    isCertificate ? '#28a745' : '#6c757d'
                };">
                    ${isCertificate ? '✓ Posible Certificado' : 'Otro QR'} ${
                    index + 1
                }
                </div>
                <div style="font-size: 12px; color: #666; margin-top: 5px; word-break: break-all;">
                    ${preview}
                </div>
            `;

                if (isCertificate) {
                    item.style.borderColor = '#28a745';
                    item.style.backgroundColor = '#f8f9fa';
                }

                item.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    resolve(qrText);
                });

                qrList!.appendChild(item);
            });

            const cancelBtn = content.querySelector('#qrCancel');
            cancelBtn?.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(null);
            });

            modal.appendChild(content);
            document.body.appendChild(modal);
        });
    }

    private async showCropTool(file: File): Promise<string | null> {
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
                    try {
                        const croppedFile = await this.cropImage(
                            imageUrl,
                            modal
                        );
                        document.body.removeChild(modal);

                        const QrScanner = (await import('qr-scanner')).default;
                        const result = await QrScanner.scanImage(croppedFile);
                        const qrText = this.extractQRText(result);
                        resolve(qrText || null);
                    } catch (error) {
                        document.body.removeChild(modal);
                        console.error('Error scanning cropped area:', error);
                        resolve(null);
                    }
                });

                cancelBtn?.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    resolve(null);
                });
            };

            reader.readAsDataURL(file);
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

                ctx.filter = 'contrast(150%) brightness(110%)';

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

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const file = new File([blob], 'cropped-qr.png', {
                                type: 'image/png',
                            });
                            resolve(file);
                        }
                    },
                    'image/png',
                    0.95
                );
            };
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

    isCurrentlyScanning(): boolean {
        return this.isScanning;
    }

    isScannerAvailable(): boolean {
        return true; // Siempre disponible ya que usa Camera API o web scanner
    }
}
