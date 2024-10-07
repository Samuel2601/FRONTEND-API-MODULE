import { Component, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { UbicacionService } from '../service/ubicacion.service';
import { ListService } from 'src/app/demo/services/list.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { CreateService } from 'src/app/demo/services/create.service';
import { Router } from '@angular/router';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { filter } from 'rxjs';
import { FilterService } from '../../demo/services/filter.service';
import { DeleteService } from 'src/app/demo/services/delete.service';

@Component({
    selector: 'app-agregar-recolector',
    templateUrl: './agregar-recolector.component.html',
    styleUrl: './agregar-recolector.component.scss',
    providers: [DynamicDialogConfig],
})
export class AgregarRecolectorComponent {
    formulario: FormGroup;
    funcionarios: any[] = [];
    devices: any[] = [];
    selectedFuncionario: any;
    selectedDevice: any;

    isExterno = false; // Controla si se seleccionó Externo
    showExternoForm = false; // Controla la visibilidad del formulario de Externo
    externos: any[] = [];
    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private ubicar: UbicacionService,
        private list: ListService,
        private auth: AuthService,
        private helper: HelperService,
        private create: CreateService,
        private router: Router, // Inyecta Router para redirección,
        private filterser: FilterService,
        private deleteser: DeleteService,
        @Optional() public ref: DynamicDialogRef // Inyecta DynamicDialogConfig para acceder a la configuración del diálogo
    ) {
        this.formulario = this.fb.group({
            funcionario: [null],
            externo: [null],
            isExterno: [false], // El valor por defecto es Funcionario
            deviceId: [null, Validators.required],
            externo_register: this.fb.group({
                name: [''],
                dni: [''],
                phone: [''],
                address: [''],
                email: [''],
            }),
        });
    }
    isMobil() {
        return this.helper.isMobil();
    }
    token = this.auth.token();
    async ngOnInit() {
        await this.fetchFuncionarios();
        await this.fetchDevices();
        await this.listarExterno();
        //await this.cedula_validator();
    }

    async cedula_validator() {
        console.log(
            'Función: esIdentificacionValida()',
            'Valor enviado: 0803768530',
            ': ',
            ValidacionCedulaRucService.esIdentificacionValida('0803768530')
        );
        console.log(
            'Función: esIdentificacionValida()',
            'Valor enviado: 0803768530',
            ': ',
            ValidacionCedulaRucService.esIdentificacionValida('0803768530')
        );
        console.log(
            'Función: esCedulaValida()',
            'Valor enviado: 0803768530',
            ': ',
            ValidacionCedulaRucService.esCedulaValida('0803768530')
        );
        console.log(
            'Función: esRucValido()',
            'Valor enviado: 0803768530',
            ': ',
            ValidacionCedulaRucService.esRucValido('0803768530')
        );
        console.log(
            'Función: esRucPersonaNaturalValido()',
            'Valor enviado: 0803768530',
            ': ',
            ValidacionCedulaRucService.esRucPersonaNaturalValido('0803768530')
        );
        console.log(
            'Función: esRucSociedadPrivadaValido()',
            'Valor enviado: 0803768530',
            ': ',
            ValidacionCedulaRucService.esRucSociedadPrivadaValido('0803768530')
        );
        console.log(
            'Función: esRucSociedadPublicaValido()',
            'Valor enviado: 0803768530',
            ': ',
            ValidacionCedulaRucService.esRucSociedadPublicaValido('0803768530')
        );
    }
    getCiudadano() {
        this.filterser
            .getciudadano(this.formulario.get('externo_register').value.dni)
            .subscribe(
                (response: any) => {
                    console.log(response);
                    if (response.nombres) {
                        this.formulario
                            .get('externo_register')
                            .get('name')
                            .setValue(response.nombres);
                    }
                },
                (error) => {
                    console.error(error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Algo salio mal',
                        detail: 'Parece no estar en nuestros registros',
                    });
                }
            );
    }
    async listarExterno() {
        this.list.listarRecolectorExterno(this.token).subscribe((response) => {
            console.log(response);
            this.externos = response.data;
        });
    }
    async fetchFuncionarios() {
        this.list
            .listarUsuarios(this.token, { role: '66bb7b1fcc9232a17ce931d9' }) //"65c505bc9c664a1238b47f1a" FUNCIONARIO
            .subscribe((response) => {
                //console.log(response);
                if (response.data) {
                    this.funcionarios = response.data.map((funcionario) => ({
                        ...funcionario,
                        fullName: `${funcionario.name} ${funcionario.last_name}`,
                    }));
                }
            });
    }

    async fetchDevices() {
        this.ubicar.obtenerDeviceGPS().subscribe(async (response) => {
            //console.log(response);
            this.devices = response.filter((e) => e.status == 'online');
            await this.checkExistingRegistrations();
        });
    }

    async checkExistingRegistrations() {
        const today = new Date();
        const dateOnly = `${today.getFullYear()}-${
            today.getMonth() + 1
        }-${today.getDate()}`;
        this.list
            .listarAsignacionRecolectores(
                this.token,
                { dateOnly, populate: 'externo' },
                false
            )
            .subscribe((response) => {
                console.log(response);
                const data: any[] = response.data || [];
                if (data.length > 0) {
                    data.forEach((element_data) => {
                        this.funcionarios = this.funcionarios.filter(
                            (element) =>
                                element._id !== element_data.funcionario
                        );
                        this.devices = this.devices.filter(
                            (element) => element.id != element_data.deviceId
                        );
                        if (element_data.externo) {
                            this.externos = this.externos.filter(
                                (e) => e.dni != element_data.externo.dni
                            );
                        }
                        /* console.log(this.devices.filter(
                            (element) => element.id != element_data.deviceId
                        ));*/
                    });
                }
            });
    }
    ondeleteExterno(id: string) {
        this.deleteser
            .RemoveRecolectoresExterno(this.token, id)
            .subscribe((response) => {
                console.log(response);
            });
    }

    onSubmit() {
        if (this.formulario.valid) {
            console.log(this.formulario.value);
            if (this.formulario.get('funcionario').value) {
                this.formulario
                    .get('funcionario')
                    .setValue(this.formulario.get('funcionario').value._id);
            }
            if (this.formulario.get('externo').value) {
                this.formulario
                    .get('externo')
                    .setValue(this.formulario.get('externo').value._id);
            }

            this.formulario
                .get('deviceId')
                .setValue(this.formulario.get('deviceId').value.id);

            if (
                this.formulario.get('isExterno').value &&
                !this.formulario.get('externo').value
            ) {
                //console.log(this.formulario.get('externo_register').value);
                this.create
                    .registrarRecolectorExterno(
                        this.token,
                        this.formulario.get('externo_register').value
                    )
                    .subscribe(
                        (response) => {
                            console.log(response);
                            this.formulario
                                .get('externo')
                                .setValue(response.data._id);
                            this.registrar_asignacion();
                        },
                        (error) => {
                            console.error(error);
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Algo salio mal',
                                detail: 'No se pudo crear al chofer externo',
                            });
                        }
                    );
            } else {
                this.registrar_asignacion();
            }
        } else {
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario Inválido',
                detail: 'Por favor, completa todos los campos.',
            });
        }
    }
    registrar_asignacion() {
        this.create
            .registrarAsignacionReolectores(this.token, this.formulario.value)
            .subscribe(
                (response) => {
                    //console.log(response);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Registro',
                        detail: 'Asignación Completada.',
                    });
                    if (!this.isMobil()) {
                        // Si es móvil, cierra el diálogo
                        this.ref.close(true); // Usa `ref` de DynamicDialogConfig
                    } else {
                        // Si no es móvil, redirige a /recolectores/listar
                        this.router.navigate(['/recolectores/listar']);
                    }
                },
                (error) => {
                    console.error(error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Algo salio mal',
                        detail: 'No se pudo crear al chofer externo',
                    });
                }
            );
    }
}
enum TipoIdentificacionEnum {
    CEDULA,
    RUC_PERSONA_NATURAL,
    RUC_SOCIEDAD_PRIVADA,
    RUC_SOCIEDAD_PUBLICA,
}

