import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import {
    Observable,
    debounceTime,
    distinctUntilChanged,
    forkJoin,
    of,
    switchMap,
    catchError,
} from 'rxjs';
import { ImportsModule } from 'src/app/demo/services/import';
import { Introducer } from 'src/app/zoosanitario/interfaces/invoice.interface';
import { IntroducerService } from 'src/app/zoosanitario/services/introducer.service';
import { InvoiceService } from 'src/app/zoosanitario/services/invoice.service';
import { OracleService } from 'src/app/zoosanitario/services/oracle.service';
import { RateService } from 'src/app/zoosanitario/services/rate.service';
import {
    SlaughterProcessService,
    SlaughterProcess,
} from 'src/app/zoosanitario/services/slaughter-process.service';

interface Rate {
    _id: string;
    type: 'TASA' | 'TARIFA' | 'SERVICIOS';
    description: string;
    code: string;
    rubroxAtributo: string;
    position: number;
    unitPrice?: number;
    animalTypes: string[];
    personType: ('Natural' | 'Jurídica')[];
}

interface ProformaType {
    label: string;
    value: string;
    rateType: string;
    description: string;
}

@Component({
    selector: 'app-invoice-form',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './invoice-form.component.html',
    styleUrls: ['./invoice-form.component.scss'],
    providers: [MessageService],
})
export class InvoiceFormComponent implements OnInit {
    introducerSearch: string = '';
    slaughterProcessSearch: string = '';
    form: FormGroup;
    loading = false;
    isEditMode = false;
    invoiceId: string | null = null;
    introducers: Introducer[] = [];
    filteredIntroducers: Introducer[] = [];
    selectedIntroducer: any | null = null;
    slaughterProcesses: SlaughterProcess[] = [];
    filteredSlaughterProcesses: SlaughterProcess[] = [];
    selectedSlaughterProcess: SlaughterProcess | null = null;
    rates: Rate[] = [];
    filteredRates: Rate[] = [];
    typeOptions: ProformaType[] = [];
    loadingRates = true;
    loadingSlaughterProcesses = false;
    calculationError = false;
    introducerLocked = false;

    // Nueva propiedad para controlar el tipo de rate seleccionado en la factura
    selectedInvoiceRateType: string | null = null;

    constructor(
        private fb: FormBuilder,
        private invoiceService: InvoiceService,
        private introducerService: IntroducerService,
        private oracleService: OracleService,
        private rateService: RateService,
        private slaughterProcessService: SlaughterProcessService,
        private route: ActivatedRoute,
        private router: Router,
        private messageService: MessageService
    ) {
        this.form = this.createForm();
    }

    ngOnInit() {
        this.invoiceId = this.route.snapshot.paramMap.get('id');
        this.isEditMode = !!this.invoiceId;
        this.loadInitialData();
    }

