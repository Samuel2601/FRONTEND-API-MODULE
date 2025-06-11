// src/app/shared/services/scanners/qr-file-scanner.service.ts
import { Injectable } from '@angular/core';
import { QRScanOptions, QRScanResult } from '../types/qr.types';

@Injectable({
    providedIn: 'root',
})
export class QrFileScannerService {
    /**
     * Escanea QR desde archivo seleccionado por el usuario
     */
    async scanFromFile(options: QRScanOptions = {}): Promise<QRScanResult> {
        try {
            const file = await this.selectFile();

            if (!file) {
                return {
                    success: false,
                    error: 'No se seleccionó ningún archivo',
                    method: 'file-upload',
                };
            }

            // Validar tipo de archivo
            const validTypes = [
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/webp',
                'image/gif',
            ];
            if (!validTypes.includes(file.type)) {
                return {
                    success: false,
                    error: 'Tipo de archivo no soportado. Use JPG, PNG, WebP o GIF',
                    method: 'file-upload',
                };
            }

            // Validar tamaño (máximo 10MB)
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                return {
                    success: false,
                    error: 'El archivo es demasiado grande. Máximo 10MB',
                    method: 'file-upload',
                };
            }

            // Escanear archivo
            const qrContent = await this.processImageFile(file);

            if (qrContent) {
                return {
                    success: true,
                    rawData: qrContent,
                    method: 'file-upload',
                };
            } else {
                return {
                    success: false,
                    error: 'No se encontró código QR en la imagen',
                    method: 'file-upload',
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Error procesando archivo: ${error.message}`,
                method: 'file-upload',
            };
        }
    }

    /**
     * Escanea QR desde archivo específico (para uso programático)
     */
    async scanFile(file: File): Promise<QRScanResult> {
        try {
            const qrContent = await this.processImageFile(file);

            if (qrContent) {
                return {
                    success: true,
                    rawData: qrContent,
                    method: 'file-upload',
                };
            } else {
                return {
                    success: false,
                    error: 'No se encontró código QR en la imagen',
                    method: 'file-upload',
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Error procesando archivo: ${error.message}`,
                method: 'file-upload',
            };
        }
    }

    /**
     * Permite al usuario seleccionar un archivo
     */
    private selectFile(): Promise<File | null> {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.style.display = 'none';

            input.onchange = (event: any) => {
                const file = event.target.files[0];
                resolve(file || null);
            };

            input.oncancel = () => {
                resolve(null);
            };

            // Agregar al DOM temporalmente
            document.body.appendChild(input);
            input.click();

            // Limpiar después de un tiempo
            setTimeout(() => {
                if (input.parentNode) {
                    input.parentNode.removeChild(input);
                }
            }, 1000);
        });
    }

    /**
     * Procesa imagen y extrae contenido QR
     */
    private async processImageFile(file: File): Promise<string | null> {
        try {
            // Importar dinámicamente qr-scanner
            const QrScanner = (await import('qr-scanner')).default;

            // Escanear imagen
            const result = await QrScanner.scanImage(file, {
                returnDetailedScanResult: true, // Devuelve objeto completo con cornerPoints
                alsoTryWithoutScanRegion: true, // Si falla con región, intenta sin ella
                disallowCanvasResizing: false, // Permite redimensionar canvas para optimizar
                scanRegion: null, // Sin región específica (escanea toda la imagen)
                canvas: null, // Deja que cree su propio canvas
                qrEngine: null, // Usa engine automático (BarcodeDetector o Worker)
            });

            // El resultado es un objeto ScanResult con { data: string, cornerPoints: Point[] }
            return result.data;
        } catch (error: any) {
            console.error('Error scanning image:', error);

            // Intentar con métodos alternativos si falla el principal
            try {
                return await this.fallbackImageScan(file);
            } catch (fallbackError) {
                console.error('Fallback scan also failed:', fallbackError);
                return null;
            }
        }
    }

    /**
     * Método alternativo de escaneo si falla el principal
     */
    private async fallbackImageScan(file: File): Promise<string | null> {
        return new Promise((resolve) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const img = new Image();
                    img.onload = async () => {
                        try {
                            // Crear canvas para procesar imagen
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');

                            if (!ctx) {
                                resolve(null);
                                return;
                            }

                            // Redimensionar si es necesario
                            let { width, height } = this.calculateDimensions(
                                img.width,
                                img.height,
                                800
                            );

                            canvas.width = width;
                            canvas.height = height;

                            // Dibujar imagen
                            ctx.drawImage(img, 0, 0, width, height);

                            // Convertir a blob y escanear nuevamente
                            canvas.toBlob(
                                async (blob) => {
                                    if (!blob) {
                                        resolve(null);
                                        return;
                                    }

                                    try {
                                        const QrScanner = (
                                            await import('qr-scanner')
                                        ).default;
                                        const result =
                                            await QrScanner.scanImage(blob);
                                        resolve(result);
                                    } catch (error) {
                                        resolve(null);
                                    }
                                },
                                'image/png',
                                0.9
                            );
                        } catch (error) {
                            resolve(null);
                        }
                    };

                    img.onerror = () => resolve(null);
                    img.src = e.target?.result as string;
                } catch (error) {
                    resolve(null);
                }
            };

            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
    }

    /**
     * Calcula dimensiones optimizadas para procesamiento
     */
    private calculateDimensions(
        originalWidth: number,
        originalHeight: number,
        maxSize: number = 800
    ): { width: number; height: number } {
        if (originalWidth <= maxSize && originalHeight <= maxSize) {
            return { width: originalWidth, height: originalHeight };
        }

        const ratio = Math.min(
            maxSize / originalWidth,
            maxSize / originalHeight
        );

        return {
            width: Math.round(originalWidth * ratio),
            height: Math.round(originalHeight * ratio),
        };
    }

    /**
     * Valida si un archivo es una imagen válida
     */
    isValidImageFile(file: File): boolean {
        const validTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/gif',
        ];
        const maxSize = 10 * 1024 * 1024; // 10MB

        return validTypes.includes(file.type) && file.size <= maxSize;
    }

    /**
     * Obtiene información del archivo para mostrar al usuario
     */
    getFileInfo(file: File): {
        name: string;
        size: string;
        type: string;
        isValid: boolean;
    } {
        return {
            name: file.name,
            size: this.formatFileSize(file.size),
            type: file.type,
            isValid: this.isValidImageFile(file),
        };
    }

    /**
     * Formatea el tamaño del archivo
     */
    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
