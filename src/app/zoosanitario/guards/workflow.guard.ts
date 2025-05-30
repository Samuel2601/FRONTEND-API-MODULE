// ===== WORKFLOW GUARD =====
import { Injectable } from '@angular/core';
import {
    CanActivate,
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
    Router,
} from '@angular/router';
import { Observable } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuthService } from 'src/app/demo/services/auth.service';

@Injectable()
export class WorkflowGuard implements CanActivate {
    constructor(
        private authService: AuthService,
        private router: Router,
        private messageService: MessageService
    ) {}

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): boolean | Observable<boolean> {
        // Verificar autenticación
        if (!this.authService.isAuthenticated()) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Acceso Denegado',
                detail: 'Debe iniciar sesión para acceder al flujo de trabajo',
            });
            this.router.navigate(['/login']);
            return false;
        }

        // Verificar permisos específicos para veterinarios
        const userRole = this.authService.getPermisos();
        const allowedRoles = ['VETERINARIAN', 'INSPECTOR', 'ADMIN'];

        /*if (!allowedRoles.includes(userRole)) {
            this.messageService.add({
                severity: 'error',
                summary: 'Permisos Insuficientes',
                detail: 'No tiene permisos para acceder al flujo de trabajo veterinario',
            });
            this.router.navigate(['/dashboard']);
            return false;
        }*/

        return true;
    }
}
