// src/app/components/slaughter-process-form/slaughter-process-form.component.ts
import {
    Component,
    OnInit,
    OnDestroy,
    Input,
    Output,
    EventEmitter,
    inject,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import {
    Introducer,
    Reception,
    SlaughterProcess,
    SlaughterProcessService,
    ExternalInspection,
    User,
} from 'src/app/zoosanitario/services/slaughter-process.service';

interface DropdownOption {
    label: string;
    value: any;
    [key: string]: any;
}

@Component({
    selector: 'app-slaughter-process-form',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './slaughter-process-form.component.html',
    styleUrls: ['./slaughter-process-form.component.scss'],
})
export class SlaughterProcessFormComponent implements OnInit, OnDestroy {
    private readonly destroy$ = new Subject<void>();
    private readonly fb = inject(FormBuilder);
    private readonly slaughterProcessService = inject(SlaughterProcessService);
    private readonly messageService = inject(MessageService);

    @Input() visible = false;
    @Input() processId: string | null = null;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() processSaved = new EventEmitter<SlaughterProcess>();
    @Output() dialogClosed = new EventEmitter<void>();

    // Estado del componente
    processForm!: FormGroup;
    loading = false;
    isEditMode = false;
    processData: SlaughterProcess | null = null;

    // Datos relacionados
    selectedIntroducerDetails: Introducer | null = null;
    selectedReceptionDetails: Reception | null = null;
    selectedInspections: ExternalInspection[] = [];

    // Opciones para dropdowns
    stateOptions: DropdownOption[] = [
        { label: 'Iniciado', value: 'Iniciado' },
        { label: 'Pre-Faenamiento', value: 'PreFaenamiento' },
        { label: 'Pagado', value: 'Pagado' },
        { label: 'En Proceso', value: 'EnProceso' },
        { label: 'Finalizado', value: 'Finalizado' },
        { label: 'Anulado', value: 'Anulado' },
    ];

    introducerOptions: DropdownOption[] = [];
    receptionOptions: DropdownOption[] = [];
    externalInspectionOptions: DropdownOption[] = [];

    ngOnInit(): void {
        this.initializeForm();
        this.loadRelatedData();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ========================================
    // INICIALIZACIÓN
    // ========================================

    initializeForm(): void {
        this.processForm = this.fb.group({
            numeroOrden: ['', [Validators.required, Validators.minLength(3)]],
            introductor: ['', Validators.required],
            recepcion: [''],
            inspeccionesExternas: [[]],
            estado: ['Iniciado', Validators.required],
            prioridad: [1, [Validators.min(1), Validators.max(10)]],
            observaciones: [''],
        });

        // Suscribirse a cambios en inspecciones externas
        this.processForm
            .get('inspeccionesExternas')
            ?.valueChanges.pipe(takeUntil(this.destroy$))
            .subscribe((selectedIds) => {
                this.updateSelectedInspections(selectedIds);
            });
    }

    loadRelatedData(): void {
        this.loadIntroducers();
        this.loadReceptions();
        this.loadExternalInspections();

        if (this.processId) {
            this.loadProcessData();
        }
    }

    // ========================================
    // CARGA DE DATOS
    // ========================================

    loadProcessData(): void {
        if (!this.processId) return;

        this.loading = true;
        this.isEditMode = true;

        this.slaughterProcessService
            .getById(this.processId)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (process: SlaughterProcess) => {
                    console.log('Proceso cargado para editar:', process);
                    this.processData = process;
                    this.populateForm(process);
                },
                error: (error) => {
                    console.error('Error loading process data:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al cargar los datos del proceso',
                    });
                },
            });
    }

    loadIntroducers(): void {
        // En una implementación real, cargarías desde el servicio de introductores
        // Aquí simulamos algunos datos basados en la estructura real del backend
        this.introducerOptions = [
            {
                label: 'AREVALO PANCHI SAMUEL INKESHKI',
                value: '68471eb02c76cd755453cafa',
                type: 'Natural',
                document: '0803768530',
                data: {
                    _id: '68471eb02c76cd755453cafa',
                    name: 'AREVALO PANCHI SAMUEL INKESHKI',
                    personType: 'Natural',
                    idNumber: '0803768530',
                    ruc: '',
                    email: 'saamare99@gmail.com',
                    phone: '0995767887',
                    address: 'Dirección del introductor',
                },
            },
            {
                label: 'Ganadera San José S.A.',
                value: 'introducer-2',
                type: 'Jurídica',
                document: '20123456789',
                data: {
                    _id: 'introducer-2',
                    name: 'Ganadera San José S.A.',
                    personType: 'Jurídica',
                    ruc: '20123456789',
                    phone: '555-5678',
                    address: 'Av. Industrial 456',
                },
            },
        ];
    }

    loadReceptions(): void {
        // En una implementación real, cargarías desde el servicio de recepciones
        // Simulamos datos basados en la estructura real del backend
        this.receptionOptions = [
            {
                label: 'REC-6849e75371d0941c221e3a02',
                value: '6849e75371d0941c221e3a02',
                estado: 'Pendiente',
                fecha: new Date('2025-06-11T20:30:11.355Z'),
                data: {
                    _id: '6849e75371d0941c221e3a02',
                    fechaHoraRecepcion: new Date('2025-06-11T20:30:11.355Z'),
                    estado: 'Pendiente',
                    prioridad: 0,
                    animalHealthCertificate: {
                        _id: '6849d4faa40973a3cc418240',
                        numeroCZPM: '2023-05-9765837433',
                        totalProductos: 1,
                    },
                },
            },
            {
                label: 'REC-002 - Lote Porcino',
                value: 'reception-2',
                estado: 'Procesando',
                fecha: new Date('2024-01-16'),
                data: {
                    _id: 'reception-2',
                    fechaHoraRecepcion: new Date('2024-01-16'),
                    estado: 'Procesando',
                    prioridad: 2,
                    animalHealthCertificate: {
                        _id: 'cert-2',
                        numeroCZPM: 'CZPM-2024-002',
                        totalProductos: 15,
                    },
                },
            },
        ];
    }

    loadExternalInspections(): void {
        // En una implementación real, cargarías desde el servicio de inspecciones
        // Simulamos datos basados en la estructura real del backend
        this.externalInspectionOptions = [
            {
                label: 'IE-2025-06-11-811534-0000001',
                value: '6849e75371d0941c221e3a06',
                resultado: 'Apto',
                especie: 'Porcino',
                data: {
                    _id: '6849e75371d0941c221e3a06',
                    numero: 'IE-2025-06-11-811534-0000001',
                    resultado: 'Apto',
                    especie: {
                        _id: '6846df24a4691ab809e78af5',
                        species: 'Porcino',
                        category: 'Menor',
                    },
                },
            },
            {
                label: 'INS-002',
                value: 'inspection-2',
                resultado: 'Pendiente',
                especie: 'Bovino',
                data: {
                    _id: 'inspection-2',
                    numero: 'INS-002',
                    resultado: 'Pendiente',
                    especie: {
                        _id: 'species-2',
                        species: 'Bovino',
                        category: 'Mayor',
                    },
                },
            },
        ];
    }

    // ========================================
    // MANEJO DEL FORMULARIO
    // ========================================

    populateForm(process: SlaughterProcess): void {
        // Determinar valores para el formulario
        const introducerId =
            typeof process.introductor === 'string'
                ? process.introductor
                : process.introductor._id;

        const recepcionId =
            typeof process.recepcion === 'string'
                ? process.recepcion
                : process.recepcion?._id || '';

        const inspectionIds = Array.isArray(process.inspeccionesExternas)
            ? process.inspeccionesExternas.map((i) =>
                  typeof i === 'string' ? i : i._id
              )
            : [];

        // Poblar el formulario
        this.processForm.patchValue({
            numeroOrden: process.numeroOrden,
            introductor: introducerId,
            recepcion: recepcionId,
            inspeccionesExternas: inspectionIds,
            estado: process.estado,
            observaciones: '',
        });

        // Cargar detalles si están disponibles como objetos
        if (typeof process.introductor !== 'string') {
            this.selectedIntroducerDetails = process.introductor;
        } else {
            // Buscar en las opciones cargadas
            const introducerOption: any = this.introducerOptions.find(
                (opt) => opt.value === introducerId
            );
            if (introducerOption) {
                this.selectedIntroducerDetails = introducerOption.data;
            }
        }

        if (typeof process.recepcion !== 'string' && process.recepcion) {
            this.selectedReceptionDetails = process.recepcion;
        } else if (recepcionId) {
            // Buscar en las opciones cargadas
            const receptionOption: any = this.receptionOptions.find(
                (opt) => opt.value === recepcionId
            );
            if (receptionOption) {
                this.selectedReceptionDetails = receptionOption.data;
            }
        }

        // Actualizar inspecciones seleccionadas
        this.updateSelectedInspections(inspectionIds);
    }

    onSubmit(): void {
        if (this.processForm.invalid) {
            this.markFormGroupTouched();
            return;
        }

        this.loading = true;
        const formData = this.prepareFormData();

        const operation = this.isEditMode
            ? this.slaughterProcessService.update(this.processId!, formData)
            : this.slaughterProcessService.create(formData);

        operation
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (process: SlaughterProcess) => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: `Proceso ${
                            this.isEditMode ? 'actualizado' : 'creado'
                        } correctamente`,
                    });
                    this.processSaved.emit(process);
                    this.closeDialog();
                },
                error: (error) => {
                    console.error('Error saving process:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: `Error al ${
                            this.isEditMode ? 'actualizar' : 'crear'
                        } el proceso`,
                    });
                },
            });
    }

    prepareFormData(): Partial<SlaughterProcess> {
        const formValue = this.processForm.value;

        const data: Partial<SlaughterProcess> = {
            numeroOrden: formValue.numeroOrden.trim(),
            introductor: formValue.introductor,
            estado: formValue.estado,
        };

        if (formValue.recepcion) {
            data.recepcion = formValue.recepcion;
        }

        if (formValue.inspeccionesExternas?.length > 0) {
            data.inspeccionesExternas = formValue.inspeccionesExternas;
        }

        return data;
    }

    // ========================================
    // EVENTOS DE CAMBIO
    // ========================================

    onIntroducerChange(event: any): void {
        const selectedOption: any = this.introducerOptions.find(
            (opt) => opt.value === event.value
        );
        this.selectedIntroducerDetails = selectedOption?.data || null;
    }

    onReceptionChange(event: any): void {
        const selectedOption: any = this.receptionOptions.find(
            (opt) => opt.value === event.value
        );
        this.selectedReceptionDetails = selectedOption?.data || null;
    }

    updateSelectedInspections(selectedIds: string[]): void {
        if (!selectedIds || !Array.isArray(selectedIds)) {
            this.selectedInspections = [];
            return;
        }

        this.selectedInspections = this.externalInspectionOptions
            .filter((opt) => selectedIds.includes(opt.value))
            .map((opt: any) => opt.data);
    }

    // ========================================
    // VALIDACIONES
    // ========================================

    isFieldInvalid(fieldName: string): boolean {
        const field = this.processForm.get(fieldName);
        return !!(field && field.invalid && (field.dirty || field.touched));
    }

    getFieldError(fieldName: string): string {
        const field = this.processForm.get(fieldName);
        if (!field || !field.errors) return '';

        const errors = field.errors;

        if (errors['required']) {
            return 'Este campo es requerido';
        }

        if (errors['minlength']) {
            return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
        }

        if (errors['min']) {
            return `El valor mínimo es ${errors['min'].min}`;
        }

        if (errors['max']) {
            return `El valor máximo es ${errors['max'].max}`;
        }

        return 'Campo inválido';
    }

    markFormGroupTouched(): void {
        Object.keys(this.processForm.controls).forEach((key) => {
            const control = this.processForm.get(key);
            control?.markAsTouched();
        });
    }

    // ========================================
    // MÉTODOS AUXILIARES
    // ========================================

    getReceptionStateSeverity(
        estado: string
    ): 'success' | 'info' | 'warning' | 'danger' {
        const severities: { [key: string]: any } = {
            Completado: 'success',
            Procesando: 'warning',
            Pendiente: 'info',
            Rechazado: 'danger',
        };
        return severities[estado] || 'info';
    }

    getInspectionResultSeverity(
        resultado: string
    ): 'success' | 'info' | 'warning' | 'danger' {
        const severities: { [key: string]: any } = {
            Apto: 'success',
            Pendiente: 'warning',
            Devolución: 'danger',
            Cuarentena: 'info',
            Comisión: 'info',
        };
        return severities[resultado] || 'info';
    }

    getUserName(user: string | User): string {
        if (typeof user === 'string') {
            return 'Cargando...';
        }
        if (user && user.name) {
            return user.last_name
                ? `${user.name} ${user.last_name}`
                : user.name;
        }
        return 'N/A';
    }

    getSpeciesName(especie: any): string {
        if (typeof especie === 'string') {
            return especie;
        }
        if (especie && typeof especie === 'object') {
            return especie.species || 'N/A';
        }
        return 'N/A';
    }

    // ========================================
    // EVENTOS DE DIÁLOGO
    // ========================================

    onCancel(): void {
        this.closeDialog();
    }

    onDialogHide(): void {
        this.dialogClosed.emit();
        this.resetComponent();
    }

    closeDialog(): void {
        this.visible = false;
        this.visibleChange.emit(false);
    }

    resetForm(): void {
        this.processForm.reset();
        this.processForm.patchValue({
            estado: 'Iniciado',
            prioridad: 1,
            inspeccionesExternas: [],
        });
        this.selectedIntroducerDetails = null;
        this.selectedReceptionDetails = null;
        this.selectedInspections = [];
    }

    resetComponent(): void {
        this.resetForm();
        this.processData = null;
        this.isEditMode = false;
        this.processId = null;
        this.loading = false;
    }

    // ========================================
    // GETTERS PARA ACCESO SEGURO EN TEMPLATE
    // ========================================

    get isFormValid(): boolean {
        return this.processForm.valid;
    }

    get canSubmit(): boolean {
        return this.isFormValid && !this.loading;
    }

    get formTitle(): string {
        return this.isEditMode
            ? 'Editar Proceso de Faenamiento'
            : 'Nuevo Proceso de Faenamiento';
    }

    get submitButtonLabel(): string {
        return this.isEditMode ? 'Actualizar' : 'Crear';
    }

    get submitButtonIcon(): string {
        return this.isEditMode ? 'pi pi-check' : 'pi pi-plus';
    }
}
