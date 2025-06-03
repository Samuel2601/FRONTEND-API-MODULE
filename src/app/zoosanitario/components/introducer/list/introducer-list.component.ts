import { Component, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    Introducer,
    IntroducerService,
    IntroducerStatistics,
} from 'src/app/zoosanitario/services/introducer.service';

@Component({
    selector: 'app-introducer-list',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './introducer-list.component.html',
    styleUrls: ['./introducer-list.component.scss'],
    providers: [ConfirmationService, MessageService],
})
export class IntroducerListComponent implements OnInit {
    @ViewChild('dt') table!: Table;

    introducers: Introducer[] = [];
    loading = false;
    totalRecords = 0;
    statistics!: IntroducerStatistics;

    // Filtros
    searchText = '';
    selectedType: any = null;
    selectedIntroducerType: any = null;
    selectedStatus: any = null;

    // Opciones de filtros
    typeOptions = [
        { label: 'Natural', value: 'NATURAL' },
        { label: 'Jurídica', value: 'JURIDICAL' },
    ];

    introducerTypeOptions = [
        { label: 'Bovino Mayor', value: 'BOVINE_MAJOR' },
        { label: 'Porcino Menor', value: 'PORCINE_MINOR' },
        { label: 'Mixto', value: 'MIXED' },
    ];

    statusOptions = [
        { label: 'Pendiente', value: 'PENDING' },
        { label: 'Activo', value: 'ACTIVE' },
        { label: 'Suspendido', value: 'SUSPENDED' },
        { label: 'Expirado', value: 'EXPIRED' },
    ];

    constructor(
        private introducerService: IntroducerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.loadIntroducers();
        this.loadStatistics();
    }

    loadIntroducers(event?: any): void {
        this.loading = true;

        const params = {
            query: this.searchText,
            type: this.selectedType,
            introducerType: this.selectedIntroducerType,
            registrationStatus: this.selectedStatus,
            page: event ? event.first / event.rows + 1 : 1,
            limit: event?.rows || 10,
        };

        this.introducerService.searchIntroducers(params).subscribe({
            next: (response) => {
                console.log('Response:', response);
                this.introducers = response.data;
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

    loadStatistics(): void {
        this.introducerService.getStatistics().subscribe({
            next: (stats) => {
                console.log('Statistics:', stats);
                this.statistics = stats;
            },
            error: (error) => {
                console.error('Error cargando estadísticas:', error);
            },
        });
    }

    onSearch(): void {
        this.loadIntroducers();
    }

    clearFilters(): void {
        this.searchText = '';
        this.selectedType = null;
        this.selectedIntroducerType = null;
        this.selectedStatus = null;
        this.loadIntroducers();
    }

    newIntroducer(): void {
        this.router.navigate(['/zoosanitario/introducers/new']);
    }

    editIntroducer(introducer: Introducer): void {
        this.router.navigate([
            '/zoosanitario/introducers/edit',
            introducer._id,
        ]);
    }

    viewIntroducer(introducer: Introducer): void {
        this.router.navigate([
            '/zoosanitario/introducers/view',
            introducer._id,
        ]);
    }

    deleteIntroducer(introducer: Introducer): void {
        this.confirmationService.confirm({
            message: `¿Está seguro de eliminar al introductor ${this.getIntroducerName(
                introducer
            )}?`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
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
        }
        return introducer.companyName || '';
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
                return 'secondary';
            default:
                return 'info';
        }
    }

    getIntroducerTypeLabel(type: string): string {
        const option = this.introducerTypeOptions.find(
            (opt) => opt.value === type
        );
        return option?.label || type;
    }

    processInscriptionPayment(introducer: Introducer): void {
        this.router.navigate([
            '/zoosanitario/introducers/payment',
            introducer._id,
        ]);
    }
}