    private loadInitialData() {
        this.loading = true;

        forkJoin({
            rates: this.rateService.getAll(),
            introducers: this.introducerService.getAll({
                limit: 1000,
                page: 1,
            }),
            slaughterProcesses:
                this.slaughterProcessService.getActiveSlaughterProcesses({
                    limit: 1000,
                    page: 1,
                }),
        }).subscribe({
            next: (data: any) => {
                console.log('Datos cargados:', data);
                this.rates = data.rates;

                // Extraer introducers de la respuesta paginada
                if (data.introducers?.data?.introducers) {
                    this.introducers = data.introducers.data.introducers;
                    this.filteredIntroducers = [...this.introducers];
                } else if (Array.isArray(data.introducers)) {
                    this.introducers = data.introducers;
                    this.filteredIntroducers = [...this.introducers];
                } else {
                    this.introducers = [];
                    this.filteredIntroducers = [];
                    console.warn(
                        'Estructura de introducers no reconocida:',
                        data.introducers
                    );
                }

                // Extraer slaughter processes de la respuesta paginada
                if (data.slaughterProcesses?.docs) {
                    this.slaughterProcesses = data.slaughterProcesses.docs;
                    this.filteredSlaughterProcesses = [
                        ...this.slaughterProcesses,
                    ];
                } else if (Array.isArray(data.slaughterProcesses)) {
                    this.slaughterProcesses = data.slaughterProcesses;
                    this.filteredSlaughterProcesses = [
                        ...this.slaughterProcesses,
                    ];
                } else {
                    this.slaughterProcesses = [];
                    this.filteredSlaughterProcesses = [];
                    console.warn(
                        'Estructura de slaughter processes no reconocida:',
                        data.slaughterProcesses
                    );
                }

                this.filteredIntroducers = this.introducers;
                this.filteredSlaughterProcesses = this.slaughterProcesses;

                console.log('Introducers cargados:', this.introducers);
                console.log(
                    'Slaughter Processes cargados:',
                    this.slaughterProcesses
                );

                this.generateTypeOptionsFromRates();
                this.setupFormSubscriptions();

                if (this.isEditMode) {
                    this.loadInvoice();
                } else {
                    this.generateInvoiceNumber();
                    if (this.typeOptions.length > 0) {
                        this.form
                            .get('type')
                            ?.setValue(this.typeOptions[0].value);
                    }
                }

                this.loading = false;
                this.loadingRates = false;
            },
            error: (error) => {
                console.error('Error loading initial data:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron cargar los datos iniciales',
                });
                this.loading = false;
                this.introducers = [];
                this.filteredIntroducers = [];
                this.slaughterProcesses = [];
                this.filteredSlaughterProcesses = [];
            },
        });
    }

    private generateTypeOptionsFromRates() {
        const rateTypes = [...new Set(this.rates.map((rate) => rate.type))];

        this.typeOptions = rateTypes.map((rateType) => {
            switch (rateType) {
                case 'TASA':
                    return {
                        label: 'Faenamiento',
                        value: 'SLAUGHTER_SERVICE',
                        rateType: 'TASA',
                        description: 'Servicios de faenamiento',
                    };
                case 'TARIFA':
                    return {
                        label: 'Inscripción',
                        value: 'INSCRIPTION',
                        rateType: 'TARIFA',
                        description: 'Tasas de inscripción y registro',
                    };
                case 'SERVICIOS':
                    return {
                        label: 'Servicios Adicionales',
                        value: 'ADDITIONAL_SERVICE',
                        rateType: 'SERVICIOS',
                        description: 'Servicios adicionales y complementarios',
                    };
                default:
                    return {
                        label: rateType,
                        value: rateType,
                        rateType: rateType,
                        description: `Servicios de tipo ${rateType}`,
                    };
            }
        });

        // ELIMINADO: No agregar opción mixta según las reglas de negocio
        // Solo se permite un tipo de rate por factura
    }

    private createForm(): FormGroup {
        return this.fb.group({
            invoiceNumber: ['', Validators.required],
            type: ['', Validators.required],
            introducerId: ['', Validators.required],
            introducerSearch: [''],
            slaughterProcessId: [''],
            slaughterProcessSearch: [''],
            items: this.fb.array([]),
            subtotal: [{ value: 0, disabled: true }],
            //taxes: [{ value: 0, disabled: true }],
            totalAmount: [{ value: 0, disabled: true }],
            dueDate: [null, Validators.required],
            notes: [''],
        });
    }

    get items(): FormArray {
        return this.form.get('items') as FormArray;
    }

    private setupFormSubscriptions() {
        // Filtro de introductores
        this.form
            .get('introducerSearch')
            ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
            .subscribe((value) => {
                if (!this.introducerLocked) {
                    this.filterIntroducers(value);
                }
            });

        // Filtro de procesos de faenamiento
        this.form
            .get('slaughterProcessSearch')
            ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
            .subscribe((value) => {
                this.filterSlaughterProcesses(value);
            });

        // Recalcular totales cuando cambien los items
        this.items.valueChanges.subscribe(() => {
            this.calculateTotals();
        });

        // Cuando cambia el tipo de factura, cargar tarifas correspondientes
        this.form.get('type')?.valueChanges.subscribe((type) => {
            this.filterRatesByInvoiceType(type);
        });

        // Cuando cambia el introductor, filtrar procesos de faenamiento
        this.form
            .get('introducerId')
            ?.valueChanges.subscribe((introducerId) => {
                if (introducerId && !this.introducerLocked) {
                    this.filterSlaughterProcessesByIntroducer(introducerId);
                }
            });
    }

    private filterRatesByInvoiceType(invoiceType: string) {
        if (!invoiceType || this.rates.length === 0) {
            this.filteredRates = [];
            return;
        }

        const selectedType = this.typeOptions.find(
            (t) => t.value.toLowerCase() === invoiceType.toLowerCase()
        );

        if (!selectedType) {
            this.filteredRates = [];
            return;
        }

        // Filtrar por tipo
        let filteredByType = this.rates.filter(
            (rate) =>
                rate.type.toLowerCase() === selectedType.rateType.toLowerCase()
        );

        // Restricción: Si hay proceso de faenamiento y es tipo TARIFA, bloquear
        if (
            this.selectedSlaughterProcess &&
            (selectedType.rateType === 'TARIFA' ||
                selectedType.rateType === 'TASA')
        ) {
            this.filteredRates = [];
            this.messageService.add({
                severity: 'warn',
                summary: 'Restricción',
                detail: 'No se pueden usar tarifas de inscripción cuando hay un proceso de faenamiento seleccionado',
            });
            return;
        }

        // Filtrar por tipo de persona del introductor
        if (this.selectedIntroducer) {
            const introducerPersonType = this.selectedIntroducer.personType;
            filteredByType = filteredByType.filter((rate) =>
                rate.personType.includes(introducerPersonType)
            );

            // Filtrar por tipos de animal del introductor
            if (this.selectedIntroducer.cattleTypes?.length > 0) {
                const introducerAnimalTypeIds =
                    this.selectedIntroducer.cattleTypes.map((ct: any) =>
                        typeof ct === 'string' ? ct : String(ct._id)
                    );

                filteredByType = filteredByType.filter(
                    (rate) =>
                        Array.isArray(rate.animalTypes) &&
                        rate.animalTypes.some((animalType: any) =>
                            introducerAnimalTypeIds.includes(
                                typeof animalType === 'string'
                                    ? animalType
                                    : String(animalType._id)
                            )
                        )
                );
            }
        }

        // Si hay proceso de faenamiento, también filtrar por sus tipos de animal
        if (this.selectedSlaughterProcess) {
            const processAnimalTypes = this.getSlaughterProcessAnimalTypes();
            if (processAnimalTypes.length > 0) {
                filteredByType = filteredByType.filter(
                    (rate) =>
                        Array.isArray(rate.animalTypes) &&
                        rate.animalTypes.some((animalType: any) =>
                            processAnimalTypes.includes(
                                typeof animalType === 'string'
                                    ? animalType
                                    : String(animalType._id)
                            )
                        )
                );
            }
        }

        // Ordenar por posición
        this.filteredRates = filteredByType.sort(
            (a, b) => a.position - b.position
        );
    }

    private getSlaughterProcessAnimalTypes(): string[] {
        if (!this.selectedSlaughterProcess?.inspeccionesExternas) {
            return [];
        }

        const animalTypes: string[] = [];
        this.selectedSlaughterProcess.inspeccionesExternas.forEach(
            (inspection: any) => {
                if (inspection.especie) {
                    const specieId =
                        typeof inspection.especie === 'string'
                            ? inspection.especie
                            : inspection.especie._id;
                    if (!animalTypes.includes(specieId)) {
                        animalTypes.push(specieId);
                    }
                }
            }
        );

        return animalTypes;
    }

    private filterSlaughterProcessesByIntroducer(introducerId: string) {
        if (!introducerId) {
            this.filteredSlaughterProcesses = this.slaughterProcesses;
            return;
        }

        this.filteredSlaughterProcesses = this.slaughterProcesses.filter(
            (process) => {
                const processIntroducerId =
                    typeof process.introductor === 'string'
                        ? process.introductor
                        : process.introductor?._id;
                return processIntroducerId === introducerId;
            }
        );
    }

    private loadInvoice() {
        if (!this.invoiceId) return;

        this.loading = true;
        this.invoiceService.getById(this.invoiceId).subscribe({
            next: (invoice: any) => {
                this.form.patchValue({
                    invoiceNumber: invoice.invoiceNumber,
                    type: invoice.type,
                    introducerId: invoice.introducerId,
                    slaughterProcessId:
                        invoice.metadata?.slaughterProcessId || '',
                    subtotal: invoice.subtotal,
                    //taxes: invoice.taxes,
                    totalAmount: invoice.totalAmount,
                    dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
                    notes: invoice.notes || '',
                });

                // Cargar items y determinar el tipo de rate
                this.clearItems();
                if (invoice.items && invoice.items.length > 0) {
                    // Obtener el tipo del primer item para establecer el tipo de factura
                    const firstRate = this.rates.find(
                        (r) => r._id === invoice.items[0].rateId
                    );
                    if (firstRate) {
                        this.selectedInvoiceRateType = firstRate.type;
                    }

                    invoice.items.forEach((item: any) => {
                        this.addItem(item);
                    });
                }

                // Cargar introductor
                if (invoice.introducer) {
                    this.selectedIntroducer = invoice.introducer as any;
                    this.form
                        .get('introducerSearch')
                        ?.setValue(
                            this.getIntroducerDisplayName(
                                this.selectedIntroducer
                            )
                        );
                }

                // Cargar slaughter process si existe
                if (invoice.metadata?.slaughterProcessId) {
                    const slaughterProcess = this.slaughterProcesses.find(
                        (sp) => sp._id === invoice.metadata.slaughterProcessId
                    );
                    if (slaughterProcess) {
                        this.selectedSlaughterProcess = slaughterProcess;
                        this.form
                            .get('slaughterProcessSearch')
                            ?.setValue(
                                this.getSlaughterProcessDisplayName(
                                    slaughterProcess
                                )
                            );
                    }
                }

                this.loading = false;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar proforma: ' + error.message,
                });
                this.loading = false;
                this.router.navigate(['/invoices']);
            },
        });
    }

    private generateInvoiceNumber() {
        const date = new Date();
        const number = `PRF-${date.getFullYear()}-${String(
            date.getTime()
        ).slice(-6)}`;
        this.form.get('invoiceNumber')?.setValue(number);
    }

    filterIntroducers(query: string) {
        if (!query || query.trim() === '') {
            this.filteredIntroducers = [...this.introducers];
            return;
        }

        const queryLower = query.toLowerCase();
        this.filteredIntroducers = this.introducers.filter(
            (introducer: any) => {
                const nameMatch =
                    introducer.name?.toLowerCase().includes(queryLower) ||
                    false;
                const idMatch = introducer.idNumber?.includes(query) || false;
                const companyMatch =
                    introducer.companyName
                        ?.toLowerCase()
                        .includes(queryLower) || false;

                return nameMatch || idMatch || companyMatch;
            }
        );
    }

    filterSlaughterProcesses(query: string) {
        if (!query || query.trim() === '') {
            if (this.selectedIntroducer) {
                this.filterSlaughterProcessesByIntroducer(
                    this.selectedIntroducer._id
                );
            } else {
                this.filteredSlaughterProcesses = [...this.slaughterProcesses];
            }
            return;
        }

        const queryLower = query.toLowerCase();
        let processesToFilter = this.slaughterProcesses;

        if (this.selectedIntroducer) {
            processesToFilter = this.slaughterProcesses.filter((process) => {
                const processIntroducerId =
                    typeof process.introductor === 'string'
                        ? process.introductor
                        : process.introductor?._id;
                return processIntroducerId === this.selectedIntroducer!._id;
            });
        }

        this.filteredSlaughterProcesses = processesToFilter.filter(
            (process) => {
                const orderMatch =
                    process.numeroOrden?.toLowerCase().includes(queryLower) ||
                    false;
                const statusMatch =
                    process.estado?.toLowerCase().includes(queryLower) || false;

                return orderMatch || statusMatch;
            }
        );
    }

    selectIntroducer(introducer: any) {
        if (this.introducerLocked) {
            return;
        }
        console.log('selectIntroducer', introducer.value);
        this.selectedIntroducer = introducer.value;
        this.form.get('introducerId')?.setValue(introducer.value._id);
        this.form
            .get('introducerSearch')
            ?.setValue(this.getIntroducerDisplayName(introducer.value));
        this.filteredIntroducers = [];

        this.filterSlaughterProcessesByIntroducer(introducer.value._id);

        if (this.selectedSlaughterProcess) {
            const processIntroducerId =
                typeof this.selectedSlaughterProcess.introductor === 'string'
                    ? this.selectedSlaughterProcess.introductor
                    : this.selectedSlaughterProcess.introductor?._id;

            if (processIntroducerId !== introducer.value._id) {
                this.clearSlaughterProcessSelection();
            }
        }

        // Refiltrar rates por tipo de persona y animalTypes
        this.filterRatesByInvoiceType(this.form.get('type')?.value);
    }

    selectSlaughterProcess(slaughterProcess: any) {
        console.log('selectSlaughterProcess', slaughterProcess);
        this.selectedSlaughterProcess = slaughterProcess;
        this.form
            .get('slaughterProcessId')
            ?.setValue(slaughterProcess.value._id);
        this.form
            .get('slaughterProcessSearch')
            ?.setValue(
                this.getSlaughterProcessDisplayName(slaughterProcess.value)
            );
        this.filteredSlaughterProcesses = [];

        // Auto-seleccionar el introductor del proceso
        const introducerId =
            typeof slaughterProcess.value.introductor === 'string'
                ? slaughterProcess.value.introductor
                : slaughterProcess.value.introductor?._id;

        if (introducerId) {
            const introducer = this.introducers.find(
                (i) => i._id === introducerId
            );
            console.log('Introducer:', introducer);
            if (introducer) {
                this.selectedIntroducer = introducer;
                this.form.get('introducerId')?.setValue(introducer._id);
                this.form
                    .get('introducerSearch')
                    ?.setValue(this.getIntroducerDisplayName(introducer));

                this.introducerLocked = true;
                this.form.get('introducerId')?.disable();
            }
        }

        // NUEVA REGLA: Si el tipo actual es TARIFA y se selecciona un proceso, cambiar tipo
        const currentType = this.form.get('type')?.value;
        const currentTypeOption = this.typeOptions.find(
            (t) => t.value === currentType
        );

        if (currentTypeOption?.rateType === 'TARIFA') {
            // Cambiar a TASA si está disponible
            const tasaOption = this.typeOptions.find(
                (t) => t.rateType === 'TASA'
            );
            if (tasaOption) {
                this.form.get('type')?.setValue(tasaOption.value);
                this.messageService.add({
                    severity: 'info',
                    summary: 'Tipo Cambiado',
                    detail: 'El tipo se cambió automáticamente a Faenamiento debido al proceso seleccionado',
                });
            }
        }

        // Refiltrar rates
        this.filterRatesByInvoiceType(this.form.get('type')?.value);

        // Agregar nota automática si no hay notas previas
        const currentNotes = this.form.get('notes')?.value;
        if (!currentNotes) {
            this.form
                .get('notes')
                ?.setValue(
                    `Proforma generada para proceso de faenamiento ${slaughterProcess.value.numeroOrden}`
                );
        }
    }

    clearSlaughterProcessSelection() {
        this.selectedSlaughterProcess = null;
        this.form.get('slaughterProcessId')?.setValue('');
        this.form.get('slaughterProcessSearch')?.setValue('');

        this.introducerLocked = false;
        this.form.get('introducerId')?.enable();

        // Refiltrar rates sin la restricción de slaughter process
        this.filterRatesByInvoiceType(this.form.get('type')?.value);

        const currentNotes = this.form.get('notes')?.value;
        if (
            currentNotes &&
            currentNotes.includes(
                'Proforma generada para proceso de faenamiento'
            )
        ) {
            this.form.get('notes')?.setValue('');
        }
    }

    addItem(itemData?: any, rate?: Rate) {
        // NUEVA VALIDACIÓN: Verificar compatibilidad de tipos
        if (rate && this.items.length > 0) {
            if (
                this.selectedInvoiceRateType &&
                this.selectedInvoiceRateType !== rate.type
            ) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Tipo Incompatible',
                    detail: `No se puede agregar un item de tipo ${rate.type} cuando ya hay items de tipo ${this.selectedInvoiceRateType}`,
                });
                return;
            }
        }

        // Establecer el tipo de rate de la factura
        if (rate && !this.selectedInvoiceRateType) {
            this.selectedInvoiceRateType = rate.type;
        }

        const item = this.fb.group({
            rateId: [itemData?.rateId || rate?._id || null],
            description: [
                itemData?.description || rate?.description || '',
                Validators.required,
            ],
            quantity: [
                itemData?.quantity || 1,
                [Validators.required, Validators.min(1)],
            ],
            unitPrice: [
                itemData?.unitPrice || rate?.unitPrice || 0,
                [Validators.required, Validators.min(0)],
            ],
            total: [{ value: itemData?.total || 0, disabled: true }],
        });

        item.get('quantity')?.valueChanges.subscribe(() =>
            this.calculateItemTotal(item)
        );
        item.get('unitPrice')?.valueChanges.subscribe(() =>
            this.calculateItemTotal(item)
        );

        this.items.push(item);
        this.calculateItemTotal(item);
    }

    removeItem(index: number) {
        this.items.removeAt(index);

        // Si no quedan items, resetear el tipo de rate seleccionado
        if (this.items.length === 0) {
            this.selectedInvoiceRateType = null;
        }

        this.calculateTotals();
    }

    private calculateTotals() {
        if (this.items.length === 0) {
            this.form.get('subtotal')?.setValue(0, { emitEvent: false });
            this.form.get('totalAmount')?.setValue(0, { emitEvent: false });
            this.calculationError = false;
            return;
        }

        const itemsToCalculate = this.items.value
            .filter((item: any) => item.rateId)
            .map((item: any) => ({
                rateId: item.rateId,
                quantity: item.quantity,
            }));

        if (itemsToCalculate.length === 0) {
            this.calculateManually();
            return;
        }

        this.oracleService
            .calculateInvoiceItems(itemsToCalculate)
            .pipe(
                catchError((error) => {
                    console.error('Error calculating totals:', error);
                    this.calculationError = true;
                    this.calculateManually();
                    return of(null);
                })
            )
            .subscribe({
                next: (response: any) => {
                    console.log('Respuesta de calculo:', response);
                    if (
                        response?.success &&
                        response?.data &&
                        Array.isArray(response.data)
                    ) {
                        const subtotal = response.data.reduce(
                            (sum: number, item: any) => {
                                return sum + (item.totalAmount || 0);
                            },
                            0
                        );

                        this.items.controls.forEach(
                            (formItem: any, index: number) => {
                                const rateId = formItem.get('rateId')?.value;
                                if (rateId) {
                                    const calculatedItem = response.data.find(
                                        (item: any) => item.rateId === rateId
                                    );
                                    if (calculatedItem) {
                                        formItem
                                            .get('unitPrice')
                                            ?.setValue(
                                                calculatedItem.unitPrice,
                                                { emitEvent: false }
                                            );
                                        formItem
                                            .get('description')
                                            ?.setValue(
                                                calculatedItem.description,
                                                { emitEvent: false }
                                            );
                                        formItem
                                            .get('total')
                                            ?.setValue(
                                                calculatedItem.totalAmount,
                                                { emitEvent: false }
                                            );
                                    }
                                }
                            }
                        );

                        this.form
                            .get('subtotal')
                            ?.setValue(subtotal, { emitEvent: false });
                        this.form
                            .get('totalAmount')
                            ?.setValue(subtotal, { emitEvent: false });
                        this.calculationError = false;
                    } else {
                        this.calculationError = true;
                        this.calculateManually();
                        this.messageService.add({
                            severity: 'warn',
                            summary: 'Cálculo Manual',
                            detail: 'No se recibieron datos válidos del servicio de cálculo. Se usó cálculo manual.',
                        });
                    }
                },
            });
    }

    private calculateManually() {
        const subtotal = this.items.value.reduce(
            (sum: number, item: any) => sum + (item.total || 0),
            0
        );
        const total = subtotal;

        this.form.get('subtotal')?.setValue(subtotal, { emitEvent: false });
        // this.form.get('taxes')?.setValue(0, { emitEvent: false });
        this.form.get('totalAmount')?.setValue(total, { emitEvent: false });
    }

    private calculateItemTotal(item: FormGroup) {
        const quantity = item.get('quantity')?.value || 0;
        const unitPrice = item.get('unitPrice')?.value || 0;
        const total = quantity * unitPrice;
        item.get('total')?.setValue(total, { emitEvent: false });
    }

    private clearItems() {
        while (this.items.length !== 0) {
            this.items.removeAt(0);
        }
        this.selectedInvoiceRateType = null;
    }

    onSubmit() {
        if (this.form.invalid) {
            this.markFormGroupTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario Inválido',
                detail: 'Complete todos los campos requeridos',
            });
            return;
        }

        if (this.items.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Items Requeridos',
                detail: 'Debe agregar al menos un item a la proforma',
            });
            return;
        }

        this.loading = true;
        const formData = this.form.getRawValue();

        delete formData.introducerSearch;
        delete formData.slaughterProcessSearch;

        if (formData.slaughterProcessId) {
            formData.metadata = {
                slaughterProcessId: formData.slaughterProcessId,
                version: '1.0',
                tags: [],
            };
        }

        delete formData.slaughterProcessId;

        const operation = this.isEditMode
            ? this.invoiceService.update(this.invoiceId!, formData)
            : this.invoiceService.create(formData);

        operation.subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: `Proforma ${
                        this.isEditMode ? 'actualizada' : 'creada'
                    } correctamente`,
                });
                this.router.navigate(['/invoices']);
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail:
                        `Error al ${
                            this.isEditMode ? 'actualizar' : 'crear'
                        } proforma: ` + error.message,
                });
                this.loading = false;
            },
        });
    }

    onCancel() {
        this.router.navigate(['/invoices']);
    }

    private markFormGroupTouched() {
        Object.keys(this.form.controls).forEach((key) => {
            const control = this.form.get(key);
            control?.markAsTouched();
        });

        this.items.controls.forEach((item) => {
            const group = item as FormGroup;
            Object.keys(group.controls).forEach((key) => {
                group.get(key)?.markAsTouched();
            });
        });
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.form.get(fieldName);
        return !!(field?.invalid && (field?.dirty || field?.touched));
    }

    isItemFieldInvalid(index: number, fieldName: string): boolean {
        const field = this.items.at(index).get(fieldName);
        return !!(field?.invalid && (field?.dirty || field?.touched));
    }

    getIntroducerDisplayName(introducer: any): string {
        if (introducer.personType === 'Natural') {
            return introducer.name;
        } else {
            return introducer.companyName || 'Sin nombre';
        }
    }

    getSlaughterProcessDisplayName(slaughterProcess: SlaughterProcess): string {
        return `${slaughterProcess.numeroOrden} - ${slaughterProcess.estado}`;
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    }

    getFieldError(fieldName: string): string {
        const field = this.form.get(fieldName);
        if (field?.errors?.['required']) {
            return 'Este campo es requerido';
        }
        if (field?.errors?.['min']) {
            return `El valor mínimo es ${field.errors['min'].min}`;
        }
        return '';
    }

    getSelectedTypeDescription(): string {
        const selectedType = this.typeOptions.find(
            (t) => t.value === this.form.get('type')?.value
        );
        return selectedType?.description || '';
    }

    // NUEVO MÉTODO: Verificar si un rate es compatible con los items actuales
    isRateCompatible(rate: Rate): boolean {
        if (this.items.length === 0) {
            return true;
        }
        return (
            !this.selectedInvoiceRateType ||
            this.selectedInvoiceRateType === rate.type
        );
    }

    // NUEVO MÉTODO: Obtener mensaje de incompatibilidad
    getIncompatibilityMessage(rate: Rate): string {
        if (
            this.selectedInvoiceRateType &&
            this.selectedInvoiceRateType !== rate.type
        ) {
            return `No compatible: esta factura ya contiene items de tipo ${this.selectedInvoiceRateType}`;
        }
        return '';
    }

    // NUEVO MÉTODO: Obtener severidad del badge según tipo de rate
    getRateBadgeSeverity(
        rateType: string
    ): 'success' | 'info' | 'warning' | 'secondary' {
        switch (rateType) {
            case 'TASA':
                return 'success';
            case 'TARIFA':
                return 'info';
            case 'SERVICIOS':
                return 'warning';
            default:
                return 'secondary';
        }
    }

    // NUEVO MÉTODO: Limpiar selección de introductor
    clearIntroducerSelection() {
        if (this.introducerLocked) {
            return;
        }

        this.selectedIntroducer = null;
        this.form.get('introducerId')?.setValue('');
        this.form.get('introducerSearch')?.setValue('');
        this.filteredIntroducers = [...this.introducers];

        // Limpiar slaughter process también
        this.clearSlaughterProcessSelection();

        // Refiltrar rates
        this.filterRatesByInvoiceType(this.form.get('type')?.value);
    }

    // NUEVO MÉTODO: Obtener tipos de animal del introductor
    getIntroducerAnimalTypes(): string[] {
        if (!this.selectedIntroducer?.cattleTypes) {
            return [];
        }

        return this.selectedIntroducer.cattleTypes.map((ct) =>
            typeof ct === 'string' ? ct : ct._id
        );
    }

    // NUEVO MÉTODO: Verificar si el rate actual es del tipo seleccionado en la factura
    isCurrentInvoiceRateType(rateType: string): boolean {
        return (
            !this.selectedInvoiceRateType ||
            this.selectedInvoiceRateType === rateType
        );
    }

    // NUEVO MÉTODO: Obtener descripción del tipo de factura actual
    getCurrentInvoiceTypeDescription(): string {
        if (!this.selectedInvoiceRateType) {
            return '';
        }

        switch (this.selectedInvoiceRateType) {
            case 'TASA':
                return 'Servicios de Faenamiento';
            case 'TARIFA':
                return 'Tasas de Inscripción y Registro';
            case 'SERVICIOS':
                return 'Servicios Adicionales y Complementarios';
            default:
                return this.selectedInvoiceRateType;
        }
    }
}
