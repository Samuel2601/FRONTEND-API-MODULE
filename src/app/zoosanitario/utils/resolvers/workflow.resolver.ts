// ===== WORKFLOW RESOLVER =====
import { Injectable } from '@angular/core';
import {
    Resolve,
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
} from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WorkflowManagerService } from '../../services/WorkflowManager.service';

@Injectable()
export class WorkflowResolver implements Resolve<any> {
    constructor(private workflowManager: WorkflowManagerService) {}

    resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<any> {
        // Cargar datos necesarios para el workflow
        return forkJoin({
            steps: of(this.workflowManager.getWorkflowSteps()),
            currentWorkflow: of(this.workflowManager.getCurrentWorkflow()),
            userPreferences: this.loadUserPreferences().pipe(
                catchError(() => of({}))
            ),
        }).pipe(
            catchError((error) => {
                console.error('Error resolving workflow data:', error);
                return of({
                    steps: this.workflowManager.getWorkflowSteps(),
                    currentWorkflow: null,
                    userPreferences: {},
                });
            })
        );
    }

    private loadUserPreferences(): Observable<any> {
        // Cargar preferencias del usuario desde el backend
        // Por ahora retornar configuración por defecto
        return of({
            autoSave: true,
            notifications: true,
            defaultTemperatureUnit: 'celsius',
            defaultWeightUnit: 'kg',
        });
    }
}
