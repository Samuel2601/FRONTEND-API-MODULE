import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { AuthService } from '../demo/services/auth.service';

@Injectable({
    providedIn: 'root',
})
export class PermissionGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) {}

    canActivate(route: ActivatedRouteSnapshot): Observable<boolean> | boolean {
        const expectedPermission = route.data['expectedPermission'];
        const userId = this.authService.idUserToken();
        const userRole = this.authService.roleUserToken();

        return this.authService.getUserRole(userRole).pipe(
            switchMap((roles) => {
                console.log('Fetched roles:', expectedPermission); // Agrega este console.log

                // Obtener permisos asociados a los roles del usuario
                const rolePermissions = roles.flatMap((role: any) => role);
                console.log('Role permissions:', rolePermissions); // Agrega este console.log

                // Verificar si alguno de los roles tiene el permiso esperado
                const hasRolePermission = rolePermissions.some(
                    (permission: any) => permission.name === expectedPermission
                );

                if (hasRolePermission) {
                    console.log('Permitido');
                    return of(true); // Permitir acceso si alguno de los roles tiene el permiso
                } else {
                    // Si no tiene suficientes permisos por roles, obtener los permisos específicos del usuario
                    return this.authService.getUserPermissions(userId).pipe(
                        map((userPermissions) => {
                            console.log(
                                'Fetched user permissions:',
                                userPermissions
                            ); // Agrega este console.log

                            // Combinar permisos de roles con permisos específicos del usuario
                            const combinedPermissions = [
                                ...rolePermissions,
                                ...userPermissions,
                            ];
                            console.log(
                                'Combined permissions:',
                                combinedPermissions
                            ); // Agrega este console.log

                            // Verificar si el usuario tiene el permiso esperado
                            const hasPermission = combinedPermissions.some(
                                (permission) =>
                                    permission.name === expectedPermission
                            );

                            if (!hasPermission) {
                                this.router.navigate(['/access-denied']);
                            }

                            return hasPermission;
                        })
                    );
                }
            })
        );
    }
}
