import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ProyectoService } from '../../service/proyecto.service';
import { Proyecto } from '../../interface/proyecto.interfaces';
import { ActivatedRoute, Router } from '@angular/router';
import { ImportsModule } from 'src/app/demo/services/import';
import { DomSanitizer } from '@angular/platform-browser';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';

@Component({
    selector: 'app-proyecto-form',
    templateUrl: './proyecto-form.component.html',
    styleUrls: ['./proyecto-form.component.scss'],
    standalone: true,
    imports: [ImportsModule],
    providers: [MessageService],
})
export class ProyectoFormComponent implements OnInit {
    proyectoForm!: FormGroup;
    editando: boolean = false;
    proyectoId: string = '';
    cargando: boolean = false;
    guardando: boolean = false;
    imagenSeleccionada: any = null;
    previewImagenUrl: string | null = null;

    estadoOptions = [
        { label: 'Activo', value: 'activo' },
        { label: 'Inactivo', value: 'inactivo' },
        { label: 'En proceso', value: 'en_proceso' },
    ];

    constructor(
        private fb: FormBuilder,
        private proyectoService: ProyectoService,
        private messageService: MessageService,
        private route: ActivatedRoute,
        private router: Router,
        private sanitizer: DomSanitizer
    ) {}

    ngOnInit(): void {
        this.inicializarFormulario();

        this.route.params.subscribe((params) => {
            if (params['id']) {
                this.editando = true;
                this.proyectoId = params['id'];
                this.cargarProyecto(this.proyectoId);
            }
        });
    }

    inicializarFormulario(): void {
        this.proyectoForm = this.fb.group({
            numero: [null, [Validators.required, Validators.min(1)]],
            nombre: ['', [Validators.required, Validators.maxLength(200)]],
            descripcion: ['', [Validators.required]],
            mensajeInicial: ['', [Validators.required]],
            estado: ['activo', [Validators.required]],
            tagTotalNominados: ['Ilustres Esmeraldeños', [Validators.required]],
            tagLisado: [
                'Célebres e Ilustres Esmeraldeños',
                [Validators.required],
            ],
            totalNominados: [0],
        });
    }

    cargarProyecto(id: string): void {
        this.cargando = true;
        this.proyectoService.getProyecto(id, true).subscribe({
            next: (response: any) => {
                const proyecto = response.data[0] || response.data;
                this.proyectoForm.patchValue({
                    numero: proyecto.numero,
                    nombre: proyecto.nombre,
                    descripcion: proyecto.descripcion,
                    mensajeInicial: proyecto.mensajeInicial,
                    estado: proyecto.estado,
                    tagTotalNominados: proyecto.tagTotalNominados,
                    tagLisado: proyecto.tagLisado,
                    totalNominados: proyecto.totalNominados,
                });

                if (proyecto.imagen?.url) {
                    this.previewImagenUrl =
                        GLOBAL.url +
                        'obtener_imagen/proyecto/' +
                        proyecto.imagen.url;
                }

                this.cargando = false;
            },
            error: (error) => {
                this.cargando = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo cargar la información del proyecto',
                });
                console.error('Error al cargar proyecto:', error);
            },
        });
    }

    // proyecto-form.component.ts - Método onSubmit modificado

    onSubmit(): void {
        if (this.proyectoForm.invalid) {
            this.proyectoForm.markAllAsTouched();
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Por favor, complete todos los campos requeridos correctamente',
            });
            return;
        }

        this.guardando = true;
        const proyectoData = this.proyectoForm.value;

        // Crear FormData para envío
        const formData = new FormData();

        // Agregar campos del formulario
        Object.keys(proyectoData).forEach((key) => {
            if (proyectoData[key] !== null && proyectoData[key] !== undefined) {
                formData.append(key, proyectoData[key]);
            }
        });

        // Agregar imagen si existe
        if (this.imagenSeleccionada) {
            formData.append('imagen', this.imagenSeleccionada);
        }
        console.log(formData);
        // Llamar al servicio con FormData
        const request$ = this.editando
            ? this.proyectoService.updateProyecto(this.proyectoId, formData)
            : this.proyectoService.createProyecto(formData);

        request$.subscribe({
            next: (response) => {
                console.log(response);
                this.guardando = false;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: this.editando
                        ? 'Proyecto actualizado correctamente'
                        : 'Proyecto creado correctamente',
                });

                // Redirigir a la lista de proyectos
                setTimeout(() => {
                    this.router.navigate(['/proyectos-list']);
                }, 1500);
            },
            error: (error) => {
                this.guardando = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al guardar el proyecto',
                });
                console.error('Error:', error);
            },
        });
    }

    cancelar(): void {
        this.router.navigate(['/admin/proyectos']);
    }

    onImagenSeleccionada(event: any): void {
        const file = event.files[0];

        // Validación opcional
        if (file && !file.type.startsWith('image/')) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Solo se permiten archivos de imagen',
            });
            return;
        }

        this.imagenSeleccionada = file;

        if (this.imagenSeleccionada) {
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.previewImagenUrl = e.target.result;
            };
            reader.readAsDataURL(this.imagenSeleccionada);
        }
    }

    eliminarImagen(): void {
        this.imagenSeleccionada = null;
        this.previewImagenUrl = null;
    }

    getSafeHtml(contenido: string) {
        return this.sanitizer.bypassSecurityTrustHtml(contenido);
    }

    esContenidoHTML(texto: string): boolean {
        if (!texto) return false;
        const htmlRegex = /<[^>]*>/;
        return htmlRegex.test(texto);
    }
}
