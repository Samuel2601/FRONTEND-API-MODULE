// ===== WEIGHT PIPE =====
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    standalone: false,
    name: 'weight',
})
export class WeightPipe implements PipeTransform {
    transform(
        value: number | null | undefined,
        unit: 'kg' | 'lb' = 'kg',
        decimals: number = 2
    ): string {
        if (value === null || value === undefined) {
            return '--';
        }

        const formattedValue = Number(value).toFixed(decimals);

        if (unit === 'lb') {
            const pounds = value * 2.20462;
            return `${pounds.toFixed(decimals)} lb`;
        }

        return `${formattedValue} kg`;
    }
}

