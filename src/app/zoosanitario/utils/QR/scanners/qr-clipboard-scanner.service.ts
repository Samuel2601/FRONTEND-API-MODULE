// src/app/shared/services/scanners/qr-clipboard-scanner.service.ts
import { Injectable } from '@angular/core';
import { Clipboard } from '@capacitor/clipboard';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { QRScanOptions, QRScanResult } from '../types/qr.types';

@Injectable({
    providedIn: 'root',
})
export class QrClipboardScannerService {
    private isMonitoring = false;
    private monitoringInterval: any = null;
    private lastClipboardContent = '';
    private appStateListener: any = null;

    /**
     * Escaneo automático desde portapapeles (para apps nativas)
     */
    async scanFromClipboard(
        options: QRScanOptions = {}
    ): Promise<QRScanResult> {
        if (!Capacitor.isNativePlatform()) {
            return {
                success: false,
                error: 'Escaneo automático de portapapeles solo disponible en apps nativas',
                method: 'clipboard-auto',
            };
        }

        try {
            return new Promise<QRScanResult>((resolve) => {
                const timeout = options.timeout || 60000; // 1 minuto por defecto

                this.startClipboardMonitoring((content) => {
                    this.stopClipboardMonitoring();
                    resolve({
                        success: true,
                        rawData: content,
                        method: 'clipboard-auto',
                    });
                });

                // Configurar listeners de app
                this.setupAppStateListener();

                // Timeout
                setTimeout(() => {
                    this.stopClipboardMonitoring();
                    resolve({
                        success: false,
                        error: 'Tiempo de espera agotado',
                        method: 'clipboard-auto',
                    });
                }, timeout);
            });
        } catch (error: any) {
            this.stopClipboardMonitoring();
            return {
                success: false,
                error: `Error en monitoreo de portapapeles: ${error.message}`,
                method: 'clipboard-auto',
            };
        }
    }

    /**
     * Escaneo manual desde portapapeles
     */
    async manualPaste(options: QRScanOptions = {}): Promise<QRScanResult> {
        try {
            let clipboardContent: string;

            if (Capacitor.isNativePlatform()) {
                // Usar Capacitor Clipboard
                const { value } = await Clipboard.read();
                clipboardContent = value || '';
            } else {
                // Usar Web Clipboard API
                if (!navigator.clipboard) {
                    return {
                        success: false,
                        error: 'Clipboard API no disponible. Pegue manualmente.',
                        method: 'clipboard-manual',
                    };
                }
                clipboardContent = await navigator.clipboard.readText();
            }

            if (!clipboardContent.trim()) {
                return {
                    success: false,
                    error: 'El portapapeles está vacío',
                    method: 'clipboard-manual',
                };
            }

            return {
                success: true,
                rawData: clipboardContent,
                method: 'clipboard-manual',
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Error leyendo portapapeles: ${error.message}`,
                method: 'clipboard-manual',
            };
        }
    }

    /**
     * Inicia el monitoreo del portapapeles
     */
    private startClipboardMonitoring(
        onContentFound: (content: string) => void
    ): void {
        if (this.isMonitoring) {
            this.stopClipboardMonitoring();
        }

        this.isMonitoring = true;

        // Leer contenido inicial
        this.readInitialClipboard();

        // Monitorear cambios cada segundo
        this.monitoringInterval = setInterval(async () => {
            try {
                const { value } = await Clipboard.read();
                const content = value || '';

                if (content && content !== this.lastClipboardContent) {
                    console.log('Nuevo contenido detectado en portapapeles');
                    this.lastClipboardContent = content;

                    // Verificar si parece ser un certificado
                    if (this.looksLikeCertificate(content)) {
                        onContentFound(content);
                    }
                }
            } catch (error) {
                console.warn('Error verificando portapapeles:', error);
            }
        }, 1000);
    }

    /**
     * Detiene el monitoreo del portapapeles
     */
    private stopClipboardMonitoring(): void {
        this.isMonitoring = false;

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        if (this.appStateListener) {
            this.appStateListener.remove();
            this.appStateListener = null;
        }
    }

    /**
     * Lee el contenido inicial del portapapeles
     */
    private async readInitialClipboard(): Promise<void> {
        try {
            const { value } = await Clipboard.read();
            this.lastClipboardContent = value || '';
        } catch (error) {
            console.warn('Error leyendo portapapeles inicial:', error);
            this.lastClipboardContent = '';
        }
    }

    /**
     * Configura listener para detectar cuando la app vuelve a primer plano
     */
    private setupAppStateListener(): void {
        if (!Capacitor.isNativePlatform()) return;

        this.appStateListener = App.addListener(
            'appStateChange',
            async (state) => {
                if (state.isActive && this.isMonitoring) {
                    console.log(
                        'App volvió a primer plano, verificando portapapeles...'
                    );

                    // Dar tiempo para que el sistema copie al portapapeles
                    setTimeout(async () => {
                        try {
                            const { value } = await Clipboard.read();
                            const content = value || '';

                            if (
                                content &&
                                content !== this.lastClipboardContent
                            ) {
                                this.lastClipboardContent = content;

                                if (this.looksLikeCertificate(content)) {
                                    // El callback se manejará en el próximo ciclo del interval
                                }
                            }
                        } catch (error) {
                            console.warn(
                                'Error verificando portapapeles al volver:',
                                error
                            );
                        }
                    }, 500);
                }
            }
        );
    }

    /**
     * Verifica si el contenido parece ser un certificado zoosanitario
     */
    private looksLikeCertificate(content: string): boolean {
        const upperContent = content.toUpperCase();

        // Patrones que indican que es un certificado
        const certificatePatterns = [
            'CZPM',
            'AUTORIZADO A:',
            'CERTIFICADO ZOOSANITARIO',
            'VALIDO HASTA',
            'VÁLIDO HASTA',
            'TOTAL PRODUCTOS',
            'VEHICULO:',
        ];

        // Patrones que indican que NO es un certificado
        const exclusionPatterns = [
            'HTTP://',
            'HTTPS://',
            'WWW.',
            '.COM',
            '.ORG',
            '.NET',
        ];

        // Verificar exclusiones
        const hasExclusion = exclusionPatterns.some((pattern) =>
            upperContent.includes(pattern)
        );

        if (hasExclusion) return false;

        // Verificar patrones de certificado
        const certificateScore = certificatePatterns.reduce(
            (score, pattern) => {
                return upperContent.includes(pattern) ? score + 1 : score;
            },
            0
        );

        // Requiere al menos 2 patrones para considerar válido
        return certificateScore >= 2;
    }

    /**
     * Obtiene el último contenido del portapapeles
     */
    async getCurrentClipboardContent(): Promise<string> {
        try {
            if (Capacitor.isNativePlatform()) {
                const { value } = await Clipboard.read();
                return value || '';
            } else {
                if (navigator.clipboard) {
                    return await navigator.clipboard.readText();
                }
                return '';
            }
        } catch (error) {
            console.warn('Error leyendo portapapeles:', error);
            return '';
        }
    }

    /**
     * Cancela el monitoreo actual
     */
    cancelScan(): void {
        this.stopClipboardMonitoring();
    }

    /**
     * Verifica si está monitoreando
     */
    get isCurrentlyMonitoring(): boolean {
        return this.isMonitoring;
    }

    /**
     * Limpia recursos
     */
    cleanup(): void {
        this.stopClipboardMonitoring();
    }
}
