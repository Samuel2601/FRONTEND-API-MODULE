import { Component, Input } from '@angular/core';
import { ImportsModule } from 'src/app/demo/services/import';

@Component({
    selector: 'app-grafico-tipo',
    standalone: true,
    imports: [ImportsModule],
    template: `<p-chart [type]="type" [data]="data"></p-chart>`,
})
export class GraficoTipoComponent {
    @Input() data: any;
    @Input() type: 'bar' | 'pie' | 'line' = 'bar';
}
