import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { DialogService } from 'primeng/dynamicdialog';
import * as CryptoJS from 'crypto-js';
import { LayersComponent } from '../components/maps/layers/layers.component';
import { HomeComponent } from '../components/static-page/home/home.component';
import { SpinnerComponent } from 'src/app/layout/spinner.component';
import { StackBarriosComponent } from '../components/dashboard/stack-barrios/stack-barrios.component';
import { StackFichasComponent } from '../components/dashboard/stack-fichas/stack-fichas.component';
import { StackIncidentesComponent } from '../components/dashboard/stack-incidentes/stack-incidentes.component';
import { StackbarriofichaComponent } from '../components/dashboard/stackbarrioficha/stackbarrioficha.component';

@Injectable({
    providedIn: 'root',
})
export class HelperService {
    private deshabilitarMapaSubject = new Subject<void>();
    deshabilitarMapa$ = this.deshabilitarMapaSubject.asObservable();
    public autocompleteService: google.maps.places.AutocompleteService;
    public geocoderService: google.maps.Geocoder;
    public key = 'labella'; //'buzon';
    llamadasActivas = 0;
    spiner: any;
    private mapComponent: LayersComponent | null = null;
    private homeComponent: HomeComponent | null = null;

    constructor(
        private dialogService: DialogService,
        private router: Router,
    ) {}

    isMobil(): boolean {
        return window.innerWidth <= 575;
    }

    deshabilitarMapa() {
        this.deshabilitarMapaSubject.next();
    }

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

    encryptData(data: string, key: string): string {
        const dataString = data ? 'true' : 'false';
        return CryptoJS.AES.encrypt(dataString, key).toString();
    }

    encryptDataLogin(data: string, key: string): string {
        return CryptoJS.AES.encrypt(data, key).toString();
    }

    decryptDataLogin(encryptedData: string): string {
        return CryptoJS.AES.decrypt(encryptedData, this.key).toString(
            CryptoJS.enc.Utf8
        );
    }

    decryptData(encryptedData: string): boolean {
        const encrypte =
            sessionStorage.getItem(encryptedData) ||
            localStorage.getItem(encryptedData);
        if (encrypte) {
            return !!CryptoJS.AES.decrypt(encrypte, this.key).toString(
                CryptoJS.enc.Utf8
            );
        }
        return false;
    }

    llamarspinner(mensaje?: string[], tiempo?: number) {
        if (this.llamadasActivas === 0) {
            this.spiner = this.dialogService.open(SpinnerComponent, {
                header: 'Cargando',
                dismissableMask: false,
                width: 'auto',
                closable: false,
            });
        }
        this.llamadasActivas++;
    }

    cerrarspinner() {
        this.llamadasActivas--;
        if (this.llamadasActivas === 0 && this.spiner !== null) {
            setTimeout(() => {
                try {
                    this.spiner.destroy();
                } catch (error) {
                    console.error('Error closing spinner:', error);
                }
            }, 200);
        }
    }

    setMapComponent(mapComponent: LayersComponent) {
        this.mapComponent = mapComponent;
    }

    setHomeComponent(homeComponent: HomeComponent) {
        this.homeComponent = homeComponent;
    }

    cerrarincidente() {
        if (this.mapComponent !== null) {
            this.mapComponent.mostrarincidente = false;
        }
    }

    cerrarficha() {
        if (this.mapComponent !== null) {
            this.mapComponent.mostrarficha = false;
        }
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
    showLoading() {
        this.llamarspinner();
    }

    hideLoading() {
        this.cerrarspinner();
    }

    navigateToUrlWithDelay(url: string, delay: number) {
        setTimeout(() => {
            this.router.navigate([url]);
        }, delay);
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
}