export class ValidacionCedulaRucService {
    /**
     * Permite validar cualquier número de identificación, puede ser cédula, ruc
     * de persona natural, ruc de sociedad pública, ruc de sociedad privada
     *
     * @param identificacion
     * @return
     */
    static esIdentificacionValida(identificacion: string) {
        if (this.isNullOrEmpty(identificacion)) {
            return false;
        } else {
            const longitud: number = identificacion.length;
            this.esNumeroIdentificacionValida(identificacion, longitud);

            if (longitud === 10) {
                return this.esCedulaValida(identificacion);
            } else if (longitud === 13) {
                const tercerDigito: number = parseInt(
                    identificacion.substring(2, 3),
                    10
                );

                if (0 <= tercerDigito && tercerDigito <= 5) {
                    return this.esRucPersonaNaturalValido(identificacion);
                } else if (6 === tercerDigito) {
                    return this.esRucSociedadPublicaValido(identificacion);
                } else if (9 === tercerDigito) {
                    return this.esRucSociedadPrivadaValido(identificacion);
                } else {
                    return false;
                }
            } else {
                return false;
            }
        }
    }

    /**
     * Permite verificar si un número de cédula es válido o no
     * @param numeroCedula
     * @return
     */
    static esCedulaValida(numeroCedula: string): boolean {
        const esIdentificacionValida = this.validacionesPrevias(
            numeroCedula,
            10,
            TipoIdentificacionEnum.CEDULA
        );

        if (esIdentificacionValida) {
            const ultimoDigito: number = parseInt(numeroCedula.charAt(9), 10);

            return this.algoritmoVerificaIdentificacion(
                numeroCedula,
                ultimoDigito,
                TipoIdentificacionEnum.CEDULA
            );
        } else {
            return false;
        }
    }

