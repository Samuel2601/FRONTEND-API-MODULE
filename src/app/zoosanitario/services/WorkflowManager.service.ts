import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class WorkflowManagerService {
    private currentWorkflowSubject = new BehaviorSubject<any>(null);
    public currentWorkflow$ = this.currentWorkflowSubject.asObservable();

    private workflowSteps = [
        {
            id: 'reception',
            name: 'Recepción',
            icon: 'pi-qrcode',
            completed: false,
        },
        {
            id: 'external',
            name: 'Inspección Externa',
            icon: 'pi-eye',
            completed: false,
        },
        {
            id: 'slaughter',
            name: 'Faenamiento',
            icon: 'pi-cog',
            completed: false,
        },
        {
            id: 'internal',
            name: 'Inspección Interna',
            icon: 'pi-check-circle',
            completed: false,
        },
        {
            id: 'shipping',
            name: 'Despacho',
            icon: 'pi-truck',
            completed: false,
        },
    ];

    constructor() {}

    getWorkflowSteps() {
        return [...this.workflowSteps];
    }

    setCurrentWorkflow(workflow: any) {
        this.currentWorkflowSubject.next(workflow);
    }

    getCurrentWorkflow() {
        return this.currentWorkflowSubject.value;
    }

    updateStepStatus(stepId: string, completed: boolean) {
        const step = this.workflowSteps.find((s) => s.id === stepId);
        if (step) {
            step.completed = completed;
        }
    }

    getNextStep(currentStepId: string): string | null {
        const currentIndex = this.workflowSteps.findIndex(
            (s) => s.id === currentStepId
        );
        if (
            currentIndex !== -1 &&
            currentIndex < this.workflowSteps.length - 1
        ) {
            return this.workflowSteps[currentIndex + 1].id;
        }
        return null;
    }

    canAdvanceToStep(stepId: string): boolean {
        const stepIndex = this.workflowSteps.findIndex((s) => s.id === stepId);
        if (stepIndex === 0) return true; // Primer paso siempre disponible

        // Verificar que todos los pasos anteriores estén completados
        for (let i = 0; i < stepIndex; i++) {
            if (!this.workflowSteps[i].completed) {
                return false;
            }
        }
        return true;
    }
}
