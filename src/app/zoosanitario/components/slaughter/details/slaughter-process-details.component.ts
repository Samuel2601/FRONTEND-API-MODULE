// src/app/components/slaughter-process-details/slaughter-process-details.component.ts
import {
    Component,
    OnInit,
    OnDestroy,
    Input,
    Output,
    EventEmitter,
    inject,
} from '@angular/core';
import { Subject, takeUntil, finalize, forkJoin, of } from 'rxjs';
import { MessageService, MenuItem } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    Dispatch,
    ExternalInspection,
    Introducer,
    Invoice,
    Reception,
    Slaughtering,
    SlaughterProcess,
    SlaughterProcessService,
    User,
} from 'src/app/zoosanitario/services/slaughter-process.service';
import { InvoiceService } from 'src/app/zoosanitario/services/invoice.service';
import { Router } from '@angular/router';

// Interfaces actualizadas para el resumen detallado
export interface SlaughterProcessSummary {
    proceso: {
        id: string;
        numeroOrden: string;
        estado: string;
        fechaCreacion: string;
        version: number;
    };
    introductor: {
        id: string;
        idNumber: string;
        ruc: string;
        nombre: string;
        email: string;
        telefono: string;
        direccion: string;
        tipo: string;
    };
    recepcion: {
        id: string;
        fecha: string;
        estado: string;
        prioridad: number;
        fechaProgramada: string;
        observaciones: string;
        certificadoSanitario: {
            numero: string;
            autorizadoA: string;
            totalProductos: number;
        };
        transporte: {
            temperatura: number;
            humedadAmbiental: number;
            condicionesHigienicas: string;
            condicionAnimales: string;
            observaciones: string;
            fechaInspeccion: string;
            fotografias: number;
        };
    };
    inspecciones: {
        total: number;
        porResultado: {
            pendientes: number;
            aptas: number;
            devolucion: number;
            cuarentena: number;
            comision: number;
        };
        porSexo: {
            macho: number;
            hembra: number;
            pendiente: number;
        };
        porEspecie: { [key: string]: number };
        estadisticas: {
            pesoPromedio: number;
            pesoTotal: number;
            pesoMinimo: number;
            pesoMaximo: number;
            edadPromedio: number;
            edadMinima: number;
            edadMaxima: number;
        };
        detalles: any[];
    };
    facturacion: {
        total: number;
        tieneFacturas: boolean;
        porEstado: {
            pagadas: number;
            emitidas: number;
            canceladas: number;
            pendientes: number;
        };
        montos: {
            totalPagado: number;
            totalEmitido: number;
            totalCancelado: number;
            totalPendiente: number;
            totalGeneral: number;
            promedioFactura: number;
        };
        fechas: {
            primeraEmision: string;
            ultimaEmision: string;
            proximoVencimiento: string;
        };
        facturas: any[];
    };
    faenamientos: {
        total: number;
        detalles: any[];
    };
    inspeccionesInternas: {
        total: number;
        detalles: any[];
    };
    despachos: {
        total: number;
        detalles: any[];
    };
    tiempos: {
        fechaCreacion: string;
        fechaUltimaActualizacion: string;
        tiempoTranscurrido: number;
        tiempoDesdeRecepcion: number;
    };
    auditoria: {
        creadoPor: {
            id: string;
            nombre: string;
            apellido: string;
            email: string;
        };
        actualizadoPor: {
            id: string;
            nombre: string;
            apellido: string;
            email: string;
        };
        eliminado: boolean;
        fechaEliminacion: string;
    };
    estadisticasGenerales: {
        totalAnimales: number;
        totalFacturas: number;
        montoTotalFacturado: number;
        procesoCompleto: boolean;
    };
}

