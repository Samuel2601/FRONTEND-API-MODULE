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
} from 'rxjs';
import { ImportsModule } from 'src/app/demo/services/import';
import { Introducer } from 'src/app/zoosanitario/interfaces/invoice.interface';
import { IntroducerService } from 'src/app/zoosanitario/services/introducer.service';
import { InvoiceService } from 'src/app/zoosanitario/services/invoice.service';
import { OracleService } from 'src/app/zoosanitario/services/oracle.service';
import { RateService } from 'src/app/zoosanitario/services/rate.service';

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
    rates: any[] = [];
    filteredRates: any[] = [];

    typeOptions = [
        { label: 'Inscripción', value: 'INSCRIPTION' },
        { label: 'Servicio de Faenamiento', value: 'SLAUGHTER_SERVICE' },
        { label: 'Servicios Adicionales', value: 'ADDITIONAL_SERVICE' },
        { label: 'Multa', value: 'FINE' },
        { label: 'Mixta', value: 'MIXED' },
    ];

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

        this.loadIntroducers();
        this.loadRates();

        if (this.isEditMode) {
            this.loadInvoice();
        } else {
            this.generateInvoiceNumber();
        }

        this.setupFormSubscriptions();
    }

    private createForm(): FormGroup {
        return this.fb.group({
            invoiceNumber: ['', Validators.required],
            type: ['SLAUGHTER_SERVICE', Validators.required],
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

    private loadIntroducers() {
        this.introducerService.getAll().subscribe({
            next: (introducers: any) => {
                this.introducers = introducers;
                this.filteredIntroducers = introducers;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar introductores: ' + error.message,
                });
            },
        });
    }

    private loadRates() {
        this.rateService.getAll().subscribe({
            next: (rates: any) => {
                this.rates = rates;
                this.filteredRates = rates;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar tarifas: ' + error.message,
                });
            },
        });
    }

    private filterRatesByInvoiceType(invoiceType: string) {
        let rateType = 'TARIFA';

        switch (invoiceType) {
            case 'INSCRIPTION':
                rateType = 'TASA';
                break;
            case 'FINE':
                rateType = 'MULTA';
                break;
            case 'ADDITIONAL_SERVICE':
                rateType = 'SERVICIOS';
                break;
        }

        this.filteredRates = this.rates.filter(
            (rate) => rate.type === rateType
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
                            this.getIntroducerName(this.selectedIntroducer)
                        );
                }

                this.loading = false;
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar factura: ' + error.message,
                });
                this.loading = false;
                this.router.navigate(['/invoices']);
            },
        });
    }

    private generateInvoiceNumber() {
        const date = new Date();
        const number = `FAC-${date.getFullYear()}-${String(
            date.getTime()
        ).slice(-4)}`;
        this.form.get('invoiceNumber')?.setValue(number);
    }

    filterIntroducers(query: string) {
        if (!query) {
            this.filteredIntroducers = this.introducers;
            return;
        }

        this.filteredIntroducers = this.introducers.filter(
            (introducer: any) =>
                this.getIntroducerName(introducer)
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
            ?.setValue(this.getIntroducerName(introducer));
        this.filteredIntroducers = [];
    }

    addItem(itemData?: any, rate?: any) {
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
                itemData?.unitPrice || 0,
                [Validators.required, Validators.min(0)],
            ],
            total: [{ value: itemData?.total || 0, disabled: true }],
        });

        // Si es un nuevo item con tarifa, calcular el precio unitario
        if (rate && !itemData) {
            this.calculateUnitPrice(item, rate._id).subscribe((price) => {
                item.get('unitPrice')?.setValue(price);
                this.calculateItemTotal(item);
            });
        }

        // Recalcular total del item cuando cambien cantidad o precio
        item.get('quantity')?.valueChanges.subscribe(() =>
            this.calculateItemTotal(item)
        );
        item.get('unitPrice')?.valueChanges.subscribe(() =>
            this.calculateItemTotal(item)
        );

        this.items.push(item);

        if (itemData) {
            this.calculateItemTotal(item);
        }
    }

    private calculateUnitPrice(
        item: FormGroup,
        rateId: string
    ): Observable<number> {
        return this.oracleService
            .calculateInvoiceItems([
                {
                    rateId,
                    quantity: item.get('quantity')?.value || 1,
                },
            ])
            .pipe(
                switchMap((response: any) => {
                    if (
                        response &&
                        response.items &&
                        response.items.length > 0
                    ) {
                        return of(response.items[0].unitPrice);
                    }
                    return of(0);
                })
            );
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
            return;
        }

        const itemsToCalculate = this.items.value.map((item: any) => ({
            rateId: item.rateId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
        }));

        this.oracleService.calculateInvoiceItems(itemsToCalculate).subscribe({
            next: (response) => {
                this.form.get('subtotal')?.setValue(response.subtotal);
                this.form.get('taxes')?.setValue(response.taxes);
                this.form.get('totalAmount')?.setValue(response.total);
            },
            error: (error) => {
                console.error('Error calculating totals:', error);
                // Calcular manualmente si falla el servicio
                const subtotal = this.items.value.reduce(
                    (sum: number, item: any) => sum + (item.total || 0),
                    0
                );
                this.form.get('subtotal')?.setValue(subtotal);
                this.form.get('taxes')?.setValue(subtotal * 0.12); // Asumir 12% de impuestos
                this.form.get('totalAmount')?.setValue(subtotal * 1.12);
            },
        });
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
                detail: 'Debe agregar al menos un item a la factura',
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
                    detail: `Factura ${
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
                        } factura: ` + error.message,
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

    getIntroducerName(introducer: any): string {
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

    getIntroducerDisplayName(introducer: any): string {
        if (introducer.type === 'Natural') {
            return introducer.name;
        } else {
            return introducer.companyName || 'Sin nombre';
        }
    }
}
