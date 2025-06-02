import { Injectable } from '@angular/core';

export interface QRCertificateData {
    certificateNumber: string;
    authorizedTo: string;
    originCode: string;
    destinationCode: string;
    totalProducts: number;
    validUntil: string;
    vehicle: string;
    rawData: string;
}

@Injectable({
    providedIn: 'root',
})
export class QrDataParserService {
    private extractValue(line: string, prefixes: string[]): string {
        for (const prefix of prefixes) {
            const index = line.indexOf(prefix);
            if (index !== -1) {
                return line.substring(index + prefix.length).trim();
            }
        }
        return '';
    }

    // Método para validar si el texto parece ser un certificado zoosanitario
    // Método mejorado para validar certificados
    isValidCertificateQR(qrText: string): boolean {
        if (!qrText || typeof qrText !== 'string') {
            return false;
        }

        const upperText = qrText.toUpperCase();

        // Patrones positivos más específicos
        const certificatePatterns = [
            'CZPM',
            'CERTIFICADO ZOOSANITARIO',
            'AUTORIZADO A:',
            'VALIDO HASTA',
            'VÁLIDO HASTA',
            'TOTAL PRODUCTOS',
            'CODIGO ORIGEN',
            'CÓDIGO ORIGEN',
            'CODIGO DESTINO',
            'CÓDIGO DESTINO',
            'VEHICULO:',
            'VEHÍCULO:',
        ];

        // Patrones negativos (excluir)
        const exclusionPatterns = [
            'PLAY.GOOGLE.COM',
            'APPS/DETAILS',
            'HTTP://',
            'HTTPS://',
            'WWW.',
            '.COM/',
            '.ORG/',
            '.NET/',
            'FACEBOOK.COM',
            'INSTAGRAM.COM',
            'WHATSAPP',
        ];

        // Verificar exclusiones primero
        const hasExclusion = exclusionPatterns.some((pattern) =>
            upperText.includes(pattern)
        );
        if (hasExclusion) {
            return false;
        }

        // Verificar patrones de certificado
        const certificateScore = certificatePatterns.reduce(
            (score, pattern) => {
                return upperText.includes(pattern) ? score + 1 : score;
            },
            0
        );

        // Necesita al menos 2 patrones para ser considerado certificado válido
        return certificateScore >= 2;
    }

    // Método para puntuar qué tan probable es que sea un certificado
    scoreCertificateLikelihood(qrText: string): number {
        const upperText = qrText.toUpperCase();
        let score = 0;

        // Patrones con diferentes pesos
        const patterns = [
            { pattern: 'CZPM', weight: 10 },
            { pattern: 'CERTIFICADO ZOOSANITARIO', weight: 10 },
            { pattern: 'AUTORIZADO A:', weight: 8 },
            { pattern: 'VALIDO HASTA', weight: 8 },
            { pattern: 'VÁLIDO HASTA', weight: 8 },
            { pattern: 'TOTAL PRODUCTOS:', weight: 6 },
            { pattern: 'ORIGEN:', weight: 5 },
            { pattern: 'DESTINO:', weight: 5 },
            { pattern: 'VEHICULO:', weight: 4 },
            { pattern: 'VEHÍCULO:', weight: 4 },
        ];

        patterns.forEach(({ pattern, weight }) => {
            if (upperText.includes(pattern)) {
                score += weight;
            }
        });

        // Penalizar por patrones de URL
        const urlPatterns = ['HTTP', 'HTTPS', 'WWW.', '.COM', '.ORG'];
        urlPatterns.forEach((pattern) => {
            if (upperText.includes(pattern)) {
                score -= 20;
            }
        });

        return Math.max(0, score);
    }

