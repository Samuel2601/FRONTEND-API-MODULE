// ===== CERTIFICATE LIST COMPONENT TS =====
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Table } from 'primeng/table';
import { ZoosanitaryCertificate } from '../../utils/interfaces/zoosanitarycertificate.interface';
import { ZoosanitaryCertificateService } from '../../services/ZoosanitaryCertificate.service';
import { WorkflowManagerService } from '../../services/WorkflowManager.service';
import { QrScannerService } from '../../services/QrScanner.service';
import { SearchCriteria } from '../../utils/interfaces/apiresponse.interface';

interface CertificateFilter {
    status: string[];
    dateFrom: Date | null;
    dateTo: Date | null;
    originProvince: string[];
    destinationProvince: string[];
    search: string;
}

@Component({
    standalone: false,
    selector: 'app-certificate-list',
    templateUrl: './certificate-list.component.html',
    styleUrls: ['./certificate-list.component.scss'],
})
export class CertificateListComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    // Datos de la tabla
    certificates: ZoosanitaryCertificate[] = [];
    selectedCertificates: ZoosanitaryCertificate[] = [];

    // Configuración de la tabla
    loading = false;
    totalRecords = 0;
    rows = 10;
    first = 0;

    // Filtros y búsqueda
    filterForm: FormGroup;
    showFilters = false;
    globalFilter = '';

    // Opciones para dropdowns
    statusOptions = [
        { label: 'Activo', value: 'ACTIVE' },
        { label: 'Expirado', value: 'EXPIRED' },
        { label: 'Procesado', value: 'PROCESSED' },
        { label: 'Cancelado', value: 'CANCELLED' },
    ];

    provinceOptions = [
        { label: 'Azuay', value: 'AZUAY' },
        { label: 'Bolívar', value: 'BOLIVAR' },
        { label: 'Cañar', value: 'CANAR' },
        { label: 'Carchi', value: 'CARCHI' },
        { label: 'Chimborazo', value: 'CHIMBORAZO' },
        { label: 'Cotopaxi', value: 'COTOPAXI' },
        { label: 'El Oro', value: 'EL_ORO' },
        { label: 'Esmeraldas', value: 'ESMERALDAS' },
        { label: 'Galápagos', value: 'GALAPAGOS' },
        { label: 'Guayas', value: 'GUAYAS' },
        { label: 'Imbabura', value: 'IMBABURA' },
        { label: 'Loja', value: 'LOJA' },
        { label: 'Los Ríos', value: 'LOS_RIOS' },
        { label: 'Manabí', value: 'MANABI' },
        { label: 'Morona Santiago', value: 'MORONA_SANTIAGO' },
        { label: 'Napo', value: 'NAPO' },
        { label: 'Orellana', value: 'ORELLANA' },
        { label: 'Pastaza', value: 'PASTAZA' },
        { label: 'Pichincha', value: 'PICHINCHA' },
        { label: 'Santa Elena', value: 'SANTA_ELENA' },
        { label: 'Santo Domingo', value: 'SANTO_DOMINGO' },
        { label: 'Sucumbíos', value: 'SUCUMBIOS' },
        { label: 'Tungurahua', value: 'TUNGURAHUA' },
        { label: 'Zamora Chinchipe', value: 'ZAMORA_CHINCHIPE' },
    ];

    // Columnas de la tabla
    cols = [
        { field: 'certificateNumber', header: 'Número', sortable: true },
        { field: 'authorizedTo', header: 'Autorizado Para', sortable: true },
        { field: 'totalProducts', header: 'Productos', sortable: true },
        { field: 'validUntil', header: 'Válido Hasta', sortable: true },
        { field: 'status', header: 'Estado', sortable: true },
        { field: 'issueDate', header: 'Fecha Emisión', sortable: true },
    ];

    // Configuración de exportación
    exportOptions = [
        {
            label: 'Excel',
            icon: 'pi pi-file-excel',
            command: () => this.exportExcel(),
        },
        {
            label: 'PDF',
            icon: 'pi pi-file-pdf',
            command: () => this.exportPdf(),
        },
        { label: 'CSV', icon: 'pi pi-file', command: () => this.exportCsv() },
    ];

    constructor(
        private router: Router,
        private fb: FormBuilder,
        private certificateService: ZoosanitaryCertificateService,
        private workflowManager: WorkflowManagerService,
        private qrService: QrScannerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {
        this.initializeFilterForm();
    }

    ngOnInit() {
        this.loadCertificates();
        this.setupSearch();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private initializeFilterForm() {
        this.filterForm = this.fb.group({
            status: [[]],
            dateFrom: [null],
            dateTo: [null],
            originProvince: [[]],
            destinationProvince: [[]],
            search: [''],
        });

        // Escuchar cambios en los filtros
        this.filterForm.valueChanges
            .pipe(
                debounceTime(500),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                this.applyFilters();
            });
    }

    private setupSearch() {
        this.searchSubject
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe((searchTerm) => {
                this.globalFilter = searchTerm;
                this.loadCertificates();
            });
    }

    loadCertificates(event?: any) {
        this.loading = true;

        // Configurar criterios de búsqueda
        const criteria: SearchCriteria = {
            page: event ? Math.floor(event.first / event.rows) + 1 : 1,
            limit: event ? event.rows : this.rows,
            sortBy: event?.sortField || 'issueDate',
            sortOrder: event?.sortOrder === 1 ? 'asc' : 'desc',
            search: this.globalFilter,
            filters: this.buildFilters(),
        };

        this.certificateService
            .getAll(criteria)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    this.certificates = response.data || [];
                    this.totalRecords = response.pagination?.totalItems || 0;
                    this.loading = false;
                },
                error: (error) => {
                    console.error('Error loading certificates:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cargar los certificados',
                    });
                    this.loading = false;
                },
            });
    }

    private buildFilters(): any {
        const formValue = this.filterForm.value;
        const filters: any = {};

        if (formValue.status?.length > 0) {
            filters.status = formValue.status;
        }

        if (formValue.dateFrom) {
            filters.dateFrom = formValue.dateFrom;
        }

        if (formValue.dateTo) {
            filters.dateTo = formValue.dateTo;
        }

        if (formValue.originProvince?.length > 0) {
            filters.originProvince = formValue.originProvince;
        }

        if (formValue.destinationProvince?.length > 0) {
            filters.destinationProvince = formValue.destinationProvince;
        }

        return filters;
    }

    onGlobalFilter(event: any) {
        const value = event.target.value;
        this.searchSubject.next(value);
    }

    applyFilters() {
        this.first = 0;
        this.loadCertificates();
    }

    clearFilters() {
        this.filterForm.reset();
        this.globalFilter = '';
        this.first = 0;
        this.loadCertificates();
    }

    toggleFilters() {
        this.showFilters = !this.showFilters;
    }

    // Acciones de certificados
    viewCertificate(certificate: ZoosanitaryCertificate) {
        // Navegar a vista detalle del certificado
        this.router.navigate(['/veterinary/certificates', certificate._id]);
    }

    startWorkflowWithCertificate(certificate: ZoosanitaryCertificate) {
        if (certificate.status !== 'ACTIVE') {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Solo se pueden procesar certificados activos',
            });
            return;
        }

        this.confirmationService.confirm({
            message: `¿Desea iniciar el flujo de trabajo con el certificado ${certificate.certificateNumber}?`,
            header: 'Iniciar Flujo de Trabajo',
            icon: 'pi pi-question-circle',
            accept: () => {
                // Configurar workflow con el certificado seleccionado
                const workflowData = {
                    reception: {
                        certificateNumber: certificate.certificateNumber,
                        certificateId: certificate._id,
                        certificateData: certificate,
                        receptionDate: new Date(),
                        validationStatus: 'valid',
                    },
                };

                this.workflowManager.setCurrentWorkflow(workflowData);
                this.workflowManager.updateStepStatus('reception', true);

                this.router.navigate(['/veterinary/workflow/external']);

                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Flujo de trabajo iniciado correctamente',
                });
            },
        });
    }

    duplicateCertificate(certificate: ZoosanitaryCertificate) {
        this.confirmationService.confirm({
            message: `¿Desea crear una copia del certificado ${certificate.certificateNumber}?`,
            header: 'Duplicar Certificado',
            icon: 'pi pi-copy',
            accept: () => {
                // Implementar lógica de duplicación
                this.messageService.add({
                    severity: 'info',
                    summary: 'Información',
                    detail: 'Funcionalidad de duplicación en desarrollo',
                });
            },
        });
    }

    cancelCertificate(certificate: ZoosanitaryCertificate) {
        if (certificate.status !== 'ACTIVE') {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Solo se pueden cancelar certificados activos',
            });
            return;
        }

        this.confirmationService.confirm({
            message: `¿Está seguro que desea cancelar el certificado ${certificate.certificateNumber}? Esta acción no se puede deshacer.`,
            header: 'Cancelar Certificado',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                const updatedCertificate = {
                    ...certificate,
                    status: 'CANCELLED' as any,
                };

                this.certificateService
                    .update(certificate._id!, updatedCertificate)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => {
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Éxito',
                                detail: 'Certificado cancelado correctamente',
                            });
                            this.loadCertificates();
                        },
                        error: (error) => {
                            console.error(
                                'Error canceling certificate:',
                                error
                            );
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Error al cancelar el certificado',
                            });
                        },
                    });
            },
        });
    }

    // Acciones masivas
    deleteSelectedCertificates() {
        if (this.selectedCertificates.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Seleccione al menos un certificado',
            });
            return;
        }

        this.confirmationService.confirm({
            message: `¿Está seguro que desea eliminar ${this.selectedCertificates.length} certificado(s) seleccionado(s)?`,
            header: 'Eliminar Certificados',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                // Implementar eliminación masiva
                this.messageService.add({
                    severity: 'info',
                    summary: 'Información',
                    detail: 'Funcionalidad de eliminación masiva en desarrollo',
                });
            },
        });
    }

    exportSelectedCertificates() {
        if (this.selectedCertificates.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Seleccione al menos un certificado',
            });
            return;
        }

        this.exportExcel(this.selectedCertificates);
    }

    // Scanner QR
    async scanQRCertificate() {
        try {
            const qrResult = await this.qrService.scanQR();

            if (qrResult) {
                // Buscar el certificado por número
                this.globalFilter = qrResult;
                this.loadCertificates();

                this.messageService.add({
                    severity: 'success',
                    summary: 'QR Escaneado',
                    detail: `Buscando certificado: ${qrResult}`,
                });
            }
        } catch (error) {
            console.error('Error scanning QR:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al escanear el código QR',
            });
        }
    }

    // Funciones de exportación
    exportExcel(data?: ZoosanitaryCertificate[]) {
        const exportData = data || this.certificates;

        // Formatear datos para exportación
        const formattedData = exportData.map((cert) => ({
            Número: cert.certificateNumber,
            'Autorizado Para': cert.authorizedTo,
            Productos: cert.totalProducts,
            'Válido Hasta': new Date(cert.validUntil).toLocaleDateString(),
            Estado: cert.status,
            'Fecha Emisión': new Date(cert.issueDate).toLocaleDateString(),
            Origen: cert.origin?.location?.province || '',
            Destino: cert.destination?.location?.province || '',
            Vehículo: cert.vehicle,
        }));

        // Simular exportación
        console.log('Exporting to Excel:', formattedData);

        this.messageService.add({
            severity: 'info',
            summary: 'Exportación',
            detail: `${formattedData.length} certificados exportados a Excel`,
        });
    }

    exportPdf() {
        this.messageService.add({
            severity: 'info',
            summary: 'Exportación',
            detail: 'Exportación a PDF en desarrollo',
        });
    }

    exportCsv() {
        this.messageService.add({
            severity: 'info',
            summary: 'Exportación',
            detail: 'Exportación a CSV en desarrollo',
        });
    }

    // Utilidades
    getStatusSeverity(
        status: string
    ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
        const severities = {
            ACTIVE: 'success',
            EXPIRED: 'danger',
            PROCESSED: 'info',
            CANCELLED: 'warn',
        };
        return severities[status] || 'secondary';
    }

    getStatusIcon(status: string): string {
        const icons = {
            ACTIVE: 'pi-check-circle',
            EXPIRED: 'pi-times-circle',
            PROCESSED: 'pi-info-circle',
            CANCELLED: 'pi-ban',
        };
        return icons[status] || 'pi-circle';
    }

    isExpired(certificate: ZoosanitaryCertificate): boolean {
        return new Date(certificate.validUntil) < new Date();
    }

    isExpiringSoon(certificate: ZoosanitaryCertificate): boolean {
        const validUntil = new Date(certificate.validUntil);
        const now = new Date();
        const diffDays = Math.ceil(
            (validUntil.getTime() - now.getTime()) / (1000 * 3600 * 24)
        );
        return diffDays <= 7 && diffDays > 0;
    }

    formatDate(date: string | Date): string {
        return new Date(date).toLocaleDateString('es-ES');
    }

    clear(table: Table) {
        table.clear();
        this.globalFilter = '';
    }

    getProductTypes(certificate: ZoosanitaryCertificate): string {
        if (!certificate.products || certificate.products.length === 0) {
            return 'Sin detalle';
        }
        return certificate.products.map((p) => p.type).join(', ');
    }
}
