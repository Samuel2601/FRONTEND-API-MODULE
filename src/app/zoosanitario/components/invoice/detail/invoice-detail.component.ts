// src/app/demo/components/invoice/invoice-detail/invoice-detail.component.ts

import {
    Component,
    HostListener,
    OnDestroy,
    OnInit,
    signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Invoice } from '../../../interfaces/invoice.interface';
import { InvoiceService } from '../../../services/invoice.service';
import { OracleService } from 'src/app/zoosanitario/services/oracle.service';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { ImportsModule } from 'src/app/demo/services/import';
import { OracleCredentialsManagerService } from 'src/app/zoosanitario/services/oracle-credentials-manager.service';
import { OracleCredentialsDialogComponent } from '../../config/oracle-credendials/oracle-credentials-dialog-component';
import { Subject, takeUntil } from 'rxjs';

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
    imports: [ImportsModule, OracleCredentialsDialogComponent],
    providers: [MessageService, ConfirmationService],
    templateUrl: './invoice-detail.component.html',
    styleUrls: ['./invoice-detail.component.scss'],
})
export class InvoiceDetailComponent implements OnInit, OnDestroy {
    invoice = signal<Invoice | null>(null);
    loading = signal(true);
    invoiceId: string = '';

    // Estados para acciones
    processingAction = signal(false);
    refreshing = signal(false);
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
        private oracleCredentialsManager: OracleCredentialsManagerService
    ) {
        this.checkScreenSize();
    }

    private destroy$ = new Subject<void>();

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    showCredentialsDialogFlag = false;

    private subscribeToCredentialsDialog() {
        // Suscribirse al estado del diálogo de credenciales
        this.oracleCredentialsManager.showCredentialsDialog$
            .pipe(takeUntil(this.destroy$))
            .subscribe((show) => {
                this.showCredentialsDialogFlag = show;
            });
    }

    onCredentialsConfigured() {
        this.oracleCredentialsManager.notifyCredentialsConfigured();
        this.messageService.add({
            severity: 'success',
            summary: 'Credenciales Configuradas',
            detail: 'Las credenciales de Oracle han sido configuradas exitosamente.',
            life: 3000,
        });
    }

    onCredentialsCancelled() {
        this.oracleCredentialsManager.notifyCredentialsCancelled();
        this.messageService.add({
            severity: 'info',
            summary: 'Configuración Cancelada',
            detail: 'La configuración de credenciales ha sido cancelada.',
            life: 3000,
        });
    }

    // Método para mostrar manualmente el diálogo de credenciales
    showCredentialsDialog() {
        this.oracleCredentialsManager.showCredentialsDialog();
    }

    // Señal para controlar el layout del timeline
    timelineLayout = signal<'horizontal' | 'vertical'>('horizontal');
    timelineAlign = signal<'left' | 'right' | 'alternate' | 'top' | 'bottom'>(
        'alternate'
    );

    @HostListener('window:resize', ['$event'])
    onResize(event: any) {
        this.checkScreenSize();
    }

    private checkScreenSize() {
        const width = window.innerWidth;

        if (width < 992) {
            // Breakpoint para tablet y móvil
            this.timelineLayout.set('vertical');
            this.timelineAlign.set('left');
        } else {
            this.timelineLayout.set('vertical');
            this.timelineAlign.set('alternate');
        }
    }

    ngOnInit() {
        this.invoiceId = this.route.snapshot.paramMap.get('id') || '';
        if (this.invoiceId) {
            this.loadInvoice();
        }

        this.subscribeToCredentialsDialog();
    }

    loadInvoice(forceRefresh: boolean = false) {
        this.loading.set(true);
        // Si es refresh forzado, limpiar el cache específico de esta factura
        if (forceRefresh) {
            this.invoiceService['cacheService'].remove(
                `invoices_${this.invoiceId}`
            );
            this.refreshing.set(true);
        }

        this.invoiceService.getById(this.invoiceId).subscribe({
            next: (response: any) => {
                console.log('Invoice data loaded:', response);
                const invoice = response.data || response;
                this.invoice.set(invoice);
                this.buildTimeline(invoice);
                this.loading.set(false);
                this.refreshing.set(false);

                if (forceRefresh) {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Actualizado',
                        detail: 'Datos de la proforma actualizados correctamente',
                        life: 3000,
                    });
                }
            },
            error: (error) => {
                console.error('Error al cargar factura:', error);
                this.loading.set(false);
                this.refreshing.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo cargar la factura',
                    life: 5000,
                });
                this.router.navigate(['/zoosanitario/invoices']);
            },
        });
    }

    calculateInvoice() {
        this.confirmationService.confirm({
            message:
                '¿Está seguro de calcular el total de items de la factura?',
            header: 'Calcular Total de Items',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, Calcular',
            rejectLabel: 'Cancelar',
            accept: () => {
                this.processingAction.set(true);
                this.oracleService.calculateInvoice(this.invoiceId!).subscribe({
                    next: (response: any) => {
                        console.log('Total calculado:', response);
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: 'Total calculado correctamente',
                            life: 5000,
                        });
                        this.loadInvoice(true);
                    },
                    error: (error) => {
                        console.error('Error al calcular total:', error);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Error al calcular el total',
                            life: 5000,
                        });
                        this.processingAction.set(false);
                    },
                });
            },
        });
    }

    refreshInvoice() {
        this.loadInvoice(true);
    }

    buildTimeline(invoice: Invoice) {
        const events: InvoiceEvent[] = [];

        // Evento de creación
        events.push({
            status: 'Creada',
            date: invoice.createdAt as string,
            icon: 'pi pi-file-plus',
            color: '#607D8B',
            description: 'Proforma generada en el sistema',
        });

        // Evento de emisión
        if (invoice.status !== 'Generated') {
            events.push({
                status: 'Emitida',
                date: invoice.issueDate as string,
                icon: 'pi pi-send',
                color: '#2196F3',
                description: 'Proforma emitida al introductor',
            });
        }

        // Evento de integración Oracle
        if (invoice.oracleIntegration?.titleNumber) {
            const isSimulation = invoice.oracleIntegration.simulation;
            events.push({
                status: isSimulation
                    ? 'Simulación Oracle'
                    : 'Integrada con Oracle',
                date: invoice.issueDate || invoice.oracleIntegration.syncDate,
                icon: isSimulation ? 'pi pi-code' : 'pi pi-database',
                color: isSimulation ? '#9C27B0' : '#FF9800',
                description: `Título Oracle: ${
                    invoice.oracleIntegration.titleNumber
                }${isSimulation ? ' (Simulación)' : ''}`,
            });
        }

        // Evento de pago
        if (invoice.status === 'Paid') {
            events.push({
                status: 'Pagada',
                date: invoice.payDate as string,
                icon: 'pi pi-check-circle',
                color: '#4CAF50',
                description: 'Pago confirmado y registrado',
            });
        }

        // Evento de cancelación
        if (invoice.status === 'Cancelled') {
            events.push({
                status: 'Cancelada',
                date: invoice.updatedAt as string,
                icon: 'pi pi-times-circle',
                color: '#F44336',
                description: 'Proforma cancelada',
            });
        }

        this.invoiceEvents.set(events);

        console.log('Invoice events:', events);
    }

    back() {
        this.router.navigate(['/zoosanitario/invoices']);
    }

    // Método issueInvoice() actualizado en invoice-detail.component.ts

    issueInvoice() {
        this.confirmationService.confirm({
            message:
                '¿Está seguro de emitir esta proforma? Una vez emitida no podrá ser modificada.',
            header: 'Confirmar Emisión',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, Emitir',
            rejectLabel: 'Cancelar',
            accept: () => {
                this.processingAction.set(true);

                // USAR EL CREDENTIALS MANAGER para manejar automáticamente las credenciales
                this.oracleCredentialsManager
                    .executeWithCredentials(() =>
                        this.oracleService.createInvoiceEmiaut(this.invoiceId)
                    )
                    .pipe(
                        takeUntil(this.destroy$) // Para evitar memory leaks
                    )
                    .subscribe({
                        next: (response: any) => {
                            console.log('Oracle emission response:', response);
                            if (response.success !== false) {
                                this.messageService.add({
                                    severity: 'success',
                                    summary: 'Éxito',
                                    detail: 'Proforma emitida correctamente en Oracle',
                                    life: 5000,
                                });
                                // Forzar recarga para obtener datos actualizados
                                this.loadInvoice(true);
                            } else {
                                this.messageService.add({
                                    severity: 'error',
                                    summary: 'Error',
                                    detail:
                                        response.message ||
                                        'Error al emitir la proforma',
                                    life: 5000,
                                });
                            }
                            this.processingAction.set(false);
                        },
                        error: (error) => {
                            console.error('Oracle emission error:', error);

                            // El credentials manager ya manejó el error de credenciales
                            // Solo manejamos otros tipos de errores aquí
                            if (!error.needsCredentials) {
                                this.messageService.add({
                                    severity: 'error',
                                    summary: 'Error',
                                    detail:
                                        error.error?.message ||
                                        'Error al emitir la proforma en Oracle',
                                    life: 5000,
                                });
                                this.processingAction.set(false);
                            }
                            // Si error.needsCredentials es true, el diálogo ya se mostró automáticamente
                            // y cuando se configuren las credenciales, se reintentará automáticamente
                        },
                    });
            },
        });
    }

    // MÉTODO ACTUALIZADO: Verificar pago en Oracle en lugar de marcado manual
    checkPaymentInOracle() {
        this.confirmationService.confirm({
            message:
                '¿Desea verificar en Oracle si esta proforma ha sido pagada?',
            header: 'Verificar Pago en Oracle',
            icon: 'pi pi-search',
            acceptLabel: 'Sí, Verificar',
            rejectLabel: 'Cancelar',
            accept: () => {
                this.processingAction.set(true);

                this.messageService.add({
                    severity: 'info',
                    summary: 'Consultando Oracle...',
                    detail: 'Verificando estado de pago en el sistema Oracle',
                    life: 3000,
                });

                this.oracleService
                    .checkPaymentStatusUpdated(this.invoiceId)
                    .subscribe({
                        next: (response: any) => {
                            console.log(
                                'Oracle payment status response:',
                                response
                            );

                            if (response.success) {
                                const invoiceData = response.data?.invoice;
                                const statusChanged =
                                    response.data?.statusChanged;

                                if (invoiceData?.status === 'Paid') {
                                    // La factura está pagada en Oracle
                                    this.messageService.add({
                                        severity: 'success',
                                        summary: 'Pago Confirmado',
                                        detail: `La proforma ha sido pagada en Oracle. Fecha de pago: ${new Date(
                                            invoiceData.payDate
                                        ).toLocaleDateString('es-EC')}`,
                                        life: 5000,
                                    });

                                    // Recargar los datos de la factura desde la base de datos
                                    this.loadInvoice(true);
                                } else {
                                    // La factura aún no está pagada
                                    this.messageService.add({
                                        severity: 'warn',
                                        summary: 'Pago Pendiente',
                                        detail: 'La proforma aún no ha sido pagada según Oracle',
                                        life: 5000,
                                    });
                                }

                                if (statusChanged) {
                                    this.messageService.add({
                                        severity: 'info',
                                        summary: 'Estado Actualizado',
                                        detail: 'El estado de la proforma se ha sincronizado con Oracle',
                                        life: 3000,
                                    });
                                }
                            } else {
                                this.messageService.add({
                                    severity: 'error',
                                    summary: 'Error de Consulta',
                                    detail:
                                        response.message ||
                                        'Error al consultar el estado en Oracle',
                                    life: 5000,
                                });
                            }
                            this.processingAction.set(false);
                        },
                        error: (error) => {
                            console.error(
                                'Error al verificar pago en Oracle:',
                                error
                            );
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error de Conexión',
                                detail: 'No se pudo conectar con Oracle para verificar el pago',
                                life: 5000,
                            });
                            this.processingAction.set(false);
                        },
                    });
            },
        });
    }

    cancelInvoice() {
        this.confirmationService.confirm({
            message:
                '¿Está seguro de cancelar esta proforma? Esta acción no se puede deshacer.',
            header: 'Cancelar Proforma',
            icon: 'pi pi-times-circle',
            acceptButtonStyleClass: 'p-button-danger',
            acceptLabel: 'Sí, Cancelar',
            rejectLabel: 'No',
            accept: () => {
                this.processingAction.set(true);
                this.invoiceService.cancelInvoice(this.invoiceId).subscribe({
                    next: (response: any) => {
                        if (response.success !== false) {
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Éxito',
                                detail: 'Proforma cancelada correctamente',
                                life: 5000,
                            });
                            this.loadInvoice(true);
                        } else {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail:
                                    response.message ||
                                    'Error al cancelar la proforma',
                                life: 5000,
                            });
                        }
                        this.processingAction.set(false);
                    },
                    error: (error) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Error al cancelar la proforma',
                            life: 5000,
                        });
                        this.processingAction.set(false);
                    },
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
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Proforma integrada con Oracle correctamente',
                        life: 5000,
                    });
                    this.showOracleDialog = false;
                    this.loadInvoice(true);
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail:
                            response.message || 'Error al integrar con Oracle',
                        life: 5000,
                    });
                }
                this.processingAction.set(false);
            },
            error: (error) => {
                console.error('Error de integración Oracle:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al conectar con Oracle',
                    life: 5000,
                });
                this.processingAction.set(false);
            },
        });
    }

    // Métodos auxiliares para mostrar información de Oracle
    isOracleIntegrated(): boolean {
        const invoice = this.invoice();
        return !!invoice?.oracleIntegration?.titleNumber;
    }

    getOracleStatusSeverity(): 'success' | 'warning' | 'info' | 'secondary' {
        const invoice = this.invoice();
        if (!invoice?.oracleIntegration?.titleNumber) return 'secondary';

        if (invoice.oracleIntegration.simulation) return 'warning';

        const syncStatus = invoice.oracleIntegration.syncStatus;
        switch (syncStatus) {
            case 'SYNCED':
                return 'success';
            case 'PENDING':
                return 'warning';
            case 'ERROR':
                return 'warning';
            default:
                return 'info';
        }
    }

    getOracleStatusLabel(): string {
        const invoice = this.invoice();
        if (!invoice?.oracleIntegration?.titleNumber) return 'No Integrado';

        if (invoice.oracleIntegration.simulation) return 'Simulación';

        const syncStatus = invoice.oracleIntegration.syncStatus;
        switch (syncStatus) {
            case 'SYNCED':
                return 'Sincronizado';
            case 'PENDING':
                return 'Pendiente';
            case 'ERROR':
                return 'Error';
            default:
                return 'Integrado';
        }
    }

    async downloadPDF() {
        const invoice = this.invoice();
        if (!invoice) return;

        try {
            this.processingAction.set(true);

            this.messageService.add({
                severity: 'info',
                summary: 'Descargando...',
                detail: 'Generando archivo PDF',
                life: 3000,
            });

            const blob = await this.invoiceService
                .downloadInvoicePDF(this.invoiceId)
                .toPromise();

            if (!blob) {
                throw new Error('No se pudo generar el PDF');
            }

            const fileName = `proforma_${invoice.invoiceNumber}.pdf`;

            if (Capacitor.isNativePlatform()) {
                // Plataforma móvil
                const reader = new FileReader();
                reader.onloadend = async () => {
                    try {
                        const base64Data = (reader.result as string).split(
                            ','
                        )[1];

                        const result = await Filesystem.writeFile({
                            path: fileName,
                            data: base64Data,
                            directory: Directory.Documents,
                            recursive: true,
                        });

                        await Share.share({
                            title: `Proforma ${invoice.invoiceNumber}`,
                            text: `Proforma ${invoice.invoiceNumber} - ${invoice.introducer?.name}`,
                            url: result.uri,
                            dialogTitle: 'Compartir Proforma',
                        });

                        this.messageService.add({
                            severity: 'success',
                            summary: 'Descarga Exitosa',
                            detail: 'PDF generado y guardado correctamente',
                            life: 5000,
                        });
                    } catch (error) {
                        console.error('Error al guardar PDF:', error);
                        throw error;
                    }
                };
                reader.onerror = () => {
                    throw new Error('Error al procesar el archivo');
                };
                reader.readAsDataURL(blob);
            } else {
                // Plataforma web
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                link.style.display = 'none';

                document.body.appendChild(link);
                link.click();

                // Limpiar después de un momento
                setTimeout(() => {
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                }, 100);

                this.messageService.add({
                    severity: 'success',
                    summary: 'Descarga Iniciada',
                    detail: 'El archivo se ha descargado correctamente',
                    life: 5000,
                });
            }
        } catch (error) {
            console.error('Error al descargar PDF:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error de Descarga',
                detail: 'No se pudo descargar el archivo PDF. Inténtelo nuevamente.',
                life: 5000,
            });
        } finally {
            this.processingAction.set(false);
        }
    }

    async printInvoice() {
        const invoice = this.invoice();
        if (!invoice) return;

        try {
            this.processingAction.set(true);

            this.messageService.add({
                severity: 'info',
                summary: 'Preparando Impresión...',
                detail: 'Generando documento para imprimir',
                life: 3000,
            });

            if (Capacitor.isNativePlatform()) {
                // En dispositivos móviles, usar el PDF para imprimir
                const blob = await this.invoiceService
                    .downloadInvoicePDF(this.invoiceId)
                    .toPromise();

                if (!blob) {
                    throw new Error('No se pudo generar el PDF para imprimir');
                }

                const reader = new FileReader();
                reader.onloadend = async () => {
                    try {
                        const base64Data = reader.result as string;

                        // En dispositivos móviles, esto abrirá las opciones de compartir
                        // donde el usuario puede seleccionar imprimir
                        await Share.share({
                            title: `Imprimir Proforma ${invoice.invoiceNumber}`,
                            text: `Proforma ${invoice.invoiceNumber}`,
                            url: base64Data,
                            dialogTitle: 'Imprimir Proforma',
                        });

                        this.messageService.add({
                            severity: 'success',
                            summary: 'Listo para Imprimir',
                            detail: 'Seleccione la opción de imprimir desde el menú',
                            life: 5000,
                        });
                    } catch (error) {
                        throw new Error('Error al preparar la impresión');
                    }
                };
                reader.readAsDataURL(blob);
            } else {
                // En navegadores web
                const blob = await this.invoiceService
                    .downloadInvoicePDF(this.invoiceId)
                    .toPromise();

                if (!blob) {
                    throw new Error('No se pudo generar el PDF para imprimir');
                }

                const url = window.URL.createObjectURL(blob);
                const printWindow = window.open(url, '_blank');

                if (printWindow) {
                    printWindow.onload = () => {
                        printWindow.print();
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Impresión Iniciada',
                            detail: 'Se ha abierto el diálogo de impresión',
                            life: 5000,
                        });
                    };
                } else {
                    // Fallback: crear link de descarga para imprimir
                    const link = document.createElement('a');
                    link.href = url;
                    link.target = '_blank';
                    link.click();
                    window.URL.revokeObjectURL(url);

                    this.messageService.add({
                        severity: 'info',
                        summary: 'PDF Abierto',
                        detail: 'Use Ctrl+P para imprimir el documento',
                        life: 5000,
                    });
                }
            }
        } catch (error) {
            console.error('Error al imprimir:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error de Impresión',
                detail: 'No se pudo preparar el documento para imprimir',
                life: 5000,
            });
        } finally {
            this.processingAction.set(false);
        }
    }

    async shareInvoice() {
        const invoice = this.invoice();
        if (!invoice) return;

        try {
            this.processingAction.set(true);

            const shareText = this.generateShareText(invoice);

            if (Capacitor.isNativePlatform()) {
                // Dispositivos móviles - usar Share API nativo
                await Share.share({
                    title: `Proforma ${invoice.invoiceNumber}`,
                    text: shareText,
                    dialogTitle: 'Compartir Proforma',
                });

                this.messageService.add({
                    severity: 'success',
                    summary: 'Compartido',
                    detail: 'Proforma compartida exitosamente',
                    life: 3000,
                });
            } else {
                // Navegadores web
                if (navigator.share) {
                    // Usar Web Share API si está disponible
                    await navigator.share({
                        title: `Proforma ${invoice.invoiceNumber}`,
                        text: shareText,
                    });

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Compartido',
                        detail: 'Proforma compartida exitosamente',
                        life: 3000,
                    });
                } else {
                    // Fallback: copiar al portapapeles
                    await navigator.clipboard.writeText(shareText);

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Copiado',
                        detail: 'Información de la proforma copiada al portapapeles',
                        life: 5000,
                    });
                }
            }
        } catch (error) {
            console.error('Error al compartir:', error);

            // Fallback: mostrar dialog con la información
            this.showShareDialog(invoice);
        } finally {
            this.processingAction.set(false);
        }
    }

    private generateShareText(invoice: Invoice): string {
        const total = invoice.totalAmount?.toFixed(2) || '0.00';
        const status = this.getStatusLabel(invoice.status);
        const date = new Date(invoice.issueDate).toLocaleDateString('es-EC');

        return `🧾 Proforma ${invoice.invoiceNumber}
        👤 Introductor: ${invoice.introducer?.name || 'N/A'}
        📅 Fecha: ${date}
        💰 Total: $${total}
        📊 Estado: ${status}

        Generado desde el Sistema de Gestión Zoosanitaria`;
    }

    private showShareDialog(invoice: Invoice) {
        const shareText = this.generateShareText(invoice);

        this.confirmationService.confirm({
            message: shareText,
            header: 'Información de la Proforma',
            icon: 'pi pi-share-alt',
            acceptLabel: 'Copiar',
            rejectLabel: 'Cerrar',
            accept: () => {
                navigator.clipboard.writeText(shareText).then(() => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Copiado',
                        detail: 'Información copiada al portapapeles',
                        life: 3000,
                    });
                });
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

    getItemTotal(item: any): number {
        return (item.quantity || 0) * (item.unitPrice || 0);
    }
}