    // Método para limpiar texto del QR antes de parsear
    cleanQRText(qrText: string): string {
        return qrText
            .trim()
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\t/g, ' ')
            .replace(/\s+/g, ' ') // Múltiples espacios a uno solo
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .join('\n');
    }

    // Método mejorado para extraer valores con múltiples variantes
    private extractValueImproved(line: string, prefixes: string[]): string {
        const cleanLine = line.trim();

        for (const prefix of prefixes) {
            // Buscar exacto
            let index = cleanLine.indexOf(prefix);
            if (index !== -1) {
                return cleanLine.substring(index + prefix.length).trim();
            }

            // Buscar sin distinguir mayúsculas/minúsculas
            index = cleanLine.toUpperCase().indexOf(prefix.toUpperCase());
            if (index !== -1) {
                return cleanLine.substring(index + prefix.length).trim();
            }

            // Buscar con espacios flexibles
            const flexiblePrefix = prefix.replace(/\s+/g, '\\s*');
            const regex = new RegExp(flexiblePrefix, 'i');
            const match = cleanLine.match(regex);
            if (match) {
                return cleanLine
                    .substring(match.index! + match[0].length)
                    .trim();
            }
        }

        return '';
    }

    // Método parseQRData mejorado
    parseQRData(qrText: string): QRCertificateData | null {
        try {
            // Limpiar texto primero
            const cleanText = this.cleanQRText(qrText);

            // Verificar que sea un certificado válido
            if (!this.isValidCertificateQR(cleanText)) {
                console.warn(
                    'QR no parece ser un certificado zoosanitario válido'
                );
                return null;
            }

            const lines = cleanText.split('\n');
            const data: Partial<QRCertificateData> = {
                rawData: qrText,
            };

            // Parsear con método mejorado
            for (const line of lines) {
                if (
                    line.includes('CZPM') &&
                    (line.includes('Nº:') || line.includes('N°:'))
                ) {
                    data.certificateNumber = this.extractValueImproved(line, [
                        'CZPM Nº:',
                        'CZPM N°:',
                        'CZPM NO:',
                        'CZPM-N°',
                        'CZPM:',
                    ])
                        .replace(/^[^\d]*/, '')
                        .trim(); // Remover prefijos no numéricos
                } else if (line.includes('AUTORIZADO A:')) {
                    data.authorizedTo = this.extractValueImproved(line, [
                        'AUTORIZADO A:',
                    ]).trim();
                } else if (line.includes('ORIGEN:')) {
                    data.originCode = this.extractValueImproved(line, [
                        'CÓDIGO ÁREA ORIGEN:',
                        'CODIGO AREA ORIGEN:',
                        'ORIGEN:',
                    ]).trim();
                } else if (line.includes('DESTINO:')) {
                    data.destinationCode = this.extractValueImproved(line, [
                        'CÓDIGO ÁREA DESTINO:',
                        'CODIGO AREA DESTINO:',
                        'DESTINO:',
                    ]).trim();
                } else if (line.includes('TOTAL PRODUCTOS:')) {
                    const value = this.extractValueImproved(line, [
                        'TOTAL PRODUCTOS:',
                    ]).trim();
                    data.totalProducts =
                        parseInt(value.replace(/\D/g, '')) || 0;
                } else if (
                    line.includes('VALIDO HASTA:') ||
                    line.includes('VÁLIDO HASTA:')
                ) {
                    data.validUntil = this.extractValueImproved(line, [
                        'VÁLIDO HASTA:',
                        'VALIDO HASTA:',
                    ]).trim();
                } else if (
                    line.includes('VEHICULO:') ||
                    line.includes('VEHÍCULO:')
                ) {
                    data.vehicle = this.extractValueImproved(line, [
                        'VEHÍCULO:',
                        'VEHICULO:',
                    ]).trim();
                }
            }

            // Validar campos críticos
            if (!data.certificateNumber) {
                console.error('No se pudo extraer el número de certificado');
                return null;
            }

            console.log('Datos parseados exitosamente:', data);
            return data as QRCertificateData;
        } catch (error) {
            console.error('Error parsing QR data:', error);
            return null;
        }
    }

    // Método para formatear la fecha del QR
    formatQRDate(dateString: string): Date | null {
        try {
            // Formatos posibles: "2023-05-29 13:18:00", "2023-05-29", etc.
            const cleanDate = dateString.trim().replace(/\s+/g, ' ');

            // Intentar parseado directo
            const date = new Date(cleanDate);

            if (isNaN(date.getTime())) {
                // Intentar otros formatos si es necesario
                const parts = cleanDate.split(/[-\s:]/);
                if (parts.length >= 3) {
                    const year = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1; // Meses en JS van de 0-11
                    const day = parseInt(parts[2]);
                    const hour = parts[3] ? parseInt(parts[3]) : 0;
                    const minute = parts[4] ? parseInt(parts[4]) : 0;
                    const second = parts[5] ? parseInt(parts[5]) : 0;

                    return new Date(year, month, day, hour, minute, second);
                }
                return null;
            }

            return date;
        } catch (error) {
            console.error('Error parsing date:', error);
            return null;
        }
    }
}
