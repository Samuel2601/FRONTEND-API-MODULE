import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { MessageService, ConfirmationService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    Introducer,
    IntroducerSearchResponse,
    IntroducerService,
} from 'src/app/zoosanitario/services/introducer.service';

@Component({
    selector: 'app-introducer-list',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './introducer-list.component.html',
    styleUrls: ['./introducer-list.component.scss'],
    providers: [MessageService, ConfirmationService],
})
export class IntroducerListComponent implements OnInit {
    introducers: Introducer[] = [];
    loading = false;
    totalRecords = 0;
    page = 1;
    limit = 10;

    // Filtros
    searchQuery = '';
    selectedType = '';
    selectedIntroducerType = '';
    selectedStatus = '';

    // Opciones para dropdowns
    typeOptions = [
        { label: 'Todos', value: '' },
        { label: 'Natural', value: 'NATURAL' },
        { label: 'Jurídica', value: 'JURIDICAL' },
    ];

    introducerTypeOptions = [
        { label: 'Todos', value: '' },
        { label: 'Bovino Mayor', value: 'BOVINE_MAJOR' },
        { label: 'Porcino Menor', value: 'PORCINE_MINOR' },
        { label: 'Mixto', value: 'MIXED' },
    ];

    statusOptions = [
        { label: 'Todos', value: '' },
        { label: 'Pendiente', value: 'PENDING' },
        { label: 'Activo', value: 'ACTIVE' },
        { label: 'Suspendido', value: 'SUSPENDED' },
        { label: 'Expirado', value: 'EXPIRED' },
    ];

    constructor(
        private introducerService: IntroducerService,
        private router: Router,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit() {
        this.loadIntroducers();
    }

    loadIntroducers() {
        this.loading = true;

        const searchParams = {
            query: this.searchQuery || undefined,
            type: this.selectedType || undefined,
            introducerType: this.selectedIntroducerType || undefined,
            status: this.selectedStatus || undefined,
            page: this.page,
            limit: this.limit,
        };

        this.introducerService.searchIntroducers(searchParams).subscribe({
            next: (response: IntroducerSearchResponse) => {
                this.introducers = response.introducers;
                this.totalRecords = response.total;
                this.loading = false;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar introductores: ' + error.message,
                });
                this.loading = false;
            },
        });
    }

    onPageChange(event: any) {
        this.page = event.page + 1;
        this.limit = event.rows;
        this.loadIntroducers();
    }

    applyFilters() {
        this.page = 1;
        this.loadIntroducers();
    }

    clearFilters() {
        this.searchQuery = '';
        this.selectedType = '';
        this.selectedIntroducerType = '';
        this.selectedStatus = '';
        this.page = 1;
        this.loadIntroducers();
    }

    createIntroducer() {
        this.router.navigate(['/introducers/create']);
    }

    editIntroducer(introducer: Introducer) {
        this.router.navigate(['/introducers/edit', introducer._id]);
    }

    viewIntroducer(introducer: Introducer) {
        this.router.navigate(['/introducers/view', introducer._id]);
    }

    validateSlaughter(introducer: Introducer) {
        this.router.navigate(['/introducers/validate', introducer._id]);
    }

    deleteIntroducer(introducer: Introducer) {
        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar el introductor ${this.getIntroducerName(
                introducer
            )}?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.introducerService
                    .deleteIntroducer(introducer._id!)
                    .subscribe({
                        next: () => {
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Éxito',
                                detail: 'Introductor eliminado correctamente',
                            });
                            this.loadIntroducers();
                        },
                        error: (error) => {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail:
                                    'Error al eliminar introductor: ' +
                                    error.message,
                            });
                        },
                    });
            },
        });
    }

    getIntroducerName(introducer: Introducer): string {
        if (introducer.type === 'NATURAL') {
            return `${introducer.firstName} ${introducer.lastName}`;
        } else {
            return introducer.companyName || 'Sin nombre';
        }
    }

    getStatusSeverity(
        status: string
    ): 'success' | 'warning' | 'danger' | 'info' | 'secondary' {
        switch (status) {
            case 'ACTIVE':
                return 'success';
            case 'PENDING':
                return 'warning';
            case 'SUSPENDED':
                return 'danger';
            case 'EXPIRED':
                return 'info';
            default:
                return 'secondary';
        }
    }

    getStatusLabel(status: string): string {
        const labels: { [key: string]: string } = {
            PENDING: 'Pendiente',
            ACTIVE: 'Activo',
            SUSPENDED: 'Suspendido',
            EXPIRED: 'Expirado',
        };
        return labels[status] || status;
    }

    getTypeLabel(type: string): string {
        const labels: { [key: string]: string } = {
            NATURAL: 'Natural',
            JURIDICAL: 'Jurídica',
        };
        return labels[type] || type;
    }

    getIntroducerTypeLabel(type: string): string {
        const labels: { [key: string]: string } = {
            BOVINE_MAJOR: 'Bovino Mayor',
            PORCINE_MINOR: 'Porcino Menor',
            MIXED: 'Mixto',
        };
        return labels[type] || type;
    }
}
