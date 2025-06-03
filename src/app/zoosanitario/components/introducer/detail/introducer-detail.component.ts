import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    Introducer,
    IntroducerService,
} from 'src/app/zoosanitario/services/introducer.service';

@Component({
    selector: 'app-introducer-detail',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './introducer-detail.component.html',
    styleUrls: ['./introducer-detail.component.scss'],
    providers: [MessageService, ConfirmationService],
})
export class IntroducerDetailComponent implements OnInit {
    introducer!: Introducer;
    loading = true;
    introducerId!: string;
    canSlaughter = false;
    slaughterValidationMessage = '';
    pendingAmount = 0;

    // Modales
    showFineDialog = false;
    showPaymentDialog = false;
    selectedFine: any = null;

    // Formularios de modal
    newFine = {
        type: '',
        amount: 0,
        reason: '',
    };

    newPayment = {
        year: new Date().getFullYear(),
        amount: 0,
        paymentMethod: 'CASH',
        receiptNumber: '',
    };

    paymentMethods = [
        { label: 'Efectivo', value: 'CASH' },
        { label: 'Transferencia', value: 'TRANSFER' },
        { label: 'Cheque', value: 'CHECK' },
        { label: 'Tarjeta', value: 'CARD' },
    ];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private introducerService: IntroducerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.introducerId = this.route.snapshot.paramMap.get('id')!;
        this.loadIntroducer();
    }

    loadIntroducer(): void {
        this.loading = true;
        this.introducerService.getIntroducerById(this.introducerId).subscribe({
            next: (introducer) => {
                this.introducer = introducer;
                this.loading = false;
                this.validateSlaughter();
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar introductor: ' + error.message,
                });
                this.loading = false;
                this.router.navigate(['/zoosanitario/introducers']);
            },
        });
    }

    validateSlaughter(): void {
        this.introducerService.validateSlaughter(this.introducerId).subscribe({
            next: (validation) => {
                this.canSlaughter = validation.canSlaughter;
                this.slaughterValidationMessage = validation.reason || '';
                this.pendingAmount = validation.pendingAmount || 0;
            },
            error: (error) => {
                console.error('Error validando faenamiento:', error);
            },
        });
    }

    getIntroducerName(): string {
        if (this.introducer.type === 'NATURAL') {
            return `${this.introducer.firstName} ${this.introducer.lastName}`;
        }
        return this.introducer.companyName || '';
    }

    getStatusSeverity(
        status: string
    ): 'success' | 'warning' | 'danger' | 'secondary' | 'info' {
        switch (status) {
            case 'ACTIVE':
                return 'success';
            case 'PENDING':
                return 'warning';
            case 'SUSPENDED':
                return 'danger';
            case 'EXPIRED':
                return 'secondary';
            case 'PAID':
                return 'success';
            case 'OVERDUE':
                return 'danger';
            default:
                return 'info';
        }
    }

    getIntroducerTypeLabel(type: string): string {
        switch (type) {
            case 'BOVINE_MAJOR':
                return 'Bovino Mayor';
            case 'PORCINE_MINOR':
                return 'Porcino Menor';
            case 'MIXED':
                return 'Mixto';
            default:
                return type;
        }
    }

    getActiveInscriptions(): any[] {
        return (
            this.introducer.inscriptionPayments?.filter(
                (p) => p.status === 'PAID'
            ) || []
        );
    }

    getPendingInscriptions(): any[] {
        return (
            this.introducer.inscriptionPayments?.filter(
                (p) => p.status !== 'PAID'
            ) || []
        );
    }

    getPendingFines(): any[] {
        return (
            this.introducer.pendingFines?.filter(
                (f) => f.status === 'PENDING'
            ) || []
        );
    }

    editIntroducer(): void {
        this.router.navigate([
            '/zoosanitario/introducers/edit',
            this.introducerId,
        ]);
    }

    renewCard(): void {
        this.confirmationService.confirm({
            message: '¿Está seguro de renovar el carnet de identificación?',
            header: 'Confirmar Renovación',
            icon: 'pi pi-refresh',
            accept: () => {
                this.introducerService.renewCard(this.introducerId).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: 'Carnet renovado correctamente',
                        });
                        this.loadIntroducer();
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

    openFineDialog(): void {
        this.newFine = { type: '', amount: 0, reason: '' };
        this.showFineDialog = true;
    }

    applyFine(): void {
        if (
            !this.newFine.type ||
            !this.newFine.amount ||
            !this.newFine.reason
        ) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Atención',
                detail: 'Complete todos los campos',
            });
            return;
        }

        this.introducerService
            .applyFine(this.introducerId, this.newFine)
            .subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Multa aplicada correctamente',
                    });
                    this.showFineDialog = false;
                    this.loadIntroducer();
                },
                error: (error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: error.message,
                    });
                },
            });
    }

    openPaymentDialog(): void {
        this.newPayment = {
            year: new Date().getFullYear(),
            amount: 0,
            paymentMethod: 'CASH',
            receiptNumber: '',
        };
        this.showPaymentDialog = true;
    }

    processPayment(): void {
        this.introducerService
            .processInscriptionPayment(this.introducerId, this.newPayment)
            .subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Pago procesado correctamente',
                    });
                    this.showPaymentDialog = false;
                    this.loadIntroducer();
                },
                error: (error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: error.message,
                    });
                },
            });
    }

    payFine(fine: any): void {
        this.confirmationService.confirm({
            message: `¿Confirma el pago de la multa por $${fine.amount}?`,
            header: 'Confirmar Pago',
            icon: 'pi pi-dollar',
            accept: () => {
                const payment = {
                    amount: fine.amount,
                    paymentMethod: 'CASH',
                    receiptNumber: '',
                };

                this.introducerService
                    .payFine(this.introducerId, fine._id, payment)
                    .subscribe({
                        next: () => {
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Éxito',
                                detail: 'Multa pagada correctamente',
                            });
                            this.loadIntroducer();
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

    goBack(): void {
        this.router.navigate(['/zoosanitario/introducers']);
    }
}
