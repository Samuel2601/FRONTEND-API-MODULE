// ===== WORKFLOW STATUS PIPE =====
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'workflowStatus',
})
export class WorkflowStatusPipe implements PipeTransform {
    transform(
        step: string,
        completed: boolean
    ): { label: string; icon: string; color: string } {
        const stepConfig: Record<string, { label: string; icon: string }> = {
            reception: { label: 'Recepción', icon: 'pi-qrcode' },
            external: { label: 'Inspección Externa', icon: 'pi-eye' },
            slaughter: { label: 'Faenamiento', icon: 'pi-cog' },
            internal: { label: 'Inspección Interna', icon: 'pi-check-circle' },
            shipping: { label: 'Despacho', icon: 'pi-truck' },
        };

        const config = stepConfig[step] || { label: step, icon: 'pi-circle' };

        return {
            label: config.label,
            icon: config.icon,
            color: completed ? '#4caf50' : '#9e9e9e',
        };
    }
}
