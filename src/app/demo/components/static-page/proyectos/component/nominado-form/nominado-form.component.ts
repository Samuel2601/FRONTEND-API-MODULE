import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ProyectoService } from '../../service/proyecto.service';
import { Nominado, Proyecto } from '../../interface/proyecto.interfaces';
import { ActivatedRoute, Router } from '@angular/router';
import { ImportsModule } from 'src/app/demo/services/import';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
    selector: 'app-nominado-form',
    templateUrl: './nominado-form.component.html',
    styleUrls: ['./nominado-form.component.scss'],
    standalone: true,
    imports: [ImportsModule],
    providers: [MessageService],
})
export class NominadoFormComponent implements OnInit {
    nominadoForm!: FormGroup;
    proyectos: Proyecto[] = [];
    editando: boolean = false;
    nominadoId: string = '';
    cargando: boolean = false;
    cargandoProyectos: boolean = false;
    guardando: boolean = false;
    imagenSeleccionada: any = null;
    previewImagenUrl: string | null = null;
    datosCompletos: boolean = false;

    estadoOptions = [
        { label: 'Activo', value: 'activo' },
        { label: 'Inactivo', value: 'inactivo' },
        { label: 'Revisión', value: 'revision' },
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
        this.cargarProyectos();

        this.route.params.subscribe((params) => {
            if (params['id']) {
                this.editando = true;
                this.nominadoId = params['id'];
                this.cargarNominado(this.nominadoId);
            } else {
                this.route.queryParams.subscribe((queryParams) => {
                    if (queryParams['proyecto']) {
                        const proyectoId = queryParams['proyecto'];
                        this.nominadoForm.patchValue({ proyecto: proyectoId });
                    }
                });
            }
        });
    }

    inicializarFormulario(): void {
        this.nominadoForm = this.fb.group({
            numero: [null, [Validators.required, Validators.min(1)]],
            persona: this.fb.group({
                nombre: ['', [Validators.required, Validators.maxLength(100)]],
                apellidos: ['', [Validators.maxLength(100)]],
                nombreCompleto: [''],
            }),
            titulo: ['', [Validators.required, Validators.maxLength(200)]],
            biografia: this.fb.group({
                aspectosPositivos: [
                    '',
                    [Validators.required, Validators.minLength(50)],
                ],
                logros: this.fb.array([]), // Inicializar como array vacío
                reconocimientos: this.fb.array([]), // Inicializar como array vacío
                legado: [''], // Agregado para el binding correcto
            }),
            proyecto: ['', [Validators.required]],
            estado: ['activo', [Validators.required]],
        });
    }

