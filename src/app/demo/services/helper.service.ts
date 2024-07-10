import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
    BehaviorSubject,
    Observable,
    Subject,
    catchError,
    map,
    throwError,
} from 'rxjs';
import { AdminService } from './admin.service';
import { FilterService } from './filter.service';
import { SpinnerComponent } from 'src/app/layout/spinner.component';
import { LayersComponent } from '../components/maps/layers/layers.component';
import * as CryptoJS from 'crypto-js';
import { Capacitor } from '@capacitor/core';
import { StackBarriosComponent } from '../components/dashboard/stack-barrios/stack-barrios.component';
import { StackFichasComponent } from '../components/dashboard/stack-fichas/stack-fichas.component';
import { StackIncidentesComponent } from '../components/dashboard/stack-incidentes/stack-incidentes.component';
import { StackbarriofichaComponent } from '../components/dashboard/stackbarrioficha/stackbarrioficha.component';
import { DialogService } from 'primeng/dynamicdialog';
import { ListService } from './list.service';
import { HomeComponent } from '../components/static-page/home/home.component';
import { JwtHelperService } from '@auth0/angular-jwt';
@Injectable({
    providedIn: 'root',
})
export class HelperService {
    private deshabilitarMapaSubject = new Subject<void>();
    isMobil() {
        return window.innerWidth <= 575; //Capacitor.isNativePlatform(); //
    }

    deshabilitarMapa$ = this.deshabilitarMapaSubject.asObservable();

