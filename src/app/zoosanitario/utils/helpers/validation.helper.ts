// ===== VALIDATION HELPERS =====
export class VeterinaryValidators {
    static certificateNumber(control: any) {
        if (!control.value) return null;

        const pattern = /^[A-Z]{2,4}-\d{6,8}-\d{4}$/;
        if (!pattern.test(control.value)) {
            return { invalidCertificateNumber: true };
        }

        return null;
    }

    static temperature(min: number, max: number) {
        return (control: any) => {
            if (!control.value) return null;

            const value = parseFloat(control.value);
            if (value < min || value > max) {
                return { temperatureOutOfRange: { min, max, actual: value } };
            }

            return null;
        };
    }

    static weight(min: number, max: number) {
        return (control: any) => {
            if (!control.value) return null;

            const value = parseFloat(control.value);
            if (value < min || value > max) {
                return { weightOutOfRange: { min, max, actual: value } };
            }

            return null;
        };
    }

    static ecuadorianId(control: any) {
        if (!control.value) return null;

        const id = control.value.toString();
        if (!/^\d{10}$/.test(id)) {
            return { invalidEcuadorianId: true };
        }

        // Validar dígito verificador
        const digits = id.split('').map(Number);
        const province = parseInt(id.substr(0, 2));

        if (province < 1 || province > 24) {
            return { invalidEcuadorianId: true };
        }

        const checkDigit = digits[9];
        let sum = 0;

        for (let i = 0; i < 9; i++) {
            let coefficient = i % 2 === 0 ? 2 : 1;
            let result = digits[i] * coefficient;

            if (result > 9) {
                result -= 9;
            }

            sum += result;
        }

        const calculatedCheckDigit = sum % 10 === 0 ? 0 : 10 - (sum % 10);

        if (calculatedCheckDigit !== checkDigit) {
            return { invalidEcuadorianId: true };
        }

        return null;
    }
}
