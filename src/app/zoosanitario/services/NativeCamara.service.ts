import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Browser } from '@capacitor/browser';
import { AlertController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';

export interface QRScanResult {
    success: boolean;
    data?: string;
    error?: string;
}

@Injectable({
    providedIn: 'root',
})
export class NativeCameraQRService {
    constructor(private alertController: AlertController) {}

    /**
     * Método principal: usar cámara nativa con reconocimiento QR del sistema
     */
    async scanQRWithNativeCamera(): Promise<QRScanResult> {
        try {
            if (Capacitor.getPlatform() === 'android') {
                return await this.scanWithAndroidCamera();
            } else if (Capacitor.getPlatform() === 'ios') {
                return await this.scanWithiOSCamera();
            } else {
                return await this.scanWithWebCamera();
            }
        } catch (error) {
            console.error('Error en scanQRWithNativeCamera:', error);
            return {
                success: false,
                error: `Error: ${error.message}`,
            };
        }
    }

    /**
     * Android: Usar Intent para abrir escáner QR del sistema
     */
    private async scanWithAndroidCamera(): Promise<QRScanResult> {
        try {
            // Opción 1: Usar intent para app de QR del sistema
            const result = await this.openQRScannerIntent();
            if (result.success) {
                return result;
            }

            // Opción 2: Fallback a cámara normal con procesamiento
            return await this.fallbackCameraMethod();
        } catch (error) {
            console.error('Error en Android camera:', error);
            return await this.fallbackCameraMethod();
        }
    }

    /**
     * iOS: Usar cámara con procesamiento de QR
     */
    private async scanWithiOSCamera(): Promise<QRScanResult> {
        try {
            // En iOS, la cámara nativa ya detecta QR automáticamente
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Camera,
                saveToGallery: false,
                correctOrientation: true,
                // En iOS, esto puede activar el reconocimiento automático
                promptLabelHeader: 'Escanear QR',
                promptLabelCancel: 'Cancelar',
                promptLabelPhoto: 'Desde Galería',
                promptLabelPicture: 'Tomar Foto',
            });

            if (!image.dataUrl) {
                return { success: false, error: 'No se capturó imagen' };
            }

            // Intentar extraer datos QR de la imagen
            return await this.processImageForQR(image.dataUrl);
        } catch (error) {
            console.error('Error en iOS camera:', error);
            return {
                success: false,
                error: `Error iOS: ${error.message}`,
            };
        }
    }

    /**
     * Web: Fallback para navegador
     */
    private async scanWithWebCamera(): Promise<QRScanResult> {
        try {
            // Abrir cámara web estándar
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Camera,
                width: 1024,
                height: 1024,
            });

            if (!image.dataUrl) {
                return { success: false, error: 'No se capturó imagen web' };
            }

            return await this.processImageForQR(image.dataUrl);
        } catch (error) {
            console.error('Error en web camera:', error);
            return {
                success: false,
                error: `Error web: ${error.message}`,
            };
        }
    }

    /**
     * Android: Abrir intent para escáner QR del sistema
     */
    private async openQRScannerIntent(): Promise<QRScanResult> {
        return new Promise((resolve) => {
            try {
                // Crear intent para apps de QR scanner
                const intent = {
                    action: 'com.google.zxing.client.android.SCAN',
                    extras: {
                        SCAN_MODE: 'QR_CODE_MODE',
                        SAVE_HISTORY: false,
                    },
                };

                // Aquí necesitarías un plugin personalizado para manejar intents
                // Por ahora, usamos el método alternativo
                resolve({ success: false, error: 'Intent no disponible' });
            } catch (error) {
                resolve({ success: false, error: 'Error con intent' });
            }
        });
    }

    /**
     * Método de respaldo usando cámara regular
     */
    private async fallbackCameraMethod(): Promise<QRScanResult> {
        try {
            const alert = await this.alertController.create({
                header: 'Escanear QR',
                message: 'Toma una foto del código QR para procesarlo',
                buttons: [
                    {
                        text: 'Cancelar',
                        role: 'cancel',
                    },
                    {
                        text: 'Abrir Cámara',
                        handler: async () => {
                            const image = await Camera.getPhoto({
                                quality: 100,
                                allowEditing: false,
                                resultType: CameraResultType.DataUrl,
                                source: CameraSource.Camera,
                                saveToGallery: false,
                                correctOrientation: true,
                            });

                            if (image.dataUrl) {
                                return await this.processImageForQR(
                                    image.dataUrl
                                );
                            }
                            return {
                                success: false,
                                error: 'No se capturó imagen',
                            };
                        },
                    },
                ],
            });

            await alert.present();

            return new Promise((resolve) => {
                alert.onDidDismiss().then((result) => {
                    if (result.data) {
                        resolve(result.data);
                    } else {
                        resolve({
                            success: false,
                            error: 'Cancelado por usuario',
                        });
                    }
                });
            });
        } catch (error) {
            return {
                success: false,
                error: `Error fallback: ${error.message}`,
            };
        }
    }

    /**
     * Procesar imagen para extraer QR (requiere librería externa)
     */
    private async processImageForQR(dataUrl: string): Promise<QRScanResult> {
        try {
            // Aquí usarías una librería como ZXing o jsQR
            // Por ahora, simulamos el procesamiento

            // Si tienes jsQR instalado:
            // const code = jsQR(imageData, width, height);
            // if (code) {
            //     return { success: true, data: code.data };
            // }

            // Fallback: mostrar imagen al usuario para entrada manual
            return await this.showImageForManualEntry(dataUrl);
        } catch (error) {
            return {
                success: false,
                error: `Error procesando: ${error.message}`,
            };
        }
    }

    /**
     * Mostrar imagen capturada para entrada manual
     */
    private async showImageForManualEntry(
        dataUrl: string
    ): Promise<QRScanResult> {
        return new Promise(async (resolve) => {
            const alert = await this.alertController.create({
                header: 'Código QR Capturado',
                message: `
                    <img src="${dataUrl}" style="max-width: 200px; max-height: 200px;"><br>
                    Si puedes ver el código QR, ingrésalo manualmente:
                `,
                inputs: [
                    {
                        name: 'qrCode',
                        type: 'text',
                        placeholder: 'Código del QR',
                    },
                ],
                buttons: [
                    {
                        text: 'Cancelar',
                        role: 'cancel',
                        handler: () => {
                            resolve({ success: false, error: 'Cancelado' });
                        },
                    },
                    {
                        text: 'Reintentar',
                        handler: () => {
                            // Volver a intentar escanear
                            this.scanQRWithNativeCamera().then(resolve);
                        },
                    },
                    {
                        text: 'Confirmar',
                        handler: (data) => {
                            const code = data.qrCode?.trim();
                            if (code) {
                                resolve({ success: true, data: code });
                            } else {
                                resolve({
                                    success: false,
                                    error: 'Código vacío',
                                });
                            }
                        },
                    },
                ],
            });
            await alert.present();
        });
    }

    /**
     * Abrir configuración de la aplicación
     */
    async openAppSettings(): Promise<void> {
        try {
            if (Capacitor.getPlatform() === 'android') {
                await Browser.open({
                    url: 'package:' + Capacitor.getPlatform(),
                });
            } else {
                // Para iOS y web
                await Browser.open({ url: 'app-settings:' });
            }
        } catch (error) {
            console.error('Error abriendo configuración:', error);
        }
    }

    /**
     * Verificar disponibilidad de cámara
     */
    async isCameraAvailable(): Promise<boolean> {
        try {
            // Intentar acceso básico a cámara
            if (Capacitor.getPlatform() === 'web') {
                return !!(
                    navigator.mediaDevices &&
                    navigator.mediaDevices.getUserMedia
                );
            }
            return true; // En móviles, asumimos que hay cámara
        } catch (error) {
            return false;
        }
    }
}
