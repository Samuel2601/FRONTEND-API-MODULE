// auth-events.service.ts
import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class AuthEventsService {
    private loginSuccessSource = new Subject<any>();

    // Observable que otros componentes pueden suscribirse para detectar inicios de sesión
    loginSuccess$ = this.loginSuccessSource.asObservable();

    // Método para notificar que el login ha sido exitoso
    notifyLoginSuccess(userData: any): void {
        this.loginSuccessSource.next(userData);
    }
}
