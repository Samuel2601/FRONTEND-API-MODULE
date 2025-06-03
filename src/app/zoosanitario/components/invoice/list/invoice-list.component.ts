import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    Invoice,
    InvoiceService,
} from 'src/app/zoosanitario/services/invoice.service';

@Component({
    selector: 'app-invoice-list',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './invoice-list.component.html',
    styleUrls: ['./invoice-list.component.scss'],
    providers: [MessageService, ConfirmationService],
})
export class InvoiceListComponent implements OnInit {
    invoices: Invoice[] = [];
    loading = false;
    totalRecords = 0;
    page = 1;
    limit = 10;

    // Filtros
    selectedStatus = '';
    selectedType = '';
    selectedIntroducerId = '';
    invoiceNumber = '';
    dateFrom: Date | null = null;
    dateTo: Date | null = null;

    // Opciones para dropdowns
    statusOptions = [
        { label: 'Todos', value: '' },
        { label: 'Pendiente', value: 'PENDING' },
        { label: 'Pago Parcial', value: 'PARTIAL' },
        { label: 'Pagado', value: 'PAID' },
        { label: 'Vencido', value: 'OVERDUE' },
        { label: 'Cancelado', value: 'CANCELLED' },
    ];

    typeOptions = [
        { label: 'Todos', value: '' },
        { label: 'Inscripción', value: 'INSCRIPTION' },
        { label: 'Servicio de Faenamiento', value: 'SLAUGHTER_SERVICE' },
        { label: 'Servicios Adicionales', value: 'ADDITIONAL_SERVICE' },
        { label: 'Multa', value: 'FINE' },
        { label: 'Mixta', value: 'MIXED' },
    ];

    constructor(
        public invoiceService: InvoiceService,
        private router: Router,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit() {
        this.loadInvoices();
    }

    loadInvoices() {
        this.loading = true;

        const params = {
            page: this.page,
            limit: this.limit,
            status: this.selectedStatus || undefined,
            type: this.selectedType || undefined,
            introducerId: this.selectedIntroducerId || undefined,
        };

        this.invoiceService.getAllInvoices(params).subscribe({
            next: (response) => {
                this.invoices = response.invoices;
                this.totalRecords = response.total;
                this.loading = false;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar facturas: ' + error.message,
                });
                this.loading = false;
            },
        });
    }

    onPageChange(event: any) {
        this.page = event.page + 1;
        this.limit = event.rows;
        this.loadInvoices();
    }

    applyFilters() {
        this.page = 1;
        this.loadInvoices();
    }

    clearFilters() {
        this.selectedStatus = '';
        this.selectedType = '';
        this.selectedIntroducerId = '';
        this.invoiceNumber = '';
        this.dateFrom = null;
        this.dateTo = null;
        this.page = 1;
        this.loadInvoices();
    }

    searchInvoices() {
        if (!this.invoiceNumber && !this.dateFrom && !this.dateTo) {
            this.loadInvoices();
            return;
        }

        this.loading = true;
        const filters: any = {
            page: this.page,
            limit: this.limit,
        };

        if (this.invoiceNumber) filters.invoiceNumber = this.invoiceNumber;
        if (this.selectedStatus) filters.status = [this.selectedStatus];
        if (this.selectedType) filters.type = [this.selectedType];
        if (this.dateFrom) filters.dateFrom = this.dateFrom;
        if (this.dateTo) filters.dateTo = this.dateTo;

        this.invoiceService.searchInvoices(filters).subscribe({
            next: (response) => {
                console.log('Response:', response);
                this.invoices = response.invoices;
                this.totalRecords = response.total;
                this.loading = false;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error en búsqueda: ' + error.message,
                });
                this.loading = false;
            },
        });
    }

    createInvoice() {
        this.router.navigate(['/zoosanitario/invoices/create']);
    }

    viewInvoice(invoice: Invoice) {
        this.router.navigate(['/zoosanitario/invoices/view', invoice._id]);
    }

    editInvoice(invoice: Invoice) {
        if (
            invoice.paymentStatus === 'PAID' ||
            invoice.paymentStatus === 'CANCELLED'
        ) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'No se puede editar una factura pagada o cancelada',
            });
            return;
        }
        this.router.navigate(['/invoices/edit', invoice._id]);
    }

    processPayment(invoice: Invoice) {
        if (invoice.paymentStatus === 'PAID') {
            this.messageService.add({
                severity: 'info',
                summary: 'Información',
                detail: 'Esta factura ya está completamente pagada',
            });
            return;
        }
        this.router.navigate(['/invoices/payment', invoice._id]);
    }

    cancelInvoice(invoice: Invoice) {
        if (invoice.paymentStatus === 'PAID') {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'No se puede cancelar una factura pagada',
            });
            return;
        }

        this.confirmationService.confirm({
            message: `¿Está seguro de cancelar la factura ${invoice.invoiceNumber}?`,
            header: 'Confirmar Cancelación',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.invoiceService.cancelInvoice(invoice._id!).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: 'Factura cancelada correctamente',
                        });
                        this.loadInvoices();
                    },
                    error: (error) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail:
                                'Error al cancelar factura: ' + error.message,
                        });
                    },
                });
            },
        });
    }

    getStatusSeverity(
        status: string
    ): 'info' | 'success' | 'warning' | 'danger' | 'secondary' {
        switch (status) {
            case 'PAID':
                return 'success';
            case 'PENDING':
                return 'warning';
            case 'PARTIAL':
                return 'info';
            case 'OVERDUE':
                return 'danger';
            case 'CANCELLED':
                return 'secondary';
            default:
                return 'secondary';
        }
    }

    getTypeSeverity(
        type: string
    ): 'info' | 'success' | 'warning' | 'danger' | 'secondary' {
        switch (type) {
            case 'INSCRIPTION':
                return 'info';
            case 'SLAUGHTER_SERVICE':
                return 'success';
            case 'ADDITIONAL_SERVICE':
                return 'warning';
            case 'FINE':
                return 'danger';
            case 'MIXED':
                return 'secondary';
            default:
                return 'secondary';
        }
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    }

    formatDate(date: Date | string): string {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('es-EC');
    }

    getIntroducerName(invoice: Invoice): string {
        if (!invoice.introducer) return 'N/A';

        if (invoice.introducer.type === 'NATURAL') {
            return `${invoice.introducer.firstName} ${invoice.introducer.lastName}`;
        } else {
            return invoice.introducer.companyName || 'Sin nombre';
        }
    }

    getRemainingAmount(invoice: Invoice): number {
        const totalPaid =
            invoice.payments?.reduce(
                (sum, payment) => sum + payment.amount,
                0
            ) || 0;
        return invoice.totalAmount - totalPaid;
    }

    exportToExcel() {
        const params = {
            startDate:
                this.dateFrom || new Date(new Date().getFullYear(), 0, 1),
            endDate: this.dateTo || new Date(),
            format: 'excel' as const,
        };

        this.invoiceService.getInvoiceReport(params).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob as Blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `facturas_${
                    new Date().toISOString().split('T')[0]
                }.xlsx`;
                link.click();
                window.URL.revokeObjectURL(url);
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al exportar: ' + error.message,
                });
            },
        });
    }
}
