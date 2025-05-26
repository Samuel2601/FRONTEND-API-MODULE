import { Component } from '@angular/core';
import { ImportsModule } from 'src/app/demo/services/import';

@Component({
    selector: 'app-politica',
    //standalone: true,
    //imports: [ImportsModule],
    templateUrl: './politicas.component.html',
})
export class PoliticasComponent {
    isMobile(): boolean {
        return window.innerWidth <= 575;
    }

    deletionSteps = [
        { label: 'Solicitud' },
        { label: 'Procesamiento' },
        { label: 'Confirmación' },
        { label: 'Eliminación' },
    ];
}
