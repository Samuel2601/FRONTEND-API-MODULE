// src/app/demo/components/invoice/invoice-list/invoice-list.component.ts

import {
    Component,
    OnInit,
    ViewChild,
    signal,
    computed,
    OnDestroy,
} from '@angular/core';
import { Router } from '@angular/router';
import { Table } from 'primeng/table';

import { ConfirmationService, MessageService, MenuItem } from 'primeng/api';
import { Invoice, InvoiceFilters } from '../../../interfaces/invoice.interface';
import { InvoiceService } from '../../../services/invoice.service';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { ImportsModule } from 'src/app/demo/services/import';
import { OracleService } from 'src/app/zoosanitario/services/oracle.service';
import { InvoiceDetailComponent } from '../detail/invoice-detail.component';

@Component({
    selector: 'app-invoice-list',
    standalone: true,
    imports: [ImportsModule],
    providers: [ConfirmationService, MessageService],
    templateUrl: './invoice-list.component.html',
    styleUrls: ['./invoice-list.component.scss'],
})
export class InvoiceListComponent implements OnInit, OnDestroy {
    @ViewChild('dt') table!: Table;

    // Signals for reactive state
    loading = signal(false);
    invoices = signal<Invoice[]>([]);
    totalRecords = signal(0);
    selectedInvoices = signal<Invoice[]>([]);

    // Filters
    filters: any = {};
    searchTerm = '';
    dateRange: Date[] = [];

    // Pagination
    first = 0;
    rows = 10;

    // Status options
    statusOptions = [
        { label: 'Todos', value: null },
        { label: 'Generada', value: 'Generated' },
        { label: 'Emitida', value: 'Issued' },
        { label: 'Pagada', value: 'Paid' },
        { label: 'Cancelada', value: 'Cancelled' },
    ];

    // Search with debounce
    private searchSubject = new Subject<string>();
    private destroy$ = new Subject<void>();

    // Action menu
    actionMenuItems: MenuItem[] = [];

    // Dialog states
    showOracleDialog = false;
    processingOracle = false;
    selectedInvoiceForOracle: Invoice | null = null;

    constructor(
        private invoiceService: InvoiceService,
        private oracleService: OracleService,
        private router: Router,
        private confirmationService: ConfirmationService,
        private messageService: MessageService
    ) {
        // Configure search with debounce
        this.searchSubject
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe((searchTerm) => {
                this.filters.invoiceNumber = searchTerm || undefined;
                this.loadInvoices();
            });
    }

    ngOnInit() {
        this.loadInvoices();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadInvoices() {
        this.loading.set(true);
        const page = this.first / this.rows + 1;

        this.invoiceService
            .getInvoices(this.filters, { page, limit: this.rows }, false)
            .subscribe({
                next: (response: any) => {
                    response = response.data;
                    console.log('Respuesta:', response);
                    this.invoices.set(response.docs);
                    this.totalRecords.set(response.totalDocs);
                    this.loading.set(false);
                },
                error: (error) => {
                    console.error('Error loading invoices:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cargar facturas',
                    });
                    this.loading.set(false);
                },
            });
    }

    onPageChange(event: any) {
        this.first = event.first;
        this.rows = event.rows;
        this.loadInvoices();
    }

    onSearch(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.searchSubject.next(value);
    }

    onDateRangeChange() {
        if (this.dateRange && this.dateRange.length === 2) {
            this.filters.dateFrom = this.dateRange[0];
            this.filters.dateTo = this.dateRange[1];
        } else {
            this.filters.dateFrom = undefined;
            this.filters.dateTo = undefined;
        }
        this.loadInvoices();
    }

    onStatusChange(status: string | null) {
        this.filters.status = status || undefined;
        this.loadInvoices();
    }

    clearFilters() {
        this.filters = {};
        this.searchTerm = '';
        this.dateRange = [];
        this.table.clear();
        this.loadInvoices();
    }

    viewInvoice(invoice: Invoice) {
        this.router.navigate(['/zoosanitario/invoices/view', invoice._id]);
    }

