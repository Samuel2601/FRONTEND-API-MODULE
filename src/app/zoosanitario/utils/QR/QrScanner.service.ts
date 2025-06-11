// src/app/shared/services/qr-scanner.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
    QRScanResult,
    QRScanOptions,
    QRScanMethod,
    Platform,
    QRScanEvent,
    AnimalHealthCertificate,
} from './types/qr.types';

import { QrCameraScannerService } from './scanners/qr-camera-scanner.service';
import { QrFileScannerService } from './scanners/qr-file-scanner.service';
import { QrClipboardScannerService } from './scanners/qr-clipboard-scanner.service';
import { QrCertificateParserService } from './qr-certificate-parser.service';

@Injectable({
    providedIn: 'root',
})
export class QrScannerService implements OnDestroy {
    private destroy$ = new Subject<void>();

    // Estados observables
    private scanningState$ = new BehaviorSubject<boolean>(false);
    private scanEvents$ = new Subject<QRScanEvent>();

    // Propiedades públicas
    public isScanning$ = this.scanningState$.asObservable();
    public events$ = this.scanEvents$.asObservable();

    private currentScanPromise: Promise<QRScanResult> | null = null;

    constructor(
        private certificateParser: QrCertificateParserService,
        private cameraScanner: QrCameraScannerService,
        private fileScanner: QrFileScannerService,
        private clipboardScanner: QrClipboardScannerService
    ) {}

    /**
     * Detecta la plataforma actual
     */
    getPlatform(): Platform {
        const platform = Capacitor.getPlatform();
        if (platform === 'web') return 'web';
        if (platform === 'ios') return 'ios';
        if (platform === 'android') return 'android';
        return 'web';
    }

    /**
     * Obtiene los métodos de escaneo disponibles según la plataforma
     */
    getAvailableMethods(): QRScanMethod[] {
        const platform = this.getPlatform();
        const baseMethods: QRScanMethod[] = [
            'file-upload',
            'clipboard-manual',
            'manual-input',
        ];

        if (platform === 'web') {
            return ['camera-web', ...baseMethods];
        } else {
            // iOS/Android
            return ['camera-capacitor', 'clipboard-auto', ...baseMethods];
        }
    }

    getMethodLabel(method: string): string {
        return this.getMethodLabelMap()[method];
    }

    getMethodLabelMap(): Record<string, string> {
        return {
            'camera-capacitor': 'Cámara',
            'camera-web': 'Cámara Web',
            'file-upload': 'Archivo',
            'clipboard-auto': 'Portapapeles',
            'clipboard-manual': 'Portapapeles Manual',
            'manual-input': 'Entrada Manual',
        };
    }

    /**
     * Escanea QR con el mejor método disponible
     */
    async scanQR(options: QRScanOptions = {}): Promise<QRScanResult> {
        if (this.scanningState$.value) {
            throw new Error('Ya hay un escaneo en progreso');
        }

        const platform = this.getPlatform();
        const availableMethods = this.getAvailableMethods();

        // Determinar método preferido
        let method: QRScanMethod;
        if (
            options.preferredMethod &&
            availableMethods.includes(options.preferredMethod)
        ) {
            method = options.preferredMethod;
        } else {
            // Método por defecto según plataforma
            method = platform === 'web' ? 'camera-web' : 'camera-capacitor';
        }

        return this.scanWithMethod(method, options);
    }

    /**
     * Escanea con un método específico
     */
    async scanWithMethod(
        method: QRScanMethod,
        options: QRScanOptions = {}
    ): Promise<QRScanResult> {
        if (this.scanningState$.value) {
            throw new Error('Ya hay un escaneo en progreso');
        }

        this.setScanningState(true);
        this.emitEvent('scan-start', method);

        try {
            let result: QRScanResult;

            switch (method) {
                case 'camera-capacitor':
                    result = await this.cameraScanner.scanWithCapacitor(
                        options
                    );
                    break;

                case 'camera-web':
                    result = await this.cameraScanner.scanWithWebCamera(
                        options
                    );
                    break;

                case 'file-upload':
                    result = await this.fileScanner.scanFromFile(options);
                    break;

                case 'clipboard-auto':
                    result = await this.clipboardScanner.scanFromClipboard(
                        options
                    );
                    break;

                case 'clipboard-manual':
                    result = await this.clipboardScanner.manualPaste(options);
                    break;

                case 'manual-input':
                    result = await this.manualInput(options);
                    break;

                default:
                    throw new Error(
                        `Método de escaneo no soportado: ${method}`
                    );
            }

            // Procesar resultado
            if (result.success && result.rawData) {
                const parseResult = this.certificateParser.parseQRToCertificate(
                    result.rawData
                );

                if (parseResult.certificate && parseResult.validation.isValid) {
                    result.data = parseResult.certificate;
                    this.emitEvent('scan-success', method, {
                        certificate: parseResult.certificate,
                    });
                } else {
                    result.success = false;
                    result.error =
                        parseResult.validation.errors.join(', ') ||
                        'Contenido QR inválido';
                    this.emitEvent('scan-error', method, {
                        errors: parseResult.validation.errors,
                    });
                }
            }

            result.method = method;
            result.timestamp = new Date();

            return result;
        } catch (error: any) {
            console.error('Error en escaneo:', error);
            const errorResult: QRScanResult = {
                success: false,
                error: error.message || 'Error desconocido durante el escaneo',
                method,
                timestamp: new Date(),
            };

            this.emitEvent('scan-error', method, { error: error.message });
            return errorResult;
        } finally {
            this.setScanningState(false);
        }
    }

