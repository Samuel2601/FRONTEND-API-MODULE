import { Component } from '@angular/core';

import {
    FormArray,
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
    registrationForm: FormGroup;
    houseStateOptions = [
        { label: 'Casa Cerrada', value: 'casa_cerrada' },
        { label: 'Solar Vacío', value: 'solar_vacio' },
        { label: 'Construcción Iniciada', value: 'construccion_iniciada' },
        { label: 'Hogar Entrevistado', value: 'hogar_entrevistado' },
        { label: 'Casa No Habitada', value: 'casa_no_habitada' },
        { label: 'Solar con Maleza', value: 'solar_con_maleza' },
    ];

    estadoSaludOptions = [
        { label: 'Excelente', value: 'excelente' },
        { label: 'Bueno', value: 'bueno' },
        { label: 'Regular', value: 'regular' },
        { label: 'Malo', value: 'malo' },
        { label: 'Fatal', value: 'fatal' },
    ];

    causasSaludOptions = [
        { label: 'Mala Alimentación', value: 'mala_alimentacion' },
        { label: 'Entorno', value: 'entorno' },
        { label: 'El No-Uso de Medicamento', value: 'no_uso_medicamento' },
        { label: 'No Me Gusta el Médico', value: 'no_me_gusta_medico' },
        { label: 'No Tengo Recursos para Ir al Médico', value: 'no_recursos' },
        {
            label: 'Distancia con el Subcentro de Salud',
            value: 'distancia_subcentro',
        },
    ];

    conexionHigienicoOptions = [
        { label: 'Red Pública', value: 'red_publica' },
        { label: 'Pozo Ciego', value: 'pozo_ciego' },
        { label: 'Pozo Séptico', value: 'pozo_septico' },
        { label: 'Río o Canal', value: 'rio_canal' },
        { label: 'No Tiene', value: 'no_tiene' },
    ];

    estructuraViviendaOptions = [
        'Hormigón',
        'Cartón',
        'Mixta',
        'Madera',
        'Plástico',
        'Caña',
        'Plywood',
        'Zinc',
    ];
    serviciosBasicosOptions = [
        'Agua',
        'Teléfono/Convencional',
        'Celular',
        'Luz',
        'Alcantarillado',
        'Recolección de Basura',
        'Otros',
    ];
    tenenciaViviendaOptions = [
        'Propia',
        'Alquilada',
        'Prestada',
        'Donada',
        'Invadida',
        'Abandonada',
        'Otro',
    ];
    documentosPropiedadOptions = [
        'Contrato de Compra-Venta',
        'Derecho de Posesión',
        'Escritura',
        'Ninguna',
    ];
    tipoAlumbradoOptions = ['Electricidad', 'Lámparas', 'Otros'];
    abastecimientoAguaOptions = [
        'Agua Potable',
        'Cisterna',
        'Pozo',
        'Río',
        'Tanquero',
        'Embotellada',
        'Otros',
    ];
    bienesServiciosElectrodomesticosOptions = [
        'Internet',
        'Lavadora',
        'Cocina de Gas',
        'Cocina Eléctrica',
        'Cocina de Inducción',
        'TV',
        'TV Cable',
        'Laptop',
        'Refrigeradora',
        'Computadora',
        'Plancha Eléctrica',
        'Microondas',
        'No Quiso Responder',
        'Otros',
    ];
    zonaRiesgoOptions = [
        'Deslave',
        'Desbordamientos del Río',
        'Inundaciones',
        'Incendios',
        'Otros',
        'No',
    ];

    newCausa: string = '';
    constructor(private fb: FormBuilder) {
        this.registrationForm = this.fb.group({
            informacionRegistro: this.fb.group({
                date: ['', Validators.required],
                encuestador: ['', Validators.required],
            }),
            informacionPersonal: this.fb.group({
                entrevistado: ['', Validators.required],
                dni: ['', Validators.required],
                edad: [null, Validators.required], // NUMERO
                nacionalidad: ['', Validators.required],
                phone: ['', Validators.required],
            }),
            informacionUbicacion: this.fb.group({
                posesionTime: ['', Validators.required],
                sector: ['', Validators.required],
                barrio: ['', Validators.required],
                manzana: ['', Validators.required],
                lotenumero: ['', Validators.required],
                familyCount: [null, Validators.required], // NUMERO
                peopleCount: [null, Validators.required], // NUMERO
                houseState: ['', Validators.required], // UNO: CASA CERRADA, SOLAR VACÍO, CONSTRUCCIÓN INICIADA, HOGAR ENTREVISTADO, CASA NO HABITADA, SOLAR CON MALEZA
            }),
            salud: this.fb.group({
                estadoSalud: ['', Validators.required], //UNO: EXCELENTE, MALO, BUENO, REGULAR, FATAL
                causasSalud: [[], Validators.required], // MULTIPLE: MALA ALIMENTACIÓN, ENTORNO, EL NO-USO DE MEDICAMENTO, OTRO (ESPECIFICAR), NO ME GUSTA EL MÉDICO, NO TENGO RECURSOS PARA IR AL MÉDICO, DISTANCIA CON EL SUBCENTRO DE SALUD
                conexionHigienico: ['', Validators.required], // UNO: RED PÚBLICA, POZO CIEGO, POZO SÉPTICO, RÍO O CANAL, NO TIENE
            }),
            vivienda: this.fb.group({
                estructuraVivienda: ['', Validators.required], // UNO: HORMIGÓN, CARTÓN, MIXTA, MADERA, PLÁSTICO, CAÑA, PLYWOOD, ZINC
                serviciosBasicos: [[], Validators.required], // MULTIPLE: AUGA, TELÉFONO/CONVENCIONAL, CELULAR, LUZ, ALCANTARILLADO, RECOLECCIÓN DE LA BASURA, OTROS
                tenenciaVivienda: ['', Validators.required], // UNO: PROPIA, ALQUILADA, PRESTADA, DONADA, INVADIDA, ABANDONADA, OTRO:
                documentosPropiedad: [[], Validators.required], // UNO: CONTRATO DE COMPRA-VENTA, DERECHO DE POSISÓN, ESCRITURA, NINGUNA
                numPisos: ['', Validators.required],
                numHabitaciones: ['', Validators.required],
                tipoAlumbrado: ['', Validators.required], // UNO: ELECTRICIDAD, LAMPARAS, OTROS:
                abastecimientoAgua: [[], Validators.required], // MULTIPLE: AGUA POTABLE, CISTERNA, POZO, RIO, TANQUERO, EMBOTELLADA, OTROS:
                bienesServiciosElectrodomesticos: [[], Validators.required], //MULTIPLE: INTERNET, LAVADORA, COCINA DE GAS, COCINEA, COCINA DE INDUCCIÓN, TV, TV CABLE, LAPTOP, REFRIGERADORA, COMPUTADORA, PLANCHA EÉCTRICA, MICROONDAS, NO QUISO RESPONDER, OTROS:
                zonaRiesgo: ['', Validators.required], //UNO: DESLAVE, DEBORDAMIENTOS DEL RÍO, INUNDACIONES, INCENDIOS, OTROS: , NO
            }),
            mediosDeVida: this.fb.group({
                participacionCapacitacion: ['', Validators.required], //UNO: SI, NO
                cuantosTrabajos: [null, Validators.required], //NÚMERO
                actividadLaboral: ['', Validators.required], //UNO: A TIEMPO COMPLETO, PARCIAL, ESPORÁDICA, POR TEMPORADA, PENSIONISTA, CESANTE, NINGUNA
                actividadEconomica: [[], Validators.required], // DIALOG PARA INGRESAR EL NOMBRE DE LA ACTIVIDAD ECONOMICA //HACER UN PEQUEÑA TABLA PARA MOSTRAR LOS INGRESADOS, AÑADIR BOTÓN PARA MODIFICAR CON EL DIALOG O BORRAR
                relacionDependencia: ['', Validators.required], //UNO: SI FORMAL, INFORMAL, NO QUISO RESPONDER
                cuentaPropia: ['', Validators.required], //UNO: SI CON RUC, SI CON RISE, SIN RUC, NO CON RISE, NO QUISO RESPONDER
                ingresosMensuales: ['', Validators.required], // UNO: Menos que salario basicos, USD460 - USD500,USD500 - USD750,USD750 - USD999, USD1000+, No quiere responder
                gastosHogar: [[], Validators.required], // ESPECIFICAR CUANTO PARA CADA UNO: Pago alquiler de vivienda %, Pago de préstamo de vivienda %, Arreglo de la vivienda %, Vestimenta %, Alimentación %, Salud %, Educación %, Serv.Básicos %, Movilidad %, Otros Gastos %, Ahorro % 
                especifique: [''], // Ahorro Formal: NUMERO, Ahorro Informal: NUMERO
                fuentesIngresos: [[], Validators.required], //MULTIPLE: Trabajo, Bono por discapacidad, Bono Madres Solteras, Bono de Desarrollo Humano, Bono de la Tercera Edad, Apoyo  de ONG’s, Pensiòn de Alimentos, Otros, Pension por Jubilacion
            }),
            redesDeApoyo: this.fb.group({
                actividadesBarrio: [[], Validators.required], // Utiliza FormArray para múltiples selecciones
                actividadesDentroCanton: [[], Validators.required], // Utiliza FormArray para múltiples selecciones
                actividadesFueraCanton: [[], Validators.required], // Utiliza FormArray para múltiples selecciones
                sugerenciasBarrio: [[], Validators.required], // Utiliza FormArray para múltiples selecciones
                propuestasAdicionales: [''],
                ayudaHumanitaria: [[], Validators.required], // Utiliza FormArray para múltiples selecciones
                otros: [''],
            }),
        });
    }
    customCausaControl = new FormControl(''); // Control para la nueva causa
    displayoption:number=3;
    addCausa() {
        const nuevaCausa = this.customCausaControl.value.trim();
        if (
            nuevaCausa &&
            !this.causasSaludOptions.some(
                (option) => option.label === nuevaCausa
            )
        ) {
            const causesControl =
                this.registrationForm.get('salud.causasSalud').value;
            if (!causesControl.includes(nuevaCausa)) {
                causesControl.push(nuevaCausa);
            }
            this.customCausaControl.setValue(''); // Limpiar campo de texto
        }
    }

    onSubmit() {
        console.log(this.registrationForm.value);
        if (this.registrationForm.valid) {
            // Aquí puedes manejar el envío del formulario
        }
    }
    actividadEconomicaList: any[] = [];
    isDialogVisible: boolean = false;
    editIndex: number | null = null;
    actividadEconomica: any = { nombre: '' };
  
    // Mostrar diálogo para añadir o editar actividad económica
  showActividadEconomicaDialog(index: number | null = null) {
    if (index !== null) {
      this.actividadEconomica = { ...this.actividadEconomicaList[index] }; // Copiar la actividad existente
      this.editIndex = index;
    } else {
      this.actividadEconomica = { nombre: '' }; // Nueva actividad
      this.editIndex = null;
    }
    this.isDialogVisible = true;
  }

  // Confirmar adición o edición de actividad económica
  saveActividadEconomica() {
    if (this.editIndex !== null) {
      this.actividadEconomicaList[this.editIndex] = this.actividadEconomica;
    } else {
      this.actividadEconomicaList.push(this.actividadEconomica);
    }
    this.registrationForm.get('mediosDeVida').value.controls['actividadEconomica'].setValue(this.actividadEconomicaList);
    this.isDialogVisible = false;
  }

  // Eliminar actividad económica
  removeActividadEconomica(index: number) {
    this.actividadEconomicaList.splice(index, 1);
    this.registrationForm.get('mediosDeVida').value.controls['actividadEconomica'].setValue(this.actividadEconomicaList);
  }
}
