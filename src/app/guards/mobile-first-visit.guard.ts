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
        // Check if this is a mobile device
        if (
            this.helperService.isMobil() &&
            !MobileFirstVisitGuard.hasVisitedBefore
        ) {
            // Mark that we've visited before
            MobileFirstVisitGuard.hasVisitedBefore = true;

            // Redirect to mapa-turistico
            this.router.navigate(['/mapa-turistico']);
            return false;
        }

        // For desktop or returning mobile users, allow access to the original route
        return true;
    }
}
