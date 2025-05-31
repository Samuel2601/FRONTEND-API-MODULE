// ===== STATUS PIPE =====
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    standalone: false,
    name: 'status',
})
export class StatusPipe implements PipeTransform {
    transform(
        value: string | null | undefined,
        context: 'certificate' | 'workflow' | 'shipping' = 'certificate'
    ): string {
        if (!value) return 'Sin estado';

        const statusMap: Record<string, Record<string, string>> = {
            certificate: {
                ACTIVE: 'Activo',
                EXPIRED: 'Expirado',
                PROCESSED: 'Procesado',
                CANCELLED: 'Cancelado',
            },
            workflow: {
                IN_PROGRESS: 'En Progreso',
                COMPLETED: 'Completado',
                REJECTED: 'Rechazado',
                SUSPENDED: 'Suspendido',
            },
            shipping: {
                PREPARATION: 'Preparación',
                IN_TRANSIT: 'En Tránsito',
                DELIVERED: 'Entregado',
                RETURNED: 'Retornado',
                INCIDENT: 'Incidente',
            },
        };

        return statusMap[context]?.[value] || value;
    }
}

