import { Component, OnInit } from '@angular/core';
import { RegistroService } from '../services/registro.service';
import { ImportsModule } from 'src/app/demo/services/import';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
    selector: 'app-search',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './search.component.html',
    styleUrl: './search.component.scss',
})
export class SearchComponent implements OnInit {
    // Formulario para la búsqueda
    buscarForm: FormGroup;

    // Datos de ejemplo para dropdowns (estos deben obtenerse desde un servicio)
    nacionalidades = ['Ecuador', 'Perú', 'Colombia'];
    sectores = ['Sector 1', 'Sector 2', 'Sector 3'];
    tiposDeVivienda = ['Casa', 'Departamento', 'Vivienda Temporal'];

    constructor(
        private fb: FormBuilder,
        private registroService: RegistroService
    ) {
        // Inicializamos el formulario con los campos que vamos a buscar
        this.buscarForm = this.fb.group({
            informacionRegistro: this.fb.group({
                date: this.fb.group({
                    start: [null],
                    end: [null],
                }),
                encuestador: [],
            }),
            informacionPersonal: this.fb.group({
                entrevistado: ['', [Validators.maxLength(100)]],
                dni: [null, [Validators.pattern('^[0-9]+$')]],
                edad: this.fb.group({
                    min: [null, [Validators.min(1), Validators.max(120)]],
                    max: [null, [Validators.min(1), Validators.max(120)]],
                }),
                nacionalidad: [undefined, Validators.required],
                phone: [null, [Validators.pattern('^[0-9]+$')]],
            }),
            informacionUbicacion: this.fb.group({
                posesionTime: this.fb.group({
                    min: [null, [Validators.min(0)]],
                    max: [null, [Validators.min(0)]],
                }),
                posesionTimeUnit: ['years'],
                sector: [null, Validators.required],
                barrio: [null, Validators.required],
                manzana: [null, Validators.required],
                lotenumero: [null, Validators.required],
                familyCount: this.fb.group({
                    min: [null, [Validators.min(1)]],
                    max: [null, [Validators.min(1)]],
                }),
                peopleCount: this.fb.group({
                    min: [null, [Validators.min(1)]],
                    max: [null, [Validators.min(1)]],
                }),
                houseState: [null, Validators.required],
            }),
            salud: this.fb.group({
                estadoSalud: [null, Validators.required],
                causasSalud: [[], Validators.required],
                conexionHigienico: [null, Validators.required],
            }),
            vivienda: this.fb.group({
                estructuraVivienda: [null, Validators.required],
                serviciosBasicos: [[], [Validators.minLength(1)]],
                tenenciaVivienda: [null, Validators.required],
                documentosPropiedad: [[], Validators.required],
                numPisos: this.fb.group({
                    min: [null, [Validators.min(1)]],
                    max: [null, [Validators.min(1)]],
                }),
                numHabitaciones: this.fb.group({
                    min: [null, [Validators.min(1)]],
                    max: [null, [Validators.min(1)]],
                }),
                tipoAlumbrado: [null, Validators.required],
                abastecimientoAgua: [[], Validators.required],
                bienesServiciosElectrodomesticos: [[], Validators.required],
                zonaRiesgo: [null, Validators.required],
            }),
            mediosDeVida: this.fb.group({
                participacionCapacitacion: [null, Validators.required],
                cuantosTrabajos: this.fb.group({
                    min: [null, [Validators.min(0)]],
                    max: [null, [Validators.min(0)]],
                }),
                actividadLaboral: [null, Validators.required],
                actividadEconomica: [[]],
                relacionDependencia: [null, Validators.required],
                cuentaPropia: [null, Validators.required],
                ingresosMensuales: this.fb.group({
                    min: [null, [Validators.min(0)]],
                    max: [null, [Validators.min(0)]],
                }),
                gastosHogar: this.fb.group({
                    min: [null, [Validators.min(0)]],
                    max: [null, [Validators.min(0)]],
                }),
                fuentesIngresos: [[], Validators.required],
            }),
            redesDeApoyo: this.fb.group({
                actividadesBarrio: [[], Validators.required],
                recibeayudaHumanitaria: [[], Validators.required],
                actividadCantonDentro: [[], Validators.required],
                actividadCantonFuera: [[], Validators.required],
                mejorasBarrio: [[], Validators.required],
                mejoraPlus: [null],
            }),
            familiaList: [[]],
        });
    }
    ngOnInit(): void {
        this.fecthuniqueValues();
    }
    uniqueValues: any;
    async fecthuniqueValues() {
        this.registroService.getUniqueValues().subscribe((data: any) => {
            console.log(data);
            this.uniqueValues = data;
        });
    }

    // Método para enviar la búsqueda
    buscar() {
        const busqueda = this.buscarForm.value;
        console.log(busqueda);
        // Aquí se llamaría a un servicio para obtener los resultados de la búsqueda
    }
}
