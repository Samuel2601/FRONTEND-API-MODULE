import { Component, OnInit } from '@angular/core';
import { ImportsModule } from 'src/app/demo/services/import';
import { ListService } from 'src/app/demo/services/list.service';
import { ViewFichasArticulosComponent } from '../view-fichas-articulos/view-fichas-articulos.component';
import { HelperService } from 'src/app/demo/services/helper.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-mostrar-fichas-articulos',
    standalone: true,
    imports: [ImportsModule,ViewFichasArticulosComponent],
    templateUrl: './mostrar-fichas-articulos.component.html',
    styleUrl: './mostrar-fichas-articulos.component.scss',
})
export class MostrarFichasArticulosComponent implements OnInit{
    fichas_sectoriales_arr: any[] = [];
    displayDialog: boolean = false;
    selectedFichaId: any;

    constructor(private listService: ListService, private helper:HelperService,private router: Router) {}

    ngOnInit(): void {
        this.listarFichaSectorial();
    }

    listarFichaSectorial(): void {
        this.listService
            .listarFichaSectorialMapa()
            .subscribe((response: any) => {
                if (response.data && response.data.length > 0) {
                    this.fichas_sectoriales_arr = response.data;
                }
            });
    }
    IsMobil() {
        return this.helper.isMobil();
    }

    mostrarFicha(fichaId: any): void {
        if(!this.IsMobil()){
            this.selectedFichaId = fichaId;
            this.displayDialog = true;
        }else{
            this.router.navigate(['/ver-ficha', fichaId._id]); 
        }
     
    }
}