    editInvoice(invoice: Invoice) {
        if (invoice.status !== 'Generated') {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Solo se pueden editar facturas en estado Generada',
            });
            return;
        }
        this.router.navigate(['/invoices/edit', invoice._id]);
    }

    issueInvoice(invoice: Invoice) {
        this.confirmationService.confirm({
            message: '¿Está seguro de emitir esta factura?',
            header: 'Confirmar Emisión',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.loading.set(true);
                this.invoiceService.issueInvoice(invoice._id!).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: 'Factura emitida correctamente',
                        });
                        this.loadInvoices();
                    },
                    error: (error) => {
                        console.error('Error issuing invoice:', error);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Error al emitir la factura',
                        });
                        this.loading.set(false);
                    },
                });
            },
        });
    }

    markAsPaid(invoice: Invoice) {
        this.confirmationService.confirm({
            message: '¿Confirma que esta factura ha sido pagada?',
            header: 'Marcar como Pagada',
            icon: 'pi pi-check-circle',
            accept: () => {
                this.loading.set(true);
                this.invoiceService.markAsPaid(invoice._id!).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: 'Factura marcada como pagada',
                        });
                        this.loadInvoices();
                    },
                    error: (error) => {
                        console.error('Error marking invoice as paid:', error);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Error al marcar la factura como pagada',
                        });
                        this.loading.set(false);
                    },
                });
            },
        });
    }

    cancelInvoice(invoice: Invoice) {
        this.confirmationService.confirm({
            message:
                '¿Está seguro de cancelar esta factura? Esta acción no se puede deshacer.',
            header: 'Cancelar Factura',
            icon: 'pi pi-times-circle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.loading.set(true);
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
                        console.error('Error canceling invoice:', error);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Error al cancelar la factura',
                        });
                        this.loading.set(false);
                    },
                });
            },
        });
    }

    async downloadPDF(invoice: Invoice) {
        try {
            this.loading.set(true);
            const blob = await this.invoiceService
                .downloadInvoicePDF(invoice._id!)
                .toPromise();

            if (!blob) {
                throw new Error('No PDF data received');
            }

            if (Capacitor.isNativePlatform()) {
                // On mobile - save and share
                const fileName = `factura_${invoice.invoiceNumber}.pdf`;
                const base64Data = await this.blobToBase64(blob);

                // Write the file
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Documents,
                    recursive: true,
                });

                // Share the file
                await Share.share({
                    title: `Factura ${invoice.invoiceNumber}`,
                    url: result.uri,
                    dialogTitle: 'Compartir Factura',
                });
            } else {
                // On web - download directly
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `factura_${invoice.invoiceNumber}.pdf`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
            }
        } catch (error) {
            console.error('Error downloading PDF:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al descargar el PDF',
            });
        } finally {
            this.loading.set(false);
        }
    }

    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    showActionMenu(event: Event, invoice: Invoice, menu: any) {
        this.actionMenuItems = this.getActionMenuItems(invoice);
        menu.toggle(event);
    }

    getActionMenuItems(invoice: Invoice): MenuItem[] {
        const items: MenuItem[] = [
            {
                label: 'Ver Detalles',
                icon: 'pi pi-eye',
                command: () => this.viewInvoice(invoice),
            },
            {
                label: 'Descargar PDF',
                icon: 'pi pi-download',
                command: () => this.downloadPDF(invoice),
            },
        ];

        if (invoice.status === 'Generated') {
            items.push(
                {
                    label: 'Editar',
                    icon: 'pi pi-pencil',
                    command: () => this.editInvoice(invoice),
                },
                {
                    separator: true,
                },
                {
                    label: 'Emitir Factura',
                    icon: 'pi pi-send',
                    command: () => this.issueInvoice(invoice),
                }
            );
        }

        if (invoice.status === 'Issued') {
            items.push(
                {
                    separator: true,
                },
                {
                    label: 'Marcar como Pagada',
                    icon: 'pi pi-check',
                    command: () => this.markAsPaid(invoice),
                },
                {
                    label: 'Emitir en Oracle',
                    icon: 'pi pi-database',
                    command: () => this.showOracleIntegration(invoice),
                }
            );
        }

        if (invoice.status !== 'Cancelled' && invoice.status !== 'Paid') {
            items.push(
                {
                    separator: true,
                },
                {
                    label: 'Cancelar Factura',
                    icon: 'pi pi-times',
                    command: () => this.cancelInvoice(invoice),
                    styleClass: 'text-red-500',
                }
            );
        }

        return items;
    }

    showOracleIntegration(invoice: Invoice) {
        this.selectedInvoiceForOracle = invoice;
        this.showOracleDialog = true;
    }

    processOracleIntegration() {
        if (!this.selectedInvoiceForOracle) return;

        this.processingOracle = true;
        this.oracleService
            .createInvoiceEmiaut(this.selectedInvoiceForOracle._id!)
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: 'Factura emitida en Oracle correctamente',
                        });
                        this.showOracleDialog = false;
                        this.loadInvoices();
                    } else {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail:
                                response.message || 'Error al emitir en Oracle',
                        });
                    }
                    this.processingOracle = false;
                },
                error: (error) => {
                    console.error('Oracle integration error:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al conectar con Oracle',
                    });
                    this.processingOracle = false;
                },
            });
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

    async exportExcel() {
        try {
            this.loading.set(true);
            const { utils, write } = await import('xlsx');

            const worksheet = utils.json_to_sheet(this.invoices());
            const workbook = {
                Sheets: { data: worksheet },
                SheetNames: ['data'],
            };
            const excelBuffer = write(workbook, {
                bookType: 'xlsx',
                type: 'array',
            });
            this.saveAsExcelFile(excelBuffer, 'facturas');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al exportar a Excel',
            });
        } finally {
            this.loading.set(false);
        }
    }

    private saveAsExcelFile(buffer: any, fileName: string): void {
        const data = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}_${new Date().getTime()}.xlsx`;
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);
    }

    hasNonIssuedSelected(): boolean {
        return (
            this.selectedInvoices &&
            this.selectedInvoices().some((inv: any) => inv.status !== 'Issued')
        );
    }

    syncSelectedWithOracle() {
        if (!this.selectedInvoices().length) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Seleccione una o más facturas para sincronizar',
            });
            return;
        }

        this.processingOracle = true;
        this.oracleService
            .syncInvoicesBatch(this.selectedInvoices().map((inv) => inv._id!))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: 'Facturas sincronizadas correctamente',
                        });
                        this.loadInvoices();
                    } else {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: response.message || 'Error al sincronizar',
                        });
                    }
                    this.processingOracle = false;
                },
                error: (error) => {
                    console.error('Error syncing invoices:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al sincronizar facturas',
                    });
                    this.processingOracle = false;
                },
            });
    }
}
