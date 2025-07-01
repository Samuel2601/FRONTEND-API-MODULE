// src/app/demo/services/oracle-credentials-manager.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError, EMPTY } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class OracleCredentialsManagerService {
    private showCredentialsDialogSubject = new BehaviorSubject<boolean>(false);
    private credentialsConfiguredSubject = new BehaviorSubject<boolean>(false);

    public showCredentialsDialog$ =
        this.showCredentialsDialogSubject.asObservable();
    public credentialsConfigured$ =
        this.credentialsConfiguredSubject.asObservable();

    constructor() {}

    /**
     * Maneja automáticamente los errores de credenciales
     * Muestra el diálogo cuando se detecta que faltan credenciales
     */
    handleCredentialsError<T>(source$: Observable<T>): Observable<T> {
        return source$.pipe(
            catchError((error) => {
                if (this.isCredentialsError(error)) {
                    this.showCredentialsDialog();

                    // Esperar a que se configuren las credenciales y luego reintentar
                    return this.credentialsConfigured$.pipe(
                        filter((configured) => configured),
                        take(1),
                        switchMap(() => {
                            // Reset el estado y retorna EMPTY para que el componente maneje el reintento
                            this.credentialsConfiguredSubject.next(false);
                            return EMPTY;
                        })
                    );
                }

                return throwError(() => error);
            })
        );
    }

    /**
     * Verifica si el error es por falta de credenciales
     */
    private isCredentialsError(error: any): boolean {
        return (
            error?.needsCredentials === true ||
            (error?.status === 400 &&
                error?.error?.message?.includes('credenciales activas'))
        );
    }

    /**
     * Muestra el diálogo de credenciales
     */
    showCredentialsDialog(): void {
        this.showCredentialsDialogSubject.next(true);
    }

    /**
     * Oculta el diálogo de credenciales
     */
    hideCredentialsDialog(): void {
        this.showCredentialsDialogSubject.next(false);
    }

    /**
     * Notifica que las credenciales han sido configuradas
     */
    notifyCredentialsConfigured(): void {
        this.credentialsConfiguredSubject.next(true);
        this.hideCredentialsDialog();
    }

    /**
     * Notifica que se canceló la configuración de credenciales
     */
    notifyCredentialsCancelled(): void {
        this.hideCredentialsDialog();
    }

    /**
     * Wrapper para operaciones que requieren credenciales Oracle
     * Maneja automáticamente la configuración de credenciales si es necesario
     */
    executeWithCredentials<T>(operation: () => Observable<T>): Observable<T> {
        return operation().pipe(
            catchError((error) => {
                if (this.isCredentialsError(error)) {
                    this.showCredentialsDialog();

                    return this.credentialsConfigured$.pipe(
                        filter((configured) => configured),
                        take(1),
                        switchMap(() => {
                            this.credentialsConfiguredSubject.next(false);
                            return operation(); // Reintentar la operación
                        })
                    );
                }

                return throwError(() => error);
            })
        );
    }
}
