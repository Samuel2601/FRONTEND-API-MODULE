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

    constructor(private fb: FormBuilder) {
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

    // Datos para el diálogo de Actividad Económica y Gastos del Hogar
    actividadEconomicaList = []; // Lista para las actividades económicas ingresadas
    gastosHogarList = []; // Lista para los gastos del hogar ingresados

    // Variables para los diálogos
    displayActividadDialog: boolean = false;
    displayGastosDialog: boolean = false;
    actividadActual = { nombre: '' }; // Objeto temporal para actividad económica
    gastoActual = { tipo: '', porcentaje: null }; // Objeto temporal para gasto del hogar

    // Métodos en el componente
    showDialogActividadEconomica() {
        /* abrir diálogo */
    }
    saveActividadEconomica() {
        /* guardar actividad */
    }
    cancelActividadEconomica() {
        /* cancelar */
    }
    editActividadEconomica(actividad) {
        /* editar actividad */
    }
    deleteActividadEconomica(actividad) {
        /* eliminar actividad */
    }

    showDialogGastosHogar() {
        /* abrir diálogo */
    }
    saveGastoHogar() {
        /* guardar gasto */
    }
    cancelGastoHogar() {
        /* cancelar */
    }
    editGastoHogar(gasto) {
        /* editar gasto */
    }
    deleteGastoHogar(gasto) {
        /* eliminar gasto */
    }
}
