import { Component } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { Network } from '@capacitor/network';
import { SpeedDialModule } from 'primeng/speeddial';
import { NetworkService } from '../services/network.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

interface Incident {
    direccion_geo: {
        nombre: string;
        latitud: number;
        longitud: number;
    };
    urgencia: boolean;
    descripcion: string;
    timestamp: number;
    sent: boolean;
}

@Component({
    selector: 'app-button-panic',
    standalone: true,
    imports: [SpeedDialModule, ToastModule, DialogModule, ButtonModule],
    templateUrl: './button-panic.component.html',
    styleUrl: './button-panic.component.scss',
    providers: [MessageService],
})
export class ButtonPanicComponent {
    speedDialActions: any[] = [];
    showDialog: boolean = false;

    constructor(
        private networkService: NetworkService,
        private messageService: MessageService
    ) {
        this.speedDialActions = [
            {
                label: 'Policía',
                icon: 'pi pi-user',
                command: () => this.handleIncident('Policía'),
            },
            {
                label: 'Bomberos',
                icon: 'pi pi-fire',
                command: () => this.handleIncident('Bomberos'),
            },
            {
                label: 'Ambulancia',
                icon: 'pi pi-heart',
                command: () => this.handleIncident('Ambulancia'),
            },
        ];
        this.networkService.isConnected$.subscribe((connected) => {
            console.log('Conectado:', connected);
            this.messageService.add({
                severity: connected ? 'success' : 'warn',
                summary: 'Estado de conexión',
                detail: connected ? 'Conectado a la red' : 'Sin conexión',
            });
        });
    }

    async handleIncident(type: string) {
        this.showDialog = true; // Mostrar el diálogo de calma
        try {
            const permissions = await Geolocation.checkPermissions();
            if (permissions.location === 'denied') {
                await this.requestLocationPermissions();
            }
            const position = await Geolocation.getCurrentPosition();

            const incident: Incident = {
                direccion_geo: {
                    nombre: 'Ubicación actual',
                    latitud: position.coords.latitude,
                    longitud: position.coords.longitude,
                },
                descripcion: `${type} requerido`,
                timestamp: Date.now(),
                sent: false,
                urgencia: true,
            };
            this.messageService.add({
                severity: 'success',
                summary: 'Incidente reportado',
                detail: 'Su solicitud de emergencia ha sido registrada',
            });
            await this.networkService.handleEmergency(incident);

            this.messageService.add({
                severity: 'success',
                summary: 'Incidente reportado',
                detail: 'Su solicitud de emergencia ha sido registrada',
            });
        } catch (error) {
            console.error('Error al manejar el incidente', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Hubo un problema al reportar el incidente. Por favor, intente nuevamente.',
            });
        }
    }

    async requestLocationPermissions() {
        const permissionsTimeout = setTimeout(() => {
            this.messageService.add({
                severity: 'warn',
                summary: 'Ubicación',
                detail: 'Solicitud de permisos de geolocalización tomó demasiado tiempo',
            });
        }, 15000);

        try {
            const requestPermissions = await Geolocation.requestPermissions();
            clearTimeout(permissionsTimeout);
            if (requestPermissions.location === 'denied') {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Ubicación',
                    detail: 'Permisos de geolocalización denegados. No se puede reportar su ubicación.',
                });
            }
        } catch (error) {
            clearTimeout(permissionsTimeout);
            console.error(
                'Error al solicitar permisos de geolocalización',
                error
            );
            this.messageService.add({
                severity: 'error',
                summary: 'Ubicación',
                detail: 'Error al solicitar permisos de geolocalización',
            });
        }
    }
}