    /**
     * Permite verificar si un número de ruc de cualquier tipo es válido o no
     *
     * @param numeroRuc
     * @return
     */
    static esRucValido(numeroRuc: string) {
        return (
            this.esRucPersonaNaturalValido(numeroRuc) ||
            this.esRucSociedadPrivadaValido(numeroRuc) ||
            this.esRucSociedadPublicaValido(numeroRuc)
        );
    }

    /**
     * Permite verificar si un número de ruc para personas naturales es válido o no.
     *
     * @param numeroRuc
     * @return
     */
    static esRucPersonaNaturalValido(numeroRuc: string): boolean {
        const esIdentificacionValida = this.validacionesPrevias(
            numeroRuc,
            13,
            TipoIdentificacionEnum.RUC_PERSONA_NATURAL
        );

        if (esIdentificacionValida) {
            const ultimoDigito: number = parseInt(numeroRuc.charAt(9), 10);
            return this.algoritmoVerificaIdentificacion(
                numeroRuc,
                ultimoDigito,
                TipoIdentificacionEnum.RUC_PERSONA_NATURAL
            );
        } else {
            return false;
        }
    }

    /**
     * Permite verificar si un número de ruc para sociedades privadas es válido o no.
     *
     * @param numeroRuc
     * @return
     */
    static esRucSociedadPrivadaValido(numeroRuc: string): boolean {
        const esIdentificacionValida = this.validacionesPrevias(
            numeroRuc,
            13,
            TipoIdentificacionEnum.RUC_SOCIEDAD_PRIVADA
        );
        if (esIdentificacionValida) {
            const ultimoDigito: number = parseInt(numeroRuc.charAt(9), 10);
            return this.algoritmoVerificaIdentificacion(
                numeroRuc,
                ultimoDigito,
                TipoIdentificacionEnum.RUC_SOCIEDAD_PRIVADA
            );
        } else {
            return false;
        }
    }

    /**
     * Permite verificar si un número de ruc para sociedades públicas es válido o no.
     *
     * @param numeroRuc
     * @return
     */
    static esRucSociedadPublicaValido(numeroRuc: string): boolean {
        const esIdentificacionValida = this.validacionesPrevias(
            numeroRuc,
            13,
            TipoIdentificacionEnum.RUC_SOCIEDAD_PUBLICA
        );
        if (esIdentificacionValida) {
            const ultimoDigito: number = parseInt(numeroRuc.charAt(8), 10);
            return this.algoritmoVerificaIdentificacion(
                numeroRuc,
                ultimoDigito,
                TipoIdentificacionEnum.RUC_SOCIEDAD_PUBLICA
            );
        } else {
            return false;
        }
    }

    /**
     * VALIDACIONES PREVIAS AL ALGORITMO DE IDENTIFICACIÓN PARA CÉDULA Y RUC
     * @param contenido
     */
    static isNullOrEmpty(contenido: any): boolean {
        return (
            undefined === contenido || null === contenido || '' === contenido
        );
    }

