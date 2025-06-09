import { Component, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { ImportsModule } from 'src/app/demo/services/import';
import { IntroducerService } from 'src/app/zoosanitario/services/introducer.service';
import { Introducer } from 'src/app/zoosanitario/interfaces/slaughter.interface';
import { AnimalTypeService } from 'src/app/zoosanitario/services/animal-type.service';

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
    statistics: any = {
        total: 0,
        personTypeBreakdown: {},
        statusBreakdown: {},
        totalInvoices: 0,
        totalProcesses: 0,
        avgInvoicesPerIntroducer: 0,
        avgProcessesPerIntroducer: 0,
    };

    // Filtros
    searchText = '';
    selectedType: any = null;
    selectedIntroducerType: any = null;
    selectedStatus: any = null;

    // Opciones de filtros
    // En typeOptions
    typeOptions = [
        { label: 'Natural', value: 'Natural' }, // Cambiado de 'Natural'
        { label: 'Jurídica', value: 'Juridical' }, // Cambiado de 'JURIDICAL'
    ];

    introducerTypeOptions = [];

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
        private router: Router,
        private animalTypeService: AnimalTypeService
    ) {}

    async ngOnInit(): Promise<void> {
        this.loadIntroducers();
        this.loadStatistics();
        await this.loadAnimalTypes();
    }
    async loadAnimalTypes(): Promise<void> {
        this.animalTypeService
            .getAll({ limit: 100, fields: 'species,category', slaughter: true })
            .subscribe({
                next: (response: any) => {
                    console.log('Animal types:', response);
                    this.introducerTypeOptions = response.data.animalTypes.map(
                        (a: any) => ({
                            label: a.species + ' (' + a.category + ')',
                            value: a.id,
                        })
                    );
                },
                error: (error) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cargar tipos de animales',
                    });
                    this.loading = false;
                },
            });
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

        this.introducerService.getAll(params).subscribe({
            next: (response: any) => {
                console.log('Introducers:', response);
                this.introducers = response.data.introducers;
                this.totalRecords = response.data.totalDocs;
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

    // Métodos para calcular estadísticas y porcentajes

    getActivationRate(): number {
        if (!this.statistics?.total || this.statistics.total === 0) return 0;
        const active = this.statistics.statusBreakdown?.active || 0;
        return Math.round((active / this.statistics.total) * 100);
    }

    getPercentage(status: string): number {
        if (!this.statistics?.total || this.statistics.total === 0) return 0;
        const count = this.statistics.statusBreakdown?.[status] || 0;
        return Math.round((count / this.statistics.total) * 100);
    }

    getPersonTypePercentage(type: string): number {
        if (!this.statistics?.total || this.statistics.total === 0) return 0;
        const count = this.statistics.personTypeBreakdown?.[type] || 0;
        return Math.round((count / this.statistics.total) * 100);
    }

    getSystemHealth(): number {
        if (!this.statistics?.total || this.statistics.total === 0) return 0;

        const active = this.statistics.statusBreakdown?.active || 0;
        const pending = this.statistics.statusBreakdown?.pending || 0;
        const total = this.statistics.total;

        // Salud basada en activos (peso 70%) y pendientes que pueden activarse (peso 30%)
        const healthScore = ((active * 0.7 + pending * 0.3) / total) * 100;
        return Math.round(healthScore);
    }

    getSystemHealthClass(): string {
        const health = this.getSystemHealth();
        if (health >= 80) return 'text-green-600';
        if (health >= 60) return 'text-yellow-600';
        if (health >= 40) return 'text-orange-600';
        return 'text-red-600';
    }

    getSystemHealthText(): string {
        const health = this.getSystemHealth();
        if (health >= 80) return 'Excelente';
        if (health >= 60) return 'Bueno';
        if (health >= 40) return 'Regular';
        return 'Requiere atención';
    }

    // Métodos para indicadores booleanos
    hasActiveIntroducers(): boolean {
        return (this.statistics?.statusBreakdown?.active || 0) > 0;
    }

    hasPendingIntroducers(): boolean {
        return (this.statistics?.statusBreakdown?.pending || 0) > 0;
    }

    hasSuspendedIntroducers(): boolean {
        return (this.statistics?.statusBreakdown?.suspended || 0) > 0;
    }

    hasInvoices(): boolean {
        return (this.statistics?.totalInvoices || 0) > 0;
    }

    // Método para obtener el color del progreso por estado
    getProgressClass(status: string): string {
        switch (status) {
            case 'active':
                return 'success';
            case 'pending':
                return 'warning';
            case 'suspended':
                return 'danger';
            case 'expired':
                return 'secondary';
            default:
                return 'info';
        }
    }

    // Método para obtener estadísticas resumidas
    getStatisticsSummary(): any {
        if (!this.statistics) return null;

        return {
            activeRate: this.getActivationRate(),
            pendingRate: this.getPercentage('pending'),
            avgInvoices: +(
                this.statistics.avgInvoicesPerIntroducer || 0
            ).toFixed(1),
            avgProcesses: +(
                this.statistics.avgProcessesPerIntroducer || 0
            ).toFixed(1),
            systemHealth: this.getSystemHealth(),
            hasActivity: this.hasActiveIntroducers() || this.hasInvoices(),
        };
    }

    // Método para refrescar estadísticas
    refreshStatistics(): void {
        this.loadStatistics();
    }

    // Método mejorado para cargar estadísticas con manejo de errores
    loadStatistics(): void {
        this.introducerService.getStatistics().subscribe({
            next: (response: any) => {
                console.log('Estadísticas cargadas:', response);
                this.statistics = response.data || response;

                // Asegurar que existen todas las propiedades necesarias
                this.statistics = {
                    total: 0,
                    totalInvoices: 0,
                    totalProcesses: 0,
                    personTypeBreakdown: { natural: 0, juridica: 0 },
                    statusBreakdown: {
                        active: 0,
                        pending: 0,
                        suspended: 0,
                        expired: 0,
                    },
                    avgInvoicesPerIntroducer: 0,
                    avgProcessesPerIntroducer: 0,
                    ...this.statistics,
                };
            },
            error: (error) => {
                console.error('Error cargando estadísticas:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar estadísticas: ' + error.message,
                });

                // Estadísticas por defecto en caso de error
                this.statistics = {
                    total: 0,
                    totalInvoices: 0,
                    totalProcesses: 0,
                    personTypeBreakdown: { natural: 0, juridica: 0 },
                    statusBreakdown: {
                        active: 0,
                        pending: 0,
                        suspended: 0,
                        expired: 0,
                    },
                    avgInvoicesPerIntroducer: 0,
                    avgProcessesPerIntroducer: 0,
                };
            },
        });
    }

    // ... rest of the methods remain the same ...
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
                this.introducerService.delete(introducer._id!).subscribe({
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
        if (introducer.personType === 'Natural') {
            return introducer.name;
        }
        return introducer.companyName || 'Razón social no especificada';
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

    getIntroducerTypeLabel(cattleTypes: any[]): string {
        const types = cattleTypes.map((type) => {
            if (type.species === 'Bovino' && type.category === 'Mayor')
                return 'Bovino Mayor';
            if (type.species === 'Porcino' && type.category === 'Menor')
                return 'Porcino Menor';
            return `${type.species} ${type.category}`;
        });

        return types.length > 1 ? 'Mixto' : types[0] || 'No especificado';
    }

    processInscriptionPayment(introducer: Introducer): void {
        this.router.navigate([
            '/zoosanitario/introducers/payment',
            introducer._id,
        ]);
    }
}
