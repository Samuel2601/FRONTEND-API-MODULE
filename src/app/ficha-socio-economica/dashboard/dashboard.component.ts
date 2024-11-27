import { Component, OnInit } from '@angular/core';
import { RegistroService } from '../services/registro.service';
import { AuthService } from 'src/app/demo/services/auth.service';
import { ImportsModule } from 'src/app/demo/services/import';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
    token = this.authservice.token() || '';

    registros: any[] = [];
    filteredData: any[] = [];
    filterOptions = [
        { label: 'Sector', value: 'sector' },
        { label: 'Barrio', value: 'barrio' },
        { label: 'Estado de salud', value: 'estadoSalud' },
    ];
    selectedFilter: string | null = null;
    dateRange: Date[] | null = null;

    barChartData: any;
    lineChartData: any;
    pieChartData: any;

    columns = [
        { field: 'informacionPersonal.edad', header: 'Edad' },
        { field: 'informacionUbicacion.sector', header: 'Sector' },
        { field: 'salud.estadoSalud', header: 'Estado de salud' },
    ];

    constructor(
        private registroService: RegistroService,
        private authservice: AuthService
    ) {}

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        const select =
            'informacionRegistro,informacionPersonal,informacionUbicacion,salud,vivienda,mediosDeVida,redesDeApoyo';
        const populate = 'all';

        this.registroService
            .getRegistros(this.token, select, populate)
            .subscribe({
                next: (response) => {
                    this.registros = response.data;
                    this.filteredData = [...this.registros];
                    this.generateCharts();
                },
                error: (error) =>
                    console.error('Error al cargar registros:', error),
            });
    }

    generateCharts() {
        // Datos para gráfico de barras
        this.barChartData = {
            labels: ['Sector 1', 'Sector 2', 'Sector 3'],
            datasets: [
                {
                    label: 'Edades promedio',
                    data: this.registros.map(
                        (reg) => reg.informacionPersonal.edad
                    ),
                    backgroundColor: '#42A5F5',
                },
            ],
        };

        // Datos para gráfico de líneas
        this.lineChartData = {
            labels: ['Enero', 'Febrero', 'Marzo'],
            datasets: [
                {
                    label: 'Tendencia de ingresos',
                    data: [2000, 2500, 3000],
                    borderColor: '#66BB6A',
                },
            ],
        };

        // Datos para gráfico circular
        this.pieChartData = {
            labels: ['Con servicios básicos', 'Sin servicios básicos'],
            datasets: [
                {
                    data: [300, 50],
                    backgroundColor: ['#FFA726', '#FF7043'],
                },
            ],
        };
    }
}