    /**
     * @param identificacion
     * @param longitud
     * @param tipoIdentificacion
     * @param validarEstablecimiento
     */
    static validacionesPrevias(
        identificacion: string,
        longitud: number,
        tipoIdentificacion: TipoIdentificacionEnum
    ): boolean {
        if (TipoIdentificacionEnum.CEDULA === tipoIdentificacion) {
            return (
                this.esNumeroIdentificacionValida(identificacion, longitud) &&
                this.esCodigoProvinciaValido(identificacion) &&
                this.esTercerDigitoValido(identificacion, tipoIdentificacion)
            );
        } else {
            return (
                this.esNumeroIdentificacionValida(identificacion, longitud) &&
                this.esCodigoProvinciaValido(identificacion) &&
                this.esTercerDigitoValido(identificacion, tipoIdentificacion) &&
                this.esCodigoEstablecimientoValido(identificacion)
            );
        }
    }

    /**
     * @param numeroIdentificacion
     * @param longitud
     */
    static esNumeroIdentificacionValida(
        numeroIdentificacion: string,
        longitud: number
    ): boolean {
        return (
            numeroIdentificacion.length === longitud &&
            /^\d+$/.test(numeroIdentificacion)
        );
    }

    /**
     * @param numeroCedula
     */
    static esCodigoProvinciaValido(numeroCedula: string) {
        const numeroProvincia: number = parseInt(
            numeroCedula.substring(0, 2),
            10
        );
        return numeroProvincia > 0 && numeroProvincia <= 24;
    }

    /**
     * @param numeroRuc
     * @return
     */
    static esCodigoEstablecimientoValido(numeroRuc: string) {
        const ultimosTresDigitos: number = parseInt(
            numeroRuc.substring(10, 13),
            10
        );
        return !(ultimosTresDigitos < 1);
    }

    /**
     * Tercer dígito:
     * <p>
     * RUC jurídicos y extranjeros sin cédula: 9
     * <p>
     * RUC públicos: 6
     * <p>
     * RUC natural menor a 6: (0,1,2,3,4,5)
     *
     * @param numeroCedula
     * @param tipoIdentificacion
     *            de documento cedula, ruc
     * @return
     */
    static esTercerDigitoValido(
        numeroCedula: string,
        tipoIdentificacion: TipoIdentificacionEnum
    ) {
        const tercerDigito: any = parseInt(numeroCedula.substring(2, 3), 10);

        if (tipoIdentificacion === TipoIdentificacionEnum.CEDULA) {
            return this.esTercerDigitoCedulaValido(tercerDigito);
        }

        if (tipoIdentificacion === TipoIdentificacionEnum.RUC_PERSONA_NATURAL) {
            return this.verificarTercerDigitoRucNatural(tercerDigito);
        }

        if (
            tipoIdentificacion === TipoIdentificacionEnum.RUC_SOCIEDAD_PUBLICA
        ) {
            return this.verificarTercerDigitoRucPublica(tercerDigito);
        }

        if (
            tipoIdentificacion === TipoIdentificacionEnum.RUC_SOCIEDAD_PRIVADA
        ) {
            return this.verificarTercerDigitoRucPrivada(tercerDigito);
        }

        return false;
    }

    /**
     * @param tercerDigito
     * @return
     */
    static esTercerDigitoCedulaValido(tercerDigito: number) {
        return !isNaN(tercerDigito) && !(tercerDigito < 0 && tercerDigito > 5);
    }

    /**
     * @param tercerDigito
     * @return
     */
    static verificarTercerDigitoRucNatural(tercerDigito: number) {
        return tercerDigito >= 0 || tercerDigito <= 5;
    }

    /**
     * @param tercerDigito
     * @return
     */
    static verificarTercerDigitoRucPrivada(tercerDigito: number) {
        return tercerDigito === 9;
    }

    /**
     * @param tercerDigito
     * @return
     */
    static verificarTercerDigitoRucPublica(tercerDigito: number) {
        return tercerDigito === 6;
    }

    /**
     * ALGORITMO DE VALIDACION DE IDENTIFICACION
     */

