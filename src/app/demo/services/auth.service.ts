import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Router } from '@angular/router';
import { GLOBAL } from './GLOBAL';
import { HelperService } from './helper.service';
import { SocketService } from './socket.io.service';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private permissionsSubject: BehaviorSubject<any[]> = new BehaviorSubject<
        any[]
    >([]);
    private rolesSubject: BehaviorSubject<any[]> = new BehaviorSubject<any[]>(
        []
    );
    public permissions$: Observable<any[]> =
        this.permissionsSubject.asObservable();
    public roles$: Observable<any[]> = this.rolesSubject.asObservable();
    private url: string;

    constructor(
        private http: HttpClient,
        private router: Router,
        private helpers: HelperService,
        private socketService: SocketService
    ) {
        this.url = GLOBAL.url;
        if (this.isAuthenticated()) {
            this.inicialityPermiss();
            this.socketService
                .onPermissionChange()
                .subscribe((permissionChange) => {
                    const currentPermissions =
                        this.permissionsSubject.getValue();
                    this.updatePermissions(
                        currentPermissions,
                        permissionChange
                    );
                });

            this.socketService.onRoleChange().subscribe((roleChange) => {
                const currentRoles = this.rolesSubject.getValue();
                this.updateRoles(currentRoles, roleChange);
            });
        }
    }
    init: number = 0;
    public async inicialityPermiss() {
        if (this.init == 0) {
            this.init++;
            const userId = this.idUserToken();
            const userRole = this.roleUserToken();
            this.getUserPermissions(userId).subscribe();
            this.getUserRole(userRole).subscribe();
            this.init--;
        }
    }

    private updatePermissions(
        currentPermissions: any[],
        permissionChange: any
    ) {
        const { action, permiso } = permissionChange;

        if (action === 'PERMISSION_ADDED') {
            this.permissionsSubject.next([...currentPermissions, permiso]);
        } else if (action === 'PERMISSION_REMOVED') {
            this.permissionsSubject.next(
                currentPermissions.filter((p) => p._id !== permiso._id)
            );
        }
    }

    private updateRoles(currentRoles: any[], roleChange: any) {
        const { action, roleId } = roleChange;

        if (action === 'ROLE_REMOVED') {
            this.rolesSubject.next([]);
        } else if (action === 'ROLE_ADDED') {
            this.getUserRole(roleId).subscribe(
                () => {
                    // Llamar a función para obtener nuevo token
                    this.refreshToken();
                },
                (error) => {
                    console.error('Error updating roles:', error);
                }
            );
        }
    }
    refreshToken() {
        const decodedToken = this.authToken();
    }

    obtenerGPS(): Observable<any> {
        const headers = new HttpHeaders()
            .set('Content-Type', 'application/json')
            .set('Authorization', 'Basic ' + btoa('CIUDADANIA:123456789'));
        return this.http.get(
            'https://inteligenciavehicular.com/api/positions/',
            { headers }
        );
    }

    obtenerNameGPS(id: any): Observable<any> {
        const headers = new HttpHeaders()
            .set('Content-Type', 'application/json')
            .set('Authorization', 'Basic ' + btoa('CIUDADANIA:123456789'));
        return this.http.get(
            `https://inteligenciavehicular.com/api/devices?id=${id}`,
            { headers }
        );
    }

    loginWithGoogle() {
        window.location.href = `${this.url}/auth/google`;
    }

    handleGoogleCallback(code: string): Observable<any> {
        const params = new HttpParams().set('code', code);
        return this.http.get(`${this.url}/auth/google/callback`, { params });
    }

    login(data: any): Observable<any> {
        const headers = new HttpHeaders().set(
            'Content-Type',
            'application/json'
        );
        return this.http.post(this.url + 'login', data, { headers });
    }

    validcode(data: any): Observable<any> {
        const headers = new HttpHeaders().set(
            'Content-Type',
            'application/json'
        );
        return this.http.post(this.url + 'validcode', data, { headers });
    }

    token(): string | null {
        const token =
            sessionStorage.getItem('token') || localStorage.getItem('token');
        if (token) {
            const aux = this.calcularTiempoRestante(token);
            if (aux <= 0) {
                this.clearSession();
                console.log("regreso a  login");
                //window.location.href = '/auth/login';
                this.redirectToLoginIfNeeded();
                return null;
            }
        } else {
            console.log("regreso a  login");
            //this.redirectToLoginIfNeeded();
        }
        return token || null;
    }

    calcularTiempoRestante(token: string): number {
        const helper = new JwtHelperService();
        const decodedToken = helper.decodeToken(token);
        const expiracion = decodedToken.exp * 1000;
        const ahora = Date.now();
        const diferencia = expiracion - ahora;
        if (expiracion <= ahora) {
            this.clearSession();
            return 0;
        }
        return diferencia;
    }

    authToken(token?: string) {
        const datatoken = token || this.token();
        if (this.isAuthenticated()) {
            const helper = new JwtHelperService();
            return helper.decodeToken(datatoken);
        }
    }

    roleUserToken(token?: string) {
        const datatoken = token || this.token();
        if (this.isAuthenticated()) {
            const helper = new JwtHelperService();
            return helper.decodeToken(datatoken).role;
        }
    }

    idUserToken(token?: string) {
        const datatoken = token || this.token();
        if (this.isAuthenticated()) {
            const helper = new JwtHelperService();
            console.log(helper.decodeToken(datatoken));
            return helper.decodeToken(datatoken).sub;
        }
    }

    getUserPermissions(userId: string): Observable<any> {
        const body = { users: [userId] };
        const token = this.token();
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        });

        return this.http
            .post(`${GLOBAL.url}obtenerPermisosPorCriterio`, body, { headers })
            .pipe(
                map((response: any) => {
                    this.permissionsSubject.next(response.data);
                    localStorage.setItem(
                        'permissions',
                        JSON.stringify(response.data)
                    );
                    return response.data;
                })
            );
    }

    getUserRole(userRole: string): Observable<any> {
        const token = this.token();
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        });

        return this.http
            .get(`${GLOBAL.url}obtenerRole?id=${userRole}`, { headers })
            .pipe(
                map((response: any) => {
                    this.rolesSubject.next(response.data.permisos);
                    localStorage.setItem(
                        'roles',
                        JSON.stringify(response.data.permisos)
                    );
                    return response.data.permisos;
                })
            );
    }

    getPermisos(): any[] {
        let permisos = [];
        let roles = [];

        // Intentar obtener permisos y roles desde localStorage
        const storedPermissions = localStorage.getItem('permissions');
        const storedRoles = localStorage.getItem('roles');

        if (storedPermissions && storedRoles) {
            // Si están en localStorage, parsear y devolver
            permisos = JSON.parse(storedPermissions);
            roles = JSON.parse(storedRoles);
        } else {
            // Si no están en localStorage, obtener del subject y actualizar localStorage
            permisos = this.permissionsSubject.getValue();
            roles = this.rolesSubject.getValue();
            localStorage.setItem('permissions', JSON.stringify(permisos));
            localStorage.setItem('roles', JSON.stringify(roles));
            // Recargar la página después de actualizar localStorage
            //location.reload();
        }

        // Combinar roles y permisos y devolver
        return [...roles, ...permisos];
    }

    async hasPermissionComponent(
        permission: string,
        method: string
    ): Promise<Observable<boolean>> {
        let permisos = [];
        if (this.isAuthenticated()) {
            if (this.getPermisos().length == 0) {
                await this.inicialityPermiss();
            }
            permisos = this.getPermisos();
        }
        const hasPermissionBOL = permisos.some(
            (e) => e.name === permission && e.method === method
        );
        console.log(hasPermissionBOL);
        return of(hasPermissionBOL);
    }

    isAuthenticated(): boolean {
        const token = this.token();
        if (!token) {
            this.clearSession();
            return false;
        }

        try {
            const helper = new JwtHelperService();
            if (helper.isTokenExpired(token) || !helper.decodeToken(token)) {
                this.clearSession();
                return false;
            }
        } catch (error) {
            this.clearSession();
            return false;
        }

        return true;
    }

    private clearSession() {
        localStorage.clear();
        sessionStorage.clear();
    }

    private redirectToLoginIfNeeded() {
        if (!['/auth/login', '/home', '/'].includes(this.router.url)) {
            console.log("regreso a  login");
            this.router.navigate(['/auth/login']);
            if (this.helpers.llamadasActivas > 0) {
                this.helpers.cerrarspinner();
            }
        }
    }
}
