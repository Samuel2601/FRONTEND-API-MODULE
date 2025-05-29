import { Injectable } from '@angular/core';
import {
    CanActivate,
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
    Router,
} from '@angular/router';
import { HelperService } from '../demo/services/helper.service';

@Injectable({
    providedIn: 'root',
})
export class MobileFirstVisitGuard implements CanActivate {
    private static hasVisitedBefore = false;

    constructor(private helperService: HelperService, private router: Router) {}

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): boolean {
        const currentUrl = state.url;

        // Si está en '/proyectos', permite el acceso directo sin redirección
        if (currentUrl.startsWith('/proyectos')) {
            return true;
        }

        // Si es móvil y no ha visitado antes, redirige
        if (
            this.helperService.isMobil() &&
            !MobileFirstVisitGuard.hasVisitedBefore
        ) {
            MobileFirstVisitGuard.hasVisitedBefore = true;
            this.router.navigate(['/mapa-turistico']);
            return false;
        }

        // En cualquier otro caso, permite el acceso
        return true;
    }
}
