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
    SlaughterProcessSummary,
    User,
} from 'src/app/zoosanitario/services/slaughter-process.service';
import { InvoiceService } from 'src/app/zoosanitario/services/invoice.service';

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

    ngOnInit(): void {
        if (this.processId) {
            this.loadProcessDetails();
        }
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

        this.slaughterProcessService
            .getSlaughterProcessSummary(this.processData._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (summary: SlaughterProcessSummary) => {
                    console.log('Resumen del proceso cargado:', summary);
                    this.summaryData = summary;
                },
                error: (error) => {
                    console.error('Error loading summary:', error);
                    // No mostrar error al usuario, el resumen no es crítico
                },
            });
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
        this.loadProcessDetails();
    }

    // ========================================
    // ACCIONES DEL PROCESO
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
        this.messageService.add({
            severity: 'info',
            summary: 'Información',
            detail: `Ver detalles de inspección ${inspection.numero} en desarrollo`,
        });
    }

    viewInvoiceDetails(invoice: Invoice): void {
        this.messageService.add({
            severity: 'info',
            summary: 'Información',
            detail: `Ver detalles de factura ${invoice.invoiceNumber} en desarrollo`,
        });
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

        this.invoiceService
            .postInvoiceSlaughterProcesses(this.processId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (invoice) => {
                    console.log('Factura generada:', invoice);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Factura generada correctamente',
                    });
                },
                error: (error) => {
                    console.error('Error generando factura:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail:
                            error.error?.message || 'Error al generar factura',
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
}
