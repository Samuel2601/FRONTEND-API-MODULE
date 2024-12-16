import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ImportsModule } from 'src/app/demo/services/import';

@Component({
    selector: 'app-info-registro',
    standalone: true,
    imports: [ImportsModule, ReactiveFormsModule],
    templateUrl: './info-registro.component.html',
    styleUrl: './info-registro.component.scss',
})
export class InfoRegistroComponent {
    searchForm: FormGroup;

    encuestadores: any[] = []; // Lista de encuestadores

    constructor(private fb: FormBuilder) {}

    ngOnInit(): void {
        this.searchForm = this.fb.group({
            date: this.fb.group({
                start: [null],
                end: [null],
            }),
            encuestador: [null],
        });
    }
}
