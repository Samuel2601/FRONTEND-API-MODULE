import { Component } from '@angular/core';

@Component({
    selector: 'app-politica',
    templateUrl: './politicas.component.html',
})
export class PoliticasComponent {
     isMobile():boolean {
        return window.innerWidth <= 575; 
    }
 }
