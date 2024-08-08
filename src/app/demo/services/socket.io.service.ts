import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { GLOBAL } from './GLOBAL';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root',
})
export class SocketService {
    private socket: Socket;

    constructor() {
        this.inicializador();
    }
    inicializador() {
        try {
            const userId =
                localStorage.getItem('idUser') ||
                sessionStorage.getItem('idUser');
            if (userId) {
                this.socket = io('https://geoapi.esmeraldas.gob.ec', {
                    path: '/new/socket.io',
                });

                this.socket.on('connect', () => {
                    console.log('Socket connected:', this.socket.connected);

                    if (userId) {
                        this.socket.emit('set-user-id', userId);
                    } else {
                        console.error(
                            'User ID not found in localStorage or sessionStorage.'
                        );
                    }
                });
                this.socket.on('error', (error) => {
                    console.error('Socket error:', error);
                });
            }
        } catch (error) {
            console.error('Error initializing Socket.IO:', error);
        }
    }

    onPermissionChange(): Observable<any> {
        return new Observable((observer) => {
            this.socket.on('permissions-updated', (data) => {
                observer.next(data);
            });
        });
    }

    onRoleChange(): Observable<any> {
        return new Observable((observer) => {
            this.socket.on('role-updated', (data) => {
                //  console.log("SE ACTUALIZO EL ROL");
                observer.next(data);
            });
        });
    }
    onNotification(): Observable<any> {
        return new Observable((observer) => {
            this.socket.on('notification', (data) => {
                observer.next(data);
            });
        });
    }

    // Método para enviar notificaciones a un usuario específico
    notifyUser(userId: string, data: any): void {
        this.socket.emit('notify-user', { userId, data });
    }
}
