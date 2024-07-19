import { Component, Input, OnInit } from '@angular/core';
import { FilterService } from 'src/app/demo/services/filter.service';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { ImportsModule } from 'src/app/demo/services/import';
import { MapaMostrarFichasComponent } from "../mapa-mostrar-fichas/mapa-mostrar-fichas.component";

@Component({
  selector: 'app-view-fichas-articulos',
  standalone: true,
  imports: [ImportsModule, MapaMostrarFichasComponent],
  templateUrl: './view-fichas-articulos.component.html',
  styleUrl: './view-fichas-articulos.component.scss'
})
export class ViewFichasArticulosComponent implements OnInit {
    @Input() fichaId!: string;
    ficha: any;
    public url = GLOBAL.url;
    responsiveOptions = [
        {
            breakpoint: '1199px',
            numVisible: 1,
            numScroll: 1
        },
        {
            breakpoint: '991px',
            numVisible: 2,
            numScroll: 1
        },
        {
            breakpoint: '767px',
            numVisible: 1,
            numScroll: 1
        }
    ];

    constructor(private listService: FilterService) {}

    ngOnInit(): void {
        console.log("RECIBIO LA FICHA: ",this.fichaId);
        if (this.fichaId) {
            this.obtenerFicha();
        }
    }

    obtenerFicha(): void {
        this.listService.obtenerFichaPublica(this.fichaId).subscribe((response: any) => {
            if (response.data) {
                this.ficha = response.data;
            }
        },(error)=>{
            console.error(error);
        });
    }

    isMobile(): boolean {
        return window.innerWidth <= 768;
    }
}
