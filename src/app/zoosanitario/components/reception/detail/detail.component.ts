import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImportsModule } from 'src/app/demo/services/import';

@Component({
    selector: 'app-detail',
    standalone: true,
    imports: [CommonModule, ImportsModule],
    templateUrl: './detail.component.html',
    styleUrl: './detail.component.scss',
})
export class DetailComponent {
    /**
     * Controla la visibilidad del diálogo de detalles.
     */
    @Input() showDetailsDialog: boolean = false;

    /**
     * Recepción seleccionada para mostrar sus detalles.
     */
    @Input() selectedReception: any;

    /**
     * Devuelve la severidad visual asociada al estado de la recepción.
     */
    getEstadoSeverity(
        estado: string
    ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
        switch (estado?.toLowerCase()) {
            case 'pendiente':
                return 'warning';
            case 'en proceso':
                return 'info';
            case 'completado':
                return 'success';
            case 'rechazado':
                return 'danger';
            default:
                return 'secondary';
        }
    }

    /**
     * Devuelve la severidad visual asociada a las condiciones higiénicas.
     */
    getCondicionesSeverity(
        condiciones: string
    ): 'success' | 'warning' | 'danger' | 'secondary' {
        switch (condiciones?.toLowerCase()) {
            case 'buenas':
                return 'success';
            case 'regulares':
                return 'warning';
            case 'malas':
                return 'danger';
            default:
                return 'secondary';
        }
    }
}
