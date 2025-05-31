// ===== WORKFLOW MAIN COMPONENT TS =====
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { WorkflowManagerService } from '../../services/WorkflowManager.service';

@Component({
    standalone: false,
    selector: 'app-workflow-main',
    templateUrl: './workflow-main.component.html',
    styleUrls: ['./workflow-main.component.scss'],
})
export class WorkflowMainComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    steps: any[] = [];
    currentStep = 'reception';
    currentWorkflow: any = null;
    isLoading = false;
    activeStepIndex = 0;

    stepComponents = {
        reception: 'app-reception',
        external: 'app-external-verification',
        slaughter: 'app-slaughter-record',
        internal: 'app-internal-verification',
        shipping: 'app-shipping',
    };

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private workflowManager: WorkflowManagerService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        this.steps = this.workflowManager.getWorkflowSteps();

        // Suscribirse al workflow actual
        this.workflowManager.currentWorkflow$
            .pipe(takeUntil(this.destroy$))
            .subscribe((workflow) => {
                this.currentWorkflow = workflow;
            });

        // Obtener step desde la ruta
        this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
            if (params['step']) {
                this.navigateToStep(params['step']);
            }
        });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onStepIndexChange(index: number) {
        this.activeStepIndex = index;
        this.currentStep = this.steps[index].id;
    }

    navigateToStep(stepId: string) {
        if (!this.workflowManager.canAdvanceToStep(stepId)) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Debe completar los pasos anteriores antes de continuar',
            });
            return;
        }

        this.currentStep = stepId;
        this.router.navigate(['/workflow', stepId]);
    }

    onStepCompleted(stepId: string, data?: any) {
        this.workflowManager.updateStepStatus(stepId, true);

        // Actualizar el workflow con los nuevos datos
        if (data) {
            const currentWorkflow =
                this.workflowManager.getCurrentWorkflow() || {};
            currentWorkflow[stepId] = data;
            this.workflowManager.setCurrentWorkflow(currentWorkflow);
        }

        this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Etapa ${this.getStepName(stepId)} completada`,
        });

        // Avanzar al siguiente paso automáticamente
        const nextStep = this.workflowManager.getNextStep(stepId);
        if (nextStep) {
            setTimeout(() => {
                this.navigateToStep(nextStep);
            }, 1000);
        } else {
            this.messageService.add({
                severity: 'info',
                summary: 'Proceso Completado',
                detail: 'Se ha completado todo el flujo de trabajo',
            });
        }
    }

    getStepName(stepId: string): string {
        const step = this.steps.find((s) => s.id === stepId);
        return step ? step.name : stepId;
    }

    getStepIcon(stepId: string): string {
        const step = this.steps.find((s) => s.id === stepId);
        return step ? step.icon : 'pi-circle';
    }

    isStepCompleted(stepId: string): boolean {
        const step = this.steps.find((s) => s.id === stepId);
        return step ? step.completed : false;
    }

    canAccessStep(stepId: string): boolean {
        return this.workflowManager.canAdvanceToStep(stepId);
    }

    restartWorkflow() {
        this.steps.forEach((step) => (step.completed = false));
        this.workflowManager.setCurrentWorkflow(null);
        this.navigateToStep('reception');
    }

    exportWorkflowData() {
        const workflow = this.workflowManager.getCurrentWorkflow();
        if (workflow) {
            const dataStr = JSON.stringify(workflow, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `workflow_${new Date().toISOString()}.json`;
            link.click();

            URL.revokeObjectURL(url);
        }
    }
}

