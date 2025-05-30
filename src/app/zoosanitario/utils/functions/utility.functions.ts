// ===== UTILITY FUNCTIONS =====
export class VeterinaryUtils {
    static formatCertificateNumber(number: string): string {
        // Formato: ABC-123456-2024
        const parts = number.split('-');
        if (parts.length === 3) {
            return `${parts[0].toUpperCase()}-${parts[1].padStart(6, '0')}-${
                parts[2]
            }`;
        }
        return number.toUpperCase();
    }

    static validateCertificateNumber(number: string): boolean {
        const pattern = /^[A-Z]{2,4}-\d{6,8}-\d{4}$/;
        return pattern.test(number);
    }

    static calculateAnimalAge(birthDate: Date): number {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();

        if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birth.getDate())
        ) {
            age--;
        }

        return age;
    }

    static calculateProcessingYield(
        liveWeight: number,
        carcassWeight: number
    ): number {
        if (liveWeight <= 0) return 0;
        return (carcassWeight / liveWeight) * 100;
    }

    static formatTemperature(celsius: number, unit: 'C' | 'F' = 'C'): string {
        if (unit === 'F') {
            const fahrenheit = (celsius * 9) / 5 + 32;
            return `${fahrenheit.toFixed(1)}°F`;
        }
        return `${celsius.toFixed(1)}°C`;
    }

    static formatWeight(kg: number, unit: 'kg' | 'lb' = 'kg'): string {
        if (unit === 'lb') {
            const pounds = kg * 2.20462;
            return `${pounds.toFixed(2)} lb`;
        }
        return `${kg.toFixed(2)} kg`;
    }

    static generateBatchNumber(prefix: string = 'LT'): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');

        return `${prefix}${year}${month}${day}${hours}${minutes}`;
    }

    static isExpired(date: Date | string): boolean {
        const expirationDate = new Date(date);
        const now = new Date();
        return expirationDate < now;
    }

    static isExpiringSoon(
        date: Date | string,
        daysThreshold: number = 7
    ): boolean {
        const expirationDate = new Date(date);
        const now = new Date();
        const diffTime = expirationDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays <= daysThreshold && diffDays > 0;
    }

    static sanitizeFileName(fileName: string): string {
        return fileName
            .replace(/[^a-z0-9áéíóúüñ\s\-_\.]/gi, '')
            .replace(/\s+/g, '_')
            .toLowerCase();
    }

    static downloadFile(data: Blob, fileName: string, mimeType: string) {
        const blob = new Blob([data], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    static debounce<T extends (...args: any[]) => any>(
        func: T,
        delay: number
    ): (...args: Parameters<T>) => void {
        let timeoutId: NodeJS.Timeout;

        return (...args: Parameters<T>) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(null, args), delay);
        };
    }

    static deepClone<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }

    static generateQRCodeData(certificate: any): string {
        return JSON.stringify({
            number: certificate.certificateNumber,
            issued: certificate.issueDate,
            validUntil: certificate.validUntil,
            hash: certificate.documentHash,
        });
    }
}
