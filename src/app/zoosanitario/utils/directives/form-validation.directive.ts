// ===== FORM VALIDATION DIRECTIVE =====
import { Directive, Input, OnInit } from '@angular/core';
import {
    AbstractControl,
    NG_VALIDATORS,
    ValidationErrors,
    Validator,
} from '@angular/forms';

@Directive({
    selector: '[appCustomValidator]',
    providers: [
        {
            provide: NG_VALIDATORS,
            useExisting: CustomValidatorDirective,
            multi: true,
        },
    ],
})
export class CustomValidatorDirective implements Validator, OnInit {
    @Input() validationType:
        | 'certificate'
        | 'temperature'
        | 'weight'
        | 'identification' = 'certificate';
    @Input() validationParams: any = {};

    ngOnInit() {
        // Configuración inicial si es necesaria
    }

    validate(control: AbstractControl): ValidationErrors | null {
        if (!control.value) {
            return null; // No validar si está vacío (usar required para eso)
        }

        switch (this.validationType) {
            case 'certificate':
                return this.validateCertificate(control.value);
            case 'temperature':
                return this.validateTemperature(control.value);
            case 'weight':
                return this.validateWeight(control.value);
            case 'identification':
                return this.validateIdentification(control.value);
            default:
                return null;
        }
    }

    private validateCertificate(value: string): ValidationErrors | null {
        // Formato: ABC-123456-2024
        const certificatePattern = /^[A-Z]{2,4}-\d{6,8}-\d{4}$/;

        if (!certificatePattern.test(value)) {
            return {
                invalidCertificate: {
                    message:
                        'Formato de certificado inválido (ej: ABC-123456-2024)',
                },
            };
        }

        return null;
    }

    private validateTemperature(value: number): ValidationErrors | null {
        const min = this.validationParams.min || -20;
        const max = this.validationParams.max || 50;

        if (value < min || value > max) {
            return {
                invalidTemperature: {
                    message: `Temperatura debe estar entre ${min}°C y ${max}°C`,
                },
            };
        }

        return null;
    }

    private validateWeight(value: number): ValidationErrors | null {
        const min = this.validationParams.min || 0.1;
        const max = this.validationParams.max || 2000;

        if (value < min || value > max) {
            return {
                invalidWeight: {
                    message: `Peso debe estar entre ${min}kg y ${max}kg`,
                },
            };
        }

        return null;
    }

    private validateIdentification(value: string): ValidationErrors | null {
        // Validar cédula ecuatoriana (10 dígitos)
        if (!/^\d{10}$/.test(value)) {
            return {
                invalidIdentification: {
                    message: 'Identificación debe tener 10 dígitos',
                },
            };
        }

        // Validar dígito verificador de cédula ecuatoriana
        const digits = value.split('').map(Number);
        const province = parseInt(value.substr(0, 2));

        if (province < 1 || province > 24) {
            return {
                invalidIdentification: {
                    message: 'Código de provincia inválido',
                },
            };
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
            return {
                invalidIdentification: {
                    message: 'Número de cédula inválido',
                },
            };
        }

        return null;
    }
}
