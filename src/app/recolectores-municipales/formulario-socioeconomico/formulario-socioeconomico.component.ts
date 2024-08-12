import { Component } from '@angular/core';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';

@Component({
    selector: 'app-formulario-socioeconomico',
    templateUrl: './formulario-socioeconomico.component.html',
    styleUrl: './formulario-socioeconomico.component.scss',
})
export class FormularioSocioeconomicoComponent {
    surveyForm: FormGroup;
    houseStates = [
        { name: 'Casa Cerrada' },
        { name: 'Solar Vacío' },
        { name: 'Construcción Iniciada' },
        { name: 'Hogar Entrevistado' },
        { name: 'Casa no Habitada' },
        { name: 'Solar con maleza' },
    ];
    estadoSaludStates = [
        { name: 'Excelente' },
        { name: 'Bueno' },
        { name: 'Regular' },
        { name: 'Malo' },
        { name: 'Fatal' },
    ];
    causasSaludStates = [
        { name: 'Mala Alimentación' },
        { name: 'Entorno' },
        { name: 'El no-uso de medicamentos' },
        { name: 'No me gusta el médico' },
        { name: 'No tengo recursos para ir al médico' },
        { name: 'Distancia con el sub-centro de salud' },
    ];
    conexionHigienicoStates = [
        { name: 'Red pública' },
        { name: 'Pozo ciego' },
        { name: 'Pozo séptico' },
        { name: 'Río o canal' },
        { name: 'No tiene' },
    ];
    viviendaStructureStates = [
        { name: 'Hormigón' },
        { name: 'Cartón' },
        { name: 'Mixta' },
        { name: 'Madera' },
        { name: 'Plástico' },
        { name: 'Caña' },
        { name: 'Plywood' },
        { name: 'Zin' },
    ];

    serviciosBasicosStates = [
        { name: 'Agua' },
        { name: 'Teléfono/Convencional' },
        { name: 'Celular' },
        { name: 'Luz' },
        { name: 'Alcantarillado' },
        { name: 'Recolección de la Basura' },
        { name: 'Otros' },
    ];

    tipoPerdidaStates = [
        { name: 'Casa' },
        { name: 'Paredes' },
        { name: 'Muebles' },
        { name: 'Enseres' },
    ];

    tenenciaViviendaStates = [
        { name: 'Propia' },
        { name: 'Prestada' },
        { name: 'Abandonada' },
        { name: 'Donada' },
        { name: 'Alquilada' },
        { name: 'Invadida' },
    ];

    documentosPropiedadStates = [
        { name: 'Contrato de compra-venta' },
        { name: 'Derecho de posesión' },
        { name: 'Escritura' },
        { name: 'Ninguno' },
    ];

    tipoAlumbradoStates = [
        { name: 'Electricidad' },
        { name: 'Gas' },
        { name: 'Lámparas' },
        { name: 'Otros' },
    ];

    abastecimientoAguaStates = [
        { name: 'Agua Potable' },
        { name: 'Cisterna' },
        { name: 'Pozo' },
        { name: 'Río' },
        { name: 'Tanquero' },
        { name: 'Embotellada' },
        { name: 'Otros' },
    ];
    bienesServiciosElectrodomesticosStates = [
        { name: 'Internet' },
        { name: 'Lavadora' },
        { name: 'Cocina de gas' },
        { name: 'Cocineta' },
        { name: 'Cocina de inducción' },
        { name: 'TV' },
        { name: 'TV Cable' },
        { name: 'Laptop' },
        { name: 'Refrigeradora' },
        { name: 'Computadora' },
        { name: 'Plancha Eléctrica' },
        { name: 'Microondas' },
        { name: 'No quiso responder' },
        { name: 'Otros' },
    ];

    zonaRiesgoStates = [
        { name: 'Deslave' },
        { name: 'Desbordamientos del río' },
        { name: 'Inundaciones' },
        { name: 'Incendios' },
        { name: 'Otros' },
        { name: 'No' },
    ];
    constructor(private fb: FormBuilder) {
        this.surveyForm = this.fb.group({
            date: ['', Validators.required],
            possessionTime: [''],
            phone: [''],
            nationality: [''],
            surveyorName: ['', Validators.required],
            intervieweeName: ['', Validators.required],
            age: ['', Validators.required],
            ethnicity: [''],
            civilStatus: [''],
            educationLevel: [''],
            idNumber: [''],
            disability: [''],
            address: ['', Validators.required],
            sector: [''],
            neighborhood: [''],
            blockNumber: [''],
            lotNumber: [''],
            familyCount: [0, Validators.required],
            peopleCount: [0, Validators.required],
            houseState: new FormControl(),
            estadoSalud: [''],
            causasSalud: [[]],
            ultimaVisita: [''],
            otrosMetodosSanacion: [''],
            conexionHigienico: [''],
            bienesServiciosElectrodomesticos: [''],
            abastecimientoAgua: [''],
            tipoAlumbrado: [''],
            documentosPropiedad: [''],
            tenenciaVivienda: [''],
            zonaRiesgo: [''],
            tipoPerdida: [''],
            serviciosBasicos: [''],
            numPisos: [''],
            numHabitaciones: [''],
            estructuraVivienda: [''],
        });
    }
    onSubmit() {
        console.log(this.surveyForm.value);
        if (this.surveyForm.valid) {
            // Aquí puedes manejar el envío del formulario
        }
    }
}
