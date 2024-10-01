import { Injectable } from '@angular/core';
import { Network } from '@capacitor/network';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { catchError, tap, delay, mergeMap, retryWhen } from 'rxjs/operators';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { Preferences } from '@capacitor/preferences';
import { AuthService } from 'src/app/demo/services/auth.service';

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

@Injectable({
    providedIn: 'root',
})
export class NetworkService {
    private isConnectedSubject = new BehaviorSubject<boolean>(true);
    public isConnected$ = this.isConnectedSubject.asObservable();
    public url: string;

    constructor(private http: HttpClient, private auth: AuthService) {
        this.url = GLOBAL.url;
        this.initializeNetworkListener();
    }

    private initializeNetworkListener() {
        Network.addListener('networkStatusChange', (status) => {
            this.isConnectedSubject.next(status.connected);

            if (status.connected) {
                this.sendOfflineIncidents();
            }
        });
    }

    private async sendOfflineIncidents() {
        const incidents = await this.getOfflineIncidents();
        for (const incident of incidents) {
            if (!incident.sent) {
                await this.postIncidente(incident).toPromise();
            }
        }
    }

    postIncidente(incident: Incident): Observable<any> {
        const token = this.auth.token();
        if (!token) {
            return from(Promise.reject('No token available'));
        }

        let headers = new HttpHeaders({
            Authorization: typeof token === 'string' ? token : '',
        });

        return this.http
            .post(this.url + 'incidentes_denuncia', incident, {
                headers: headers,
            })
            .pipe(
                tap(() => {
                    this.removeIncidentFromStorage(incident);
                }),
                retryWhen((errors) =>
                    errors.pipe(
                        mergeMap((error, index) => {
                            if (index < 3) {
                                return of(error).pipe(
                                    delay(1000 * Math.pow(2, index))
                                );
                            }
                            throw error;
                        })
                    )
                ),
                catchError(async (error) => {
                    console.error('Error enviando el incidente', error);
                    await this.saveIncidentOffline(incident);
                    throw error;
                })
            );
    }

    async saveIncidentOffline(incident: Incident) {
        incident.timestamp = Date.now();
        incident.sent = false;
        const incidents = await this.getOfflineIncidents();
        incidents.push(incident);
        await Preferences.set({
            key: 'offlineIncidents',
            value: JSON.stringify(incidents),
        });
        console.log('Incidente guardado localmente');
    }

    async getOfflineIncidents(): Promise<Incident[]> {
        const { value } = await Preferences.get({ key: 'offlineIncidents' });
        return value ? JSON.parse(value) : [];
    }

    private async removeIncidentFromStorage(incident: Incident) {
        const incidents = await this.getOfflineIncidents();
        const updatedIncidents = incidents.filter(
            (inc) => inc.timestamp !== incident.timestamp
        );
        await Preferences.set({
            key: 'offlineIncidents',
            value: JSON.stringify(updatedIncidents),
        });
    }

    async call911() {
        const { value: lastCallTimeStr } = await Preferences.get({
            key: 'lastEmergencyCall',
        });
        const now = Date.now();
        if (!lastCallTimeStr || now - parseInt(lastCallTimeStr) > 300000) {
            // 5 minutes
            window.open('tel:911');
            await Preferences.set({
                key: 'lastEmergencyCall',
                value: now.toString(),
            });
        } else {
            console.log(
                'Emergency call already made recently. Skipping to prevent duplicate calls.'
            );
        }
    }

    async handleEmergency(incident: Incident) {
        const status = await Network.getStatus();
        if (status.connected) {
            try {
                await this.postIncidente(incident).toPromise();
                console.log('Incidente enviado exitosamente');
            } catch (error) {
                console.error(
                    'Error al enviar incidente, guardando offline',
                    error
                );
                await this.saveIncidentOffline(incident);
                await this.call911();
            }
        } else {
            await this.saveIncidentOffline(incident);
            await this.call911();
        }
    }

    async getPendingOfflineIncidents(): Promise<Incident[]> {
        const incidents = await this.getOfflineIncidents();
        return incidents.filter((incident) => !incident.sent);
    }
}
