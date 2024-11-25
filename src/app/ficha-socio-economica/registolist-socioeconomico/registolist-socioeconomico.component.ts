import { Component, OnInit } from '@angular/core';
import { RegistroService } from '../services/registro.service';
import { ImportsModule } from 'src/app/demo/services/import';
import { AuthService } from 'src/app/demo/services/auth.service';
import { EditSocioeconomicaComponent } from '../edit-socioeconomica/edit-socioeconomica.component';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { FormularioSocioeconomicoComponent } from '../formulario-socioeconomico/formulario-socioeconomico.component';

@Component({
    selector: 'app-registolist-socioeconomico',
    standalone: true,
    imports: [ImportsModule, FormularioSocioeconomicoComponent],
    templateUrl: './registolist-socioeconomico.component.html',
    styleUrl: './registolist-socioeconomico.component.scss',
    providers: [MessageService, DynamicDialogRef],
})
export class RegistolistSocioeconomicoComponent implements OnInit {
    registros: any[] = [];
    loading: boolean = true;
    token = this.authservice.token() || '';
    selectedRegistro: any = null; // Registro seleccionado para mostrar o editar
    showDialog: boolean = false; // Estado para mostrar el modal

    constructor(
        private registroService: RegistroService,
        private authservice: AuthService
    ) {}

    ngOnInit(): void {
        // Definir qué campos queremos en el select y en el populate
        const select =
            'informacionRegistro,informacionPersonal,informacionUbicacion';
        const populate = 'all';

        this.loading = true;
        this.registroService
            .getRegistros(this.token, select, populate)
            .subscribe({
                next: (response) => {
                    console.log('Registros:', response.data);
                    this.registros = response.data.map((registro: any) => ({
                        entrevistado:
                            registro.informacionPersonal?.entrevistado +
                                '(' +
                                registro.informacionPersonal?.dni +
                                ')' || 'N/A',
                        encuestador: `${
                            registro.informacionRegistro?.encuestador?.name ||
                            ''
                        } ${
                            registro.informacionRegistro?.encuestador
                                ?.last_name || ''
                        }`,
                        fecha: registro.informacionRegistro?.date || 'N/A',
                        id: registro._id,
                    }));
                    this.loading = false;
                    console.log('Registros cargados:', this.registros);
                },
                error: (error) => {
                    console.error('Error al cargar registros:', error);
                    this.loading = false;
                },
            });
    }
    selectedRegistroId: string | null = null; // ID del registro seleccionado para el diálogo
    viewDiaglog: boolean = false;

    onRowSelect(registroId: string): void {
        console.log('Registro seleccionado:', registroId);
        this.viewDiaglog = true;
        this.selectedRegistroId = registroId; // Establecer el id del registro seleccionado
    }

    onDialogClose(): void {
        this.selectedRegistroId = null; // Limpiar el id cuando se cierre el diálogo
        this.viewDiaglog = false;
    }
}
