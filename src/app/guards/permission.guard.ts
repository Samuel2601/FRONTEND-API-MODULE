import { Injectable } from '@angular/core';
import {
    CanActivate,
    ActivatedRouteSnapshot,
    Router,
    RouterStateSnapshot,
} from '@angular/router';
import { from, Observable, of } from 'rxjs';
import { switchMap, map, catchError, tap } from 'rxjs/operators';
import { AuthService } from '../demo/services/auth.service';

@Injectable({
    providedIn: 'root',
})
export class PermissionGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) {}

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean> {
        const expectedPermission = route.data['expectedPermission'];
    
        // Verificar si el permiso esperado está presente en los permisos
        return from(this.authService.hasPermissionComponent(expectedPermission, 'get')).pipe(
            switchMap((hasPermissionObservable) => hasPermissionObservable),
            tap((hasPermission) => {
                if (!hasPermission) {
                    console.log('ERROR');
                    this.router.navigate(['/access-denied']);
                }
            })
        );
    }
    
}
