import { Component, Input, OnInit } from '@angular/core';
import { ProgressBarModule } from 'primeng/progressbar';
// For dynamic progressbar demo
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
@Component({
  selector: 'app-spinner',
  templateUrl: './spinner.component.html',
  standalone:true,
  imports:[ProgressSpinnerModule],
  providers: [MessageService,DialogService],
  animations: [
    trigger('fadeInOut', [
      state('in', style({ opacity: 2 })),
      transition('* <=> *', [
        animate(300)
      ])
    ])
  ],
})
export class SpinnerComponent implements OnInit{
   mensajesPredeterminados: string[] = ['Podrías ir por café mientras', 'Estamos cargando tu página', 'Esto puede tardar unos segundos'];
    message: string = '';
    show: boolean = false;

  ngOnInit(): void {
    this.llamar();
  }

  llamar() {
    let index = 0;
    this.message = this.mensajesPredeterminados[index];
    index = 1;
    setInterval(() => {
      this.message = this.mensajesPredeterminados[index];
      index = (index + 1) % this.mensajesPredeterminados.length;
    }, 5000);
  }
  
}