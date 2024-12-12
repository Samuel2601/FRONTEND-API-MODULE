import { Component } from '@angular/core';
import { RegistroService } from '../services/registro.service';
import { ImportsModule } from 'src/app/demo/services/import';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
    selector: 'app-search',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './search.component.html',
    styleUrl: './search.component.scss',
})
export class SearchComponent {
    buscarForm: FormGroup;

    // Datos de ejemplo para dropdowns (estos deben obtenerse desde un servicio)
    nacionalidades = ['Ecuador', 'Perú', 'Colombia'];
    sectores = ['Sector 1', 'Sector 2', 'Sector 3'];
    tiposDeVivienda = ['Casa', 'Departamento', 'Vivienda Temporal'];

    constructor(private fb: FormBuilder) {
        // Inicializamos el formulario con los campos que vamos a buscar
        this.buscarForm = this.fb.group({
            // Sección de Información Registro
            fecha: [null],

            // Sección de Información Personal
            entrevistado: [''],
            dni: [''],
            edad: [null],
            nacionalidad: [''],
            telefono: [''],

            // Sección de Información de Ubicación
            sector: [''],
            barrio: [''],
            manzana: [''],
            lotenumero: [''],
            familyCount: [null],

            // Sección de Salud
            estadoSalud: [''],
            causasSalud: [''],
            conexionHigienico: [''],

            // Sección de Vivienda
            estructuraVivienda: [''],
            serviciosBasicos: [''],
            tenenciaVivienda: [''],
            numPisos: [null],

            // Sección de Medios de Vida
            participacionCapacitacion: [''],
            actividadLaboral: [''],
            ingresosMensuales: [''],

            // Sección de Redes de Apoyo
            actividadesBarrio: [''],
            recibeAyudaHumanitaria: [''],
            mejorasBarrio: [''],
        });
    }

    // Método para enviar la búsqueda
    buscar() {
        const busqueda = this.buscarForm.value;
        console.log(busqueda);
        // Aquí se llamaría a un servicio para obtener los resultados de la búsqueda
    }
}
