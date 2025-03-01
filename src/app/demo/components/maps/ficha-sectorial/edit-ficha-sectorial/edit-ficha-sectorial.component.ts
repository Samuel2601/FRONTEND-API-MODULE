import { Component, OnInit } from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    Validators,
    FormControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { Camera } from '@capacitor/camera';

import { AuthService } from 'src/app/demo/services/auth.service';
import { ListService } from 'src/app/demo/services/list.service';
import { UpdateService } from 'src/app/demo/services/update.service';
import { FilterService } from '../../../../services/filter.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    selector: 'app-edit-ficha-sectorial',
    templateUrl: './edit-ficha-sectorial.component.html',
    styleUrls: ['./edit-ficha-sectorial.component.scss'],
})
export class EditFichaSectorialComponent implements OnInit {
    fichaSectorialForm: FormGroup;
    estadosActividadProyecto: any[] = [];
    actividadesProyecto: any[] = [];
    id: string | null = null;
    ficha: any = {};
    selectedFiles: File[] = [];
    imagenesSeleccionadas: Array<any> = [];
    isLoading = true;

    responsiveOptions = [
        { breakpoint: '1024px', numVisible: 5 },
        { breakpoint: '768px', numVisible: 3 },
        { breakpoint: '560px', numVisible: 1 },
    ];

    get ubicacion() {
        return JSON.stringify(
            this.fichaSectorialForm.get('direccion_geo')?.value
        );
    }

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private authService: AuthService,
        private listService: ListService,
        private updateService: UpdateService,
        private filterService: FilterService,
        private messageService: MessageService,
        private dialogConfig: DynamicDialogConfig,
        private dialogRef: DynamicDialogRef,
        private helperService: HelperService,
        private sanitizer: DomSanitizer
    ) {
        this.fichaSectorialForm = this.createForm();
    }

    async ngOnInit(): Promise<void> {
        this.isLoading = true;

        try {
            await this.checkPermissions();
            this.id = this.dialogConfig.data?.id || null;

            if (this.id) {
                await this.loadFichaSectorial();
            }

            this.estadosActividadProyecto = await this.loadEstadosActividad();
            this.actividadesProyecto = await this.loadActividadesProyecto();
        } catch (error) {
            console.error('Error en ngOnInit:', error);
            this.router.navigate(['/notfound']);
        } finally {
            this.isLoading = false;
        }
    }
    isMobil() {
        return this.helperService.isMobil();
    }

    private createForm(): FormGroup {
        const form = this.fb.group({
            direccion_geo: ['', Validators.required],
            actividad: ['', Validators.required],
            fecha_evento: ['', Validators.required],
            view_date_evento: [true],
            estado: ['', Validators.required],
            es_articulo: [false],
            descripcion: ['', Validators.required],
            observacion: [''],
            mostrar_en_mapa: [false],
            title_marcador: [''],
            icono_marcador: ['', Validators.pattern('https?://.+')],
            destacado: [false],
        });

        return form;
    }

    private async checkPermissions(): Promise<void> {
        const permissions = await this.authService.hasPermissionComponent(
            '/ficha_sectorial/:id',
            'put'
        );

        if (!permissions) {
            this.router.navigate(['/notfound']);
            throw new Error('Permiso denegado');
        }
    }

    private async loadFichaSectorial(): Promise<void> {
        const response = await this.filterService
            .obtenerActividadProyecto(this.authService.token(), this.id!)
            .toPromise();
        console.log(response.data);
        this.ficha = response.data || {};
        this.populateForm(this.ficha);

        this.fichaSectorialForm
            .get('fecha_evento')
            ?.setValue(new Date(this.ficha.fecha_evento));
    }

    private populateForm(data: any): void {
        Object.keys(data).forEach((key) => {
            const control = this.fichaSectorialForm.get(key);
            if (control) {
                control.setValue(data[key]);
            }
        });
    }

    private async loadEstadosActividad(): Promise<any[]> {
        try {
            const response = await this.listService
                .listarEstadosActividadesProyecto(this.authService.token())
                .toPromise();
            return response.data || [];
        } catch (error) {
            this.handleError(error);
            return [];
        }
    }

    private async loadActividadesProyecto(): Promise<any[]> {
        try {
            const response = await this.listService
                .listarTiposActividadesProyecto(this.authService.token())
                .toPromise();
            return response.data || [];
        } catch (error) {
            this.handleError(error);
            return [];
        }
    }

    onFilesSelected(event: any): void {
        for (let file of event.files) {
            this.selectedFiles.push(file);
            const objectURL = URL.createObjectURL(file);
            this.imagenesSeleccionadas.push({ itemImageSrc: objectURL });
        }

        this.messageService.add({
            severity: 'info',
            summary: 'Imágenes seleccionadas',
            detail: `${this.selectedFiles.length} archivos cargados.`,
        });
    }

    eliminarImagen(index: number): void {
        this.imagenesSeleccionadas.splice(index, 1);
        this.selectedFiles.splice(index, 1);
    }

    async guardarFichaSectorial(): Promise<void> {
        if (!this.fichaSectorialForm.valid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario inválido',
                detail: 'Por favor completa los campos obligatorios.',
            });
            return;
        }

        this.isLoading = true;

        try {
            const response = await this.updateService
                .actualizarActividadProyecto(
                    this.authService.token(),
                    this.id!,
                    this.fichaSectorialForm.value
                )
                .toPromise();

            this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Ficha sectorial actualizada con éxito.',
            });

            this.dialogRef.close();
            this.router.navigate(['/success']);
        } catch (error) {
            this.handleError(error);
        } finally {
            this.isLoading = false;
        }
    }

    private handleError(error: any): void {
        console.error('Error:', error);

        if (error.error.message === 'InvalidToken') {
            this.router.navigate(['/auth/login']);
        } else {
            this.messageService.add({
                severity: 'error',
                summary: `(${error.status})`,
                detail: error.error.message || 'Error desconocido.',
            });
        }
    }
    sanitizedContent: SafeHtml;
    cleanHtmlContent(content: string): string {
        // Limpiar las comillas escapadas en el contenido
        content = content.replace(/&quot;/g, '"');
        content = content.replace(/&nbsp;/g, ' ');
        // Elimina las etiquetas <pre> y permite <iframe>
        return content.replace(
            /<pre data-language="plain">(.*?)<\/pre>/gs,
            (_, innerContent) =>
                innerContent
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
        );
    }

    get sanitizedDescripcion(): SafeHtml {
        //const descripcion = this.fichaSectorialForm.get('descripcion').value;
        return this.sanitizedContent;
    }
    // Método para actualizar el contenido sanitizado
    updateSanitizedDescripcion(): void {
        console.log(this.fichaSectorialForm.get('descripcion').value);
        const rawContent = this.fichaSectorialForm.get('descripcion').value;
        const cleanedContent = this.cleanHtmlContent(rawContent);
        this.sanitizedContent =
            this.sanitizer.bypassSecurityTrustHtml(cleanedContent);
    }

    // Detectar cambios en el formulario (opcional)
    onDescripcionChange(): void {
        this.updateSanitizedDescripcion();
    }
}
