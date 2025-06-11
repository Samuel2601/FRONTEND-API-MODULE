// src/app/shared/services/qr-certificate-parser.service.ts
import { Injectable } from '@angular/core';
import {
    AnimalHealthCertificate,
    QRParseResult,
    QRValidationResult,
} from './types/qr.types';

@Injectable({
    providedIn: 'root',
})
export class QrCertificateParserService {
    /**
     * Parsea un string QR a un certificado zoosanitario
     */
    parseQRToCertificate(qrText: string): QRParseResult {
        const normalizedText = this.normalizeText(qrText);
        const validation = this.validateQRText(normalizedText);

        if (!validation.isValid) {
            return {
                validation,
                rawData: qrText,
            };
        }

        const certificate = this.extractCertificateData(normalizedText);

        // Re-validar con datos extraídos
        const finalValidation = this.validateCertificate(certificate);

        return {
            certificate,
            validation: finalValidation,
            rawData: qrText,
        };
    }

    /**
     * Normaliza el texto del QR
     */
    private normalizeText(text: string): string {
        return text
            .trim()
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\t/g, ' ')
            .replace(/\s+/g, ' ')
            .toUpperCase();
    }

    /**
     * Valida si el texto parece ser un certificado zoosanitario
     */
    validateQRText(qrText: string): QRValidationResult {
        const normalizedText = this.normalizeText(qrText);
        const errors: string[] = [];
        const warnings: string[] = [];
        let score = 0;

        // Patrones requeridos
        const requiredPatterns = [
            {
                pattern: /CZPM\s*N[°º]?:?\s*\d{4}-\d{2}-\d+/i,
                weight: 30,
                field: 'CZPM Number',
            },
            {
                pattern: /AUTORIZADO\s+A:\s*\d+/i,
                weight: 25,
                field: 'Autorizado A',
            },
            {
                pattern: /CODIG[OÓ]\s*ÁREA\s*ORIGEN:/i,
                weight: 20,
                field: 'Código Área Origen',
            },
            {
                pattern: /CODIG[OÓ]\s*ÁREA\s*DESTINO:/i,
                weight: 20,
                field: 'Código Área Destino',
            },
            {
                pattern: /TOTAL\s*PRODUCTOS:\s*\d+/i,
                weight: 15,
                field: 'Total Productos',
            },
            {
                pattern: /V[ÁA]LIDO?\s*HASTA:/i,
                weight: 20,
                field: 'Válido Hasta',
            },
        ];

        // Patrones opcionales
        const optionalPatterns = [
            {
                pattern: /VEHICULO:\s*[A-Z0-9]+/i,
                weight: 10,
                field: 'Vehículo',
            },
        ];

        // Patrones de exclusión (URLs, etc.)
        const exclusionPatterns = [
            'HTTP://',
            'HTTPS://',
            'WWW.',
            '.COM',
            '.ORG',
            '.NET',
            'FACEBOOK',
            'INSTAGRAM',
            'WHATSAPP',
            'PLAY.GOOGLE',
        ];

        // Verificar exclusiones
        const hasExclusion = exclusionPatterns.some((pattern) =>
            normalizedText.includes(pattern)
        );

        if (hasExclusion) {
            errors.push(
                'El contenido parece ser una URL o enlace, no un certificado'
            );
            return { isValid: false, errors, warnings, score: 0 };
        }

        // Verificar patrones requeridos
        requiredPatterns.forEach(({ pattern, weight, field }) => {
            if (pattern.test(normalizedText)) {
                score += weight;
            } else {
                errors.push(`Campo requerido no encontrado: ${field}`);
            }
        });

        // Verificar patrones opcionales
        optionalPatterns.forEach(({ pattern, weight, field }) => {
            if (pattern.test(normalizedText)) {
                score += weight;
            } else {
                warnings.push(`Campo opcional no encontrado: ${field}`);
            }
        });

        const isValid = score >= 90; // Requiere al menos 90% de patrones requeridos

        return {
            isValid,
            errors,
            warnings,
            score,
        };
    }

    /**
     * Extrae los datos del certificado del texto QR
     */
    private extractCertificateData(
        normalizedText: string
    ): AnimalHealthCertificate {
        const patterns = {
            numeroCZPM: [/CZPM\s*N[°º]?:?\s*([0-9-]+)/i, /(\d{4}-\d{2}-\d+)/i],
            autorizadoA: [
                /AUTORIZADO\s+A:\s*(\d+)/i,
                /AUTORIZADO\s*A\s*(\d+)/i,
            ],
            codigoAreaOrigen: [
                /CODIG[OÓ]\s*ÁREA\s*ORIGEN:\s*([0-9-]+)/i,
                /ORIGEN:\s*([0-9-]+)/i,
            ],
            codigoAreaDestino: [
                /CODIG[OÓ]\s*ÁREA\s*DESTINO:\s*([0-9-]+)/i,
                /DESTINO:\s*([0-9-]+)/i,
            ],
            totalProductos: [
                /TOTAL\s*PRODUCTOS:\s*(\d+)/i,
                /PRODUCTOS:\s*(\d+)/i,
            ],
            validoHasta: [
                /V[ÁA]LIDO?\s*HASTA:\s*([\d\s:-]+)/i,
                /HASTA:\s*([\d\s:-]+)/i,
            ],
            vehiculo: [/VEHICULO:\s*([A-Z0-9]+)/i, /VEHÍCULO:\s*([A-Z0-9]+)/i],
        };

        const certificate: AnimalHealthCertificate = {
            numeroCZPM:
                this.extractValue(normalizedText, patterns.numeroCZPM) || '',
            autorizadoA:
                this.extractValue(normalizedText, patterns.autorizadoA) || '',
            codigoAreaOrigen:
                this.extractValue(normalizedText, patterns.codigoAreaOrigen) ||
                '',
            codigoAreaDestino:
                this.extractValue(normalizedText, patterns.codigoAreaDestino) ||
                '',
            totalProductos: parseInt(
                this.extractValue(normalizedText, patterns.totalProductos) ||
                    '1'
            ),
            validoHasta: this.parseDate(
                this.extractValue(normalizedText, patterns.validoHasta) || ''
            ),
            vehiculo:
                this.extractValue(normalizedText, patterns.vehiculo) || '',
        };

        return certificate;
    }

    /**
     * Extrae un valor usando múltiples patrones
     */
    private extractValue(text: string, patterns: RegExp[]): string {
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return '';
    }

    /**
     * Parsea una fecha desde el QR
     */
    private parseDate(dateString: string): Date {
        if (!dateString) {
            return new Date();
        }

        try {
            // Limpiar la fecha
            const cleanDate = dateString.trim().replace(/\s+/g, ' ');

            // Intentar parseado directo
            let date = new Date(cleanDate);
            if (!isNaN(date.getTime())) {
                return date;
            }

            // Parsing manual para formato: 2023-05-29 13:18:00
            const datePattern =
                /(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}):(\d{1,2}))?/;
            const match = cleanDate.match(datePattern);

            if (match) {
                const year = parseInt(match[1]);
                const month = parseInt(match[2]) - 1; // JS months are 0-based
                const day = parseInt(match[3]);
                const hour = match[4] ? parseInt(match[4]) : 0;
                const minute = match[5] ? parseInt(match[5]) : 0;
                const second = match[6] ? parseInt(match[6]) : 0;

                return new Date(year, month, day, hour, minute, second);
            }

            // Fallback a fecha actual
            return new Date();
        } catch (error) {
            console.error('Error parsing date:', error);
            return new Date();
        }
    }

    /**
     * Valida un certificado extraído
     */
    private validateCertificate(
        certificate: AnimalHealthCertificate
    ): QRValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        let score = 100;

        // Validaciones requeridas
        if (!certificate.numeroCZPM) {
            errors.push('Número CZPM es requerido');
            score -= 30;
        }

        if (!certificate.autorizadoA) {
            errors.push('Campo "Autorizado A" es requerido');
            score -= 25;
        }

        if (!certificate.codigoAreaOrigen) {
            errors.push('Código de área origen es requerido');
            score -= 20;
        }

        if (!certificate.codigoAreaDestino) {
            errors.push('Código de área destino es requerido');
            score -= 20;
        }

        if (!certificate.totalProductos || certificate.totalProductos < 1) {
            errors.push('Total de productos debe ser mayor a 0');
            score -= 15;
        }

        // Validación de fecha
        if (certificate.validoHasta) {
            const now = new Date();
            const validUntil = new Date(certificate.validoHasta);

            // Eliminar la hora para comparar solo fechas
            now.setHours(0, 0, 0, 0);
            validUntil.setHours(0, 0, 0, 0);

            if (validUntil < now) {
                errors.push('El certificado ha expirado');
                score -= 20;
            } else {
                const daysUntilExpiry = Math.ceil(
                    (validUntil.getTime() - now.getTime()) /
                        (1000 * 60 * 60 * 24)
                );
                if (daysUntilExpiry <= 3) {
                    warnings.push(
                        `El certificado expira en ${daysUntilExpiry} día(s)`
                    );
                }
            }
        } else {
            warnings.push('Fecha de validez no especificada');
        }

        // Validaciones opcionales
        if (!certificate.vehiculo) {
            warnings.push('Vehículo no especificado');
            score -= 5;
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            score: Math.max(0, score),
        };
    }

    /**
     * Calcula la puntuación de probabilidad de que sea un certificado
     */
    scoreCertificateLikelihood(qrText: string): number {
        const validation = this.validateQRText(qrText);
        return validation.score;
    }
}
