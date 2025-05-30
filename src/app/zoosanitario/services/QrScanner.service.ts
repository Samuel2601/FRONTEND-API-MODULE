// ===== QR SCANNER SERVICE =====
import { Injectable } from '@angular/core';
import {
    BarcodeScanner,
    BarcodeFormat,
} from '@capacitor-mlkit/barcode-scanning';
import { AlertController, Platform } from '@ionic/angular';

@Injectable({
    providedIn: 'root',
})
export class QrScannerService {
    private isScanning = false;

    constructor(
        private alertController: AlertController,
        private platform: Platform
    ) {}

    async checkPermissions(): Promise<boolean> {
        try {
            const { camera } = await BarcodeScanner.checkPermissions();
            return camera === 'granted';
        } catch (error) {
            console.error('Error checking camera permissions:', error);
            return false;
        }
    }

    async requestPermissions(): Promise<boolean> {
        try {
            const { camera } = await BarcodeScanner.requestPermissions();
            return camera === 'granted';
        } catch (error) {
            console.error('Error requesting camera permissions:', error);
            return false;
        }
    }

    async scanQR(): Promise<string | null> {
        if (this.isScanning) {
            return null;
        }

        try {
            // Verificar permisos
            const hasPermission = await this.checkPermissions();
            if (!hasPermission) {
                const permissionGranted = await this.requestPermissions();
                if (!permissionGranted) {
                    await this.showPermissionAlert();
                    return null;
                }
            }

            this.isScanning = true;

            // Configurar el scanner
            await BarcodeScanner.addListener(
                'barcodesScanned',
                async (result) => {
                    console.log('Barcode scanned:', result);
                }
            );

            // Iniciar el scan
            const result = await BarcodeScanner.scan({
                formats: [BarcodeFormat.QrCode],
            });

            this.isScanning = false;

            if (result && result.barcodes && result.barcodes.length > 0) {
                return result.barcodes[0].rawValue;
            }

            return null;
        } catch (error) {
            this.isScanning = false;
            console.error('Error scanning QR code:', error);
            await this.showErrorAlert('Error al escanear el código QR');
            return null;
        }
    }

    async stopScan(): Promise<void> {
        try {
            await BarcodeScanner.stopScan();
            this.isScanning = false;
        } catch (error) {
            console.error('Error stopping scan:', error);
        }
    }

    private async showPermissionAlert(): Promise<void> {
        const alert = await this.alertController.create({
            header: 'Permisos de Cámara',
            message:
                'Se requieren permisos de cámara para escanear códigos QR. Por favor, habilite los permisos en la configuración de la aplicación.',
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

    // Método para escaneo manual (input de texto) como fallback
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
                            if (
                                data.certificateNumber &&
                                data.certificateNumber.trim()
                            ) {
                                resolve(data.certificateNumber.trim());
                            } else {
                                resolve(null);
                            }
                        },
                    },
                ],
            });
            await alert.present();
        });
    }

    isCurrentlyScanning(): boolean {
        return this.isScanning;
    }
}
