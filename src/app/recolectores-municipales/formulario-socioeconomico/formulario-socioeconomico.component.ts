import { Component, OnInit } from '@angular/core';

import {
    AbstractControl,
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { RegistroService } from '../service/registro.service';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { AuthService } from 'src/app/demo/services/auth.service';

@Component({
    selector: 'app-formulario-socioeconomico',
    templateUrl: './formulario-socioeconomico.component.html',
    styleUrl: './formulario-socioeconomico.component.scss',
    providers: [MessageService, ConfirmationService],
})
export class FormularioSocioeconomicoComponent implements OnInit {
    registrationForm: FormGroup;
    username: String = '';
    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private registrationService: RegistroService,
        private authService: AuthService,
        private confirmationService: ConfirmationService
    ) {
        this.registrationForm = this.fb.group({
            informacionRegistro: this.fb.group({
                date: [null, Validators.required],
                encuestador: [
                    this.authService.idUserToken(),
                    Validators.required,
                ],
            }),
            informacionPersonal: this.fb.group({
                entrevistado: [
                    '',
                    [Validators.required, Validators.maxLength(100)],
                ],
                dni: [
                    '',
                    [Validators.required, Validators.pattern('^[0-9]+$')],
                ],
                edad: [
                    null,
                    [
                        Validators.required,
                        Validators.min(1),
                        Validators.max(120),
                    ],
                ],
                nacionalidad: [undefined, Validators.required],
                phone: [
                    '',
                    [Validators.required, Validators.pattern('^[0-9]+$')],
                ],
            }),
            informacionUbicacion: this.fb.group({
                posesionTimeNumber: [null], // Control para el número de tiempo
                posesionTimeUnit: ['years'],
                sector: [null, Validators.required],
                barrio: [null, Validators.required],
                manzana: [null, Validators.required],
                lotenumero: [null, Validators.required],
                familyCount: [null, [Validators.required, Validators.min(1)]],
                peopleCount: [null, [Validators.required, Validators.min(1)]],
                houseState: [null, Validators.required],
            }),
            salud: this.fb.group({
                estadoSalud: [null, Validators.required],
                causasSalud: [[], Validators.required],
                conexionHigienico: [null, Validators.required],
            }),
            vivienda: this.fb.group({
                estructuraVivienda: [null, Validators.required],
                serviciosBasicos: [
                    [],
                    [Validators.required, Validators.minLength(1)],
                ],
                tenenciaVivienda: [null, Validators.required],
                documentosPropiedad: [[], Validators.required],
                numPisos: [null, [Validators.required, Validators.min(1)]],
                numHabitaciones: [
                    null,
                    [Validators.required, Validators.min(1)],
                ],
                tipoAlumbrado: [null, Validators.required],
                abastecimientoAgua: [[], Validators.required],
                bienesServiciosElectrodomesticos: [[], Validators.required],
                zonaRiesgo: [null, Validators.required],
            }),
            mediosDeVida: this.fb.group({
                participacionCapacitacion: [null, Validators.required],
                cuantosTrabajos: [
                    null,
                    [Validators.required, Validators.min(0)],
                ],
                actividadLaboral: [null, Validators.required],
                actividadEconomica: [[]],
                relacionDependencia: [null, Validators.required],
                cuentaPropia: [null, Validators.required],
                ingresosMensuales: [null, Validators.required],
                gastosHogar: [[]],
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
        const userDate = authService.authToken();

        this.username = userDate.last_name + ' ' + userDate.name;
        // Asigna la fecha actual al control 'date' al inicializar el componente
        const currentDate = new Date().toISOString().split('T')[0]; // Formato 'YYYY-MM-DD' para el input date
        this.registrationForm
            .get('informacionRegistro.date')
            ?.setValue(currentDate);
    }
    async ngOnInit() {
        await this.initializeNetworkListener();
    }

    // Método recursivo para obtener la lista de campos no válidos, incluyendo subformularios
    getInvalidFields(
        control: AbstractControl = this.registrationForm,
        parentKey: string = ''
    ): string[] {
        let invalidFields: string[] = [];

        if (control instanceof FormGroup) {
            Object.keys(control.controls).forEach((key) => {
                const nestedControl = control.get(key);
                const controlKey = parentKey ? `${parentKey}.${key}` : key;

                if (nestedControl && nestedControl.invalid) {
                    if (nestedControl instanceof FormGroup) {
                        invalidFields = invalidFields.concat(
                            this.getInvalidFields(nestedControl, controlKey)
                        );
                    } else {
                        invalidFields.push(controlKey);
                    }
                }
            });
        }

        return invalidFields;
    }

    selectedValues: any = {};
    key = '';
    onMultiSelectChange(formControlName: string, json?: boolean) {
        const selectedItems = this.selectedValues[formControlName];
        console.log(selectedItems);
        const isNingunaSelected = json
            ? selectedItems.some((causa) => causa.value === 'NINGUNO')
            : selectedItems.includes('NINGUNO');
        // Si "Ninguna" está seleccionada, solo mantenemos "Ninguna"
        if (isNingunaSelected) {
            // Desmarcamos todas las demás opciones y solo dejamos "Ninguna"
            this.selectedValues[formControlName] = json
                ? [{ label: 'Ninguno', value: 'NINGUNO' }]
                : ['NINGUNA'];
        } else {
            const isOtroSelected = json
                ? selectedItems.some(
                      (causa) =>
                          causa.value === 'OTRO' || causa.value === 'OTROS'
                  )
                : selectedItems.includes('OTRO', 'OTROS');
            // Si "Otro" está seleccionada, solo mantenemos "Otro"
            if (isOtroSelected) {
                this.key = formControlName;
                this.isOtroSelected[this.key] = true;
                this.displayDialogOtherCause = true;
            }
        }

        // También puedes agregar aquí validaciones adicionales si es necesario
        console.log(
            `Selección para ${formControlName}:`,
            this.selectedValues[formControlName]
        );
    }

    timeUnits: any[] = [
        { label: 'Días', value: 'days' },
        { label: 'Meses', value: 'months' },
        { label: 'Años', value: 'years' },
    ];

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

    causasSaludOptions: {
        label: string;
        value: string;
        customOther?: string;
    }[] = [
        { label: 'Mala Alimentación', value: 'MALA_ALIMENTACION' },
        { label: 'Entorno', value: 'ENTORNO' },
        { label: 'El No-Uso de Medicamento', value: 'NO_USO_MEDICAMENTO' },
        {
            label: 'Otro (Especificar)',
            value: 'OTRO',
            customOther: 'Causa personalizada',
        },
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
        { label: 'Otros', value: 'OTRO' },
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
        { label: 'Ninguno', value: 'NINGUNO' },
    ];

    tipoAlumbradoOptions: { label: string; value: string }[] = [
        { label: 'Electricidad', value: 'ELECTRICIDAD' },
        { label: 'Lámparas', value: 'LAMPARAS' },
        { label: 'Otros', value: 'OTRO' },
    ];

    abastecimientoAguaOptions: { label: string; value: string }[] = [
        { label: 'Agua Potable', value: 'AGUA_POTABLE' },
        { label: 'Cisterna', value: 'CISTERNA' },
        { label: 'Pozo', value: 'POZO' },
        { label: 'Río', value: 'RIO' },
        { label: 'Tanquero', value: 'TANQUERO' },
        { label: 'Embotellada', value: 'EMBOTELLADA' },
        { label: 'Otros', value: 'OTRO' },
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
        { label: 'Otros', value: 'OTRO' },
    ];

    zonaRiesgoOptions: { label: string; value: string }[] = [
        { label: 'Deslave', value: 'DESLAVE' },
        { label: 'Desbordamientos del Río', value: 'DEBORDAMIENTOS_RIO' },
        { label: 'Inundaciones', value: 'INUNDACIONES' },
        { label: 'Incendios', value: 'INCENDIOS' },
        { label: 'Otros', value: 'OTRO' },
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
        { label: 'Ninguno', value: 'NINGUNO' },
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
        { label: 'Otros', value: 'OTRO' },
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
        { label: 'OTROS', value: 'OTRO' },
        { label: 'Ninguno', value: 'NINGUNO' },
    ];

    recibeAyudaHumanitariaOptions = [
        { label: 'IGLESIA', value: 'IGLESIA' },
        { label: 'VECINO(A)S', value: 'VECINO(A)S' },
        { label: 'AMIGO(A)S', value: 'AMIGO(A)S' },
        { label: 'FAMILIA', value: 'FAMILIA' },
        { label: "ONG'S", value: "ONG'S" },
        { label: 'INSTITUCIONES PÚBLICA', value: 'INSTITUCIONES PÚBLICA' },
        { label: 'Ninguno', value: 'NINGUNO' },
        { label: 'OTROS', value: 'OTRO' },
    ];

    actividadCantonDentroOptions = [
        { label: 'PLAYA', value: 'PLAYA' },
        { label: 'DOMICILIO', value: 'DOMICILIO' },
        { label: 'RIO', value: 'RIO' },
        { label: 'DEPORTE', value: 'DEPORTE' },
        { label: 'CAMPO', value: 'CAMPO' },
        { label: 'PARQUES', value: 'PARQUES' },
        { label: 'OTROS', value: 'OTRO' },
        { label: 'Ninguno', value: 'NINGUNO' },
    ];

    actividadCantonFueraOptions = [
        { label: 'PLAYA', value: 'PLAYA' },
        { label: 'DOMICILIO', value: 'DOMICILIO' },
        { label: 'RIO', value: 'RIO' },
        { label: 'DEPORTE', value: 'DEPORTE' },
        { label: 'CAMPO', value: 'CAMPO' },
        { label: 'PARQUES', value: 'PARQUES' },
        { label: 'OTROS', value: 'OTRO' },
        { label: 'Ninguno', value: 'NINGUNO' },
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
        { label: 'Afganistán', value: 'AFGANA', code: 'AF' },
        { label: 'Alemania', value: 'ALEMANA', code: 'DE' },
        { label: 'Argentina', value: 'ARGENTINA', code: 'AR' },
        { label: 'Australia', value: 'AUSTRALIANA', code: 'AU' },
        { label: 'Brasil', value: 'BRASILEÑA', code: 'BR' },
        { label: 'Canadá', value: 'CANADIENSE', code: 'CA' },
        { label: 'Chile', value: 'CHILENA', code: 'CL' },
        { label: 'China', value: 'CHINA', code: 'CN' },
        { label: 'Colombia', value: 'COLOMBIANA', code: 'CO' },
        { label: 'Cuba', value: 'CUBANA', code: 'CU' },
        { label: 'Dinamarca', value: 'DANESA', code: 'DK' },
        { label: 'Ecuador', value: 'ECUATORIANA', code: 'EC' },
        { label: 'Egipto', value: 'EGIPCIA', code: 'EG' },
        { label: 'España', value: 'ESPAÑOLA', code: 'ES' },
        { label: 'Estados Unidos', value: 'ESTADOUNIDENSE', code: 'US' },
        { label: 'Filipinas', value: 'FILIPINA', code: 'PH' },
        { label: 'Francia', value: 'FRANCESA', code: 'FR' },
        { label: 'Grecia', value: 'GRIEGA', code: 'GR' },
        { label: 'Guatemala', value: 'GUATEMALTECA', code: 'GT' },
        { label: 'Honduras', value: 'HONDUREÑA', code: 'HN' },
        { label: 'India', value: 'INDIA', code: 'IN' },
        { label: 'Indonesia', value: 'INDONESIA', code: 'ID' },
        { label: 'Irlanda', value: 'IRLANDESA', code: 'IE' },
        { label: 'Italia', value: 'ITALIANA', code: 'IT' },
        { label: 'Japón', value: 'JAPONESA', code: 'JP' },
        { label: 'México', value: 'MEXICANA', code: 'MX' },
        { label: 'Nicaragua', value: 'NICARAGÜENSE', code: 'NI' },
        { label: 'Noruega', value: 'NORUEGA', code: 'NO' },
        { label: 'Panamá', value: 'PANAMEÑA', code: 'PA' },
        { label: 'Paraguay', value: 'PARAGUAYA', code: 'PY' },
        { label: 'Perú', value: 'PERUANA', code: 'PE' },
        { label: 'Portugal', value: 'PORTUGUESA', code: 'PT' },
        { label: 'Reino Unido', value: 'BRITÁNICA', code: 'GB' },
        { label: 'República Dominicana', value: 'DOMINICANA', code: 'DO' },
        { label: 'Rusia', value: 'RUSA', code: 'RU' },
        { label: 'Sudáfrica', value: 'SUDAFRICANA', code: 'ZA' },
        { label: 'Suecia', value: 'SUECA', code: 'SE' },
        { label: 'Suiza', value: 'SUIZA', code: 'CH' },
        { label: 'Uruguay', value: 'URUGUAYA', code: 'UY' },
        { label: 'Venezuela', value: 'VENEZOLANA', code: 'VE' },
        { label: 'No se aplica', value: 'NO SE APLICA', code: 'NA' },
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
        familiNacionalidad: undefined,
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
        familiNacionalidad: undefined,
        familiCeduala: '',
        familiNivelEducativo: '',
        familiOcupacion: '',
        familiDiscacidad: '',
        familiEnfermedad: '',
    }; // Objeto temporal para familiar
    customOther: any = {}; // Campo para capturar el valor cuando elige "Otro"
    // Variable para guardar el valor anterior de customOther
    previousCustomCause: string = '';

    selectedCausasSalud: any[] = []; // Para almacenar las causas seleccionadas

    // Método para manejar la opción "Otro" y agregarla al array
    displayDialogOtherCause: boolean = false;
    // Booleano para verificar si 'OTRO' está seleccionado
    isOtroSelected: { [key: string]: boolean } = {};

    openDialogOtherCause(formControlName: string) {
        this.key = formControlName;
        this.displayDialogOtherCause = true;
    }
    closeDialogOtherCause() {
        this.displayDialogOtherCause = false;

        if (this.customOther[this.key]) {
            // Verifica si ya existe el valor "OTRO"
            const index = this.selectedValues[this.key].findIndex(
                (causa) => causa.value === 'OTRO' || causa.value === 'OTROS'
            );

            if (index !== -1) {
                // Si existe, actualizamos la causa personalizada
                this.selectedValues[this.key][index].customOther =
                    this.customOther[this.key];
            } else {
                // Si no existe, agregamos el valor "OTRO" con la causa personalizada
                this.selectedValues[this.key].push({
                    value: 'OTRO',
                    label: 'Otro (Especificar)',
                    customOther: this.customOther[this.key],
                });
            }

            console.log(this.selectedValues); // Ver el valor actualizado
        }
    }

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
        this.isEditMode = false; // Modo agregar
        this.displayGastosDialog = true;
    }

    // Método para obtener las opciones filtradas para el dropdown
    get filteredGastosOptions(): any[] {
        // Filtra las opciones para excluir las que ya están en la lista
        return this.gastosHogarOptions.filter(
            (option) =>
                !this.gastosHogarList.some(
                    (gasto) => gasto.tipo.value === option.value
                )
        );
    }

    isFormValid(): boolean {
        let totalPorcentaje = 0;
        if (!this.isEditMode) {
            // Verifica que se haya seleccionado un tipo de gasto y que el porcentaje esté entre 0 y 100
            totalPorcentaje = this.gastosHogarList.reduce(
                (sum, gasto) => sum + gasto.porcentaje,
                0
            );
            // Calcula el porcentaje restante
            const porcentajeRestante = 100 - totalPorcentaje;

            // Verifica si el porcentaje que se intenta agregar excede el 100%
            if (this.gastoActual.porcentaje + totalPorcentaje > 100) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: `La suma de los porcentajes no puede exceder el 100%. Puedes agregar hasta ${porcentajeRestante}% más.`,
                });
                this.gastoActual.porcentaje = 0;
            }
        }

        return (
            this.gastoActual.tipo.label && // Verifica que se haya seleccionado un tipo de gasto
            this.gastoActual.porcentaje >= 0 &&
            this.gastoActual.porcentaje <= 100 && // Verifica que el porcentaje esté entre 0 y 100
            totalPorcentaje + this.gastoActual.porcentaje <= 100 // Verifica que la suma de los porcentajes no exceda 100
        );
    }

    saveGastoHogar() {
        if (!this.isEditMode) {
            // Calcula la suma total de los porcentajes actuales
            const totalPorcentaje = this.gastosHogarList.reduce(
                (sum, gasto) => sum + gasto.porcentaje,
                0
            );

            // Calcula el porcentaje restante
            const porcentajeRestante = 100 - totalPorcentaje;

            // Verifica si el porcentaje que se intenta agregar excede el 100%
            if (this.gastoActual.porcentaje + totalPorcentaje > 100) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: `La suma de los porcentajes no puede exceder el 100%. Puedes agregar hasta ${porcentajeRestante}% más.`,
                });
                return; // No continuar si el total excede 100%
            }
        }

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
        // Calcula el total de porcentajes, excluyendo el gasto que está siendo editado
        const totalPorcentaje = this.gastosHogarList.reduce((sum, gasto) => {
            return gasto.tipo !== this.cloneEditGasto.tipo
                ? sum + gasto.porcentaje
                : sum;
        }, 0);

        // Calcula el porcentaje restante disponible
        const porcentajeRestante = 100 - totalPorcentaje;

        // Verifica si el porcentaje actualizado excede el 100%
        if (this.gastoActual.porcentaje > porcentajeRestante) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: `La suma de los porcentajes no puede exceder el 100%. Puedes agregar hasta ${porcentajeRestante}% más.`,
            });
            return; // Termina si el total excede el 100%
        }

        // Actualiza el porcentaje del gasto seleccionado
        this.gastosHogarList = this.gastosHogarList.map((element) => {
            if (element.tipo === this.cloneEditGasto.tipo) {
                return { ...element, porcentaje: this.gastoActual.porcentaje };
            }
            return element;
        });

        // Restablece los valores después de la actualización
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
    isEditMode: boolean = false;
    editGastoHogar(gasto) {
        this.isEditMode = true; // Modo edición
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
            familiNacionalidad: undefined,
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
            familiNacionalidad: undefined,
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
            familiNacionalidad: undefined,
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
            familiNacionalidad: undefined,
            familiCeduala: '',
            familiNivelEducativo: '',
            familiOcupacion: '',
            familiDiscacidad: '',
            familiEnfermedad: '',
        };
        console.log(this.familiarList);
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
            familiNacionalidad: undefined,
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
            familiNacionalidad: undefined,
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

    private hasNotifiedUser: boolean = false;
    private lastStatus: boolean = false; // Estado anterior de la red

    async initializeNetworkListener() {
        const status = await Network.getStatus();
        this.lastStatus = status.connected;

        Network.addListener('networkStatusChange', async (status) => {
            if (!this.lastStatus && status.connected) {
                await this.syncData();
                this.hasNotifiedUser = false; // Resetear la notificación
            } else if (!status.connected && !this.hasNotifiedUser) {
                alert(
                    'Estás desconectado. La próxima vez que te conectes, enviaremos tu información.'
                );
                this.hasNotifiedUser = true; // Marca como notificado
            }
            this.lastStatus = status.connected;
        });
    }

    sendRegistro() {
        // Actualizar los valores del formulario con las listas correspondientes
        this.registrationForm.value.mediosDeVida.actividadEconomica =
            this.actividadEconomicaList;
        this.registrationForm.value.mediosDeVida.gastosHogar =
            this.gastosHogarList;
        this.registrationForm.value.familiaList = this.familiarList;

        // Preparar el formulario para ser enviado
        const formData = this.prepareFormData(this.registrationForm);
        console.log('Data Simple', formData);

        if (this.lastStatus) {
            // Si hay conexión, intenta enviar los datos al servidor
            this.registrationService.sendRegistration(formData).subscribe(
                (res) => {
                    console.log('Respuesta del servidor:', res);
                    alert(`Registro exitoso con ID: ${res.data._id}`);
                },
                (error) => {
                    console.error('Error al enviar los datos:', error);

                    // Manejo de errores específicos
                    if (error.status === 409) {
                        // Error de conflicto, mostrar información detallada
                        const errorMessage = this.parseDuplicateKeyError(
                            error.error?.error || error.message
                        );
                        alert(`Error: ${errorMessage}`);
                    } else {
                        // Otros errores
                        alert(
                            'Ocurrió un error al registrar los datos. Por favor, inténtalo de nuevo más tarde.'
                        );

                        // Guardar los datos localmente en caso de error
                        this.saveFormLocally();
                    }
                }
            );
        } else {
            // Si no hay conexión, guardar los datos localmente
            this.saveFormLocally();
        }
    }

    parseDuplicateKeyError(errorMessage: string): string {
        const match = /dup key: { (.*) }/.exec(errorMessage);
        if (match && match[1]) {
            return `Ya existe un registro con los mismos datos: ${match[1]}`;
        }
        return 'Error de clave duplicada detectado.';
    }

    // Método para preparar los datos del formulario antes de enviarlos o guardarlos
    prepareFormData(form: FormGroup): any {
        const formData = form.value;

        // Función para transformar datos personalizados en formato "OTRO: Detalle"
        const transformData = (data: any) => {
            if (Array.isArray(data)) {
                return data.map((item) =>
                    typeof item === 'object' && item.value
                        ? item.value === 'OTRO' && item.customOther
                            ? `OTRO: ${item.customOther}`
                            : item.value
                        : item
                );
            }
            return data;
        };
        // Función para transformar objetos con campos como label, value y code
        const extractValue = (data: any) => {
            if (data && typeof data === 'object' && data.value) {
                return data.value; // Extrae solo el valor
            }
            return data;
        };

        return {
            informacionRegistro: { ...formData.informacionRegistro },
            informacionPersonal: {
                ...formData.informacionPersonal,
                nacionalidad: extractValue(
                    formData.informacionPersonal.nacionalidad
                ),
            },
            informacionUbicacion: { ...formData.informacionUbicacion },
            salud: {
                ...formData.salud,
                causasSalud: transformData(formData.salud.causasSalud),
            },
            vivienda: {
                ...formData.vivienda,
                serviciosBasicos: transformData(
                    formData.vivienda.serviciosBasicos
                ),
                documentosPropiedad: transformData(
                    formData.vivienda.documentosPropiedad
                ),
                abastecimientoAgua: transformData(
                    formData.vivienda.abastecimientoAgua
                ),
                bienesServiciosElectrodomesticos: transformData(
                    formData.vivienda.bienesServiciosElectrodomesticos
                ),
            },
            mediosDeVida: {
                ...formData.mediosDeVida,
                actividadEconomica:
                    formData.mediosDeVida.actividadEconomica.map(
                        (item: any) => item.nombre
                    ),
                gastosHogar: transformData(formData.mediosDeVida.gastosHogar),
                fuentesIngresos: transformData(
                    formData.mediosDeVida.fuentesIngresos
                ),
            },
            redesDeApoyo: {
                ...formData.redesDeApoyo,
                actividadesBarrio: transformData(
                    formData.redesDeApoyo.actividadesBarrio
                ),
                recibeayudaHumanitaria: transformData(
                    formData.redesDeApoyo.recibeayudaHumanitaria
                ),
                actividadCantonDentro: transformData(
                    formData.redesDeApoyo.actividadCantonDentro
                ),
                actividadCantonFuera: transformData(
                    formData.redesDeApoyo.actividadCantonFuera
                ),
            },
            familiaList: formData.familiaList.map((familiar: any) => ({
                ...familiar,
                familiNacionalidad: familiar.familiNacionalidad?.value,
            })),
        };
    }

    async syncData() {
        try {
            const { pending } = await this.getLocalRecords();

            if (pending.length === 0) {
                alert('No hay registros pendientes para sincronizar.');
                return;
            }

            for (const record of pending) {
                // Verifica conectividad antes de enviar cada registro
                const isConnected = await this.checkNetworkConnectivity();

                if (!isConnected) {
                    console.warn(
                        `Sin conexión. Sincronización abortada para el registro con ID: ${record.id}`
                    );
                    break; // Si no hay conexión, salimos del bucle
                }

                try {
                    const result = await this.registrationService
                        .sendRegistration(record.formData)
                        .toPromise();

                    alert(`Registro enviado con ID: ${result.data._id}`);

                    // Marca el registro como enviado
                    await this.markAsSent(record.id);
                } catch (error) {
                    console.error(
                        `Error al enviar registro con ID: ${record.id}`,
                        error
                    );
                }
            }
        } catch (error) {
            console.error('Error al sincronizar datos:', error);
        }
    }

    async checkNetworkConnectivity(): Promise<boolean> {
        try {
            const status = await Network.getStatus(); // Capacitor Network Plugin
            return status.connected;
        } catch (error) {
            console.error('Error al verificar la conectividad:', error);
            return false; // Asume que no hay conexión si ocurre un error
        }
    }

    async saveFormLocally() {
        try {
            // Obtén los registros almacenados previamente
            const storedData = await Preferences.get({ key: 'formDataList' });
            const formDataList = storedData.value
                ? JSON.parse(storedData.value)
                : [];

            // Agrega el nuevo registro con estado "pending"
            formDataList.push({
                id: new Date().getTime().toString(), // Generar ID único
                formData: this.prepareFormData(this.registrationForm),
                status: 'pending',
            });

            await Preferences.set({
                key: 'formDataList',
                value: JSON.stringify(formDataList),
            });

            alert('Datos guardados localmente. Se enviarán al conectarse.');
        } catch (error) {
            console.error('Error al guardar los datos localmente:', error);
        }
    }

    async getLocalRecords() {
        try {
            const storedData = await Preferences.get({ key: 'formDataList' });
            const formDataList = storedData.value
                ? JSON.parse(storedData.value)
                : [];

            const pending = formDataList.filter(
                (record) => record.status === 'pending'
            );
            const sent = formDataList.filter(
                (record) => record.status === 'sent'
            );

            return { pending, sent };
        } catch (error) {
            console.error('Error al obtener los registros:', error);
            return { pending: [], sent: [] };
        }
    }

    async markAsSent(recordId: string) {
        try {
            const storedData = await Preferences.get({ key: 'formDataList' });
            const formDataList = storedData.value
                ? JSON.parse(storedData.value)
                : [];

            const updatedList = formDataList.map((record) =>
                record.id === recordId ? { ...record, status: 'sent' } : record
            );

            await Preferences.set({
                key: 'formDataList',
                value: JSON.stringify(updatedList),
            });
        } catch (error) {
            console.error('Error al actualizar el estado:', error);
        }
    }
    displayDialogRecords: boolean = false;
    localRecords: Array<any> = [];
    editRecord(record: any) {
        this.loadRecord(record);
        this.displayDialogRecords = true;
    }

    async showRecords() {
        const { pending, sent } = await this.getLocalRecords();

        console.log('Registros pendientes:', pending);
        console.log('Registros enviados:', sent);

        // Puedes implementar una ventana modal o tabla para mostrar estos registros
        alert(
            `Pendientes: ${pending.length}, Enviados: ${sent.length}. Revisa la consola para más detalles.`
        );
        this.localRecords = [
            ...pending.map((record) => ({ ...record, status: 'Pendiente' })),
            ...sent.map((record) => ({ ...record, status: 'Enviado' })),
        ];
        console.log(this.localRecords);
        this.displayDialogRecords = true;
    }

    // Método para cargar un registro pendiente en el formulario para editarlo
    loadRecord(record: any) {
        this.registrationForm.patchValue(record.formData);
        alert('Registro cargado para edición.');
    }

    confirmDelete(record: any) {
        this.confirmationService.confirm({
            message: `¿Estás seguro de que deseas eliminar el registro con ID ${record.id}?`,
            header: 'Confirmar eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.deleteRecord(record.id);
            },
            reject: () => {
                this.messageService.add({
                    severity: 'info',
                    summary: 'Cancelado',
                    detail: 'El registro no fue eliminado.',
                });
            },
        });
    }

    async deleteRecord(recordId: string) {
        try {
            const storedData = await Preferences.get({ key: 'formDataList' });
            const formDataList = storedData.value
                ? JSON.parse(storedData.value)
                : [];

            const updatedList = formDataList.filter(
                (record) => record.id !== recordId
            );

            await Preferences.set({
                key: 'formDataList',
                value: JSON.stringify(updatedList),
            });

            this.localRecords = this.localRecords.filter(
                (record) => record.id !== recordId
            );

            this.messageService.add({
                severity: 'success',
                summary: 'Eliminado',
                detail: `El registro con ID ${recordId} fue eliminado exitosamente.`,
            });
        } catch (error) {
            console.error('Error al eliminar el registro:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Hubo un problema al eliminar el registro.',
            });
        }
    }

    async calculateStorageUsage() {
        let totalSize = 0;

        const storedData = await Preferences.get({ key: 'formDataList' });
        if (storedData.value) {
            const dataSize = new Blob([storedData.value]).size; // Tamaño de los datos en bytes
            totalSize += dataSize;
        }

        // Conversión a KB/MB
        const usedKB = totalSize / 1024;
        const usedMB = usedKB / 1024;

        alert(
            `Espacio utilizado: ${usedKB.toFixed(2)} KB (${usedMB.toFixed(
                2
            )} MB)`
        );
    }
    async deleteSentRecords() {
        try {
            const storedData = await Preferences.get({ key: 'formDataList' });
            const formDataList = storedData.value
                ? JSON.parse(storedData.value)
                : [];

            const pendingRecords = formDataList.filter(
                (record) => record.status !== 'sent'
            );

            await Preferences.set({
                key: 'formDataList',
                value: JSON.stringify(pendingRecords),
            });

            this.localRecords = pendingRecords; // Actualiza la tabla de registros locales

            alert('Registros enviados eliminados correctamente.');
        } catch (error) {
            console.error('Error al eliminar registros enviados:', error);
        }
    }
}
