import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import { Introducer } from 'src/app/zoosanitario/interfaces/slaughter.interface';
import { IntroducerService } from 'src/app/zoosanitario/services/introducer.service';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-introducer-detail',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './introducer-detail.component.html',
    styleUrls: ['./introducer-detail.component.scss'],
    providers: [MessageService, ConfirmationService],
})
export class IntroducerDetailComponent implements OnInit {
    introducer!: any;
    loading = true;
    introducerId!: string;

    // Datos completos del introductor
    introducerData: any = null;

    // Estados financieros
    paymentStatus: any = null;
    finesStatus: any = null;
    canSlaughter = false;
    validationMessage = '';

    // Estadísticas y datos adicionales
    processStatistics: any = null;
    recentInvoices: any[] = [];
    warnings: any[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private introducerService: IntroducerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.introducerId = this.route.snapshot.paramMap.get('id')!;
        this.loadIntroducerData();
    }

    loadIntroducerData(): void {
        this.loading = true;

        // Cargar datos del introductor y validaciones en paralelo
        forkJoin({
            introducer: this.introducerService.getById(this.introducerId),
            payment: this.introducerService.getCheckPayment(this.introducerId),
            fines: this.introducerService.getCheckPendingFines(
                this.introducerId
            ),
        }).subscribe({
            next: ({ introducer, payment, fines }) => {
                console.log(introducer, payment, fines);

                // Guardar datos completos
                this.introducerData = introducer.data;
                this.introducer = introducer.data.introducer || introducer;
                this.paymentStatus = payment.data;
                this.finesStatus = fines.data;
                this.processStatistics = introducer.data.statistics;
                this.recentInvoices = introducer.data.recentInvoices || [];
                this.warnings = introducer.data.warnings || [];

                this.updateValidationStatus();
                this.loading = false;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail:
                        'Error al cargar los datos del introductor: ' +
                        error.message,
                });
                this.loading = false;
                this.router.navigate(['/zoosanitario/introducers']);
            },
        });
    }

    updateValidationStatus(): void {
        // Usar canProceed del API si está disponible, sino usar la lógica anterior
        if (this.introducerData?.canProceed !== undefined) {
            this.canSlaughter =
                this.introducerData.canProceed &&
                !this.paymentStatus?.required &&
                !this.finesStatus?.hasPendingFines;
        } else {
            this.canSlaughter =
                !this.paymentStatus?.required &&
                !this.finesStatus?.hasPendingFines;
        }

        const messages = [];

        // Agregar mensaje del API si existe
        if (this.introducerData?.message && !this.introducerData.canProceed) {
            messages.push(this.introducerData.message);
        }

        if (this.paymentStatus?.required) {
            messages.push(this.paymentStatus.message);
        }

        if (this.finesStatus?.hasPendingFines) {
            messages.push(
                `Multas pendientes: ${this.formatCurrency(
                    this.finesStatus.pendingAmount
                )}`
            );
        }

        // Agregar warning del límite si existe
        if (this.introducerData?.details?.warningMessage) {
            messages.push(this.introducerData.details.warningMessage);
        }

        this.validationMessage =
            messages.length > 0
                ? messages.join('. ')
                : this.introducerData?.message || 'Autorizado para faenamiento';
    }

    getIntroducerName(): string {
        if (!this.introducer) return '';

        if (this.introducer.personType === 'Natural') {
            return this.introducer.name || '';
        }
        return this.introducer.companyName || 'Sin nombre';
    }

    getDocumentNumber(): string {
        if (!this.introducer) return '';

        if (this.introducer.personType === 'Natural') {
            return this.introducer.idNumber || '';
        }
        return this.introducer.ruc || '';
    }

    getStatusSeverity(
        status: string
    ): 'success' | 'warning' | 'danger' | 'secondary' | 'info' {
        switch (status?.toUpperCase()) {
            case 'ACTIVE':
            case 'PAID':
                return 'success';
            case 'PENDING':
            case 'GENERATED':
            case 'ISSUED':
                return 'warning';
            case 'SUSPENDED':
            case 'OVERDUE':
                return 'danger';
            case 'EXPIRED':
            case 'CANCELLED':
                return 'secondary';
            default:
                return 'info';
        }
    }

    getIntroducerTypeLabels(): string[] {
        if (!this.introducer?.cattleTypes) return [];

        return this.introducer.cattleTypes.map((type: any) => {
            if (typeof type === 'string') return type;
            return type.species && type.category
                ? `${type.species} (${type.category})`
                : type.label || 'Tipo no especificado';
        });
    }

    getLimitStatus(): 'success' | 'warning' | 'danger' {
        if (!this.introducerData?.details) return 'success';

        const remaining = this.introducerData.details.remainingFreeProcesses;
        const hasExceeded = this.processStatistics?.hasExceededFreeLimit;

        if (hasExceeded) return 'danger';
        if (remaining <= 1) return 'warning';
        return 'success';
    }

    editIntroducer(): void {
        this.router.navigate([
            '/zoosanitario/introducers/edit',
            this.introducerId,
        ]);
    }

    refreshData(): void {
        // Limpiar cache y recargar
        this.introducerService['cacheService']?.clearByPrefix(
            `introducers_${this.introducerId}`
        );
        this.loadIntroducerData();

        this.messageService.add({
            severity: 'info',
            summary: 'Actualizado',
            detail: 'Información actualizada correctamente',
            life: 3000,
        });
    }

    activateIntroducer(): void {
        this.confirmationService.confirm({
            message: '¿Está seguro de activar este introductor?',
            header: 'Confirmar Activación',
            icon: 'pi pi-check-circle',
            acceptLabel: 'Sí, activar',
            rejectLabel: 'Cancelar',
            accept: () => {
                this.introducerService
                    .activateIntroducer(this.introducerId)
                    .subscribe({
                        next: () => {
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Éxito',
                                detail: 'Introductor activado correctamente',
                            });
                            this.refreshData();
                        },
                        error: (error) => {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: error.message,
                            });
                        },
                    });
            },
        });
    }

    suspendIntroducer(): void {
        this.confirmationService.confirm({
            message:
                '¿Está seguro de suspender este introductor? Esta acción requiere una justificación.',
            header: 'Confirmar Suspensión',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, suspender',
            rejectLabel: 'Cancelar',
            accept: () => {
                const reason = prompt('Motivo de suspensión:');
                if (reason?.trim()) {
                    this.introducerService
                        .suspendIntroducer(this.introducerId, reason)
                        .subscribe({
                            next: () => {
                                this.messageService.add({
                                    severity: 'warn',
                                    summary: 'Suspendido',
                                    detail: 'Introductor suspendido correctamente',
                                });
                                this.refreshData();
                            },
                            error: (error) => {
                                this.messageService.add({
                                    severity: 'error',
                                    summary: 'Error',
                                    detail: error.message,
                                });
                            },
                        });
                } else {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Cancelado',
                        detail: 'Debe proporcionar un motivo para la suspensión',
                    });
                }
            },
        });
    }

    viewInvoice(invoiceId: string): void {
        // Navegar a la vista de factura
        this.router.navigate(['/zoosanitario/invoices/view', invoiceId]);
    }

    payInscription(): void {
        if (this.paymentStatus?.pendingInvoiceId) {
            this.viewInvoice(this.paymentStatus.pendingInvoiceId);
        } else {
            // Crear nueva factura de inscripción
            this.router.navigate(['/zoosanitario/invoices/create'], {
                queryParams: {
                    introducerId: this.introducerId,
                    type: 'inscription',
                    rateId: this.paymentStatus?.rateId,
                },
            });
        }
    }

    payFines(): void {
        if (this.finesStatus?.fines?.length > 0) {
            // Mostrar opciones de pago de multas
            this.router.navigate(['/zoosanitario/payments/fines'], {
                queryParams: {
                    introducerId: this.introducerId,
                    amount: this.finesStatus.pendingAmount,
                },
            });
        }
    }

    goBack(): void {
        this.router.navigate(['/zoosanitario/introducers']);
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD',
        }).format(amount || 0);
    }

    formatDate(date: string | Date): string {
        if (!date) return '';
        return new Date(date).toLocaleDateString('es-EC', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    formatDateShort(date: string | Date): string {
        if (!date) return '';
        return new Date(date).toLocaleDateString('es-EC', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }
}
