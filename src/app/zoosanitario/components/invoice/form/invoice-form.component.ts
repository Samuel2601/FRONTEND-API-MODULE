import { Component, OnInit, OnDestroy } from '@angular/core';
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
    Subject,
    takeUntil,
    BehaviorSubject,
    combineLatest,
    timer,
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
    code_tributo: string;
    rubroxAtributo: string;
    position: number;
    unitPrice?: number;
    animalTypes: string[];
    personType: ('Natural' | 'Jurídica')[];
    quantityConfig: {
        maxQuantity?: number;
        isUnlimited: boolean;
        maxQuantityBasedOnRate?: string;
    };
    invoiceConfig: {
        allowInvoice: boolean;
        alwaysInclude: boolean;
        automaticCharge: boolean;
        chargeFrequency: string;
        uniqueByIntroducerYear: boolean;
    };
    dependencies: {
        requiresPreviousRate?: string;
        requiresSlaughterProcess: boolean;
        standaloneAllowed: boolean;
    };
    validationRules: {
        prerequisiteRates: string[];
        quantityValidationRate?: string;
        quantityValidationType: string;
    };
}

interface ProformaType {
    label: string;
    value: string;
    rateType: string;
    description: string;
    codeTributo: string;
}

interface ValidationCache {
    hash: string;
    timestamp: number;
    result: boolean;
    filteredRates: Rate[];
}

@Component({
    selector: 'app-invoice-form',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './invoice-form.component.html',
    styleUrls: ['./invoice-form.component.scss'],
    providers: [MessageService],
})
export class InvoiceFormComponent implements OnInit, OnDestroy {
    // Form and basic properties
    form: FormGroup;
    loading = false;
    isEditMode = false;
    invoiceId: string | null = null;

    // Search properties
    introducerSearch: string = '';
    slaughterProcessSearch: string = '';

    // Data arrays
    introducers: Introducer[] = [];
    filteredIntroducers: Introducer[] = [];
    slaughterProcesses: SlaughterProcess[] = [];
    filteredSlaughterProcesses: SlaughterProcess[] = [];
    rates: Rate[] = [];
    rates_const: Rate[] = [];
    filteredRates: Rate[] = [];
    typeOptions: ProformaType[] = [];

    // Selected entities
    selectedIntroducer: any | null = null;
    selectedSlaughterProcess: SlaughterProcess | null = null;
    slaughterProcessDetails: SlaughterProcess | null = null;
    selectedCodeTributo: string | null = null;

    // State flags
    loadingRates = true;
    loadingSlaughterProcesses = false;
    isLoadingSlaughterProcess = false;
    calculationError = false;
    introducerLocked = false;
    isCalculating = false;

    // Optimization properties
    retryCount = 0;
    maxRetries = 3;
    private validationCache: ValidationCache | null = null;
    private validationCacheTimeout = 5000;
    private lastValidationHash = '';
    private lastCalculationHash = '';
    private baseRetryDelay = 1000;