@Component({
    selector: 'app-slaughter-process-details',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './slaughter-process-details.component.html',
    styleUrls: ['./slaughter-process-details.component.scss'],
})
export class SlaughterProcessDetailsComponent implements OnInit, OnDestroy {
    private readonly destroy$ = new Subject<void>();
    private readonly slaughterProcessService = inject(SlaughterProcessService);
    private readonly invoiceService = inject(InvoiceService);
    private readonly messageService = inject(MessageService);
    constructor(private router: Router) {}

    @Input() processId!: string;
    @Output() processUpdated = new EventEmitter<SlaughterProcess>();
    @Output() editRequested = new EventEmitter<void>();

    // Estados del componente
    loading = false;
    processData: SlaughterProcess | null = null;
    summaryData: SlaughterProcessSummary | null = null;

    // Datos relacionados
    introducerData: Introducer | null = null;
    receptionData: Reception | null = null;
    inspectionsData: ExternalInspection[] = [];
    invoicesData: Invoice[] = [];
    slaughteringsData: Slaughtering[] = [];
    dispatchesData: Dispatch[] = [];

    // Acciones de estado disponibles
    stateActions: MenuItem[] = [];

    // Estados del proceso para progreso
    processStates = [
        'Iniciado',
        'PreFaenamiento',
        'Pagado',
        'EnProceso',
        'Finalizado',
    ];

    // Opciones para gráficos
    inspectionChartData: any = {};
    inspectionChartOptions: any = {};
    invoiceChartData: any = {};
    invoiceChartOptions: any = {};

