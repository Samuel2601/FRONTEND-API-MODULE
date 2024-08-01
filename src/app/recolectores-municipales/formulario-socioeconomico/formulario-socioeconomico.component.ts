import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
    selector: 'app-formulario-socioeconomico',
    templateUrl: './formulario-socioeconomico.component.html',
    styleUrl: './formulario-socioeconomico.component.scss',
})
export class FormularioSocioeconomicoComponent {
    surveyForm: FormGroup;
    houseStates = [
        { name: 'Casa Cerrada' },
        { name: 'Solar Vacío' },
        { name: 'Construcción Iniciada' },
        { name: 'Hogar Entrevistado' },
        { name: 'Casa no Habitada' },
        { name: 'Solar con maleza' },
    ];
    constructor(private fb: FormBuilder) {
        this.surveyForm = this.fb.group({
            date: ['', Validators.required],
            possessionTime: [''],
            phone: [''],
            nationality: [''],
            surveyorName: ['', Validators.required],
            intervieweeName: ['', Validators.required],
            age: ['', Validators.required],
            ethnicity: [''],
            civilStatus: [''],
            educationLevel: [''],
            idNumber: [''],
            disability: [''],
            address: ['', Validators.required],
            sector: [''],
            neighborhood: [''],
            blockNumber: [''],
            lotNumber: [''],
            familyCount: [0, Validators.required],
            peopleCount: [0, Validators.required],
            houseState: new FormControl()
        });
    }
    onSubmit() {
        if (this.surveyForm.valid) {
            console.log(this.surveyForm.value);
            // Aquí puedes manejar el envío del formulario
        }
    }
}