    // Reactive properties
    private destroy$ = new Subject<void>();
    private calculateSubject$ = new Subject<any[]>();

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
        this.setupCalculationOptimization();
        this.loadInitialData();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ===============================
    // FORM CREATION AND SETUP
    // ===============================

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
            totalAmount: [{ value: 0, disabled: true }],
            dueDate: [null, Validators.required],
            notes: [''],
        });
    }

    get items(): FormArray {
        return this.form.get('items') as FormArray;
    }

    private setupFormSubscriptions() {
        // Introducer search with debounce
        this.form
            .get('introducerSearch')
            ?.valueChanges.pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe((value) => {
                if (!this.introducerLocked) {
                    this.filterIntroducers(value);
                }
            });

        // Slaughter process search with debounce
        this.form
            .get('slaughterProcessSearch')
            ?.valueChanges.pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe((value) => {
                this.filterSlaughterProcesses(value);
            });

        // Items changes with smart debouncing
        this.items.valueChanges
            .pipe(
                debounceTime(800),
                distinctUntilChanged((prev, curr) => {
                    const prevWithRates = prev.filter((item) => item.rateId);
                    const currWithRates = curr.filter((item) => item.rateId);

                    if (prevWithRates.length !== currWithRates.length) {
                        return false;
                    }

                    return prevWithRates.every((prevItem, index) => {
                        const currItem = currWithRates[index];
                        return (
                            prevItem.rateId === currItem.rateId &&
                            prevItem.quantity === currItem.quantity
                        );
                    });
                }),
                takeUntil(this.destroy$)
            )
            .subscribe((items) => {
                this.handleItemsChange(items);
            });

        // Invoice type changes
        this.form
            .get('type')
            ?.valueChanges.pipe(takeUntil(this.destroy$))
            .subscribe((type) => {
                this.onInvoiceTypeChange(type);
            });

        // Introducer changes
        this.form
            .get('introducerId')
            ?.valueChanges.pipe(takeUntil(this.destroy$))
            .subscribe((introducerId) => {
                if (introducerId && !this.introducerLocked) {
                    this.filterSlaughterProcessesByIntroducer(introducerId);
                }
            });
    }

    // ===============================
    // CALCULATION OPTIMIZATION
    // ===============================

    private setupCalculationOptimization() {
        this.calculateSubject$
            .pipe(
                debounceTime(800),
                distinctUntilChanged((prev, curr) => {
                    const prevHash = this.generateCalculationHash(prev);
                    const currHash = this.generateCalculationHash(curr);
                    return prevHash === currHash;
                }),
                switchMap((itemsToCalculate) => {
                    if (this.isCalculating) {
                        return of(null);
                    }
                    return this.performCalculationWithRetry(itemsToCalculate);
                }),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (result) => {
                    if (result) {
                        this.processCalculationResult(result);
                    }
                },
                error: (error) => {
                    console.error('Error in calculation stream:', error);
                    this.handleCalculationError(error);
                },
            });
    }

    private generateCalculationHash(items: any[]): string {
        if (!items || items.length === 0) return 'empty';
        return items
            .map((item) => `${item.rateId}:${item.quantity}`)
            .sort()
            .join('|');
    }

    private generateValidationHash(): string {
        const introducerData = this.selectedIntroducer
            ? {
                  id: this.selectedIntroducer._id,
                  personType: this.selectedIntroducer.personType,
                  cattleTypes:
                      this.selectedIntroducer.cattleTypes?.map((ct: any) =>
                          typeof ct === 'string' ? ct : ct._id
                      ) || [],
              }
            : null;

        const slaughterData = this.slaughterProcessDetails
            ? {
                  id: this.slaughterProcessDetails._id,
                  animalTypes: this.getSlaughterProcessAnimalTypes(),
              }
            : null;

        const currentItems = this.items.value.map((item: any) => ({
            rateId: item.rateId,
            quantity: item.quantity,
        }));

        return JSON.stringify({
            codeTributo: this.selectedCodeTributo,
            introducer: introducerData,
            slaughter: slaughterData,
            items: currentItems,
            timestamp: Math.floor(Date.now() / this.validationCacheTimeout),
        });
    }

    private isValidationCacheValid(): boolean {
        if (!this.validationCache) return false;

        const now = Date.now();
        const cacheAge = now - this.validationCache.timestamp;

        if (cacheAge > this.validationCacheTimeout) return false;

        const currentHash = this.generateValidationHash();
        return this.validationCache.hash === currentHash;
    }

    private performCalculationWithRetry(
        itemsToCalculate: any[]
    ): Observable<any> {
        this.isCalculating = true;
        this.retryCount = 0;
        return this.attemptCalculation(itemsToCalculate);
    }

    private attemptCalculation(itemsToCalculate: any[]): Observable<any> {
        return this.oracleService.calculateInvoiceItems(itemsToCalculate).pipe(
            catchError((error) => {
                console.error('Error calculating totals:', error);

                if (error.status === 429 && this.retryCount < this.maxRetries) {
                    this.retryCount++;
                    const delay =
                        this.baseRetryDelay * Math.pow(2, this.retryCount - 1);

                    console.log(
                        `Reintentando cálculo en ${delay}ms (intento ${this.retryCount}/${this.maxRetries})`
                    );

                    return timer(delay).pipe(
                        switchMap(() =>
                            this.attemptCalculation(itemsToCalculate)
                        )
                    );
                }

                this.calculationError = true;
                this.calculateManually();
                return of(null);
            }),
            takeUntil(this.destroy$)
        );
    }

    private processCalculationResult(response: any) {
        this.isCalculating = false;
        this.retryCount = 0;

        console.log('Respuesta de calculo:', response);
        if (
            response?.success &&
            response?.data &&
            Array.isArray(response.data)
        ) {
            let totalFromAPI = 0;
            let totalFromManual = 0;

            // Process items with rates (from API)
            this.items.controls.forEach((formItem: any) => {
                const rateId = formItem.get('rateId')?.value;
                const isManual = formItem.get('isManual')?.value;

                if (rateId && !isManual) {
                    const calculatedItem = response.data.find(
                        (item: any) => item.rateId === rateId
                    );
                    if (calculatedItem) {
                        formItem.patchValue(
                            {
                                unitPrice: calculatedItem.unitPrice,
                                description: calculatedItem.description,
                                total: calculatedItem.totalAmount,
                            },
                            { emitEvent: false }
                        );

                        totalFromAPI += calculatedItem.totalAmount;
                    }
                } else if (isManual) {
                    // Calculate manual items locally
                    const quantity = formItem.get('quantity')?.value || 0;
                    const unitPrice = formItem.get('unitPrice')?.value || 0;
                    const total = quantity * unitPrice;

                    formItem.patchValue(
                        {
                            total: total,
                        },
                        { emitEvent: false }
                    );

                    totalFromManual += total;
                }
            });

            const subtotal = totalFromAPI + totalFromManual;

            this.form.patchValue(
                {
                    subtotal: subtotal,
                    totalAmount: subtotal,
                },
                { emitEvent: false }
            );

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
    }

    private handleCalculationError(error: any) {
        this.isCalculating = false;
        this.calculationError = true;
        this.calculateManually();

        if (error.status === 429) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Límite de Solicitudes',
                detail: 'Se alcanzó el límite de solicitudes. Usando cálculo manual temporalmente.',
            });
        } else {
            this.messageService.add({
                severity: 'warn',
                summary: 'Error de Cálculo',
                detail: 'Error en el servicio de cálculo. Usando cálculo manual.',
            });
        }
    }

    // ===============================
    // DATA LOADING
    // ===============================

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
                this.rates_const = data.rates;

                this.rates = this.rates_const.filter(
                    (rate) => rate.invoiceConfig?.allowInvoice === true
                );

                // Extract introducers from paginated response
                if (data.introducers?.data?.introducers) {
                    this.introducers = data.introducers.data.introducers;
                } else if (Array.isArray(data.introducers)) {
                    this.introducers = data.introducers;
                } else {
                    this.introducers = [];
                }
                this.filteredIntroducers = [...this.introducers];

                // Extract slaughter processes from paginated response
                if (data.slaughterProcesses?.docs) {
                    this.slaughterProcesses = data.slaughterProcesses.docs;
                } else if (Array.isArray(data.slaughterProcesses)) {
                    this.slaughterProcesses = data.slaughterProcesses;
                } else {
                    this.slaughterProcesses = [];
                }
                this.filteredSlaughterProcesses = [...this.slaughterProcesses];

                console.log('Introducers cargados:', this.introducers);
                console.log('Rates filtrados (allowInvoice=true):', this.rates);
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
                this.loadingRates = false;
                this.introducers = [];
                this.filteredIntroducers = [];
                this.slaughterProcesses = [];
                this.filteredSlaughterProcesses = [];
            },
        });
    }

    private generateTypeOptionsFromRates() {
        const ratesByCodeTributo = this.rates.reduce((acc, rate) => {
            if (!acc[rate.code_tributo]) {
                acc[rate.code_tributo] = [];
            }
            acc[rate.code_tributo].push(rate);
            return acc;
        }, {} as Record<string, Rate[]>);

        this.typeOptions = Object.keys(ratesByCodeTributo).map(
            (codeTributo) => {
                const rates = ratesByCodeTributo[codeTributo];
                const primaryRate = rates[0];

                let label = '';
                let description = '';

                switch (codeTributo) {
                    case '0':
                        label = 'Gastos Administrativos';
                        description = 'Gastos administrativos diversos';
                        break;
                    case '134':
                        label = 'Inscripción de Introductor';
                        description = 'Tarifas de inscripción de introductor';
                        break;
                    case '136':
                        label = 'Servicios de Faenamiento';
                        description = 'Servicios de faenamiento y corte';
                        break;
                    case '137':
                        label = 'Tasas por Uso de Corral';
                        description = 'Tasas por uso prolongado de corral';
                        break;
                    case '141':
                        label = 'Servicios Diversos PPOCF';
                        description = 'Servicios diversos según artículo 14';
                        break;
                    default:
                        label = `Código ${codeTributo}`;
                        description = `Servicios código ${codeTributo}`;
                }

                return {
                    label,
                    value: `CODE_TRIBUTO_${codeTributo}`,
                    rateType: primaryRate.type,
                    description,
                    codeTributo,
                };
            }
        );

        console.log('Type options generadas:', this.typeOptions);
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
                    totalAmount: invoice.totalAmount,
                    dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
                    notes: invoice.notes || '',
                });

                this.clearItems();
                if (invoice.items && invoice.items.length > 0) {
                    const firstRate = this.rates.find(
                        (r) => r._id === invoice.items[0].rateId
                    );
                    if (firstRate) {
                        this.selectedCodeTributo = firstRate.code_tributo;
                    }

                    invoice.items.forEach((item: any) => {
                        this.addItem(item);
                    });
                }

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
                this.router.navigate(['/zoosanitario/invoices']);
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

    // ===============================
    // FILTERING METHODS
    // ===============================

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

    private async filterRatesByInvoiceType() {
        if (this.isValidationCacheValid()) {
            this.filteredRates = this.validationCache!.filteredRates;
            return;
        }

        if (!this.selectedCodeTributo || this.rates.length === 0) {
            this.filteredRates = [];
            this.updateValidationCache([]);
            return;
        }

        let slaughterDetails = this.slaughterProcessDetails;

        if (
            this.selectedSlaughterProcess &&
            !this.slaughterProcessDetails &&
            !this.isLoadingSlaughterProcess
        ) {
            this.isLoadingSlaughterProcess = true;
            try {
                slaughterDetails = await this.slaughterProcessService
                    .getById(this.selectedSlaughterProcess._id, false)
                    .toPromise();
                this.slaughterProcessDetails = slaughterDetails;
                console.log(
                    'slaughterProcessDetails cargados:',
                    slaughterDetails
                );
            } catch (error) {
                console.error(
                    'Error cargando detalles del slaughter process:',
                    error
                );
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron cargar los detalles del proceso de faenamiento',
                });
            } finally {
                this.isLoadingSlaughterProcess = false;
            }
        }

        let filteredByCodeTributo = this.rates.filter(
            (rate) => rate.code_tributo === this.selectedCodeTributo
        );

        // Filter by introducer person type
        if (this.selectedIntroducer) {
            const introducerPersonType = this.selectedIntroducer.personType;
            filteredByCodeTributo = filteredByCodeTributo.filter((rate) =>
                rate.personType.includes(introducerPersonType)
            );

            // Filter by introducer animal types
            if (this.selectedIntroducer.cattleTypes?.length > 0) {
                const introducerAnimalTypeIds =
                    this.selectedIntroducer.cattleTypes.map((ct: any) =>
                        typeof ct === 'string' ? ct : String(ct._id)
                    );

                filteredByCodeTributo = filteredByCodeTributo.filter(
                    (rate) =>
                        rate.animalTypes.length === 0 ||
                        (Array.isArray(rate.animalTypes) &&
                            rate.animalTypes.some((animalType: any) =>
                                introducerAnimalTypeIds.includes(
                                    typeof animalType === 'string'
                                        ? animalType
                                        : String(animalType._id)
                                )
                            ))
                );
            }
        }

        // Filter by slaughter process dependencies
        filteredByCodeTributo = filteredByCodeTributo.filter((rate) => {
            if (
                rate.dependencies?.requiresSlaughterProcess &&
                !slaughterDetails
            ) {
                return false;
            }
            return true;
        });

        // Filter by slaughter process animal types
        if (slaughterDetails) {
            const processAnimalTypes =
                this.getSlaughterProcessAnimalTypesFromDetails(
                    slaughterDetails
                );
            if (processAnimalTypes.length > 0) {
                filteredByCodeTributo = filteredByCodeTributo.filter(
                    (rate) =>
                        rate.animalTypes.length === 0 ||
                        (Array.isArray(rate.animalTypes) &&
                            rate.animalTypes.some((animalType: any) =>
                                processAnimalTypes.includes(
                                    typeof animalType === 'string'
                                        ? animalType
                                        : String(animalType._id)
                                )
                            ))
                );
            }
        }

        this.filteredRates = filteredByCodeTributo.sort(
            (a, b) => a.position - b.position
        );
        this.updateValidationCache(this.filteredRates);

        console.log('Rates filtrados:', this.filteredRates);
    }

    private updateValidationCache(filteredRates: Rate[]) {
        this.validationCache = {
            hash: this.generateValidationHash(),
            timestamp: Date.now(),
            result: true,
            filteredRates: [...filteredRates],
        };
    }

    // ===============================
    // SELECTION METHODS
    // ===============================

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

        this.validationCache = null;
        this.filterRatesByInvoiceType();
    }

    async selectSlaughterProcess(slaughterProcess: any) {
        console.log('selectSlaughterProcess', slaughterProcess);
        this.selectedSlaughterProcess = slaughterProcess.value;
        this.form
            .get('slaughterProcessId')
            ?.setValue(slaughterProcess.value._id);
        this.form
            .get('slaughterProcessSearch')
            ?.setValue(
                this.getSlaughterProcessDisplayName(slaughterProcess.value)
            );
        this.filteredSlaughterProcesses = [];

        this.slaughterProcessDetails = null;
        this.validationCache = null;

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

        await this.filterRatesByInvoiceType();

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
        this.slaughterProcessDetails = null;
        this.validationCache = null;

        this.form.get('slaughterProcessId')?.setValue('');
        this.form.get('slaughterProcessSearch')?.setValue('');

        this.introducerLocked = false;
        this.form.get('introducerId')?.enable();

        this.filterRatesByInvoiceType();

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

    clearIntroducerSelection() {
        if (this.introducerLocked) {
            return;
        }

        this.selectedIntroducer = null;
        this.form.get('introducerId')?.setValue('');
        this.form.get('introducerSearch')?.setValue('');
        this.filteredIntroducers = [...this.introducers];

        this.clearSlaughterProcessSelection();

        this.validationCache = null;
        this.filterRatesByInvoiceType();
    }

    // ===============================
    // ITEM MANAGEMENT - CORE METHODS
    // ===============================

    addItem(itemData?: any, rate?: Rate) {
        console.log('addItem', itemData, rate);
        // Validate rate compatibility if rate is provided
        if (rate && !this.isRateCompatible(rate)) {
            this.messageService.add({
                severity: 'error',
                summary: 'Rate Incompatible',
                detail: this.getIncompatibilityMessage(rate),
            });
            return;
        }

        // Validate maximum quantity if specified and rate exists
        if (rate && !this.canAddRateQuantity(rate, itemData?.quantity || 1)) {
            console.log('Cant add quantity');
            return;
        }

        // Set invoice code_tributo if this is the first item and has rate
        if (rate && !this.selectedCodeTributo) {
            this.selectedCodeTributo = rate.code_tributo;
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
            isManual: [!rate], // Flag to identify manual items
        });

        // Add custom quantity validator only if rate exists
        if (rate) {
            item.get('quantity')?.addValidators(
                this.createQuantityValidator(rate)
            );
        }

        const itemIndex = this.items.length;
        this.items.push(item);

        // Setup listeners for this specific item
        this.setupItemFieldListeners(item, itemIndex);

        // Calculate initial total without triggering events
        this.calculateItemTotalSilent(item);

        // Trigger calculation based on item type
        if (rate) {
            setTimeout(() => {
                this.triggerCalculationOptimized();
            }, 0);
        } else {
            this.calculateManualTotals();
        }
    }

    addManualItem() {
        // Check that a invoice type is selected
        if (!this.selectedCodeTributo) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Seleccione Tipo de Factura',
                detail: 'Debe seleccionar un tipo de factura antes de agregar items manuales',
            });
            return;
        }

        const item = this.fb.group({
            rateId: [null],
            description: ['', Validators.required],
            quantity: [1, [Validators.required, Validators.min(1)]],
            unitPrice: [0, [Validators.required, Validators.min(0)]],
            total: [{ value: 0, disabled: true }],
            isManual: [true],
        });

        const itemIndex = this.items.length;
        this.items.push(item);

        // Setup listeners for this specific item
        this.setupItemFieldListeners(item, itemIndex);

        // Calculate initial total
        this.calculateItemTotalSilent(item);
        this.calculateManualTotals();

        this.messageService.add({
            severity: 'success',
            summary: 'Item Manual Agregado',
            detail: 'Item manual agregado correctamente. Complete la descripción y precios.',
        });
    }

    removeItem(index: number) {
        const removedItem = this.items.at(index);
        const rateId = removedItem.get('rateId')?.value;

        this.items.removeAt(index);

        // Reset selected code_tributo if no items remain
        if (this.items.length === 0) {
            this.selectedCodeTributo = null;
        }

        // Check if removed rate was required by others
        if (rateId) {
            const dependentRates = this.rates_const.filter(
                (r) =>
                    r.dependencies?.requiresPreviousRate === rateId ||
                    r.quantityConfig?.maxQuantityBasedOnRate === rateId
            );

            if (dependentRates.length > 0) {
                const affectedItems = this.items.value.filter((item: any) =>
                    dependentRates.some((dr) => dr._id === item.rateId)
                );

                if (affectedItems.length > 0) {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Dependencias Afectadas',
                        detail: `Al remover este item se afectan las validaciones de otros items`,
                    });
                }
            }
        }

        // Revalidate quantities after removing
        this.validateItemQuantities();
        this.calculateCombinedTotals();
    }

    // ===============================
    // ITEM FIELD LISTENERS
    // ===============================

    private setupItemFieldListeners(item: FormGroup, index: number) {
        // Listen to quantity changes
        item.get('quantity')
            ?.valueChanges.pipe(
                debounceTime(500),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                this.onItemFieldChange(item, index);
            });

        // Listen to unitPrice changes
        item.get('unitPrice')
            ?.valueChanges.pipe(
                debounceTime(500),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                this.onItemFieldChange(item, index);
            });
    }

    private onItemFieldChange(item: FormGroup, index: number) {
        const isManual = item.get('isManual')?.value;
        const rateId = item.get('rateId')?.value;

        if (isManual) {
            // For manual items, calculate locally
            this.calculateItemTotalSilent(item);
            this.calculateManualTotals();
        } else if (rateId) {
            // For items with rate, validate quantity and trigger API calculation
            this.validateItemQuantities();

            // Trigger calculation after a delay to avoid excessive calls
            setTimeout(() => {
                this.triggerCalculationOptimized();
            }, 100);
        }
    }

    // Template event handlers
    onItemQuantityChange(item: any, index: number) {
        // Do nothing during input, only on blur
    }

    onItemQuantityBlur(item: any, index: number) {
        const isManual = item.get('isManual')?.value;
        const rateId = item.get('rateId')?.value;

        if (isManual) {
            this.calculateItemTotalSilent(item);
            this.calculateManualTotals();
        } else if (rateId) {
            this.validateItemQuantities();
            this.triggerCalculationOptimized();
        }
    }

    onItemPriceChange(item: any, index: number) {
        // Only allow changes if manual
        const isManual = item.get('isManual')?.value;
        if (!isManual) {
            return;
        }
    }

    onItemPriceBlur(item: any, index: number) {
        const isManual = item.get('isManual')?.value;

        if (isManual) {
            this.calculateItemTotalSilent(item);
            this.calculateManualTotals();
        }
    }

    // ===============================
    // CALCULATION METHODS
    // ===============================

    private handleItemsChange(items: any[]) {
        // Separate manual items from items with rate
        const manualItems = items.filter((item) => !item.rateId);
        const rateItems = items.filter((item) => item.rateId);

        // Process manual items locally
        if (manualItems.length > 0) {
            this.calculateManualTotals();
        }

        // Process items with rate using API
        if (rateItems.length > 0) {
            this.triggerCalculationOptimized();
        } else if (manualItems.length === 0) {
            // If no items, reset totals
            this.form.patchValue(
                {
                    subtotal: 0,
                    totalAmount: 0,
                },
                { emitEvent: false }
            );
        }
    }

    private triggerCalculationOptimized() {
        const itemsWithRates = this.items.value.filter(
            (item: any) => item.rateId && item.quantity > 0
        );

        if (itemsWithRates.length === 0) {
            this.calculateManualTotals();
            return;
        }

        const itemsToCalculate = itemsWithRates.map((item: any) => ({
            rateId: item.rateId,
            quantity: item.quantity,
        }));

        // Use optimized subject
        this.calculateSubject$.next(itemsToCalculate);
    }

    private calculateItemTotalSilent(item: FormGroup) {
        const quantity = item.get('quantity')?.value || 0;
        const unitPrice = item.get('unitPrice')?.value || 0;
        const total = quantity * unitPrice;

        // Use patchValue to avoid events
        item.patchValue(
            {
                total: total,
            },
            { emitEvent: false }
        );
    }

    private calculateManualTotals() {
        let subtotal = 0;

        this.items.controls.forEach((item) => {
            const isManual = item.get('isManual')?.value;
            if (isManual) {
                const quantity = item.get('quantity')?.value || 0;
                const unitPrice = item.get('unitPrice')?.value || 0;
                const total = quantity * unitPrice;

                item.patchValue(
                    {
                        total: total,
                    },
                    { emitEvent: false }
                );
            }

            subtotal += item.get('total')?.value || 0;
        });

        this.form.patchValue(
            {
                subtotal: subtotal,
                totalAmount: subtotal,
            },
            { emitEvent: false }
        );
    }

    private calculateCombinedTotals() {
        let subtotal = 0;

        this.items.controls.forEach((item) => {
            subtotal += item.get('total')?.value || 0;
        });

        this.form.patchValue(
            {
                subtotal: subtotal,
                totalAmount: subtotal,
            },
            { emitEvent: false }
        );
    }

    private calculateManually() {
        let subtotal = 0;

        this.items.controls.forEach((item) => {
            const quantity = item.get('quantity')?.value || 0;
            const unitPrice = item.get('unitPrice')?.value || 0;
            const total = quantity * unitPrice;

            item.patchValue(
                {
                    total: total,
                },
                { emitEvent: false }
            );

            subtotal += total;
        });

        this.form.patchValue(
            {
                subtotal: subtotal,
                totalAmount: subtotal,
            },
            { emitEvent: false }
        );

        // Reset calculation state
        this.isCalculating = false;
        this.retryCount = 0;
    }

    // ===============================
    // EVENT HANDLERS
    // ===============================

    private onInvoiceTypeChange(invoiceType: string) {
        // Extract code_tributo from selected type
        const selectedType = this.typeOptions.find(
            (t) => t.value === invoiceType
        );
        if (selectedType) {
            this.selectedCodeTributo = selectedType.codeTributo;
            console.log('Code tributo seleccionado:', this.selectedCodeTributo);
        }

        // Clear existing items if type changes
        if (this.items.length > 0 && this.selectedCodeTributo) {
            this.clearItems();
            this.messageService.add({
                severity: 'info',
                summary: 'Items Limpiados',
                detail: 'Los items se limpiaron al cambiar el tipo de factura',
            });
        }

        // Invalidate validation cache
        this.validationCache = null;

        this.filterRatesByInvoiceType();
        this.addAlwaysIncludeRates();
    }

    private addAlwaysIncludeRates() {
        if (!this.selectedCodeTributo) return;

        const alwaysIncludeRates = this.filteredRates.filter(
            (rate) => rate.invoiceConfig?.alwaysInclude === true
        );

        alwaysIncludeRates.forEach((rate) => {
            const existingItem = this.items.value.find(
                (item: any) => item.rateId === rate._id
            );

            if (!existingItem) {
                this.addItem(null, rate);
                console.log('Rate auto-incluido:', rate.code, rate.description);
            }
        });

        if (alwaysIncludeRates.length > 0) {
            this.messageService.add({
                severity: 'info',
                summary: 'Items Automáticos',
                detail: `Se agregaron ${alwaysIncludeRates.length} item(s) automático(s)`,
            });
        }
    }

    private clearItems() {
        while (this.items.length !== 0) {
            this.items.removeAt(0);
        }
        this.selectedCodeTributo = null;
    }

    // ===============================
    // VALIDATION METHODS
    // ===============================

    private createQuantityValidator(rate: Rate) {
        return (control: any) => {
            if (!control.value) return null;

            const quantity = control.value;

            // Validate absolute maximum quantity
            if (
                rate.quantityConfig?.maxQuantity &&
                !rate.quantityConfig.isUnlimited
            ) {
                if (quantity > rate.quantityConfig.maxQuantity) {
                    return {
                        maxQuantityExceeded: {
                            max: rate.quantityConfig.maxQuantity,
                            actual: quantity,
                        },
                    };
                }
            }

            // Validate quantity based on another rate
            if (rate.quantityConfig?.maxQuantityBasedOnRate) {
                const baseRateQuantity =
                    this.getMaxQuantityFromSlaughterProcess(rate);
                if (baseRateQuantity > 0 && quantity > baseRateQuantity) {
                    return {
                        quantityBasedOnRateExceeded: {
                            baseQuantity: baseRateQuantity,
                            actual: quantity,
                        },
                    };
                }
            }

            // Validate against slaughter process quantities
            if (
                rate.dependencies?.requiresSlaughterProcess &&
                this.slaughterProcessDetails
            ) {
                const maxQuantityFromSlaughter =
                    this.getMaxQuantityFromSlaughterProcess(rate);
                if (
                    maxQuantityFromSlaughter > 0 &&
                    quantity > maxQuantityFromSlaughter
                ) {
                    return {
                        slaughterProcessQuantityExceeded: {
                            maxAvailable: maxQuantityFromSlaughter,
                            actual: quantity,
                        },
                    };
                }
            }

            return null;
        };
    }

    private canAddRateQuantity(rate: Rate, quantity: number = 1): boolean {
        const existingItem = this.items.value.find(
            (item: any) => item.rateId === rate._id
        );
        const currentQuantity = existingItem ? existingItem.quantity : 0;
        const totalQuantity = currentQuantity + quantity;

        // Validate absolute maximum quantity
        if (
            rate.quantityConfig?.maxQuantity &&
            !rate.quantityConfig.isUnlimited
        ) {
            if (totalQuantity > rate.quantityConfig.maxQuantity) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Cantidad Máxima Excedida',
                    detail: `La cantidad máxima para ${rate.code} es ${rate.quantityConfig.maxQuantity}`,
                });
                return false;
            }
        }

        // Validate quantity based on another rate
        if (rate.quantityConfig?.maxQuantityBasedOnRate) {
            const baseRateQuantity = this.getQuantityByRateId(
                rate.quantityConfig.maxQuantityBasedOnRate
            );
            if (baseRateQuantity === 0) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Rate Requerido',
                    detail: `Debe agregar primero el rate base para ${rate.code}`,
                });
                return false;
            }
            if (totalQuantity > baseRateQuantity) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Cantidad Basada Excedida',
                    detail: `Agregar ${rate.rubroxAtributo} no puede exceder ${baseRateQuantity}`,
                });
                return false;
            }
        }

        // Validate against slaughter process quantities
        if (
            rate.dependencies?.requiresSlaughterProcess &&
            this.slaughterProcessDetails
        ) {
            const maxQuantityFromSlaughter =
                this.getMaxQuantityFromSlaughterProcess(rate);
            if (
                maxQuantityFromSlaughter > 0 &&
                totalQuantity > maxQuantityFromSlaughter
            ) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Cantidad del Proceso Excedida',
                    detail: `La cantidad para ${rate.code} no puede exceder ${maxQuantityFromSlaughter} (animales aptos en el proceso)`,
                });
                return false;
            }
        }

        return true;
    }

    private validateItemQuantities() {
        // Revalidate all quantities when they change
        this.items.controls.forEach((control) => {
            const rateId = control.get('rateId')?.value;
            if (rateId) {
                const rate = this.rates_const.find((r) => r._id === rateId);
                if (rate) {
                    control.get('quantity')?.updateValueAndValidity();
                }
            }
        });
    }

    private validateRateDependencies(): boolean {
        const currentRateIds = this.items.value
            .map((item: any) => item.rateId)
            .filter((id) => id);

        for (const item of this.items.value) {
            if (!item.rateId) continue; // Skip manual items

            const rate = this.rates_const.find((r) => r._id === item.rateId);
            if (rate?.dependencies?.requiresPreviousRate) {
                if (
                    !currentRateIds.includes(
                        rate.dependencies.requiresPreviousRate
                    )
                ) {
                    const requiredRate = this.rates_const.find(
                        (r) => r._id === rate.dependencies.requiresPreviousRate
                    );
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Dependencia Faltante',
                        detail: `El rate ${rate.code} requiere que esté presente el rate ${requiredRate?.code}`,
                    });
                    return false;
                }
            }
        }

        return true;
    }

    validateFormBeforeSubmit(): boolean {
        if (this.form.invalid) {
            this.markFormGroupTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario Inválido',
                detail: 'Complete todos los campos requeridos',
            });
            return false;
        }

        if (this.items.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Items Requeridos',
                detail: 'Debe agregar al menos un item a la proforma',
            });
            return false;
        }

        // Validate that all items are compatible with code_tributo
        const incompatibleItems = this.items.controls.filter(
            (item, index) =>
                !this.isItemCompatibleWithCodeTributo(item as FormGroup)
        );

        if (incompatibleItems.length > 0) {
            this.messageService.add({
                severity: 'error',
                summary: 'Items Incompatibles',
                detail: `Hay ${incompatibleItems.length} item(s) incompatible(s) con el tipo de factura seleccionado`,
            });
            return false;
        }

        // Validate rate dependencies (only for items with rate)
        if (!this.validateRateDependencies()) {
            return false;
        }

        return true;
    }

    isItemCompatibleWithCodeTributo(item: FormGroup): boolean {
        const rateId = item.get('rateId')?.value;
        const isManual = item.get('isManual')?.value;

        // Manual items are compatible with any selected code_tributo
        if (isManual) {
            return true;
        }

        // Items with rate must have the same code_tributo
        if (rateId) {
            const rate = this.rates_const.find((r) => r._id === rateId);
            return rate
                ? rate.code_tributo === this.selectedCodeTributo
                : false;
        }

        return false;
    }

    // ===============================
    // RATE COMPATIBILITY METHODS
    // ===============================

    isRateCompatible(rate: Rate): { result: boolean; message: string } {
        try {
            // Check code_tributo
            if (
                this.selectedCodeTributo &&
                this.selectedCodeTributo !== rate.code_tributo
            ) {
                console.log('Code tributo incompatible');
                return {
                    result: false,
                    message: 'Código tributo incompatible',
                };
            }

            // Check if requires slaughter process
            if (
                rate.dependencies?.requiresSlaughterProcess &&
                !this.selectedSlaughterProcess
            ) {
                console.log('Requires slaughter process');
                return {
                    result: false,
                    message: 'Requiere un proceso de faenamiento seleccionado',
                };
            }

            // Check previous rate dependencies
            if (rate.dependencies?.requiresPreviousRate) {
                const currentRateIds = this.items.value.map(
                    (item: any) => item.rateId
                );
                if (
                    !currentRateIds.includes(
                        rate.dependencies.requiresPreviousRate
                    )
                ) {
                    console.log('Requires previous rate');
                    return { result: false, message: 'Requiere rate previo' };
                }
            }

            // Check if already exists and has maximum quantity of 1
            if (
                rate.quantityConfig?.maxQuantity === 1 &&
                !rate.quantityConfig.isUnlimited
            ) {
                const existingItem = this.items.value.find(
                    (item: any) => item.rateId === rate._id
                );
                if (existingItem && existingItem.quantity >= 1) {
                    console.log('Already exists and has maximum quantity of 1');
                    return {
                        result: false,
                        message: 'Ya se alcanzó la cantidad máxima (1)',
                    };
                }
            }

            // Check introducer animal types
            if (this.selectedIntroducer && rate.animalTypes.length > 0) {
                const introducerAnimalTypeIds =
                    this.selectedIntroducer.cattleTypes?.map((ct: any) =>
                        typeof ct === 'string' ? ct : String(ct._id)
                    ) || [];

                const hasCompatibleAnimalType = rate.animalTypes.some(
                    (animalType: any) =>
                        introducerAnimalTypeIds.includes(
                            typeof animalType === 'string'
                                ? animalType
                                : String(animalType._id)
                        )
                );

                if (!hasCompatibleAnimalType) {
                    console.log('Has incompatible animal type');
                    return {
                        result: false,
                        message:
                            'Tipos de animal no compatibles con el introductor',
                    };
                }
            }

            // Check slaughter process availability
            if (
                rate.dependencies?.requiresSlaughterProcess &&
                this.slaughterProcessDetails
            ) {
                const maxQuantityFromSlaughter =
                    this.getMaxQuantityFromSlaughterProcess(rate);
                if (maxQuantityFromSlaughter === 0) {
                    console.log('Max quantity from slaughter process is 0');
                    return {
                        result: false,
                        message:
                            'No hay animales aptos disponibles en el proceso',
                    };
                }
            }
            return { result: true, message: '' };
        } catch (error) {
            console.error('Error isRateCompatible:', error);
            return {
                result: false,
                message: 'Error al validar compatibilidad',
            };
        }
    }

    getIncompatibilityMessage(rate: Rate): string {
        const messages: string[] = [];

        // Check code_tributo
        if (
            this.selectedCodeTributo &&
            this.selectedCodeTributo !== rate.code_tributo
        ) {
            messages.push(
                `Code tributo incompatible (requiere ${this.selectedCodeTributo}, tiene ${rate.code_tributo})`
            );
        }

        // Check slaughter process requirement
        if (
            rate.dependencies?.requiresSlaughterProcess &&
            !this.selectedSlaughterProcess
        ) {
            messages.push('Requiere un proceso de faenamiento seleccionado');
        }

        // Check previous rate dependencies
        if (rate.dependencies?.requiresPreviousRate) {
            const currentRateIds = this.items.value.map(
                (item: any) => item.rateId
            );
            if (
                !currentRateIds.includes(rate.dependencies.requiresPreviousRate)
            ) {
                const requiredRate = this.rates_const.find(
                    (r) => r._id == rate.dependencies.requiresPreviousRate
                );
                messages.push(
                    `Requiere que esté presente el rate ${
                        requiredRate?.code || 'desconocido'
                    }`
                );
            }
        }

        // Check maximum quantity
        if (
            rate.quantityConfig?.maxQuantity === 1 &&
            !rate.quantityConfig.isUnlimited
        ) {
            const existingItem = this.items.value.find(
                (item: any) => item.rateId === rate._id
            );
            if (existingItem && existingItem.quantity >= 1) {
                messages.push('Ya se alcanzó la cantidad máxima (1)');
            }
        }

        // Check animal types
        if (this.selectedIntroducer && rate.animalTypes.length > 0) {
            const introducerAnimalTypeIds =
                this.selectedIntroducer.cattleTypes?.map((ct: any) =>
                    typeof ct === 'string' ? ct : String(ct._id)
                ) || [];

            const hasCompatibleAnimalType = rate.animalTypes.some(
                (animalType: any) =>
                    introducerAnimalTypeIds.includes(
                        typeof animalType === 'string'
                            ? animalType
                            : String(animalType._id)
                    )
            );

            if (!hasCompatibleAnimalType) {
                messages.push(
                    'Tipos de animal no compatibles con el introductor'
                );
            }
        }

        // Check slaughter process availability
        if (
            rate.dependencies?.requiresSlaughterProcess &&
            this.slaughterProcessDetails
        ) {
            const maxQuantityFromSlaughter =
                this.getMaxQuantityFromSlaughterProcess(rate);
            if (maxQuantityFromSlaughter === 0) {
                messages.push(
                    'No hay animales aptos disponibles en el proceso de faenamiento'
                );
            }
        }

        return messages.join('. ') || 'Rate no compatible';
    }

    // ===============================
    // UTILITY METHODS
    // ===============================

    private getQuantityByRateId(rateId: string): number {
        const item = this.items.value.find(
            (item: any) => item.rateId === rateId
        );
        return item ? item.quantity : 1;
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

    private getSlaughterProcessAnimalTypesFromDetails(
        slaughterDetails: SlaughterProcess
    ): string[] {
        if (!slaughterDetails?.inspeccionesExternas) {
            return [];
        }

        const animalTypes: string[] = [];
        slaughterDetails.inspeccionesExternas.forEach((inspection: any) => {
            if (inspection.especie) {
                const specieId =
                    typeof inspection.especie === 'string'
                        ? inspection.especie
                        : inspection.especie._id;
                if (!animalTypes.includes(specieId)) {
                    animalTypes.push(specieId);
                }
            }
        });

        return animalTypes;
    }

    private getSlaughterProcessQuantityByAnimalType(
        animalTypeId: string
    ): number {
        if (!this.slaughterProcessDetails?.inspeccionesExternas) {
            return 0;
        }
        const result = this.slaughterProcessDetails.inspeccionesExternas.filter(
            (inspection: any) => {
                const specieId =
                    typeof inspection.especie === 'string'
                        ? inspection.especie
                        : inspection.especie?._id;
                return (
                    specieId === animalTypeId &&
                    inspection.inspeccionRecepcion?.resultado === 'Apto'
                );
            }
        ).length;
        return result;
    }

    private getMaxQuantityFromSlaughterProcess(rate: Rate): number {
        if (!this.slaughterProcessDetails || !rate.animalTypes.length) {
            return 0;
        }

        let totalQuantity = 0;

        rate.animalTypes.forEach((animalTypeId: any) => {
            const quantityForType =
                this.getSlaughterProcessQuantityByAnimalType(
                    typeof animalTypeId === 'string'
                        ? animalTypeId
                        : animalTypeId._id
                );
            totalQuantity += quantityForType;
        });

        return totalQuantity;
    }

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

    getRateDependencyInfo(rate: Rate): string {
        const info: string[] = [];

        if (rate.dependencies?.requiresSlaughterProcess) {
            info.push('Requiere proceso de faenamiento');

            if (this.slaughterProcessDetails) {
                const available = this.getMaxQuantityFromSlaughterProcess(rate);
                if (available > 0) {
                    info.push(`${available} disponibles`);
                }
            }
        }

        if (rate.dependencies?.requiresPreviousRate) {
            const requiredRate = this.rates_const.find(
                (r) => r._id === rate.dependencies.requiresPreviousRate
            );
            info.push(`Requiere rate ${requiredRate?.code || 'desconocido'}`);
        }

        if (
            rate.quantityConfig?.maxQuantity &&
            !rate.quantityConfig.isUnlimited
        ) {
            info.push(`Máximo ${rate.quantityConfig.maxQuantity}`);
        }

        if (rate.quantityConfig?.maxQuantityBasedOnRate) {
            const baseRate = this.rates_const.find(
                (r) => r._id === rate.quantityConfig.maxQuantityBasedOnRate
            );
            info.push(`Cantidad basada en ${baseRate?.code || 'otro rate'}`);
        }

        return info.join(', ');
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

    getSelectedTypeDescription(): string {
        const selectedType = this.typeOptions.find(
            (t) => t.value === this.form.get('type')?.value
        );
        return selectedType?.description || '';
    }

    getCurrentCodeTributoDescription(): string {
        if (!this.selectedCodeTributo) {
            return '';
        }

        const typeOption = this.typeOptions.find(
            (t) => t.codeTributo === this.selectedCodeTributo
        );
        return typeOption?.description || `Código ${this.selectedCodeTributo}`;
    }

    hasAlwaysIncludeRates(): boolean {
        return this.filteredRates.some(
            (rate) => rate.invoiceConfig?.alwaysInclude === true
        );
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    }

    // ===============================
    // FORM VALIDATION HELPERS
    // ===============================

    isFieldInvalid(fieldName: string): boolean {
        const field = this.form.get(fieldName);
        return !!(field?.invalid && (field?.dirty || field?.touched));
    }

    isItemFieldInvalid(index: number, fieldName: string): boolean {
        const field = this.items.at(index).get(fieldName);
        return !!(field?.invalid && (field?.dirty || field?.touched));
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

    // ===============================
    // FORM SUBMISSION
    // ===============================

    onSubmit() {
        if (!this.validateFormBeforeSubmit()) {
            return;
        }

        this.loading = true;
        const formData = this.form.getRawValue();

        // Clean search fields
        delete formData.introducerSearch;
        delete formData.slaughterProcessSearch;

        // Clean isManual field from items before sending
        formData.items = formData.items.map((item: any) => {
            const cleanItem = { ...item };
            delete cleanItem.isManual;
            return cleanItem;
        });

        // Setup metadata
        if (formData.slaughterProcessId) {
            formData.metadata = {
                slaughterProcessId: formData.slaughterProcessId,
                version: '1.0',
                tags: [],
                codeTributo: this.selectedCodeTributo,
            };
        } else {
            formData.metadata = {
                codeTributo: this.selectedCodeTributo,
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
                this.router.navigate(['/zoosanitario/invoices']);
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
        this.router.navigate(['/zoosanitario/invoices']);
    }
}