    ngOnInit(): void {
        if (this.processId) {
            this.loadProcessDetails();
        }
        this.initializeChartOptions();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ========================================
    // CARGA DE DATOS
    // ========================================

    loadProcessDetails(): void {
        this.loading = true;

        // Limpiar datos previos
        this.processData = null;
        this.summaryData = null;
        this.introducerData = null;
        this.receptionData = null;
        this.inspectionsData = [];
        this.invoicesData = [];
        this.slaughteringsData = [];
        this.dispatchesData = [];

        // Primero cargar los datos básicos del proceso
        this.slaughterProcessService
            .getById(this.processId)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (process: SlaughterProcess) => {
                    console.log('Datos del proceso cargados:', process);
                    this.processData = process;

                    // Después cargar datos relacionados y resumen
                    this.loadRelatedData();
                    this.loadSummaryData();
                    this.setupStateActions();
                },
                error: (error) => {
                    console.error('Error loading process details:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cargar los detalles del proceso',
                    });
                },
            });
    }

    loadRelatedData(): void {
        if (!this.processData) return;
        console.log('loadRelatedData', this.processData);
        // Determinar qué datos necesitamos cargar
        const loadRequests: any = {};

        // Cargar introductor si es solo un ID
        if (typeof this.processData.introductor === 'string') {
            // Aquí cargarías el introductor completo desde su servicio
            // loadRequests.introductor = this.introducerService.getById(this.processData.introductor);
        } else {
            this.introducerData = this.processData.introductor;
        }

        // Cargar recepción si es solo un ID
        if (
            typeof this.processData.recepcion === 'string' &&
            this.processData.recepcion
        ) {
            // Aquí cargarías la recepción completa desde su servicio
            // loadRequests.reception = this.receptionService.getById(this.processData.recepcion);
        } else if (
            this.processData.recepcion &&
            typeof this.processData.recepcion !== 'string'
        ) {
            this.receptionData = this.processData.recepcion;
        }

        // Cargar inspecciones si son solo IDs
        if (
            this.processData.inspeccionesExternas &&
            Array.isArray(this.processData.inspeccionesExternas)
        ) {
            const inspectionIds = this.processData.inspeccionesExternas.filter(
                (i) => typeof i === 'string'
            );
            if (inspectionIds.length > 0) {
                // Aquí cargarías las inspecciones completas desde su servicio
                // loadRequests.inspections = this.inspectionService.getByIds(inspectionIds);
            } else {
                this.inspectionsData =
                    this.processData.inspeccionesExternas.filter(
                        (i) => typeof i !== 'string'
                    ) as ExternalInspection[];
            }
        }

        // Cargar facturas si son solo IDs
        if (
            this.processData.factura &&
            Array.isArray(this.processData.factura)
        ) {
            const invoiceIds = this.processData.factura.filter(
                (f) => typeof f === 'string'
            );
            if (invoiceIds.length > 0) {
                // Aquí cargarías las facturas completas desde su servicio
                // loadRequests.invoices = this.invoiceService.getByIds(invoiceIds);
            } else {
                this.invoicesData = this.processData.factura.filter(
                    (f) => typeof f !== 'string'
                ) as Invoice[];
            }
        }

        // Cargar faenamientos si son solo IDs
        if (
            this.processData.faenamientos &&
            Array.isArray(this.processData.faenamientos)
        ) {
            const slaughteringIds = this.processData.faenamientos.filter(
                (f) => typeof f === 'string'
            );
            if (slaughteringIds.length > 0) {
                // Aquí cargarías los faenamientos completos desde su servicio
                // loadRequests.slaughterings = this.slaughteringService.getByIds(slaughteringIds);
            } else {
                this.slaughteringsData = this.processData.faenamientos.filter(
                    (f) => typeof f !== 'string'
                ) as Slaughtering[];
            }
        }

        // Cargar despachos si son solo IDs
        if (
            this.processData.despachos &&
            Array.isArray(this.processData.despachos)
        ) {
            const dispatchIds = this.processData.despachos.filter(
                (d) => typeof d === 'string'
            );
            if (dispatchIds.length > 0) {
                // Aquí cargarías los despachos completos desde su servicio
                // loadRequests.dispatches = this.dispatchService.getByIds(dispatchIds);
            } else {
                this.dispatchesData = this.processData.despachos.filter(
                    (d) => typeof d !== 'string'
                ) as Dispatch[];
            }
        }

        // Ejecutar las cargas pendientes si las hay
        if (Object.keys(loadRequests).length > 0) {
            forkJoin(loadRequests)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (results: any) => {
                        console.log('Datos relacionados cargados:', results);
                        // Asignar los resultados a las propiedades correspondientes
                        if (results.introducer)
                            this.introducerData = results.introducer;
                        if (results.reception)
                            this.receptionData = results.reception;
                        if (results.inspections)
                            this.inspectionsData = results.inspections;
                        if (results.invoices)
                            this.invoicesData = results.invoices;
                        if (results.slaughterings)
                            this.slaughteringsData = results.slaughterings;
                        if (results.dispatches)
                            this.dispatchesData = results.dispatches;
                    },
                    error: (error) => {
                        console.error('Error loading related data:', error);
                        // No mostrar error al usuario, los datos relacionados no son críticos
                    },
                });
        }
    }

    loadSummaryData(): void {
        if (!this.processData?._id) return;
        console.log('loadSummaryData', this.processData);
        this.slaughterProcessService
            .getSlaughterProcessSummary(this.processData._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe(
                (summary: any) => {
                    console.log('Resumen del proceso cargado:', summary);
                    this.summaryData = summary;
                    this.updateChartData();
                },
                (error) => {
                    console.error('Error loading summary:', error);
                    // No mostrar error al usuario, el resumen no es crítico
                }
            );
    }

    setupStateActions(): void {
        if (!this.processData) return;

        const currentState = this.processData.estado;
        const validTransitions = this.getValidTransitions(currentState);

        this.stateActions = validTransitions.map((state) => ({
            label: `Cambiar a ${state}`,
            icon: this.getStateIcon(state),
            command: () => this.changeProcessState(state),
        }));

        // Agregar acción de anulación si es posible
        if (currentState !== 'Anulado' && currentState !== 'Finalizado') {
            this.stateActions.push(
                { separator: true },
                {
                    label: 'Anular Proceso',
                    icon: 'pi pi-ban',
                    command: () => this.cancelProcess(),
                }
            );
        }
    }

    refresh(): void {
        // Limpiar caché específico antes de refrescar
        this.slaughterProcessService.clearCache();

        this.messageService.add({
            severity: 'info',
            summary: 'Actualizando',
            detail: 'Cargando datos actualizados...',
        });

        this.loadProcessDetails();
    }

    // ========================================
    // MÉTODOS PARA GRÁFICOS
    // ========================================

    initializeChartOptions(): void {
        this.inspectionChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
            },
        };

        this.invoiceChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
            },
        };
    }

    updateChartData(): void {
        if (!this.summaryData) return;

        // Datos para gráfico de inspecciones por resultado
        this.inspectionChartData = {
            labels: [
                'Pendientes',
                'Aptas',
                'Devolución',
                'Cuarentena',
                'Comisión',
            ],
            datasets: [
                {
                    data: [
                        this.summaryData.inspecciones.porResultado.pendientes,
                        this.summaryData.inspecciones.porResultado.aptas,
                        this.summaryData.inspecciones.porResultado.devolucion,
                        this.summaryData.inspecciones.porResultado.cuarentena,
                        this.summaryData.inspecciones.porResultado.comision,
                    ],
                    backgroundColor: [
                        '#FFA726', // warning - pendientes
                        '#66BB6A', // success - aptas
                        '#EF5350', // danger - devolución
                        '#42A5F5', // info - cuarentena
                        '#AB47BC', // help - comisión
                    ],
                },
            ],
        };

        // Datos para gráfico de facturas por estado
        this.invoiceChartData = {
            labels: ['Pagadas', 'Emitidas', 'Canceladas', 'Pendientes'],
            datasets: [
                {
                    data: [
                        this.summaryData.facturacion.porEstado.pagadas,
                        this.summaryData.facturacion.porEstado.emitidas,
                        this.summaryData.facturacion.porEstado.canceladas,
                        this.summaryData.facturacion.porEstado.pendientes,
                    ],
                    backgroundColor: [
                        '#66BB6A', // success - pagadas
                        '#FFA726', // warning - emitidas
                        '#EF5350', // danger - canceladas
                        '#42A5F5', // info - pendientes
                    ],
                },
            ],
        };
    }

    // ========================================
    // GETTERS PARA MOSTRAR DATOS
    // ========================================

    get especiesArray(): { nombre: string; cantidad: number }[] {
        if (!this.summaryData?.inspecciones.porEspecie) return [];
        return Object.entries(this.summaryData.inspecciones.porEspecie).map(
            ([nombre, cantidad]) => ({ nombre, cantidad })
        );
    }

    get tiempoTranscurridoText(): string {
        if (!this.summaryData?.tiempos.tiempoTranscurrido) return 'N/A';
        const dias = this.summaryData.tiempos.tiempoTranscurrido;
        return dias === 1 ? '1 día' : `${dias} días`;
    }

    get tiempoDesdeRecepcionText(): string {
        if (!this.summaryData?.tiempos.tiempoDesdeRecepcion) return 'N/A';
        const dias = this.summaryData.tiempos.tiempoDesdeRecepcion;
        return dias === 1 ? '1 día' : `${dias} días`;
    }

    get proximoVencimientoText(): string {
        if (!this.summaryData?.facturacion.fechas.proximoVencimiento)
            return 'N/A';
        return new Date(
            this.summaryData.facturacion.fechas.proximoVencimiento
        ).toLocaleDateString('es-ES');
    }

    // ========================================
    // ACCIONES DEL PROCESO (continuación del código original)
    // ========================================

    editProcess(): void {
        this.editRequested.emit();
    }

    changeProcessState(newState: string): void {
        if (!this.processData?._id) return;

        this.slaughterProcessService
            .updateSlaughterProcessState(this.processData._id, newState)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (updatedProcess: SlaughterProcess) => {
                    console.log('Proceso actualizado:', updatedProcess);
                    this.processData = updatedProcess;
                    this.processUpdated.emit(updatedProcess);
                    this.setupStateActions();
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: `Estado cambiado a ${newState}`,
                    });

                    // Recargar datos para reflejar cambios
                    this.loadSummaryData();
                },
                error: (error) => {
                    console.error('Error updating state:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cambiar el estado del proceso',
                    });
                },
            });
    }

    cancelProcess(): void {
        if (!this.processData?._id) return;

        const reason = 'Anulado desde vista de detalles';
        this.slaughterProcessService
            .cancelSlaughterProcess(this.processData._id, reason)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (updatedProcess: SlaughterProcess) => {
                    this.processData = updatedProcess;
                    this.processUpdated.emit(updatedProcess);
                    this.setupStateActions();
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Proceso anulado correctamente',
                    });

                    // Recargar datos para reflejar cambios
                    this.loadSummaryData();
                },
                error: (error) => {
                    console.error('Error canceling process:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al anular el proceso',
                    });
                },
            });
    }

    // ========================================
    // ACCIONES DE DATOS RELACIONADOS
    // ========================================

    viewIntroducerProfile(): void {
        this.messageService.add({
            severity: 'info',
            summary: 'Información',
            detail: 'Funcionalidad de perfil del introductor en desarrollo',
        });
    }

    viewReceptionDetails(): void {
        this.messageService.add({
            severity: 'info',
            summary: 'Información',
            detail: 'Funcionalidad de detalles de recepción en desarrollo',
        });
    }

    viewInspectionDetails(inspection: ExternalInspection): void {
        console.log('viewInspectionDetails', inspection);

        if (!inspection || !inspection.numero) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Inspección inválida o sin número.',
            });
            return;
        }

        // Redirige según la fase pendiente
        if (inspection.inspeccionRecepcion?.resultado === 'Pendiente') {
            // Fase: Recepción
            this.router.navigate([
                '/zoosanitario/workflow/external-inspection/recepcion',
                inspection.numero,
            ]);
        } else if (inspection.examenAnteMortem?.resultado === 'Pendiente') {
            // Fase: Ante Mortem
            this.router.navigate([
                '/zoosanitario/workflow/external-inspection/ante-mortem',
                inspection.numero,
            ]);
        } else {
            // Fase: Ante Mortem
            this.router.navigate([
                '/zoosanitario/workflow/external-inspection/ante-mortem',
                inspection.numero,
            ]);
            // No hay fases pendientes
            this.messageService.add({
                severity: 'info',
                summary: 'Sin acciones pendientes',
                detail: 'Esta inspección no tiene fases pendientes.',
            });
        }
    }

    viewInvoiceDetails(invoice: Invoice): void {
        this.router.navigate(['/zoosanitario/invoices/view/', invoice._id]);
    }

    createInspection(): void {
        this.messageService.add({
            severity: 'info',
            summary: 'Información',
            detail: 'Funcionalidad de crear inspección en desarrollo',
        });
    }

    createInvoice(): void {
        if (!this.processId) return;

        this.loading = true;

        this.invoiceService
            .postInvoiceSlaughterProcesses(this.processId)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (invoice) => {
                    console.log('Factura generada:', invoice);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Factura generada correctamente',
                    });

                    // Limpiar caché y recargar datos después de generar factura
                    this.slaughterProcessService.clearCache();
                    this.loadProcessDetails();

                    // Emitir evento de proceso actualizado
                    if (this.processData) {
                        this.processUpdated.emit(this.processData);
                    }
                },
                error: (error) => {
                    console.error('Error generando factura:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: error.message || 'Error al generar factura',
                    });
                },
            });
    }

    viewAuditHistory(): void {
        if (!this.processId) return;

        this.slaughterProcessService
            .getAuditHistory(this.processId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (history) => {
                    console.log('Audit history:', history);
                    this.messageService.add({
                        severity: 'info',
                        summary: 'Historial',
                        detail: 'Ver consola para historial de auditoría',
                    });
                },
                error: (error) => {
                    console.error('Error loading audit history:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cargar el historial de auditoría',
                    });
                },
            });
    }

    generateReport(): void {
        this.messageService.add({
            severity: 'info',
            summary: 'Información',
            detail: 'Funcionalidad de generar reporte en desarrollo',
        });
    }

    // ========================================
    // MÉTODOS AUXILIARES
    // ========================================

    canEditProcess(): boolean {
        if (!this.processData) return false;
        return (
            this.processData.estado !== 'Finalizado' &&
            this.processData.estado !== 'Anulado'
        );
    }

    getValidTransitions(currentState: string): string[] {
        const transitions: { [key: string]: string[] } = {
            Iniciado: ['PreFaenamiento'],
            PreFaenamiento: ['Pagado'],
            Pagado: ['EnProceso'],
            EnProceso: ['Finalizado'],
            Finalizado: [],
            Anulado: [],
        };
        return transitions[currentState] || [];
    }

    getStateSeverity(
        state: string
    ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
        const severities: { [key: string]: any } = {
            Iniciado: 'info',
            PreFaenamiento: 'warning',
            Pagado: 'info',
            EnProceso: 'warning',
            Finalizado: 'success',
            Anulado: 'danger',
        };
        return severities[state] || 'secondary';
    }

    getStateIcon(state: string): string {
        const icons: { [key: string]: string } = {
            Iniciado: 'pi pi-play',
            PreFaenamiento: 'pi pi-clock',
            Pagado: 'pi pi-dollar',
            EnProceso: 'pi pi-cog',
            Finalizado: 'pi pi-check',
            Anulado: 'pi pi-ban',
        };
        return icons[state] || 'pi pi-circle';
    }

    getReceptionStateSeverity(
        estado: string
    ): 'success' | 'info' | 'warning' | 'danger' {
        const severities: { [key: string]: any } = {
            Completado: 'success',
            Procesando: 'warning',
            Pendiente: 'info',
            Rechazado: 'danger',
        };
        return severities[estado] || 'info';
    }

    getInspectionResultSeverity(
        resultado: string
    ): 'success' | 'info' | 'warning' | 'danger' {
        const severities: { [key: string]: any } = {
            Apto: 'success',
            Pendiente: 'warning',
            Devolución: 'danger',
            Cuarentena: 'info',
            Comisión: 'info',
        };
        return severities[resultado] || 'info';
    }

    getInvoiceStatusSeverity(
        status: string
    ): 'success' | 'info' | 'warning' | 'danger' {
        const severities: { [key: string]: any } = {
            Generated: 'info',
            Issued: 'warning',
            Paid: 'success',
            Cancelled: 'danger',
        };
        return severities[status] || 'info';
    }

    getSpeciesName(especie: any): string {
        if (typeof especie === 'string') {
            return especie;
        }
        return especie?.species || 'N/A';
    }

    getUserName(user: string | User): string {
        if (typeof user === 'string') {
            return 'Cargando...';
        }
        if (user && user.name) {
            return user.last_name
                ? `${user.name} ${user.last_name}`
                : user.name;
        }
        return 'N/A';
    }

    // ========================================
    // MÉTODOS DE PROGRESO
    // ========================================

    isStepActive(step: string): boolean {
        return this.processData?.estado === step;
    }

    isStepCompleted(step: string): boolean {
        if (!this.processData) return false;

        const currentIndex = this.processStates.indexOf(
            this.processData.estado
        );
        const stepIndex = this.processStates.indexOf(step);

        return stepIndex < currentIndex;
    }

    getProgressPercentage(): number {
        if (!this.processData) return 0;

        const currentIndex = this.processStates.indexOf(
            this.processData.estado
        );
        if (currentIndex === -1) return 0;

        return (currentIndex / (this.processStates.length - 1)) * 100;
    }

    getExternalInspections(number: string): void {
        this.router.navigate([
            'zoosanitario/workflow/external-inspection/recepcion/',
            number,
        ]);
    }
}