    /**
     * Entrada manual de certificado
     */
    async manualInput(options: QRScanOptions = {}): Promise<QRScanResult> {
        return new Promise((resolve) => {
            // Esto se maneja típicamente desde un componente UI
            // Aquí solo proporcionamos la estructura
            resolve({
                success: false,
                error: 'Entrada manual debe ser manejada por componente UI',
                method: 'manual-input',
                timestamp: new Date(),
            });
        });
    }

    /**
     * Crear certificado desde entrada manual
     */
    createCertificateFromManualInput(
        data: Partial<AnimalHealthCertificate>
    ): QRScanResult {
        try {
            // Validar datos mínimos
            const requiredFields = [
                'numeroCZPM',
                'autorizadoA',
                'codigoAreaOrigen',
                'codigoAreaDestino',
            ];
            const missingFields = requiredFields.filter(
                (field) => !data[field as keyof AnimalHealthCertificate]
            );

            if (missingFields.length > 0) {
                return {
                    success: false,
                    error: `Campos requeridos faltantes: ${missingFields.join(
                        ', '
                    )}`,
                    method: 'manual-input',
                    timestamp: new Date(),
                };
            }

            const certificate: AnimalHealthCertificate = {
                numeroCZPM: data.numeroCZPM || '',
                autorizadoA: data.autorizadoA || '',
                codigoAreaOrigen: data.codigoAreaOrigen || '',
                codigoAreaDestino: data.codigoAreaDestino || '',
                totalProductos: data.totalProductos || 1,
                validoHasta: data.validoHasta || new Date(),
                vehiculo: data.vehiculo || '',
            };

            // Validar certificado
            const validation =
                this.certificateParser['validateCertificate'](certificate);

            if (!validation.isValid) {
                return {
                    success: false,
                    error: validation.errors.join(', '),
                    method: 'manual-input',
                    timestamp: new Date(),
                };
            }

            return {
                success: true,
                data: certificate,
                rawData: this.certificateToString(certificate),
                method: 'manual-input',
                timestamp: new Date(),
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Error procesando entrada manual',
                method: 'manual-input',
                timestamp: new Date(),
            };
        }
    }

    /**
     * Convierte certificado a string (para rawData)
     */
    private certificateToString(cert: AnimalHealthCertificate): string {
        return `CZPM Nº: ${cert.numeroCZPM}
AUTORIZADO A: ${cert.autorizadoA}
CODIGÓ ÁREA ORIGEN: ${cert.codigoAreaOrigen}
CODIGÓ ÁREA DESTINO: ${cert.codigoAreaDestino}
TOTAL PRODUCTOS: ${cert.totalProductos}
VALIDO HASTA: ${cert.validoHasta.toISOString().slice(0, 19).replace('T', ' ')}
VEHICULO: ${cert.vehiculo}`;
    }

    /**
     * Cancela el escaneo actual
     */
    cancelScan(): void {
        if (this.scanningState$.value) {
            // Cancelar escáneres específicos
            this.cameraScanner.cancelScan();
            this.clipboardScanner.cancelScan();

            this.setScanningState(false);
            this.emitEvent('scan-cancel', 'camera-web'); // método genérico
        }
    }

    /**
     * Verifica si está escaneando
     */
    get isScanning(): boolean {
        return this.scanningState$.value;
    }

    /**
     * Establece el estado de escaneo
     */
    private setScanningState(scanning: boolean): void {
        this.scanningState$.next(scanning);
    }

    /**
     * Emite eventos de escaneo
     */
    private emitEvent(
        type: QRScanEvent['type'],
        method: QRScanMethod,
        data?: any,
        error?: string
    ): void {
        this.scanEvents$.next({
            type,
            method,
            data,
            error,
        });
    }

    /**
     * Limpieza al destruir el servicio
     */
    ngOnDestroy(): void {
        this.cancelScan();
        this.destroy$.next();
        this.destroy$.complete();
    }
}
