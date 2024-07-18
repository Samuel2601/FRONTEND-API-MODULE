import { Component } from '@angular/core';
import { ImportsModule } from 'src/app/demo/services/import';
import { ListService } from 'src/app/demo/services/list.service';
import { ViewFichasArticulosComponent } from '../view-fichas-articulos/view-fichas-articulos.component';

@Component({
  selector: 'app-mostrar-fichas-articulos',
  standalone: true,
  imports: [ImportsModule, ViewFichasArticulosComponent],
  templateUrl: './mostrar-fichas-articulos.component.html',
  styleUrl: './mostrar-fichas-articulos.component.scss'
})
export class MostrarFichasArticulosComponent {
  fichas_sectoriales_arr: any[] = [];
  displayDialog: boolean = false;
  selectedFichaId: string | null = null;

  constructor(private listService: ListService) {}

  ngOnInit(): void {
      this.listarFichaSectorial();
  }

  listarFichaSectorial(): void {
      this.listService.listarFichaSectorialMapa().subscribe((response: any) => {
          if (response.data && response.data.length > 0) {
              this.fichas_sectoriales_arr = response.data;
          }
      });
  }

  mostrarFicha(fichaId: string): void {
      this.selectedFichaId = fichaId;
      this.displayDialog = true;
  }
}
