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

interface Rate {
    _id: string;
    type: 'TASA' | 'TARIFA' | 'SERVICIOS';
    description: string;
    code: string;
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
    form: FormGroup;
    loading = false;
    isEditMode = false;
    invoiceId: string | null = null;
    introducers: Introducer[] = [];
    filteredIntroducers: Introducer[] = [];
    selectedIntroducer: Introducer | null = null;
    rates: Rate[] = [];
    filteredRates: Rate[] = [];
    typeOptions: ProformaType[] = [];
    loadingRates = true;
    calculationError = false;

    constructor(
        private fb: FormBuilder,
        private invoiceService: InvoiceService,
        private introducerService: IntroducerService,
        private oracleService: OracleService,
        private rateService: RateService,
        private route: ActivatedRoute,
        private router: Router,
        private messageService: MessageService
    ) {
        this.form = this.createForm();
    }

    ngOnInit() {
        this.invoiceId = this.route.snapshot.paramMap.get('id');
        this.isEditMode = !!this.invoiceId;

        // Primero cargar rates para determinar tipos disponibles
        this.loadInitialData();
    }

    private loadInitialData() {
        this.loading = true;

        forkJoin({
            rates: this.rateService.getAll(),
            introducers: this.introducerService.getAll(),
        }).subscribe({
            next: (data: any) => {
                console.log('Datos cargados:', data);
                this.rates = data.rates;
                this.introducers = data.introducers;
                this.filteredIntroducers = data.introducers;

                this.generateTypeOptionsFromRates();
                this.setupFormSubscriptions();

                if (this.isEditMode) {
                    this.loadInvoice();
                } else {
                    this.generateInvoiceNumber();
                    // Establecer tipo por defecto si hay opciones disponibles
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
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error de Carga',
                    detail: 'Error al cargar datos iniciales: ' + error.message,
                });
                this.loading = false;
                this.loadingRates = false;
            },
        });
    }

    private generateTypeOptionsFromRates() {
        const rateTypes = [...new Set(this.rates.map((rate) => rate.type))];

        this.typeOptions = rateTypes.map((rateType) => {
            switch (rateType) {
                case 'TASA':
                    return {
                        label: 'Inscripción',
                        value: 'INSCRIPTION',
                        rateType: 'TASA',
                        description: 'Tasas de inscripción y registro',
                    };
                case 'TARIFA':
                    return {
                        label: 'Faenamiento',
                        value: 'SLAUGHTER_SERVICE',
                        rateType: 'TARIFA',
                        description: 'Servicios de faenamiento',
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

        // Agregar opción mixta si hay más de un tipo
        if (this.typeOptions.length > 1) {
            this.typeOptions.push({
                label: 'Mixta',
                value: 'MIXED',
                rateType: 'ALL',
                description: 'Combina diferentes tipos de servicios',
            });
        }
    }

    private createForm(): FormGroup {
        return this.fb.group({
            invoiceNumber: ['', Validators.required],
            type: ['', Validators.required],
            introducerId: ['', Validators.required],
            introducerSearch: [''],
            items: this.fb.array([]),
            subtotal: [{ value: 0, disabled: true }],
            taxes: [{ value: 0, disabled: true }],
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
                this.filterIntroducers(value);
            });

        // Recalcular totales cuando cambien los items
        this.items.valueChanges.subscribe(() => {
            this.calculateTotals();
        });

        // Cuando cambia el tipo de factura, cargar tarifas correspondientes
        this.form.get('type')?.valueChanges.subscribe((type) => {
            this.filterRatesByInvoiceType(type);
        });
    }

    private filterRatesByInvoiceType(invoiceType: string) {
        if (!invoiceType || this.rates.length === 0) {
            this.filteredRates = [];
            return;
        }

        const selectedType = this.typeOptions.find(
            (t) => t.value === invoiceType
        );

        if (!selectedType) {
            this.filteredRates = [];
            return;
        }

        if (selectedType.rateType === 'ALL') {
            // Para tipo mixto, mostrar todas las rates
            this.filteredRates = this.rates.sort(
                (a, b) => a.position - b.position
            );
        } else {
            // Filtrar por tipo específico
            this.filteredRates = this.rates
                .filter((rate) => rate.type === selectedType.rateType)
                .sort((a, b) => a.position - b.position);
        }

        // Filtrar por tipo de persona del introductor seleccionado
        if (this.selectedIntroducer) {
            this.filteredRates = this.filteredRates.filter((rate) =>
                rate.personType.includes(
                    this.selectedIntroducer!.personType as any
                )
            );
        }
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
                    subtotal: invoice.subtotal,
                    taxes: invoice.taxes,
                    totalAmount: invoice.totalAmount,
                    dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
                    notes: invoice.notes || '',
                });

                // Cargar items
                this.clearItems();
                invoice.items.forEach((item: any) => {
                    this.addItem(item);
                });

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
        if (!query) {
            this.filteredIntroducers = this.introducers;
            return;
        }

        this.filteredIntroducers = this.introducers.filter(
            (introducer: any) =>
                this.getIntroducerDisplayName(introducer)
                    .toLowerCase()
                    .includes(query.toLowerCase()) ||
                introducer.idNumber.includes(query)
        );
    }

    selectIntroducer(introducer: any) {
        this.selectedIntroducer = introducer;
        this.form.get('introducerId')?.setValue(introducer._id);
        this.form
            .get('introducerSearch')
            ?.setValue(this.getIntroducerDisplayName(introducer));
        this.filteredIntroducers = [];

        // Refiltrar rates por tipo de persona
        this.filterRatesByInvoiceType(this.form.get('type')?.value);
    }

    addItem(itemData?: any, rate?: Rate) {
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

        // Recalcular total del item cuando cambien cantidad o precio
        item.get('quantity')?.valueChanges.subscribe(() =>
            this.calculateItemTotal(item)
        );
        item.get('unitPrice')?.valueChanges.subscribe(() =>
            this.calculateItemTotal(item)
        );

        this.items.push(item);

        // Calcular total inicial
        this.calculateItemTotal(item);
    }

    removeItem(index: number) {
        this.items.removeAt(index);
        this.calculateTotals();
    }

    private calculateItemTotal(item: FormGroup) {
        const quantity = item.get('quantity')?.value || 0;
        const unitPrice = item.get('unitPrice')?.value || 0;
        const total = quantity * unitPrice;
        item.get('total')?.setValue(total, { emitEvent: false });
    }

    private calculateTotals() {
        if (this.items.length === 0) {
            this.form.get('subtotal')?.setValue(0);
            this.form.get('taxes')?.setValue(0);
            this.form.get('totalAmount')?.setValue(0);
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
            // Cálculo manual si no hay items con rateId
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
                    if (response && response.subtotal !== undefined) {
                        this.form.get('subtotal')?.setValue(response.subtotal);
                        this.form.get('taxes')?.setValue(response.taxes || 0);
                        this.form.get('totalAmount')?.setValue(response.total);
                        this.calculationError = false;
                    } else {
                        this.calculationError = true;
                        this.calculateManually();
                        this.messageService.add({
                            severity: 'warn',
                            summary: 'Cálculo Manual',
                            detail: 'No se recibieron datos del servicio de cálculo. Se usó cálculo manual.',
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
        const taxes = subtotal * 0.12; // IVA 12%
        const total = subtotal + taxes;

        this.form.get('subtotal')?.setValue(subtotal);
        this.form.get('taxes')?.setValue(taxes);
        this.form.get('totalAmount')?.setValue(total);
    }

    private clearItems() {
        while (this.items.length !== 0) {
            this.items.removeAt(0);
        }
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

        // Limpiar campos de búsqueda
        delete formData.introducerSearch;

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
        if (introducer.type === 'Natural') {
            return introducer.name;
        } else {
            return introducer.companyName || 'Sin nombre';
        }
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
}