    /**
     * @param numeroIdentificacion
     * @param ultimoDigito
     * @param tipoIdentificacion
     * @return
     */
    static algoritmoVerificaIdentificacion(
        numeroIdentificacion: string,
        ultimoDigito: number,
        tipoIdentificacion: TipoIdentificacionEnum
    ): boolean {
        const sumatoria: number = this.sumarDigitosIdentificacion(
            numeroIdentificacion,
            tipoIdentificacion
        );

        const digitoVerificador: number = this.obtenerDigitoVerificador(
            sumatoria,
            tipoIdentificacion
        );

        return ultimoDigito === digitoVerificador;
    }

    /**
     * @param numeroIdentificacion
     * @param tipoIdentificacion
     * @return
     */
    static sumarDigitosIdentificacion(
        numeroIdentificacion: string,
        tipoIdentificacion: TipoIdentificacionEnum
    ): number {
        const coeficientes: number[] =
            this.obtenerCoeficientes(tipoIdentificacion);
        const identificacion = numeroIdentificacion.split('');

        let sumatoriaCocienteIdentificacion = 0;

        for (let posicion = 0; posicion < coeficientes.length; posicion++) {
            const resultado: number =
                parseInt(identificacion[posicion], 10) * coeficientes[posicion];

            const sumatoria = this.sumatoriaMultiplicacion(
                resultado,
                tipoIdentificacion
            );

            sumatoriaCocienteIdentificacion =
                sumatoriaCocienteIdentificacion + sumatoria;
        }

        return sumatoriaCocienteIdentificacion;
    }

    /**
     * @param multiplicacionValores
     * @param tipoIdentificacion
     * @return
     */
    static sumatoriaMultiplicacion(
        multiplicacionValores: number,
        tipoIdentificacion: TipoIdentificacionEnum
    ): number {
        if (tipoIdentificacion === TipoIdentificacionEnum.CEDULA) {
            return multiplicacionValores >= 10
                ? multiplicacionValores - 9
                : multiplicacionValores;
        } else if (
            tipoIdentificacion === TipoIdentificacionEnum.RUC_PERSONA_NATURAL
        ) {
            const identificacion = String(multiplicacionValores).split('');
            let sumatoria = 0;

            for (
                let posicion = 0;
                posicion < identificacion.length;
                posicion++
            ) {
                sumatoria = sumatoria + parseInt(identificacion[posicion], 10);
            }

            return sumatoria;
        } else {
            return multiplicacionValores;
        }
    }

    /**
     * @param tipoIdentificacion
     * @return
     */
    static obtenerCoeficientes(
        tipoIdentificacion: TipoIdentificacionEnum
    ): number[] {
        if (
            tipoIdentificacion === TipoIdentificacionEnum.CEDULA ||
            tipoIdentificacion === TipoIdentificacionEnum.RUC_PERSONA_NATURAL
        ) {
            return [2, 1, 2, 1, 2, 1, 2, 1, 2];
        } else if (
            tipoIdentificacion === TipoIdentificacionEnum.RUC_SOCIEDAD_PRIVADA
        ) {
            return [4, 3, 2, 7, 6, 5, 4, 3, 2];
        } else if (
            tipoIdentificacion === TipoIdentificacionEnum.RUC_SOCIEDAD_PUBLICA
        ) {
            return [3, 2, 7, 6, 5, 4, 3, 2];
        } else {
            return null;
        }
    }

    /**
     * @param sumatoria
     * @param tipoIdentificacion
     * @return
     */
    static obtenerDigitoVerificador(
        sumatoria: number,
        tipoIdentificacion: TipoIdentificacionEnum
    ): number {
        let residuo = 0;

        if (
            tipoIdentificacion === TipoIdentificacionEnum.CEDULA ||
            tipoIdentificacion === TipoIdentificacionEnum.RUC_PERSONA_NATURAL
        ) {
            residuo = sumatoria % 10;
            return residuo === 0 ? 0 : 10 - residuo;
        } else if (
            tipoIdentificacion ===
                TipoIdentificacionEnum.RUC_SOCIEDAD_PUBLICA ||
            tipoIdentificacion === TipoIdentificacionEnum.RUC_SOCIEDAD_PRIVADA
        ) {
            residuo = sumatoria % 11;
            return residuo === 0 ? 0 : 11 - residuo;
        } else {
            return null;
        }
    }
}
