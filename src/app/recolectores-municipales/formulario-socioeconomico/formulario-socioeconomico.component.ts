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
    actividadLaboralStates = [
        { name: 'A tiempo completo' },
        { name: 'Parcial' },
        { name: 'Esporádica' },
        { name: 'Por temporada' },
        { name: 'Pensionista' },
        { name: 'Cesante' },
        { name: 'Ninguna' },
    ];
    relacionDependenciaStates = [
        { name: 'Sí - formal' },
        { name: 'informal' },
        { name: 'No quiso responder' },

    ];
    cuentaPropiaStates = [
        { name: 'Sí - con RUC' },
        { name: 'Sí - con RISE' },
        { name: 'Sin RUC' },
        { name: 'No con RISE' },
        { name: 'No quiso responder' },
      ];
    
      ingresosMensualesStates = [
        { name: 'Menos que salario básico' },
        { name: 'USD 460 - USD 500' },
        { name: 'USD 500 - USD 750' },
        { name: 'USD 750 - USD 999' },
        { name: 'USD 1,000+' },
        { name: 'No quiere responder' },
      ];
    
      fuentesIngresosStates = [
        { name: 'Trabajo' },
        { name: 'Bono por discapacidad' },
        { name: 'Bono Madres Solteras' },
        { name: 'Bono de Desarrollo Humano' },
        { name: 'Bono de la Tercera Edad' },
        { name: 'Apoyo de ONG’s' },
        { name: 'Pensión de Alimentos' },
        { name: 'Otros' },
        { name: 'Pensión por Jubilación' },
      ];
       // Definición de actividades en el barrio
  actividadesBarrioStates = [
    { name: 'Iglesia' },
    { name: 'Grupos LGBTI' },
    { name: 'Comité barrial' },
    { name: 'Clubes deportivos' },
    { name: 'Asociación de mujeres' },
    { name: 'Ninguna' },
    { name: 'Asociación juvenil' },
    { name: 'Otros' },
  ];

  // Actividades dentro del cantón
  actividadesDentroCantonStates = [
    { name: 'Playa' },
    { name: 'Domicilio' },
    { name: 'Río' },
    { name: 'Deporte' },
    { name: 'Campo' },
    { name: 'Parques' },
    { name: 'Otros' },
  ];

  // Actividades fuera del cantón
  actividadesFueraCantonStates = [
    { name: 'Playa' },
    { name: 'Domicilio' },
    { name: 'Río' },
    { name: 'Deporte' },
    { name: 'Campo' },
    { name: 'Viajes' },
    { name: 'Parque' },
    { name: 'Otros' },
  ];

  // Sugerencias para mejorar el barrio
  sugerenciasBarrioStates = [
    { name: 'Calles pavimentadas' },
    { name: 'Presencia Policial' },
    { name: 'Áreas verdes' },
    { name: 'Agua potable' },
    { name: 'Alcantarillado' },
    { name: 'Actividades recreativas' },
    { name: 'Alumbrado público' },
    { name: 'Recolección de basura' },
    { name: 'Sub-centro de salud' },
  ];
  ayudaHumanitariaStates = [
    { name: 'Iglesia' },
    { name: 'Vecinos/as' },
    { name: 'Amigos/as' },
    { name: 'Familia' },
    { name: 'ONG’s' },
    { name: 'Institución pública' },
    { name: 'Ninguna' },
    { name: 'Otros' },
  ];
  gastosHogar = [
    { name: 'Pago alquiler de vivienda' },
    { name: 'Pago de préstamo de vivienda' },
    { name: 'Arreglo de la vivienda' },
    { name: 'Vestimenta' },
    { name: 'Alimentación' },
    { name: 'Salud' },
    { name: 'Educación' },
    { name: 'Serv. Básicos' },
    { name: 'Movilidad' },
    { name: 'Otros Gastos' }
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
            participacionCapacitacion: [''], 
            cuantosTrabajos: [''], 
            actividadLaboral: [''],  // 
            actividadEconomica: [''], // 
            relacionDependencia: [''],
            cuentaPropia: [''],
            ingresosMensuales: [''],
            reparticionGastos: [''],
            fuentesIngresos: [[]],
            otrosIngresos: [''],
            actividadesBarrio: [[]], // Actividades en el barrio
            actividadesDentroCantón: [[]], // Actividades dentro del cantón
            actividadesFueraCantón: [[]], // Actividades fuera del cantón
            sugerenciasBarrio: [[], Validators.maxLength(3)], // Sugerencias para mejorar el barrio
            propuestasAdicionales: [''], // Propuestas adicionales
            ayudaHumanitaria: [[]], // Para las fuentes de ayuda humanitaria
            otros: [''], // Otros tipos de ayuda
            parentesco: [''],
            
            gastosHogar: this.fb.array([]), // Para los gastos del hogar
      nombre: [''],
      genero: [''],
      edad: [''],
      estadoCivil: [''],
      etnia: [''],
      nacionalidad: [''],
      cedula: [''],
      nivelEducativo: [''],
      ocupacion: [''],
      discapacidad: [''],
      enfermedadCronica: ['']
        });
        
    }
    
    onSubmit() {
        console.log(this.surveyForm.value);
        if (this.surveyForm.valid) {
            // Aquí puedes manejar el envío del formulario
        }
    }
}
