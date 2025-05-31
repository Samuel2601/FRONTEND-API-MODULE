// ===== TEMPERATURE PIPE =====
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    standalone: false,
    name: 'temperature',
})
export class TemperaturePipe implements PipeTransform {
    transform(
        value: number | null | undefined,
        unit: 'celsius' | 'fahrenheit' = 'celsius',
        decimals: number = 1
    ): string {
        if (value === null || value === undefined) {
            return '--°C';
        }

        const formattedValue = Number(value).toFixed(decimals);

        if (unit === 'fahrenheit') {
            const fahrenheit = (value * 9) / 5 + 32;
            return `${fahrenheit.toFixed(decimals)}°F`;
        }

        return `${formattedValue}°C`;
    }
}

