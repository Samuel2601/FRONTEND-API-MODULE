// src/app/shared/services/scanners/qr-camera-scanner.service.ts
import { Injectable } from '@angular/core';
import {
    CapacitorBarcodeScanner,
    CapacitorBarcodeScannerOptions,
    CapacitorBarcodeScannerScanResult,
    CapacitorBarcodeScannerTypeHint,
    CapacitorBarcodeScannerCameraDirection,
    CapacitorBarcodeScannerScanOrientation,
    CapacitorBarcodeScannerAndroidScanningLibrary,
} from '@capacitor/barcode-scanner';
import { QRScanOptions, QRScanResult } from '../types/qr.types';

@Injectable({
    providedIn: 'root',
})
export class QrCameraScannerService {
    private webScannerInstance: any = null;
    private isWebScannerActive = false;

    /**
     * Escaneo con Capacitor Barcode Scanner (Oficial)
     */
    async scanWithCapacitor(
        options: QRScanOptions = {}
    ): Promise<QRScanResult> {
        try {
            // Configurar opciones de escaneo
            const scanOptions: CapacitorBarcodeScannerOptions = {
                hint: 0,
                scanInstructions:
                    'Apunte la cámara hacia el código QR del certificado zoosanitario',
                scanButton: true,
                scanText: 'Escanear',
                cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
                scanOrientation:
                    CapacitorBarcodeScannerScanOrientation.ADAPTIVE,
                android: {
                    scanningLibrary:
                        CapacitorBarcodeScannerAndroidScanningLibrary.MLKIT,
                },
                web: {
                    showCameraSelection: true,
                    scannerFPS: 10,
                },
            };

            // Ejecutar escaneo
            const result: CapacitorBarcodeScannerScanResult =
                await CapacitorBarcodeScanner.scanBarcode(scanOptions);

            if (result.ScanResult && result.ScanResult.trim() !== '') {
                return {
                    success: true,
                    rawData: result.ScanResult,
                    method: 'camera-capacitor',
                };
            } else {
                return {
                    success: false,
                    error: 'No se detectó ningún código QR',
                    method: 'camera-capacitor',
                };
            }
        } catch (error: any) {
            // Manejar errores específicos
            if (
                error.message?.includes('cancelled') ||
                error.message?.includes('canceled')
            ) {
                return {
                    success: false,
                    error: 'Escaneo cancelado por el usuario',
                    method: 'camera-capacitor',
                };
            }

            if (error.message?.includes('permission')) {
                return {
                    success: false,
                    error: 'Permisos de cámara denegados',
                    method: 'camera-capacitor',
                };
            }

            return {
                success: false,
                error: `Error en escaneo nativo: ${error.message}`,
                method: 'camera-capacitor',
            };
        }
    }

