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
import { Capacitor } from '@capacitor/core';

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
    spiner: any=null;
    private mapComponent: LayersComponent | null = null;
    private homeComponent: HomeComponent | null = null;

    constructor(private dialogService: DialogService, private router: Router) {}

    isMobil(): boolean {
        return  Capacitor.isNativePlatform() //window.innerWidth <= 575; 
    }
    isAndroit(){
      
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

    llamarspinner(id: any) {
        console.log("LLAMO", id);
        if (this.llamadasActivas === 0 && this.spiner==null) {  // Verifica si el spinner no está ya abierto
            this.spiner = this.dialogService.open(SpinnerComponent, {
                header: 'Cargando',
                dismissableMask: false,
                width: 'auto',
                closable: false,
            });
        }
        this.llamadasActivas++;
    }

    cerrarspinner(id:any) {
        this.llamadasActivas--;
        //console.log("CERRO",id);
       // console.log(`Llamadas activas: ${this.llamadasActivas}`);
    
        if (this.llamadasActivas == 0) {
            setTimeout(() => {
                if (this.spiner !== null) {
                    try {
                        this.spiner.close();
                       // console.log('Intentando destruir el spinner');
                        this.spiner.destroy();
                        this.spiner = null; // Asegúrate de establecerlo a null después de destruirlo
                        //console.log('Spinner destruido correctamente');
                    } catch (error) {
                        console.error('Error closing spinner:', error);
                    }
                } else {
                   // console.log('Spinner ya es null, no es necesario destruirlo');
                }
            }, 1000);
        } else {
           // console.log('Aún hay llamadas activas, no se destruye el spinner');
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
        this.llamarspinner('helper');
    }

    hideLoading() {
        this.cerrarspinner('helper');
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
    construirFiltros(
        filtroServicio: string[],
        valorServicio: any[]
    ): { [key: string]: any } {
        console.log(filtroServicio, valorServicio);
        // Construir el objeto de filtros
        const filtros: { [key: string]: any } = {};
        try {
            // Verificar si los arrays tienen la misma longitud
            if (filtroServicio.length !== valorServicio.length) {
                console.error(
                    'Los arrays de filtros y valores deben tener la misma longitud'
                );
                return {};
            }

            // Si los arrays están vacíos, devolver un objeto vacío
            if (filtroServicio.length === 0 || valorServicio.length === 0) {
                return {};
            }

            for (let i = 0; i < filtroServicio.length; i++) {
                filtros[filtroServicio[i]] = valorServicio[i];
            }
            console.log(filtros);
            return filtros;
        } catch (error) {
            console.error(error);
            return filtros;
        }
    }
}
