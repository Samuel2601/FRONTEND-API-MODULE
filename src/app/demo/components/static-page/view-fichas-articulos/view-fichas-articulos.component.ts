import { Component, Input } from '@angular/core';
import { FilterService } from 'src/app/demo/services/filter.service';
import { ImportsModule } from 'src/app/demo/services/import';

@Component({
  selector: 'app-view-fichas-articulos',
  standalone: true,
  imports: [ImportsModule],
  templateUrl: './view-fichas-articulos.component.html',
  styleUrl: './view-fichas-articulos.component.scss'
})
export class ViewFichasArticulosComponent {
  @Input() fichaId!: string;
    ficha: any;

    constructor(private listService: FilterService) {}

    ngOnInit(): void {
        if (this.fichaId) {
            this.obtenerFicha();
        }
    }

    obtenerFicha(): void {
        this.listService.obtenerFichaPublica(this.fichaId).subscribe((response: any) => {
            if (response.data) {
                this.ficha = response.data;
            }
        });
    }
}
