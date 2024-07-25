import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Router } from '@angular/router';
import { GLOBAL } from './GLOBAL';
import { HelperService } from './helper.service';
import { SocketService } from './socket.io.service';

import { MessageService } from 'primeng/api';

import { environment } from 'src/environments/environment';

//import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

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
        private socketService: SocketService,
        private messageService: MessageService
    ) {
        this.initializeGoogleOneTap();
        
        

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

    private async initializeGoogleOneTap() {
        try {
            if (this.helpers.isMobil()) {
                GoogleAuth.initialize({
                    clientId: environment.clientId,
                    scopes: ['profile', 'email'],
                    grantOfflineAccess: true,
                });
            }
        } catch (error) {
            console.error('Google One Tap initialization failed:', error);
        }
    }

    async signInWithGoogle() {
        try {
            const googleUser = await GoogleAuth.signIn();
            return googleUser;
        } catch (err) {
            console.error('Google sign-in failed:', err);
            return null;
        }
    }

    async signOut() {
        await GoogleAuth.signOut();
    }
    async sendUserToBackend(googleUser:{authentication:any,givenName:string,familyName:string,email:string,id:string,imageUrl:string}) {
        try {
            const response = await this.http
                .post(`${this.url}/auth/mobile/google`, {
                    token: googleUser.authentication.idToken,
                    name: googleUser.givenName,
                    lastName: googleUser.familyName,
                    email: googleUser.email,
                    googleId: googleUser.id,
                    photo: googleUser.imageUrl,
                })
                .toPromise();

            return response;
        } catch (err) {
            console.error('Backend authentication failed:', err);
            throw err;
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
            this.messageService.add({
                severity: 'success',
                summary: 'Permisos agregados',
            });
        } else if (action === 'PERMISSION_REMOVED') {
            this.permissionsSubject.next(
                currentPermissions.filter((p) => p._id !== permiso._id)
            );
            this.messageService.add({
                severity: 'warn',
                summary: 'Permisos removidos',
            });
        }
    }

    private updateRoles(currentRoles: any[], roleChange: any) {
        const { action, roleId } = roleChange;

        if (action === 'ROLE_REMOVED') {
            this.rolesSubject.next([]);
            this.messageService.add({
                severity: 'warn',
                summary: 'Rol Removido',
                detail: `Tu rol ha sido removido.`,
            });
        } else if (action === 'ROLE_ADDED') {
            this.messageService.add({
                severity: 'success',
                summary: 'Rol agregado',
                detail: `Se te ha sido asignado un nuevo rol.`,
            });
            this.getUserRole(roleId).subscribe(
                async () => {
                    // Llamar a función para obtener nuevo token
                    await this.refreshToken();
                },
                (error) => {
                    console.error('Error updating roles:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: `Error actualizando roles: ${error.message}`,
                    });
                }
            );
        }
    }

    // Método para refrescar el token
    async refreshToken() {
        const token = this.token();
        const id = this.idUserToken();
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: token,
        });
        const params = new HttpParams().set('id', id);

        // Realizar la solicitud para refrescar el token
        try {
            const response = await this.http
                .put<{ token: string }>(
                    this.url + 'refreshtoken',
                    { id },
                    { headers: headers, params: params }
                )
                .toPromise();
            // Guardar el nuevo token recibido
            this.guardarToken(response.token);
            return response;
        } catch (error) {
            console.error('Error al refrescar el token', error);
            throw error;
        }
    }

    // Método para guardar el token en el almacenamiento local
    guardarToken(token: string) {
        localStorage.setItem('token', token);
        const idUser = this.idUserToken(token);
        localStorage.setItem('idUser', idUser);
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
                // console.log('regreso a  login');
                this.redirectToLoginIfNeeded();
                return null;
            }
        } else {
            // console.log('regreso a  login');
            this.redirectToLoginIfNeeded();
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
            // console.log(helper.decodeToken(datatoken));
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
        const params = this.paramsf(body, false);

        return this.http
            .get(`${GLOBAL.url}obtenerpermisosporcriterio`, {
                headers,
                params: params,
            })
            .pipe(
                map((response: any) => {
                    // console.log('LLAMADO API PERMISOS:', response);
                    this.permissionsSubject.next(response.data);
                    localStorage.setItem(
                        'permissions',
                        JSON.stringify(response.data)
                    );
                    return response.data;
                })
            );
    }
    paramsf(campos: any = {}, all: boolean = true) {
        // Construir los parámetros de la URL
        let params = new HttpParams();
        if (all) {
            params = params.append('populate', 'all');
        }
        // Añadir campos de filtrado a los parámetros
        Object.keys(campos).forEach((campo) => {
            params = params.append(campo, campos[campo]);
        });
        return params;
    }

    getUserRole(userRole: any): Observable<any> {
        let id: string;
        if (typeof userRole === 'object' && userRole !== null && userRole._id) {
            id = userRole._id;
        } else if (typeof userRole === 'string') {
            id = userRole;
        } else {
            throw new Error('Invalid userRole type');
        }
        const token = this.token();
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        });

        return this.http
            .get(`${GLOBAL.url}obtenerRole?id=${id}`, { headers })
            .pipe(
                map((response: any) => {
                    // console.log('LLAMADO PARA OBTENER ROL', response);
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

        if (storedPermissions !== null && storedRoles !== null) {
            // Si están en localStorage y no son null, parsear y devolver
            permisos = JSON.parse(storedPermissions);
            roles = JSON.parse(storedRoles);
        } else {
            // Si no están en localStorage o son null, obtener del subject
            permisos = this.permissionsSubject.getValue() || [];
            roles = this.rolesSubject.getValue() || [];

            // Actualizar localStorage con arrays vacíos si no están definidos
            localStorage.setItem('permissions', JSON.stringify(permisos));
            localStorage.setItem('roles', JSON.stringify(roles));

            // Opcional: Recargar la página después de actualizar localStorage
            // location.reload();
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
        //  console.log(permission,method,hasPermissionBOL);
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

    public clearSession() {
        const nombreUsuario =
            localStorage.getItem('nombreUsuario') ||
            sessionStorage.getItem('nombreUsuario');
        const fotoUsuario =
            localStorage.getItem('fotoUsuario') ||
            sessionStorage.getItem('fotoUsuario');
        const correo =
            localStorage.getItem('correo') || sessionStorage.getItem('correo');
        const pass =
            localStorage.getItem('pass') || sessionStorage.getItem('pass');

        // Limpiar todo excepto los valores preservados
        sessionStorage.clear();
        localStorage.clear();

        // Restaurar los valores preservados
        if (nombreUsuario) localStorage.setItem('nombreUsuario', nombreUsuario);
        if (fotoUsuario) localStorage.setItem('fotoUsuario', fotoUsuario);
        if (correo) localStorage.setItem('correo', correo);
        if (pass) localStorage.setItem('pass', pass);
    }

    public redirectToLoginIfNeeded(home: boolean = false) {
        const currentUrl = this.router.url;

        // Verifica si la URL actual contiene '/auth/login' independientemente de los parámetros adicionales
        if (
            (!['/home', '/'].includes(currentUrl) &&
                !currentUrl.startsWith('/auth/login') &&
                !currentUrl.startsWith('/ver-ficha')) ||
            home
        ) {
            // console.log('Redirigiendo a login');
            this.router.navigate(['/auth/login']);
            if (this.helpers.llamadasActivas > 0) {
                this.helpers.cerrarspinner('auth');
            }
        }
    }
}