    /**
     * Escaneo con múltiples formatos
     */
    async scanWithMultipleFormats(
        formats: CapacitorBarcodeScannerTypeHint[] = [
            CapacitorBarcodeScannerTypeHint.QR_CODE,
            CapacitorBarcodeScannerTypeHint.EAN_13,
            CapacitorBarcodeScannerTypeHint.UPC_A,
            CapacitorBarcodeScannerTypeHint.CODE_39,
            CapacitorBarcodeScannerTypeHint.CODE_128,
        ],
        options: QRScanOptions = {}
    ): Promise<QRScanResult> {
        try {
            const scanOptions: CapacitorBarcodeScannerOptions = {
                hint:
                    formats.length === 1
                        ? formats[0]
                        : CapacitorBarcodeScannerTypeHint.ALL,
                scanInstructions: 'Apunte la cámara hacia el código',
                scanButton: true,
                scanText: 'Escanear',
                cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
                scanOrientation:
                    CapacitorBarcodeScannerScanOrientation.ADAPTIVE,
                android: {
                    scanningLibrary:
                        CapacitorBarcodeScannerAndroidScanningLibrary.MLKIT,
                },
                web: {
                    showCameraSelection: true,
                    scannerFPS: 10,
                },
            };

            const result: CapacitorBarcodeScannerScanResult =
                await CapacitorBarcodeScanner.scanBarcode(scanOptions);

            if (result.ScanResult && result.ScanResult.trim() !== '') {
                return {
                    success: true,
                    rawData: result.ScanResult,
                    method: 'camera-capacitor',
                };
            } else {
                return {
                    success: false,
                    error: 'No se detectó ningún código',
                    method: 'camera-capacitor',
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Error en escaneo: ${error.message}`,
                method: 'camera-capacitor',
            };
        }
    }

    /**
     * Escaneo con cámara frontal
     */
    async scanWithFrontCamera(
        options: QRScanOptions = {}
    ): Promise<QRScanResult> {
        try {
            const scanOptions: CapacitorBarcodeScannerOptions = {
                hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
                scanInstructions: 'Apunte la cámara frontal hacia el código QR',
                scanButton: true,
                scanText: 'Escanear',
                cameraDirection: CapacitorBarcodeScannerCameraDirection.FRONT,
                scanOrientation:
                    CapacitorBarcodeScannerScanOrientation.PORTRAIT,
                android: {
                    scanningLibrary:
                        CapacitorBarcodeScannerAndroidScanningLibrary.MLKIT,
                },
                web: {
                    showCameraSelection: true,
                    scannerFPS: 10,
                },
            };

            const result: CapacitorBarcodeScannerScanResult =
                await CapacitorBarcodeScanner.scanBarcode(scanOptions);

            if (result.ScanResult && result.ScanResult.trim() !== '') {
                return {
                    success: true,
                    rawData: result.ScanResult,
                    method: 'camera-capacitor',
                };
            } else {
                return {
                    success: false,
                    error: 'No se detectó ningún código QR',
                    method: 'camera-capacitor',
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Error en escaneo frontal: ${error.message}`,
                method: 'camera-capacitor',
            };
        }
    }

    /**
     * Escaneo con cámara web (fallback)
     */
    async scanWithWebCamera(
        options: QRScanOptions = {}
    ): Promise<QRScanResult> {
        try {
            // Verificar HTTPS
            if (
                location.protocol !== 'https:' &&
                location.hostname !== 'localhost'
            ) {
                return {
                    success: false,
                    error: 'HTTPS requerido para usar la cámara',
                    method: 'camera-web',
                };
            }

            // Importar dinámicamente qr-scanner
            const QrScanner = (await import('qr-scanner')).default;

            // Verificar disponibilidad de cámara
            if (!(await QrScanner.hasCamera())) {
                return {
                    success: false,
                    error: 'No se detectó cámara disponible',
                    method: 'camera-web',
                };
            }

            return new Promise<QRScanResult>((resolve) => {
                const timeout = options.timeout || 30000;
                let timeoutId: any;

                // Crear elementos del DOM
                const modal = this.createWebScannerModal();
                const video = modal.querySelector('video') as HTMLVideoElement;

                // Crear instancia del scanner
                this.webScannerInstance = new QrScanner(
                    video,
                    (result: any) => {
                        this.cleanupWebScanner();
                        clearTimeout(timeoutId);
                        resolve({
                            success: true,
                            rawData: result.data || result,
                            method: 'camera-web',
                        });
                    },
                    {
                        returnDetailedScanResult: true,
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                        preferredCamera: 'environment',
                    }
                );

                // Configurar eventos del modal
                this.setupWebScannerEvents(modal, resolve);

                // Iniciar scanner
                this.webScannerInstance
                    .start()
                    .then(() => {
                        this.isWebScannerActive = true;
                    })
                    .catch((error: any) => {
                        this.cleanupWebScanner();
                        resolve({
                            success: false,
                            error: `Error iniciando cámara: ${error.message}`,
                            method: 'camera-web',
                        });
                    });

                // Timeout
                timeoutId = setTimeout(() => {
                    this.cleanupWebScanner();
                    resolve({
                        success: false,
                        error: 'Tiempo de escaneo agotado',
                        method: 'camera-web',
                    });
                }, timeout);
            });
        } catch (error: any) {
            this.cleanupWebScanner();
            return {
                success: false,
                error: `Error en escaneo web: ${error.message}`,
                method: 'camera-web',
            };
        }
    }

    /**
     * Crea modal para scanner web
     */
    private createWebScannerModal(): HTMLElement {
        const modal = document.createElement('div');
        modal.id = 'qr-scanner-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.95); z-index: 10000; display: flex;
            flex-direction: column; align-items: center; justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        modal.innerHTML = `
            <div style="position: relative; width: 90%; max-width: 400px; height: 400px; 
                        border: 2px solid #fff; border-radius: 12px; overflow: hidden;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <video autoplay style="width: 100%; height: 100%; object-fit: cover;"></video>
                
                <!-- Overlay de escaneo -->
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                           pointer-events: none;">
                    <div style="position: absolute; top: 50%; left: 50%; width: 200px; height: 200px;
                               margin: -100px 0 0 -100px; border: 2px solid #00ff00;
                               border-radius: 8px; box-shadow: 0 0 20px rgba(0,255,0,0.5);"></div>
                </div>
                
                <!-- Controles -->
                <div style="position: absolute; top: 15px; right: 15px; display: flex; gap: 10px;">
                    <button class="file-btn" style="background: #007bff; color: white; border: none; 
                           border-radius: 50%; width: 45px; height: 45px; cursor: pointer; 
                           display: flex; align-items: center; justify-content: center;
                           box-shadow: 0 4px 12px rgba(0,123,255,0.3); transition: all 0.3s;"
                           title="Escanear desde archivo">
                        📁
                    </button>
                    <button class="close-btn" style="background: #dc3545; color: white; border: none; 
                           border-radius: 50%; width: 45px; height: 45px; cursor: pointer; 
                           display: flex; align-items: center; justify-content: center;
                           box-shadow: 0 4px 12px rgba(220,53,69,0.3); transition: all 0.3s;">
                        ✕
                    </button>
                </div>
            </div>
            
            <div style="color: white; margin-top: 20px; text-align: center; max-width: 400px;">
                <h3 style="margin: 0 0 10px; font-size: 1.2rem;">Escanear Código QR</h3>
                <p style="margin: 0; opacity: 0.8; font-size: 0.9rem;">
                    Apunte la cámara hacia el código QR del certificado zoosanitario
                </p>
            </div>
        `;

        document.body.appendChild(modal);
        return modal;
    }

    /**
     * Configura eventos del modal web
     */
    private setupWebScannerEvents(
        modal: HTMLElement,
        resolve: (result: QRScanResult) => void
    ): void {
        // Botón cerrar
        const closeBtn = modal.querySelector('.close-btn') as HTMLButtonElement;
        closeBtn?.addEventListener('click', () => {
            this.cleanupWebScanner();
            resolve({
                success: false,
                error: 'Escaneo cancelado por el usuario',
                method: 'camera-web',
            });
        });

        // Botón archivo
        const fileBtn = modal.querySelector('.file-btn') as HTMLButtonElement;
        fileBtn?.addEventListener('click', async () => {
            try {
                const result = await this.scanFromFileWeb();
                this.cleanupWebScanner();

                if (result) {
                    resolve({
                        success: true,
                        rawData: result,
                        method: 'camera-web',
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'No se pudo leer el archivo',
                        method: 'camera-web',
                    });
                }
            } catch (error: any) {
                this.cleanupWebScanner();
                resolve({
                    success: false,
                    error: `Error leyendo archivo: ${error.message}`,
                    method: 'camera-web',
                });
            }
        });

        // Cerrar con Escape
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleKeyDown);
                this.cleanupWebScanner();
                resolve({
                    success: false,
                    error: 'Escaneo cancelado',
                    method: 'camera-web',
                });
            }
        };
        document.addEventListener('keydown', handleKeyDown);
    }

    /**
     * Escanear desde archivo (para uso en modal web)
     */
    private async scanFromFileWeb(): Promise<string | null> {
        return new Promise((resolve) => {
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
                    console.error('Error scanning file:', error);
                    resolve(null);
                }
            };

            document.body.appendChild(input);
            input.click();
            document.body.removeChild(input);
        });
    }

    /**
     * Limpia el scanner web
     */
    private cleanupWebScanner(): void {
        this.isWebScannerActive = false;

        if (this.webScannerInstance) {
            try {
                this.webScannerInstance.stop();
                this.webScannerInstance.destroy();
            } catch (error) {
                console.warn('Error cleaning up web scanner:', error);
            }
            this.webScannerInstance = null;
        }

        const modal = document.getElementById('qr-scanner-modal');
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }

    /**
     * Cancela el escaneo actual
     */
    cancelScan(): void {
        if (this.isWebScannerActive) {
            this.cleanupWebScanner();
        }
    }

    /**
     * Método principal recomendado para usar
     */
    async scan(options: QRScanOptions = {}): Promise<QRScanResult> {
        return this.scanWithCapacitor(options);
    }
}
