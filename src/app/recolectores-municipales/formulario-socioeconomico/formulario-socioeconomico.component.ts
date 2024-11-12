import { Component } from '@angular/core';

import {
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { MessageService } from 'primeng/api';
import { RegistroService } from '../service/registro.service';

@Component({
    selector: 'app-formulario-socioeconomico',
    templateUrl: './formulario-socioeconomico.component.html',
    styleUrl: './formulario-socioeconomico.component.scss',
    providers: [MessageService],
})
export class FormularioSocioeconomicoComponent {
    registrationForm: FormGroup;

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private registrationService: RegistroService
    ) {
        this.registrationForm = this.fb.group({
            informacionRegistro: this.fb.group({
                date: ['', Validators.required],
                encuestador: ['', Validators.required],
            }),
            informacionPersonal: this.fb.group({
                entrevistado: ['', Validators.required],
                dni: ['', Validators.required],
                edad: [null, Validators.required], // VALOR NÚMERICO
                nacionalidad: ['', Validators.required],
                phone: ['', Validators.required],
            }),
            informacionUbicacion: this.fb.group({
                posesionTime: ['', Validators.required],
                sector: ['', Validators.required],
                barrio: ['', Validators.required],
                manzana: ['', Validators.required],
                lotenumero: ['', Validators.required],
                familyCount: [null, Validators.required], // VALOR NÚMERICO
                peopleCount: [null, Validators.required], // VALOR NÚMERICO
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
                numPisos: ['', Validators.required], //VALOR NÚMERICO
                numHabitaciones: ['', Validators.required], //VALOR NÚMERICO
                tipoAlumbrado: ['', Validators.required], // UNO: ELECTRICIDAD, LAMPARAS, OTROS.
                abastecimientoAgua: [[], Validators.required], // MULTIPLE: AGUA POTABLE, CISTERNA, POZO, RIO, TANQUERO, EMBOTELLADA, OTROS:
                bienesServiciosElectrodomesticos: [[], Validators.required], //MULTIPLE: INTERNET, LAVADORA, COCINA DE GAS, COCINEA, COCINA DE INDUCCIÓN, TV, TV CABLE, LAPTOP, REFRIGERADORA, COMPUTADORA, PLANCHA EÉCTRICA, MICROONDAS, NO QUISO RESPONDER, OTROS:
                zonaRiesgo: ['', Validators.required], //UNO: DESLAVE, DEBORDAMIENTOS DEL RÍO, INUNDACIONES, INCENDIOS, OTROS: , NO
            }),
            mediosDeVida: this.fb.group({
                participacionCapacitacion: ['', Validators.required], //UNO: SI, NO
                cuantosTrabajos: [null, Validators.required], // VALOR NUMERICO
                actividadLaboral: ['', Validators.required], //UNO: A TIEMPO COMPLETO, PARCIAL, ESPORÁDICA, POR TEMPORADA, PENSIONISTA, CESANTE, NINGUNA
                actividadEconomica: [[], Validators.required], // DIALOG PARA INGRESAR EL NOMBRE DE LA ACTIVIDAD ECONOMICA //HACER UN PEQUEÑA TABLA PARA MOSTRAR LOS INGRESADOS, AÑADIR BOTÓN PARA MODIFICAR CON EL DIALOG O BORRAR
                relacionDependencia: ['', Validators.required], //UNO: SI FORMAL, INFORMAL, NO QUISO RESPONDER
                cuentaPropia: ['', Validators.required], //UNO: SI CON RUC, SI CON RISE, SIN RUC, NO CON RISE, NO QUISO RESPONDER
                ingresosMensuales: ['', Validators.required], // UNO: Menos que salario basicos, USD460 - USD500,USD500 - USD750,USD750 - USD999, USD1000+, No quiere responder
                gastosHogar: [[], Validators.required], // ESPECIFICAR CUANTO PARA CADA UNO: Pago alquiler de vivienda %, Pago de préstamo de vivienda %, Arreglo de la vivienda %, Vestimenta %, Alimentación %, Salud %, Educación %, Serv.Básicos %, Movilidad %, Otros Gastos %, Ahorro %
                fuentesIngresos: [[], Validators.required], //MULTIPLE: Trabajo, Bono por discapacidad, Bono Madres Solteras, Bono de Desarrollo Humano, Bono de la Tercera Edad, Apoyo  de ONG’s, Pensiòn de Alimentos, Otros, Pension por Jubilacion
            }),
            redesDeApoyo: this.fb.group({
                actividadesBarrio: [[], Validators.required], // MULTIPLE: IGLESIA, GRUPOS LGTBIQ, COMITE BARRIAL, CLUBES DEPORTIVOS, ASOCIACIÓN DE MUJERES, ASOCIACIÓN JUVENIL, CLUB DE BARCO, CLUB DE POLICIA, CLUB DE ASESORIAS, CLUB DE ESTUDIANTES, OTROS, NINGUNO
                recibeayudaHumanitaria: [[], Validators.required], // MULTIPLE: IGLESIA, VECINO(A)S, AMIGO(A)S, FAMILIA, ONG'S, INSTITUCIONES PÚBLICA, NINGUNO, OTROS
                actividadCantonDentro: [[], Validators.required], // MULTIPLES: PLAYA, DOMICILIO, RIO, DEPORTE, CAMPO, PARQUES, OTROS
                actividadCantonFuera: [[], Validators.required], // MULTIPLES: PLAYA, DOMICILIO, RIO, DEPORTE, CAMPO, PARQUES, OTROS
                mejorasBarrio: [[], Validators.required], //MULTIPLE: CALLES PAVIMENTADAS, PRESENCIA POLICÍAL, AREAS VERDES, AGUA POTABLE, ALACANTARILLADO, ACTIVIDADES RECREATIVAS, ALUMBRADO PÚBLICO, RECOLECCIÓN DE BASURA, SUB-CENTRO DE SALUD
                mejoraPlus: [''],
            }),
        });
    }

    // Opciones para el campo houseState en el grupo informacionUbicacion
    houseStateOptions: { label: string; value: string }[] = [
        { label: 'Casa Cerrada', value: 'CASA_CERRADA' },
        { label: 'Solar Vacío', value: 'SOLAR_VACIO' },
        { label: 'Construcción Iniciada', value: 'CONSTRUCCION_INICIADA' },
        { label: 'Hogar Entrevistado', value: 'HOGAR_ENTREVISTADO' },
        { label: 'Casa No Habitada', value: 'CASA_NO_HABITADA' },
        { label: 'Solar con Maleza', value: 'SOLAR_CON_MALEZA' },
    ];

    // Opciones para los campos en el grupo "salud"
    estadoSaludOptions: { label: string; value: string }[] = [
        { label: 'Excelente', value: 'EXCELENTE' },
        { label: 'Malo', value: 'MALO' },
        { label: 'Bueno', value: 'BUENO' },
        { label: 'Regular', value: 'REGULAR' },
        { label: 'Fatal', value: 'FATAL' },
    ];

    causasSaludOptions: { label: string; value: string }[] = [
        { label: 'Mala Alimentación', value: 'MALA_ALIMENTACION' },
        { label: 'Entorno', value: 'ENTORNO' },
        { label: 'El No-Uso de Medicamento', value: 'NO_USO_MEDICAMENTO' },
        { label: 'Otro (Especificar)', value: 'OTRO' },
        { label: 'No me Gusta el Médico', value: 'NO_ME_GUSTA_MEDICO' },
        {
            label: 'No Tengo Recursos para ir al Médico',
            value: 'NO_RECURSOS_MEDICO',
        },
        {
            label: 'Distancia con el Subcentro de Salud',
            value: 'DISTANCIA_SUBCENTRO',
        },
    ];

    conexionHigienicoOptions: { label: string; value: string }[] = [
        { label: 'Red Pública', value: 'RED_PUBLICA' },
        { label: 'Pozo Ciego', value: 'POZO_CIEGO' },
        { label: 'Pozo Séptico', value: 'POZO_SEPTICO' },
        { label: 'Río o Canal', value: 'RIO_CANAL' },
        { label: 'No Tiene', value: 'NO_TIENE' },
    ];

    // Opciones para los campos en el grupo "vivienda"
    estructuraViviendaOptions: { label: string; value: string }[] = [
        { label: 'Hormigón', value: 'HORMIGON' },
        { label: 'Cartón', value: 'CARTON' },
        { label: 'Mixta', value: 'MIXTA' },
        { label: 'Madera', value: 'MADERA' },
        { label: 'Plástico', value: 'PLASTICO' },
        { label: 'Caña', value: 'CANA' },
        { label: 'Plywood', value: 'PLYWOOD' },
        { label: 'Zinc', value: 'ZINC' },
    ];

    serviciosBasicosOptions: { label: string; value: string }[] = [
        { label: 'Agua', value: 'AGUA' },
        { label: 'Teléfono Convencional', value: 'TELEFONO' },
        { label: 'Celular', value: 'CELULAR' },
        { label: 'Luz', value: 'LUZ' },
        { label: 'Alcantarillado', value: 'ALCANTARILLADO' },
        { label: 'Recolección de Basura', value: 'RECOLECCION_BASURA' },
        { label: 'Otros', value: 'OTROS' },
    ];

    tenenciaViviendaOptions: { label: string; value: string }[] = [
        { label: 'Propia', value: 'PROPIA' },
        { label: 'Alquilada', value: 'ALQUILADA' },
        { label: 'Prestada', value: 'PRESTADA' },
        { label: 'Donada', value: 'DONADA' },
        { label: 'Invadida', value: 'INVADIDA' },
        { label: 'Abandonada', value: 'ABANDONADA' },
        { label: 'Otro', value: 'OTRO' },
    ];

    documentosPropiedadOptions: { label: string; value: string }[] = [
        { label: 'Contrato de Compra-Venta', value: 'CONTRATO_COMPRA_VENTA' },
        { label: 'Derecho de Posesión', value: 'DERECHO_POSICION' },
        { label: 'Escritura', value: 'ESCRITURA' },
        { label: 'Ninguna', value: 'NINGUNA' },
    ];

    tipoAlumbradoOptions: { label: string; value: string }[] = [
        { label: 'Electricidad', value: 'ELECTRICIDAD' },
        { label: 'Lámparas', value: 'LAMPARAS' },
        { label: 'Otros', value: 'OTROS' },
    ];

    abastecimientoAguaOptions: { label: string; value: string }[] = [
        { label: 'Agua Potable', value: 'AGUA_POTABLE' },
        { label: 'Cisterna', value: 'CISTERNA' },
        { label: 'Pozo', value: 'POZO' },
        { label: 'Río', value: 'RIO' },
        { label: 'Tanquero', value: 'TANQUERO' },
        { label: 'Embotellada', value: 'EMBOTELLADA' },
        { label: 'Otros', value: 'OTROS' },
    ];

    bienesServiciosElectrodomesticosOptions: {
        label: string;
        value: string;
    }[] = [
        { label: 'Internet', value: 'INTERNET' },
        { label: 'Lavadora', value: 'LAVADORA' },
        { label: 'Cocina de Gas', value: 'COCINA_GAS' },
        { label: 'Cocina', value: 'COCINA' },
        { label: 'Cocina de Inducción', value: 'COCINA_INDUCCION' },
        { label: 'TV', value: 'TV' },
        { label: 'TV Cable', value: 'TV_CABLE' },
        { label: 'Laptop', value: 'LAPTOP' },
        { label: 'Refrigeradora', value: 'REFRIGERADORA' },
        { label: 'Computadora', value: 'COMPUTADORA' },
        { label: 'Plancha Eléctrica', value: 'PLANCHA_ELECTRICA' },
        { label: 'Microondas', value: 'MICROONDAS' },
        { label: 'No Quiso Responder', value: 'NO_RESPONDE' },
        { label: 'Otros', value: 'OTROS' },
    ];

    zonaRiesgoOptions: { label: string; value: string }[] = [
        { label: 'Deslave', value: 'DESLAVE' },
        { label: 'Desbordamientos del Río', value: 'DEBORDAMIENTOS_RIO' },
        { label: 'Inundaciones', value: 'INUNDACIONES' },
        { label: 'Incendios', value: 'INCENDIOS' },
        { label: 'Otros', value: 'OTROS' },
        { label: 'No', value: 'NO' },
    ];

    // Opciones para Medios de Vida
    participacionCapacitacionOptions = [
        { label: 'Sí', value: 'SI' },
        { label: 'No', value: 'NO' },
    ];

    actividadLaboralOptions = [
        { label: 'A tiempo completo', value: 'A_TIEMPO_COMPLETO' },
        { label: 'Parcial', value: 'PARCIAL' },
        { label: 'Esporádica', value: 'ESPORADICA' },
        { label: 'Por temporada', value: 'POR_TEMPORADA' },
        { label: 'Pensionista', value: 'PENSIONISTA' },
        { label: 'Cesante', value: 'CESANTE' },
        { label: 'Ninguna', value: 'NINGUNA' },
    ];

    relacionDependenciaOptions = [
        { label: 'Sí Formal', value: 'SI_FORMAL' },
        { label: 'Informal', value: 'INFORMAL' },
        { label: 'No quiso responder', value: 'NO_QUISO_RESPONDER' },
    ];

    cuentaPropiaOptions = [
        { label: 'Sí con RUC', value: 'SI_CON_RUC' },
        { label: 'Sí con RISE', value: 'SI_CON_RISE' },
        { label: 'Sin RUC', value: 'SIN_RUC' },
        { label: 'No con RISE', value: 'NO_CON_RISE' },
        { label: 'No quiso responder', value: 'NO_QUISO_RESPONDER' },
    ];

    ingresosMensualesOptions = [
        { label: 'Menos que salario básico', value: 'MENOS_SALARIO_BASICO' },
        { label: 'USD460 - USD500', value: 'USD460_500' },
        { label: 'USD500 - USD750', value: 'USD500_750' },
        { label: 'USD750 - USD999', value: 'USD750_999' },
        { label: 'USD1000+', value: 'USD1000_MAS' },
        { label: 'No quiere responder', value: 'NO_QUIERE_RESPONDER' },
    ];

    // Opciones para Fuentes de Ingresos
    fuentesIngresosOptions = [
        { label: 'Trabajo', value: 'TRABAJO' },
        { label: 'Bono por discapacidad', value: 'BONO_DISCAPACIDAD' },
        { label: 'Bono Madres Solteras', value: 'BONO_MADRES_SOLTERAS' },
        { label: 'Bono de Desarrollo Humano', value: 'BONO_DESARROLLO_HUMANO' },
        { label: 'Bono de la Tercera Edad', value: 'BONO_TERCERA_EDAD' },
        { label: 'Apoyo de ONG’s', value: 'APOYO_ONG' },
        { label: 'Pensión de Alimentos', value: 'PENSION_ALIMENTOS' },
        { label: 'Otros', value: 'OTROS' },
        { label: 'Pensión por Jubilación', value: 'PENSION_JUBILACION' },
    ];

    // Opciones para Gastos del Hogar
    gastosHogarOptions = [
        { label: 'Pago alquiler de vivienda', value: 'PAGO_ALQUILER_VIVIENDA' },
        {
            label: 'Pago de préstamo de vivienda',
            value: 'PAGO_PRESTAMO_VIVIENDA',
        },
        { label: 'Arreglo de la vivienda', value: 'ARREGLO_VIVIENDA' },
        { label: 'Vestimenta', value: 'VESTIMENTA' },
        { label: 'Alimentación', value: 'ALIMENTACION' },
        { label: 'Salud', value: 'SALUD' },
        { label: 'Educación', value: 'EDUCACION' },
        { label: 'Servicios Básicos', value: 'SERVICIOS_BASICOS' },
        { label: 'Movilidad', value: 'MOVILIDAD' },
        { label: 'Otros Gastos', value: 'OTROS_GASTOS' },
        { label: 'Ahorro', value: 'AHORRO' },
    ];

    // Variables para redesDeApoyo
    actividadesBarrioOptions = [
        { label: 'IGLESIA', value: 'IGLESIA' },
        { label: 'GRUPOS LGTBIQ', value: 'GRUPOS LGTBIQ' },
        { label: 'COMITE BARRIAL', value: 'COMITE BARRIAL' },
        { label: 'CLUBES DEPORTIVOS', value: 'CLUBES DEPORTIVOS' },
        { label: 'ASOCIACIÓN DE MUJERES', value: 'ASOCIACIÓN DE MUJERES' },
        { label: 'ASOCIACIÓN JUVENIL', value: 'ASOCIACIÓN JUVENIL' },
        { label: 'CLUB DE BARCO', value: 'CLUB DE BARCO' },
        { label: 'CLUB DE POLICIA', value: 'CLUB DE POLICIA' },
        { label: 'CLUB DE ASESORIAS', value: 'CLUB DE ASESORIAS' },
        { label: 'CLUB DE ESTUDIANTES', value: 'CLUB DE ESTUDIANTES' },
        { label: 'OTROS', value: 'OTROS' },
        { label: 'NINGUNO', value: 'NINGUNO' },
    ];

    recibeAyudaHumanitariaOptions = [
        { label: 'IGLESIA', value: 'IGLESIA' },
        { label: 'VECINO(A)S', value: 'VECINO(A)S' },
        { label: 'AMIGO(A)S', value: 'AMIGO(A)S' },
        { label: 'FAMILIA', value: 'FAMILIA' },
        { label: "ONG'S", value: "ONG'S" },
        { label: 'INSTITUCIONES PÚBLICA', value: 'INSTITUCIONES PÚBLICA' },
        { label: 'NINGUNO', value: 'NINGUNO' },
        { label: 'OTROS', value: 'OTROS' },
    ];

    actividadCantonDentroOptions = [
        { label: 'PLAYA', value: 'PLAYA' },
        { label: 'DOMICILIO', value: 'DOMICILIO' },
        { label: 'RIO', value: 'RIO' },
        { label: 'DEPORTE', value: 'DEPORTE' },
        { label: 'CAMPO', value: 'CAMPO' },
        { label: 'PARQUES', value: 'PARQUES' },
        { label: 'OTROS', value: 'OTROS' },
    ];

    actividadCantonFueraOptions = [
        { label: 'PLAYA', value: 'PLAYA' },
        { label: 'DOMICILIO', value: 'DOMICILIO' },
        { label: 'RIO', value: 'RIO' },
        { label: 'DEPORTE', value: 'DEPORTE' },
        { label: 'CAMPO', value: 'CAMPO' },
        { label: 'PARQUES', value: 'PARQUES' },
        { label: 'OTROS', value: 'OTROS' },
    ];

    mejorasBarrioOptions = [
        { label: 'CALLES PAVIMENTADAS', value: 'CALLES PAVIMENTADAS' },
        { label: 'PRESENCIA POLICÍAL', value: 'PRESENCIA POLICÍAL' },
        { label: 'AREAS VERDES', value: 'AREAS VERDES' },
        { label: 'AGUA POTABLE', value: 'AGUA POTABLE' },
        { label: 'ALCANTARILLADO', value: 'ALCANTARILLADO' },
        { label: 'ACTIVIDADES RECREATIVAS', value: 'ACTIVIDADES RECREATIVAS' },
        { label: 'ALUMBRADO PÚBLICO', value: 'ALUMBRADO PÚBLICO' },
        { label: 'RECOLECCIÓN DE BASURA', value: 'RECOLECCIÓN DE BASURA' },
        { label: 'SUB-CENTRO DE SALUD', value: 'SUB-CENTRO DE SALUD' },
    ];

    familigeneroOptions = [
        { label: 'Masculino', value: 'MASCULINO' },
        { label: 'Femenino', value: 'FEMENINO' },
        { label: 'No se aplica', value: 'NO SE APLICA' },
    ];
    estadoCivilOptions = [
        { label: 'Casado', value: 'CASADO' },
        { label: 'Soltero', value: 'SOLTERO' },
        { label: 'Divorciado', value: 'DIVERCIADO' },
        { label: 'Viudo', value: 'VIUDO' },
        { label: 'Separado', value: 'SEPARADO' },
        { label: 'No se aplica', value: 'NO SE APLICA' },
    ];
    etniaOptions = [
        { label: 'Hispana', value: 'HISPANA' },
        { label: 'Latina', value: 'LATINA' },
        { label: 'Asia', value: 'ASIA' },
        { label: 'Africana', value: 'AFRICANA' },
        { label: 'No se aplica', value: 'NO SE APLICA' },
    ];
    nacionalidadOptions = [
        { label: 'Española', value: 'ESPAÑOLA' },
        { label: 'Latina', value: 'LATINA' },
        { label: 'Asia', value: 'ASIA' },
        { label: 'Africana', value: 'AFRICANA' },
        { label: 'No se aplica', value: 'NO SE APLICA' },
    ];
    nivelEducativoOptions = [
        { label: 'Completo', value: 'COMPLETO' },
        { label: 'Mediano', value: 'MEDIANO' },
        { label: 'Bajo', value: 'BAJO' },
        { label: 'No se aplica', value: 'NO SE APLICA' },
    ];
    ocupacionOptions = [
        { label: 'Trabajador', value: 'TRABAJADOR' },
        { label: 'Estudiante', value: 'ESTUDIANTE' },
        { label: 'Estudia y Trabaja', value: 'ESTUDIANTE_TRABAJO' },
        { label: 'Otro', value: 'OTRO' },
        { label: 'No se aplica', value: 'NO SE APLICA' },
    ];
    discapacidadOptions = [
        { label: 'Discapacitado', value: 'DISCAPACITADO' },
        { label: 'No se aplica', value: 'NO SE APLICA' },
    ];
    enfermedadOptions = [
        { label: 'Enferma', value: 'ENFERMA' },
        { label: 'No se aplica', value: 'NO SE APLICA' },
    ];

    // Datos para el diálogo de Actividad Económica y Gastos del Hogar
    actividadEconomicaList = []; // Lista para las actividades económicas ingresadas
    gastosHogarList = []; // Lista para los gastos del hogar ingresados
    familiarList = []; // Lista para los gastos del hogar ingresados

    // Variables para los diálogos
    displayActividadDialog: boolean = false;
    displayGastosDialog: boolean = false;
    displayFamiliarDialog: boolean = false;

    actividadActual = { nombre: '' }; // Objeto temporal para actividad económica
    cloneEditActivada = { nombre: '' }; // Objeto temporal para actividad económica
    gastoActual = { tipo: { label: '', value: '' }, porcentaje: null }; // Objeto temporal para gasto del hogar
    cloneEditGasto = { tipo: { label: '', value: '' }, porcentaje: null }; // Objeto temporal para gasto del hogar

    familiarActual = {
        familiParentesco: '',
        familiaNombre: '',
        familiaApellido: '',
        familigenero: '',
        familiEdad: '',
        familiEstadoCivil: '',
        familiEtnia: '',
        familiNacionalidad: '',
        familiCeduala: '',
        familiNivelEducativo: '',
        familiOcupacion: '',
        familiDiscacidad: '',
        familiEnfermedad: '',
    }; // Objeto temporal para familiar
    cloneEditFamiliar = {
        familiParentesco: '',
        familiaNombre: '',
        familiaApellido: '',
        familigenero: '',
        familiEdad: '',
        familiEstadoCivil: '',
        familiEtnia: '',
        familiNacionalidad: '',
        familiCeduala: '',
        familiNivelEducativo: '',
        familiOcupacion: '',
        familiDiscacidad: '',
        familiEnfermedad: '',
    }; // Objeto temporal para familiar

    // Métodos en el componente

    showDialogActividadEconomica() {
        /* abrir diálogo */
        this.displayActividadDialog = true;
    }
    saveActividadEconomica() {
        const actividadExistente = this.actividadEconomicaList.find(
            (x) =>
                x.nombre === this.actividadActual.nombre ||
                x.nombre === this.cloneEditActivada.nombre
        );

        if (actividadExistente) {
            if (this.cloneEditActivada.nombre) {
                this.updateActividad();
            } else {
                this.mostrarErrorActividadExistente();
            }
        } else {
            this.agregarNuevaActividad();
        }
    }

    private updateActividad() {
        this.actividadEconomicaList.forEach((element) => {
            if (element.nombre === this.cloneEditActivada.nombre) {
                element.nombre = this.actividadActual.nombre;
            }
        });
        this.cloneEditActivada = { nombre: '' };
        this.displayActividadDialog = false;
        this.actividadActual = { nombre: '' };
    }

    private mostrarErrorActividadExistente() {
        this.displayActividadDialog = false;
        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'La actividad ya existe',
        });
    }

    private agregarNuevaActividad() {
        this.actividadEconomicaList.push(this.actividadActual);
        this.actividadActual = { nombre: '' };
        this.displayActividadDialog = false;
        this.cloneEditActivada = { nombre: '' };
    }

    cancelActividadEconomica() {
        this.actividadActual = { nombre: '' };
        this.displayActividadDialog = false;
        this.cloneEditActivada = { nombre: '' };
        /* cancelar */
    }

    editActividadEconomica(actividad) {
        this.cloneEditActivada = actividad;
        this.actividadActual = Object.assign({}, actividad);
        this.displayActividadDialog = true;
        /* editar actividad */
    }

    deleteActividadEconomica(actividad) {
        this.actividadEconomicaList = this.actividadEconomicaList.filter(
            (x) => x.nombre !== actividad.nombre
        );
        /* eliminar actividad */
    }

    showDialogGastosHogar() {
        /* abrir diálogo */
        this.displayGastosDialog = true;
    }

    isFormValid(): boolean {
        return (
            this.gastoActual.tipo.label && // Verifica que se haya seleccionado un tipo de gasto
            this.gastoActual.porcentaje &&
            this.gastoActual.porcentaje >= 0 &&
            this.gastoActual.porcentaje <= 100 // Verifica que el porcentaje esté entre 0 y 100
        );
    }

    saveGastoHogar() {
        const gastoExistente = this.gastosHogarList.find(
            (x) =>
                x.tipo === this.gastoActual.tipo ||
                x.tipo === this.cloneEditGasto.tipo
        );

        if (gastoExistente) {
            if (this.gastoActual.porcentaje) {
                this.updateGasto();
            } else {
                this.mostrarErrorGastoExistente();
            }
            return;
        } else {
            this.agregarNuevoGasto();
        }
    }
    updateGasto() {
        this.gastosHogarList.forEach((element) => {
            if (element.tipo === this.gastoActual.tipo) {
                element.porcentaje = this.gastoActual.porcentaje;
            }
        });
        this.cloneEditGasto = {
            tipo: { label: '', value: '' },
            porcentaje: null,
        };
        this.displayGastosDialog = false;
        this.gastoActual = { tipo: { label: '', value: '' }, porcentaje: null };
    }

    private mostrarErrorGastoExistente() {
        this.displayGastosDialog = false;
        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'El gasto ya existe',
        });
    }
    private agregarNuevoGasto() {
        console.log(this.gastoActual);
        this.gastosHogarList.push(this.gastoActual);
        this.gastoActual = { tipo: { label: '', value: '' }, porcentaje: null };
        this.displayGastosDialog = false;
        this.cloneEditGasto = {
            tipo: { label: '', value: '' },
            porcentaje: null,
        };
    }

    cancelGastoHogar() {
        this.gastoActual = { tipo: { label: '', value: '' }, porcentaje: null };
        this.displayGastosDialog = false;
        this.cloneEditGasto = {
            tipo: { label: '', value: '' },
            porcentaje: null,
        };
        /* cancelar */
    }
    editGastoHogar(gasto) {
        this.cloneEditGasto = gasto;
        this.gastoActual = Object.assign({}, gasto);
        this.displayGastosDialog = true;

        /* editar gasto */
    }
    deleteGastoHogar(gasto) {
        this.gastosHogarList = this.gastosHogarList.filter(
            (x) => x.tipo.value !== gasto.tipo.value
        );
        /* eliminar gasto */
    }

    showDialogFamiliar() {
        /* abrir diálogo */
        this.displayFamiliarDialog = true;
    }
    saveFamiliar() {
        const familiarExistente = this.familiarList.find(
            (x) =>
                x.familiaNombre === this.familiarActual.familiaNombre ||
                x.familiaNombre === this.cloneEditFamiliar.familiaNombre
        );
        if (familiarExistente) {
            if (this.cloneEditFamiliar.familiaNombre) {
                this.updateFamiliar();
            } else {
                this.mostrarErrorFamiliarExistente();
            }
        } else {
            this.agregarNuevaFamiliar();
        }
    }
    updateFamiliar() {
        this.familiarList.forEach((element) => {
            if (
                element.familiaNombre === this.cloneEditFamiliar.familiaNombre
            ) {
                element.familiaNombre = this.familiarActual.familiaNombre;
            }
        });
        this.cloneEditFamiliar = {
            familiParentesco: '',
            familiaNombre: '',
            familiaApellido: '',
            familigenero: '',
            familiEdad: '',
            familiEstadoCivil: '',
            familiEtnia: '',
            familiNacionalidad: '',
            familiCeduala: '',
            familiNivelEducativo: '',
            familiOcupacion: '',
            familiDiscacidad: '',
            familiEnfermedad: '',
        };
        this.displayFamiliarDialog = false;
        this.familiarActual = {
            familiParentesco: '',
            familiaNombre: '',
            familiaApellido: '',
            familigenero: '',
            familiEdad: '',
            familiEstadoCivil: '',
            familiEtnia: '',
            familiNacionalidad: '',
            familiCeduala: '',
            familiNivelEducativo: '',
            familiOcupacion: '',
            familiDiscacidad: '',
            familiEnfermedad: '',
        };
    }
    private mostrarErrorFamiliarExistente() {
        this.displayFamiliarDialog = false;
        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'La familiar ya existe',
        });
    }
    private agregarNuevaFamiliar() {
        this.familiarList.push(this.familiarActual);
        this.familiarActual = {
            familiParentesco: '',
            familiaNombre: '',
            familiaApellido: '',
            familigenero: '',
            familiEdad: '',
            familiEstadoCivil: '',
            familiEtnia: '',
            familiNacionalidad: '',
            familiCeduala: '',
            familiNivelEducativo: '',
            familiOcupacion: '',
            familiDiscacidad: '',
            familiEnfermedad: '',
        };
        this.displayFamiliarDialog = false;
        this.cloneEditFamiliar = {
            familiParentesco: '',
            familiaNombre: '',
            familiaApellido: '',
            familigenero: '',
            familiEdad: '',
            familiEstadoCivil: '',
            familiEtnia: '',
            familiNacionalidad: '',
            familiCeduala: '',
            familiNivelEducativo: '',
            familiOcupacion: '',
            familiDiscacidad: '',
            familiEnfermedad: '',
        };
    }
    cancelFamiliar() {
        this.familiarActual = {
            familiParentesco: '',
            familiaNombre: '',
            familiaApellido: '',
            familigenero: '',
            familiEdad: '',
            familiEstadoCivil: '',
            familiEtnia: '',
            familiNacionalidad: '',
            familiCeduala: '',
            familiNivelEducativo: '',
            familiOcupacion: '',
            familiDiscacidad: '',
            familiEnfermedad: '',
        };
        this.displayFamiliarDialog = false;
        this.cloneEditFamiliar = {
            familiParentesco: '',
            familiaNombre: '',
            familiaApellido: '',
            familigenero: '',
            familiEdad: '',
            familiEstadoCivil: '',
            familiEtnia: '',
            familiNacionalidad: '',
            familiCeduala: '',
            familiNivelEducativo: '',
            familiOcupacion: '',
            familiDiscacidad: '',
            familiEnfermedad: '',
        };
        /* cancelar */
    }
    editFamiliar(familiar) {
        this.cloneEditFamiliar = familiar;
        this.familiarActual = Object.assign({}, familiar);
        this.displayFamiliarDialog = true;
        /* editar familiar */
    }
    deleteFamiliar(familiar) {
        this.familiarList = this.familiarList.filter(
            (x) => x.familiaNombre !== familiar.familiaNombre
        );
        /* eliminar familiar */
    }
    isFormValidFamili() {
        return (
            this.familiarActual.familiaNombre &&
            this.familiarActual.familiaApellido &&
            this.familiarActual.familigenero &&
            this.familiarActual.familiEdad &&
            this.familiarActual.familiEstadoCivil &&
            this.familiarActual.familiEtnia &&
            this.familiarActual.familiNacionalidad &&
            this.familiarActual.familiCeduala &&
            this.familiarActual.familiNivelEducativo &&
            this.familiarActual.familiOcupacion &&
            this.familiarActual.familiDiscacidad &&
            this.familiarActual.familiEnfermedad
        );
    }

    sendRegistro() {
        console.log(this.registrationForm.value);
        this.registrationService
            .sendRegistration(this.registrationForm.value)
            .subscribe((res) => {
                console.log(res);
            });
    }
}