    cargarProyectos(): void {
        this.cargandoProyectos = true;
        this.proyectoService.getProyectos().subscribe({
            next: (response: any) => {
                this.proyectos = response.data;
                this.cargandoProyectos = false;
            },
            error: (error) => {
                this.cargandoProyectos = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo cargar la lista de proyectos',
                });
                console.error('Error al cargar proyectos:', error);
            },
        });
    }

    cargarNominado(id: string): void {
        this.cargando = true;
        this.proyectoService.getNominado(id).subscribe({
            next: (response: any) => {
                const nominado = response.data;
                console.log('Datos del nominado:', nominado);

                // Limpiar FormArrays antes de cargar nuevos datos
                this.logros.clear();
                this.reconocimientos.clear();

                // Cargar logros
                if (nominado.biografia?.logros?.length > 0) {
                    nominado.biografia.logros.forEach((logro: string) => {
                        this.logros.push(
                            this.fb.control(logro, Validators.required)
                        );
                    });
                }

                // Cargar reconocimientos
                if (nominado.biografia?.reconocimientos?.length > 0) {
                    nominado.biografia.reconocimientos.forEach(
                        (reconocimiento: any) => {
                            this.reconocimientos.push(
                                this.fb.group({
                                    tipo: [
                                        reconocimiento.tipo || '',
                                        Validators.required,
                                    ],
                                    descripcion: [
                                        reconocimiento.descripcion || '',
                                        Validators.required,
                                    ],
                                    anio: [reconocimiento.anio || null],
                                })
                            );
                        }
                    );
                }

                // Cargar datos principales del formulario
                this.nominadoForm.patchValue({
                    numero: nominado.numero,
                    persona: {
                        nombre: nominado.persona?.nombre || '',
                        apellidos: nominado.persona?.apellidos || '',
                        nombreCompleto: nominado.persona?.nombreCompleto || '',
                    },
                    titulo: nominado.titulo || '',
                    biografia: {
                        aspectosPositivos:
                            nominado.biografia?.aspectosPositivos || '',
                        legado: nominado.biografia?.legado || '',
                    },
                    proyecto: nominado.proyecto,
                    estado: nominado.estado || 'activo',
                });

                // Cargar imagen si existe
                if (nominado.imagen?.url) {
                    this.previewImagenUrl = nominado.imagen.url;
                }

                this.cargando = false;
            },
            error: (error) => {
                this.cargando = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo cargar la información del nominado',
                });
                console.error('Error al cargar nominado:', error);
            },
        });
    }

    // Getters para los FormArrays
    get logros() {
        return this.nominadoForm.get('biografia.logros') as FormArray;
    }

    get reconocimientos() {
        return this.nominadoForm.get('biografia.reconocimientos') as FormArray;
    }

    // Métodos para manejar logros
    agregarLogro(valor: string = ''): void {
        if (valor.trim()) {
            this.logros.push(this.fb.control(valor, Validators.required));
        }
    }

    eliminarLogro(index: number): void {
        this.logros.removeAt(index);
    }

    // Métodos para manejar reconocimientos
    agregarReconocimiento(
        tipo: string = '',
        descripcion: string = '',
        anio: number | null = null
    ): void {
        this.reconocimientos.push(
            this.fb.group({
                tipo: [tipo, Validators.required],
                descripcion: [descripcion, Validators.required],
                anio: [anio],
            })
        );
    }

    eliminarReconocimiento(index: number): void {
        this.reconocimientos.removeAt(index);
    }

    onSubmit(): void {
        if (this.nominadoForm.invalid) {
            this.nominadoForm.markAllAsTouched();

            // Marcar también los FormArrays como touched
            this.logros.controls.forEach((control) => control.markAsTouched());
            this.reconocimientos.controls.forEach((group) => {
                if (group instanceof FormGroup) {
                    Object.keys(group.controls).forEach((key) => {
                        group.get(key)?.markAsTouched();
                    });
                }
            });

            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Por favor, complete todos los campos requeridos correctamente',
            });
            return;
        }

        this.guardando = true;
        const nominadoData = this.nominadoForm.value;

        // Generar nombreCompleto si está vacío
        if (!nominadoData.persona.nombreCompleto?.trim()) {
            nominadoData.persona.nombreCompleto = `${
                nominadoData.persona.nombre
            } ${nominadoData.persona.apellidos || ''}`.trim();
        }

        // Crear FormData para envío
        const formData = new FormData();

        // Agregar campos básicos
        formData.append('numero', nominadoData.numero.toString());
        formData.append('titulo', nominadoData.titulo);
        formData.append('proyecto', nominadoData.proyecto);
        formData.append('estado', nominadoData.estado);

        // Agregar datos de persona
        formData.append('persona[nombre]', nominadoData.persona.nombre);
        if (nominadoData.persona.apellidos) {
            formData.append(
                'persona[apellidos]',
                nominadoData.persona.apellidos
            );
        }
        formData.append(
            'persona[nombreCompleto]',
            nominadoData.persona.nombreCompleto
        );

        // Agregar biografía
        formData.append(
            'biografia[aspectosPositivos]',
            nominadoData.biografia.aspectosPositivos
        );
        if (nominadoData.biografia.legado) {
            formData.append('biografia[legado]', nominadoData.biografia.legado);
        }

        // Agregar logros
        nominadoData.biografia.logros.forEach(
            (logro: string, index: number) => {
                if (logro?.trim()) {
                    formData.append(`biografia[logros][${index}]`, logro);
                }
            }
        );

        // Agregar reconocimientos
        nominadoData.biografia.reconocimientos.forEach(
            (reconocimiento: any, index: number) => {
                if (reconocimiento.tipo)
                    formData.append(
                        `biografia[reconocimientos][${index}][tipo]`,
                        reconocimiento.tipo
                    );
                if (reconocimiento.descripcion)
                    formData.append(
                        `biografia[reconocimientos][${index}][descripcion]`,
                        reconocimiento.descripcion
                    );
                if (reconocimiento.anio)
                    formData.append(
                        `biografia[reconocimientos][${index}][anio]`,
                        reconocimiento.anio.toString()
                    );
            }
        );

        // Agregar imagen si existe
        if (this.imagenSeleccionada) {
            formData.append('imagen', this.imagenSeleccionada);
        }

        console.log('FormData preparado para envío');

        // Llamar al servicio con FormData
        const request$ = this.editando
            ? this.proyectoService.updateNominado(this.nominadoId, formData)
            : this.proyectoService.createNominado(formData);

        request$.subscribe({
            next: (response) => {
                console.log(response);
                this.guardando = false;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: this.editando
                        ? 'Nominado actualizado correctamente'
                        : 'Nominado creado correctamente',
                });

                // Redirigir a la lista de nominados
                setTimeout(() => {
                    this.router.navigate(['/nominados'], {
                        queryParams: { proyecto: nominadoData.proyecto },
                    });
                }, 1500);
            },
            error: (error) => {
                this.guardando = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al guardar el nominado',
                });
                console.error('Error:', error);
            },
        });
    }

    cancelar(): void {
        this.router.navigate(['/nominados']);
    }

    onImagenSeleccionada(event: any): void {
        this.imagenSeleccionada = event.files[0];

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

    getNombreProyecto(proyectoId: string): string {
        const proyecto = this.proyectos.find((p) => p._id === proyectoId);
        return proyecto ? proyecto.nombre : '';
    }
}