    deshabilitarMapa() {
        this.deshabilitarMapaSubject.next();
    }
    token(): string | null {
        const token =
            sessionStorage.getItem('token') || localStorage.getItem('token');
        if (token) {
            let aux = this.adminService.calcularTiempoRestante(token);
            if (aux <= 0) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/auth/login';
                return null;
            }
        } else {
            if (
                this.router.url !== '/auth/login' &&
                this.router.url !== '/home' &&
                this.router.url !== '/'
            ) {
                this.router.navigate(['/auth/login']);
                if (this.llamadasActivas > 0) {
                    this.cerrarspinner();
                }
                return null;
            }
        }
        return token ? token : null;
    }

    actualizarToken(token: any) {}

    public autocompleteService: google.maps.places.AutocompleteService;
    public geocoderService: google.maps.Geocoder;

    constructor(
        private dialogService: DialogService,
        private router: Router,
        private adminService: AdminService,
        private filterService: FilterService,
        private listarService: ListService
    ) {}

    searchStreets(
        query: string
    ): Promise<google.maps.places.AutocompletePrediction[]> {
        return new Promise((resolve, reject) => {
            const request = {
                input: query,
                componentRestrictions: { country: 'ec' },
            };
            this.autocompleteService.getPlacePredictions(
                request,
                (predictions, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        resolve(predictions);
                    } else {
                        reject(status);
                    }
                }
            );
        });
    }
    getLatLngFromAddress(address: string): Promise<google.maps.LatLng> {
        return new Promise((resolve, reject) => {
            this.geocoderService.geocode({ address }, (results, status) => {
                if (
                    status === google.maps.GeocoderStatus.OK &&
                    results.length > 0
                ) {
                    resolve(results[0].geometry.location);
                } else {
                    reject(status);
                }
            });
        });
    }

    async checkPermiso(componente: any): Promise<boolean> {
        const token = this.token();
        if (!token) {
            return false;
        }
        const rolUsuario = this.adminService.roluser(token);

        if (!rolUsuario) {
            return false;
        }
        try {
            const response = await this.filterService
                .tienePermiso(token, componente, rolUsuario._id)
                .toPromise();
            return response.data ? true : false;
        } catch (error) {
            ////console.error('Error al verificar el permiso:', error);
            return false;
        }
    }

    listpermisos(save?: boolean) {
        const token = this.token();
        if (!token) {
            //console.error('Token no válido');
            return;
        }
        const rolUsuario = this.adminService.roluser(token);
        if (!rolUsuario) {
            //console.error('Rol de usuario no válido');
            return;
        }
        this.filterService.listpermisos(token, rolUsuario._id).subscribe(
            (response) => {
                const data = response.data;
                for (let clave in data) {
                    if (data.hasOwnProperty(clave)) {
                        let val = this.encryptData(data[clave], this.key);
                        if (!save) {
                            sessionStorage.setItem(clave, val);
                        } else {
                            localStorage.setItem(clave, val);
                        }
                    }
                }
            },
            (error) => {
                //console.error('Error al obtener permisos:', error);
            }
        );
    }
    public key = 'labella'//'buzon';
    // Función para cifrar la información
    encryptData(data: string, key: string): string {
        const dataString = data ? 'true' : 'false'; // Convertir booleano a cadena
        const encryptedData = CryptoJS.AES.encrypt(dataString, key).toString();
        return encryptedData;
    }
    encryptDataLogin(data: string, key: string): string {
        const encryptedData = CryptoJS.AES.encrypt(data, key).toString();
        return encryptedData;
    }
    // Función para descifrar la información
    decryptDataLogin(encryptedData: string): string {
        const decryptedData = CryptoJS.AES.decrypt(
            encryptedData,
            this.key
        ).toString(CryptoJS.enc.Utf8);
        return decryptedData;
    }

    // Función para descifrar la información
    decryptData(encryptedData: string): boolean {
        const encrypte =
            sessionStorage.getItem(encryptedData) ||
            localStorage.getItem(encryptedData);
        if (encrypte) {
            const decryptedData = CryptoJS.AES.decrypt(
                encrypte,
                this.key
            ).toString(CryptoJS.enc.Utf8);
            return decryptedData ? true : false;
        } else {
            return false;
        }
    }

    // Declara una variable para almacenar el estado del spinner
    llamadasActivas = 0;
    spiner: any;
    llamarspinner(mensaje?: string[], tiempo?: number) {
        if (this.llamadasActivas == 0) {
            this.spiner = this.dialogService.open(SpinnerComponent, {
                header: 'Cargando',
                //modal:false,
                dismissableMask: false,
                width: 'auto',
                closable: false,
            });
        }
        this.llamadasActivas++;
    }

    cerrarspinner() {
        this.llamadasActivas--;
        if (this.llamadasActivas == 0 && this.spiner !== null) {
            setTimeout(() => {
                try {
                    this.spiner.destroy();
                } catch (error) {
                    //console.log('Cerrando', error);
                }
            }, 200);
        }
    }
    private mapComponent: LayersComponent | null = null;
    private homeComponent: HomeComponent | null = null;
    setMapComponent(mapComponent: LayersComponent) {
        this.mapComponent = mapComponent;
    }
    setHomeComponent(homeComponent: HomeComponent) {
        this.homeComponent = homeComponent;
    }
    cerrarMapa() {
        this.homeComponent.visible_incidente = false;
    }
    cerrarMapaFicha() {
        this.homeComponent.visible_ficha = false;
    }
    marcarLugar(latitud: any, longitud: any, nombres?: any) {
        if (this.mapComponent) {
            this.mapComponent.addMarker(
                { lat: latitud, lng: longitud },
                'Ubicación',
                nombres
            );
        }
    }
    cerrarincidente() {
        if (this.mapComponent) {
            this.mapComponent.mostrarincidente = false;
        }
    }
    cerrarficha() {
        if (this.mapComponent) {
            this.mapComponent.mostrarficha = false;
        }
    }

    stbarrioComponent: BehaviorSubject<StackBarriosComponent | null> =
        new BehaviorSubject(null);
    stfichaComponent: BehaviorSubject<StackFichasComponent | null> =
        new BehaviorSubject(null);
    stincidenteComponent: BehaviorSubject<StackIncidentesComponent | null> =
        new BehaviorSubject(null);
    stbarrioficha: BehaviorSubject<StackbarriofichaComponent | null> =
        new BehaviorSubject(null);

    setStbarrioComponent(stbarrioComponent: StackBarriosComponent) {
        this.stbarrioComponent.next(stbarrioComponent);
    }

    setStfichaComponent(stfichaComponent: StackFichasComponent) {
        this.stfichaComponent.next(stfichaComponent);
    }

    setStincidenteComponent(stincidenteComponent: StackIncidentesComponent) {
        this.stincidenteComponent.next(stincidenteComponent);
    }

    setStbarrioficha(stbarrioficha: StackbarriofichaComponent) {
        this.stbarrioficha.next(stbarrioficha);
    }

    maximoStbarrioComponent() {
        return this.stbarrioComponent.value
            ? this.stbarrioComponent.value.encontrarMaximo()
            : undefined;
    }

    maximoStFichaComponent() {
        return this.stfichaComponent.value
            ? this.stfichaComponent.value.encontrarMaximo()
            : undefined;
    }

    maximoStincidenteComponent() {
        return this.stincidenteComponent.value
            ? this.stincidenteComponent.value.encontrarMaximo()
            : undefined;
    }

    maximoStbarrioficha() {
        return this.stbarrioficha.value
            ? this.stbarrioficha.value.encontrarMaximo()
            : undefined;
    }

    authtoken(token: string) {
        const helper = new JwtHelperService();
        var decodedToken = helper.decodeToken(token);
        console.log(decodedToken);
        return decodedToken;
    }
}
