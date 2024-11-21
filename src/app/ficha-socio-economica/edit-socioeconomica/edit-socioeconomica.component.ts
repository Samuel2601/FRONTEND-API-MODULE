import {
    Component,
    OnInit,
    Input,
    OnChanges,
    SimpleChanges,
} from '@angular/core';
import { RegistroService } from '../services/registro.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ImportsModule } from 'src/app/demo/services/import';

@Component({
    selector: 'app-edit-socioeconomica',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './edit-socioeconomica.component.html',
    styleUrls: ['./edit-socioeconomica.component.scss'],
})
export class EditSocioeconomicaComponent implements OnInit, OnChanges {
    @Input() registroId: string | null = null; // Recibe el ID directamente como input
    registro: any = null; // Datos del registro
    loading: boolean = true; // Indicador de carga
    token = this.authservice.token() || ''; // Token de autenticación

    constructor(
        private registroService: RegistroService,
        private authservice: AuthService,
        private route: ActivatedRoute,
        private router: Router
    ) {}

    ngOnInit(): void {
        // Si se recibe un id por input, lo cargamos directamente
        if (this.registroId) {
            this.loadRegistroData(this.registroId);
        } else {
            // Si no, verificamos si hay un id en la ruta
            const routeId = this.route.snapshot.paramMap.get('id');
            if (routeId) {
                this.loadRegistroData(routeId);
            } else {
                this.router.navigate(['/ficha-socio-economica/registros']); // Redirigir si no hay id
            }
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['registroId'] && this.registroId) {
            this.loadRegistroData(this.registroId); // Si el id cambia, cargar los datos
        }
    }

    loadRegistroData(id: string): void {
        this.loading = true;
        this.registroService.getRegistro(this.token, id).subscribe({
            next: (response: any) => {
                this.registro = this.reverseFormData(response.data);
                this.loading = false;
                console.log('Registro:', response, this.registro);
            },
            error: (error) => {
                console.error('Error al cargar el registro:', error);
                this.loading = false;
            },
        });
    }

    saveChanges(): void {
        if (this.registro) {
            this.registroService
                .updateRegistro(this.registro.id, this.registro)
                .subscribe({
                    next: () => {
                        this.router.navigate([
                            '/ficha-socio-economica/registros',
                        ]); // Redirigir a la lista después de guardar
                    },
                    error: (error) => {
                        console.error('Error al guardar los cambios:', error);
                    },
                });
        }
    }

    reverseFormData(formData: any): any {
        const reverseData = (data: any) => {
            if (Array.isArray(data)) {
                return data.map((item) => {
                    if (typeof item === 'string' && item.startsWith('OTRO: ')) {
                        return { value: 'OTRO', customOther: item.slice(6) }; // Extrae la parte después de 'OTRO: '
                    }
                    return { value: item }; // Retorna un objeto con el campo 'value' para los demás casos
                });
            }
            return data;
        };

        const revertValue = (data: any) => {
            // Suponiendo que los valores que fueron extraídos con 'extractValue' ahora deben ser restaurados
            if (data === 'OTRO') {
                return { value: 'OTRO', customOther: '' }; // Se puede llenar con un valor por defecto si es necesario
            }
            return { value: data }; // Retorna un objeto con el campo 'value' para los demás casos
        };

        const revertGastosHogar = (gastos: any) => {
            return Object.keys(gastos).map((key) => ({
                tipo: { value: key },
                porcentaje: gastos[key],
            }));
        };

        return {
            informacionRegistro: { ...formData.informacionRegistro },
            informacionPersonal: {
                ...formData.informacionPersonal,
                nacionalidad: revertValue(
                    formData.informacionPersonal.nacionalidad
                ),
            },
            informacionUbicacion: { ...formData.informacionUbicacion },
            salud: {
                ...formData.salud,
                causasSalud: reverseData(formData.salud.causasSalud),
            },
            vivienda: {
                ...formData.vivienda,
                serviciosBasicos: reverseData(
                    formData.vivienda.serviciosBasicos
                ),
                documentosPropiedad: reverseData(
                    formData.vivienda.documentosPropiedad
                ),
                abastecimientoAgua: reverseData(
                    formData.vivienda.abastecimientoAgua
                ),
                bienesServiciosElectrodomesticos: reverseData(
                    formData.vivienda.bienesServiciosElectrodomesticos
                ),
            },
            mediosDeVida: {
                ...formData.mediosDeVida,
                actividadEconomica:
                    formData.mediosDeVida.actividadEconomica.map(
                        (nombre: any) => ({ nombre })
                    ),
                gastosHogar: revertGastosHogar(
                    formData.mediosDeVida.gastosHogar[0]
                ),
                fuentesIngresos: reverseData(
                    formData.mediosDeVida.fuentesIngresos
                ),
            },
            redesDeApoyo: {
                ...formData.redesDeApoyo,
                actividadesBarrio: reverseData(
                    formData.redesDeApoyo.actividadesBarrio
                ),
                recibeayudaHumanitaria: reverseData(
                    formData.redesDeApoyo.recibeayudaHumanitaria
                ),
                actividadCantonDentro: reverseData(
                    formData.redesDeApoyo.actividadCantonDentro
                ),
                actividadCantonFuera: reverseData(
                    formData.redesDeApoyo.actividadCantonFuera
                ),
            },
            familiaList: formData.familiaList.map((familiar: any) => ({
                ...familiar,
                familiNacionalidad: revertValue(familiar.familiNacionalidad),
            })),
        };
    }
}
