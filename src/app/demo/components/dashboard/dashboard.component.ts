import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Product } from '../../api/product';
import { Subscription, debounceTime } from 'rxjs';
import { LayoutService } from 'src/app/layout/service/app.layout.service';
import { HelperService } from '../../services/helper.service';
import { Router } from '@angular/router';

@Component({
    templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {

    items!: MenuItem[];

    products!: Product[];

    chartData: any;

    chartOptions: any;

    subscription!: Subscription;

    constructor(public layoutService: LayoutService,private helper:HelperService,private router: Router) {
        this.subscription = this.layoutService.configUpdate$
        .pipe(debounceTime(25))
        .subscribe((config) => {
            this.initChart();
        });
    }
    notifica: any = { maxbarrio: undefined,maxficha:undefined,maxfichabarrio:undefined,maxincidente:undefined };

    ngAfterViewInit(): void {
        this.notifica.maxbarrio = this.helper.maximoStbarrioComponent();
        this.notifica.maxficha = this.helper.maximoStFichaComponent();
        this.notifica.maxfichabarrio = this.helper.maximoStbarrioficha();
        this.notifica.maxincidente = this.helper.maximoStincidenteComponent();
       // //console.log('Notificacion',this.notifica);
    }
    check:any={};
    private subscriptions: Subscription[] = [];
    ngOnInit() {
        this.check.DashboardComponent = this.helper.decryptData('DashboardComponent') || false;
        //console.log(this.check.DashboardComponent);
        if (!this.check.DashboardComponent) {
            this.router.navigate(['/notfound']);
        }
        
        this.initChart();
        //this.productService.getProductsSmall().then(data => this.products = data);

        this.items = [
            { label: 'Add New', icon: 'pi pi-fw pi-plus' },
            { label: 'Remove', icon: 'pi pi-fw pi-minus' }
        ];
        this.subscriptions.push(this.helper.stbarrioComponent.subscribe(() => this.actualizarMaximos()));
        this.subscriptions.push(this.helper.stfichaComponent.subscribe(() => this.actualizarMaximos()));
        this.subscriptions.push(this.helper.stincidenteComponent.subscribe(() => this.actualizarMaximos()));
        this.subscriptions.push(this.helper.stbarrioficha.subscribe(() => this.actualizarMaximos()));
  
    }

  private actualizarMaximos(): void {
    this.notifica.maxbarrio = this.helper.maximoStbarrioComponent();
    this.notifica.maxficha = this.helper.maximoStFichaComponent();
    this.notifica.maxfichabarrio = this.helper.maximoStbarrioficha();
    this.notifica.maxincidente = this.helper.maximoStincidenteComponent();
   // //console.log('Notificacion', this.notifica);
  }

    initChart() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

        this.chartData = {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
            datasets: [
                {
                    label: 'First Dataset',
                    data: [65, 59, 80, 81, 56, 55, 40],
                    fill: false,
                    backgroundColor: documentStyle.getPropertyValue('--bluegray-700'),
                    borderColor: documentStyle.getPropertyValue('--bluegray-700'),
                    tension: .4
                },
                {
                    label: 'Second Dataset',
                    data: [28, 48, 40, 19, 86, 27, 90],
                    fill: false,
                    backgroundColor: documentStyle.getPropertyValue('--green-600'),
                    borderColor: documentStyle.getPropertyValue('--green-600'),
                    tension: .4
                }
            ]
        };

        this.chartOptions = {
            plugins: {
                legend: {
                    labels: {
                        color: textColor
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false
                    }
                },
                y: {
                    ticks: {
                        color: textColorSecondary
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false
                    }
                }
            }
        };
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
          this.subscriptions.forEach(subscription => subscription.unsubscribe());
    }
}
