// src/app/demo/components/invoice/invoice-detail/invoice-detail.component.ts

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { TimelineModule } from 'primeng/timeline';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Invoice } from '../../../interfaces/invoice.interface';
import { InvoiceService } from '../../../services/invoice.service';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Printer } from '@awesome-cordova-plugins/printer/ngx';
import { OracleService } from 'src/app/zoosanitario/services/oracle.service';

interface InvoiceEvent {
    status: string;
    date: string;
    icon: string;
    color: string;
    description?: string;
}

@Component({
    selector: 'app-invoice-detail',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        CardModule,
        DividerModule,
        TagModule,
        TableModule,
        ToastModule,
        ProgressSpinnerModule,
        ConfirmDialogModule,
        DialogModule,
        TimelineModule,
    ],
    providers: [MessageService, ConfirmationService, Printer],
    templateUrl: './invoice-detail.component.html',
    styleUrls: ['./invoice-detail.component.scss'],
})
export class InvoiceDetailComponent implements OnInit {
    invoice = signal<Invoice | null>(null);
    loading = signal(true);
    invoiceId: string = '';

    // Estados para acciones
    processingAction = signal(false);
    showOracleDialog = false;
    oracleIntegrationData: any = null;

    // Timeline de eventos
    invoiceEvents = signal<InvoiceEvent[]>([]);

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private invoiceService: InvoiceService,
        private messageService: MessageService,
        private oracleService: OracleService,
        private confirmationService: ConfirmationService,
        private printer: Printer
    ) {}

    ngOnInit() {
        this.invoiceId = this.route.snapshot.paramMap.get('id') || '';
        if (this.invoiceId) {
            this.loadInvoice();
        }
    }

    loadInvoice() {
        this.loading.set(true);
        this.invoiceService.getById(this.invoiceId).subscribe({
            next: (invoice: any) => {
                console.log('Invoice:', invoice.data);
                this.invoice.set(invoice.data);
                this.buildTimeline(invoice.data);
                this.loading.set(false);
            },
            error: (error) => {
                console.error('Error al cargar factura:', error);
                this.loading.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo cargar la factura',
                });
                //this.router.navigate(['/zoosanitario/invoices']);
            },
        });
    }

    buildTimeline(invoice: Invoice) {
        const events: InvoiceEvent[] = [];

        // Evento de creación
        events.push({
            status: 'Creada',
            date: invoice.createdAt as string,
            icon: 'pi pi-file',
            color: '#607D8B',
            description: `Factura generada`,
        });

        // Evento de emisión
        if (invoice.status !== 'Generated') {
            events.push({
                status: 'Emitida',
                date: invoice.issueDate as string,
                icon: 'pi pi-send',
                color: '#2196F3',
                description: 'Factura emitida al introductor',
            });
        }

        // Evento de integración Oracle
        if (invoice.oracleIntegration?.issued) {
            events.push({
                status: 'Oracle',
                date: invoice.oracleIntegration.issueDate,
                icon: 'pi pi-database',
                color: '#FF9800',
                description: `Título: ${invoice.oracleIntegration.titleNumber}`,
            });
        }

        // Evento de pago
        if (invoice.status === 'Paid') {
            events.push({
                status: 'Pagada',
                date: invoice.payDate as string,
                icon: 'pi pi-check-circle',
                color: '#4CAF50',
                description: 'Pago confirmado',
            });
        }

        // Evento de cancelación
        if (invoice.status === 'Cancelled') {
            events.push({
                status: 'Cancelada',
                date: invoice.updatedAt as string,
                icon: 'pi pi-times-circle',
                color: '#F44336',
                description: 'Factura cancelada',
            });
        }

        this.invoiceEvents.set(events);
    }

    back() {
        this.router.navigate(['/invoices']);
    }

    issueInvoice() {
        this.confirmationService.confirm({
            message: '¿Está seguro de emitir esta factura?',
            header: 'Confirmar Emisión',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.processingAction.set(true);
                this.invoiceService.issueInvoice(this.invoiceId).subscribe({
                    next: (response: any) => {
                        if (response.success) {
                            this.loadInvoice();
                        }
                        this.processingAction.set(false);
                    },
                    error: () => this.processingAction.set(false),
                });
            },
        });
    }

    markAsPaid() {
        this.confirmationService.confirm({
            message: '¿Confirma que esta factura ha sido pagada?',
            header: 'Marcar como Pagada',
            icon: 'pi pi-check-circle',
            accept: () => {
                this.processingAction.set(true);
                this.invoiceService.markAsPaid(this.invoiceId).subscribe({
                    next: (response: any) => {
                        if (response.success) {
                            this.loadInvoice();
                        }
                        this.processingAction.set(false);
                    },
                    error: () => this.processingAction.set(false),
                });
            },
        });
    }

    cancelInvoice() {
        this.confirmationService.confirm({
            message:
                '¿Está seguro de cancelar esta factura? Esta acción no se puede deshacer.',
            header: 'Cancelar Factura',
            icon: 'pi pi-times-circle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.processingAction.set(true);
                this.invoiceService.cancelInvoice(this.invoiceId).subscribe({
                    next: (response: any) => {
                        if (response.success) {
                            this.loadInvoice();
                        }
                        this.processingAction.set(false);
                    },
                    error: () => this.processingAction.set(false),
                });
            },
        });
    }

    showOracleIntegration() {
        this.showOracleDialog = true;
        this.checkOracleStatus();
    }

    checkOracleStatus() {
        this.oracleService.checkPaymentStatusUpdated(this.invoiceId).subscribe({
            next: (response) => {
                this.oracleIntegrationData = response.data;
            },
            error: (error) => {
                console.error('Error al verificar estado Oracle:', error);
            },
        });
    }

    processOracleIntegration() {
        this.processingAction.set(true);
        this.oracleService.createInvoiceEmiaut(this.invoiceId).subscribe({
            next: (response) => {
                if (response.success) {
                    this.showOracleDialog = false;
                    this.loadInvoice();
                }
                this.processingAction.set(false);
            },
            error: () => this.processingAction.set(false),
        });
    }

    async downloadPDF() {
        try {
            const blob = await this.invoiceService
                .downloadInvoicePDF(this.invoiceId)
                .toPromise();
            const invoice = this.invoice();

            if (Capacitor.isNativePlatform()) {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64 = reader.result as string;
                    const fileName = `factura_${invoice?.invoiceNumber}.pdf`;

                    const result = await Filesystem.writeFile({
                        path: fileName,
                        data: base64.split(',')[1],
                        directory: Directory.Documents,
                    });

                    await Share.share({
                        title: `Factura ${invoice?.invoiceNumber}`,
                        url: result.uri,
                        dialogTitle: 'Compartir Factura',
                    });
                };
                reader.readAsDataURL(blob!);
            } else {
                const url = window.URL.createObjectURL(blob!);
                const a = document.createElement('a');
                a.href = url;
                a.download = `factura_${invoice?.invoiceNumber}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al descargar el PDF',
            });
        }
    }

    async printInvoice() {
        if (Capacitor.isNativePlatform()) {
            try {
                const blob = await this.invoiceService
                    .downloadInvoicePDF(this.invoiceId)
                    .toPromise();
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64 = reader.result as string;
                    await this.printer.print(base64);
                };
                reader.readAsDataURL(blob!);
            } catch (error) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al imprimir',
                });
            }
        } else {
            window.print();
        }
    }

    shareInvoice() {
        const invoice = this.invoice();
        if (!invoice) return;

        const text =
            `Factura ${invoice.invoiceNumber}\n` +
            `Introductor: ${invoice.introducer?.name}\n` +
            `Total: $${invoice.totalAmount.toFixed(2)}\n` +
            `Estado: ${this.getStatusLabel(invoice.status)}`;

        if (Capacitor.isNativePlatform()) {
            Share.share({
                title: `Factura ${invoice.invoiceNumber}`,
                text: text,
                dialogTitle: 'Compartir Factura',
            });
        } else {
            navigator.clipboard.writeText(text);
            this.messageService.add({
                severity: 'info',
                summary: 'Copiado',
                detail: 'Información copiada al portapapeles',
            });
        }
    }

    getSeverity(
        status: string
    ): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
        switch (status) {
            case 'Generated':
                return 'secondary';
            case 'Issued':
                return 'info';
            case 'Paid':
                return 'success';
            case 'Cancelled':
                return 'danger';
            default:
                return 'secondary';
        }
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case 'Generated':
                return 'Generada';
            case 'Issued':
                return 'Emitida';
            case 'Paid':
                return 'Pagada';
            case 'Cancelled':
                return 'Cancelada';
            default:
                return status;
        }
    }

    getItemTotal(item: any): number {
        return item.quantity * item.unitPrice;
    }
}
