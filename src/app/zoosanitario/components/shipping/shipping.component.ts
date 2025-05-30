// ===== SHIPPING COMPONENT TS =====
import {
    Component,
    OnInit,
    Input,
    Output,
    EventEmitter,
    OnDestroy,
} from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ShippingSheetService } from '../../services/ShippingSheet.service';

interface ShippingProduct {
    productId: string;
    type: string;
    quantity: number;
    weight: number;
    unit: string;
    departureTemperature: number;
    packaging: string;
    labeling: string;
    batch: string;
    expirationDate: Date;
    observations: string;
}

interface TrackingUpdate {
    date: Date;
    status: string;
    location: string;
    temperature: number;
    observations: string;
    responsible: string;
}

@Component({
    selector: 'app-shipping',
    templateUrl: './shipping.component.html',
    styleUrls: ['./shipping.component.scss'],
})
export class ShippingComponent implements OnInit, OnDestroy {
    @Input() internalSheetData: any;
    @Output() stepCompleted = new EventEmitter<any>();

    private destroy$ = new Subject<void>();
    private trackingInterval$ = interval(30000); // Actualizar tracking cada 30 segundos

    shippingForm: FormGroup;
    isLoading = false;
    currentView: 'preparation' | 'tracking' | 'delivery' = 'preparation';
    approvedProducts: any[] = [];

    // Opciones para dropdowns
    shippingTypes = [
        { label: 'Productos Faenados', value: 'SLAUGHTERED_PRODUCTS' },
        { label: 'Productos de Retorno', value: 'RETURN_PRODUCTS' },
        { label: 'Decomisos', value: 'CONFISCATIONS' },
    ];

    vehicleTypes = [
        { label: 'Refrigerado', value: 'REFRIGERATED' },
        { label: 'Carga Normal', value: 'NORMAL_CARGO' },
        { label: 'Especializado', value: 'SPECIALIZED' },
    ];

    destinationTypes = [
        { label: 'Cliente', value: 'CLIENT' },
        { label: 'Planta de Procesamiento', value: 'PROCESSING_PLANT' },
        { label: 'Decomiso', value: 'CONFISCATION' },
        { label: 'Retorno al Origen', value: 'ORIGIN_RETURN' },
    ];

    packagingTypes = [
        { label: 'Caja de Cartón', value: 'CARDBOARD_BOX' },
        { label: 'Bolsa Plástica', value: 'PLASTIC_BAG' },
        { label: 'Contenedor Hermético', value: 'SEALED_CONTAINER' },
        { label: 'Bandeja con Film', value: 'TRAY_WITH_FILM' },
    ];

    statusOptions = [
        {
            label: 'Preparación',
            value: 'PREPARATION',
            icon: 'pi-clock',
            color: 'orange',
        },
        {
            label: 'En Tránsito',
            value: 'IN_TRANSIT',
            icon: 'pi-car',
            color: 'blue',
        },
        {
            label: 'Entregado',
            value: 'DELIVERED',
            icon: 'pi-check-circle',
            color: 'green',
        },
        {
            label: 'Retornado',
            value: 'RETURNED',
            icon: 'pi-reply',
            color: 'orange',
        },
        {
            label: 'Incidente',
            value: 'INCIDENT',
            icon: 'pi-exclamation-triangle',
            color: 'red',
        },
    ];

    // Estado del envío
    currentStatus = 'PREPARATION';
    estimatedDeliveryTime: Date | null = null;
    realTimeTracking: TrackingUpdate[] = [];

    constructor(
        private fb: FormBuilder,
        private shippingService: ShippingSheetService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {
        this.initForm();
    }

    ngOnInit() {
        if (this.internalSheetData) {
            this.loadApprovedProducts();
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private initForm() {
        this.shippingForm = this.fb.group({
            internalSheetId: ['', Validators.required],
            guideNumber: [this.generateGuideNumber(), Validators.required],
            dispatchDate: [new Date(), Validators.required],
            shippingType: ['SLAUGHTERED_PRODUCTS', Validators.required],

            // Datos del vehículo
            vehicle: this.fb.group({
                type: ['REFRIGERATED', Validators.required],
                licensePlate: ['', Validators.required],
                capacity: [null, [Validators.required, Validators.min(1)]],
                operatingTemperature: [
                    null,
                    [Validators.min(-20), Validators.max(10)],
                ],
                driver: this.fb.group({
                    name: ['', Validators.required],
                    idNumber: ['', Validators.required],
                    license: ['', Validators.required],
                }),
                vehicleDocuments: this.fb.group({
                    insurance: [''],
                    technicalCertificate: [''],
                    operationPermit: [''],
                }),
            }),

            // Destino
            destination: this.fb.group({
                type: ['CLIENT', Validators.required],
                name: ['', Validators.required],
                address: ['', Validators.required],
                contact: ['', Validators.required],
                phone: ['', Validators.required],
            }),

            // Productos del envío
            shippingProducts: this.fb.array([]),

            // Condiciones de transporte
            transportConditions: this.fb.group({
                initialTemperature: [
                    null,
                    [Validators.min(-20), Validators.max(10)],
                ],
                initialHumidity: [
                    null,
                    [Validators.min(0), Validators.max(100)],
                ],
                estimatedTravelTime: [null, [Validators.min(0.5)]],
                transportRoute: [''],
                specialPrecautions: this.fb.array([]),
            }),

            // Documentación
            documentation: this.fb.group({
                qualityCertificate: [''],
                transportPermit: [''],
                commercialInvoice: [''],
                remissionGuide: [''],
                otherDocuments: this.fb.array([]),
            }),
        });
    }

    get shippingProducts(): FormArray {
        return this.shippingForm.get('shippingProducts') as FormArray;
    }

    get specialPrecautions(): FormArray {
        return this.shippingForm.get(
            'transportConditions.specialPrecautions'
        ) as FormArray;
    }

    get otherDocuments(): FormArray {
        return this.shippingForm.get(
            'documentation.otherDocuments'
        ) as FormArray;
    }

    private generateGuideNumber(): string {
        const now = new Date();
        const timestamp =
            now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0');
        return `GDE-${timestamp}`;
    }

    private loadApprovedProducts() {
        if (!this.internalSheetData?.approvedProducts) return;

        this.approvedProducts = this.internalSheetData.approvedProducts;

        this.shippingForm.patchValue({
            internalSheetId: this.internalSheetData.internalSheetId,
        });

        // Crear productos de envío automáticamente
        this.approvedProducts.forEach((product) => {
            this.addShippingProduct(product);
        });

        this.calculateEstimatedDelivery();
    }

    private addShippingProduct(productData?: any) {
        const product = this.fb.group({
            productId: [productData?.productId || '', Validators.required],
            type: [productData?.type || '', Validators.required],
            quantity: [1, [Validators.required, Validators.min(1)]],
            weight: [
                productData?.weight || null,
                [Validators.required, Validators.min(0.1)],
            ],
            unit: ['kg', Validators.required],
            departureTemperature: [
                null,
                [Validators.min(-20), Validators.max(10)],
            ],
            packaging: ['CARDBOARD_BOX', Validators.required],
            labeling: ['', Validators.required],
            batch: [this.generateBatchNumber(), Validators.required],
            expirationDate: [
                this.calculateExpirationDate(),
                Validators.required,
            ],
            observations: [''],
        });

        this.shippingProducts.push(product);
    }

    private generateBatchNumber(): string {
        const now = new Date();
        return `LT${now.getFullYear()}${(now.getMonth() + 1)
            .toString()
            .padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    }

    private calculateExpirationDate(): Date {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 15); // 15 días por defecto
        return expirationDate;
    }

    removeShippingProduct(index: number) {
        this.confirmationService.confirm({
            message: '¿Está seguro que desea eliminar este producto del envío?',
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.shippingProducts.removeAt(index);
                this.messageService.add({
                    severity: 'info',
                    summary: 'Eliminado',
                    detail: 'Producto eliminado del envío',
                });
            },
        });
    }

    addSpecialPrecaution() {
        this.specialPrecautions.push(this.fb.control('', Validators.required));
    }

    removeSpecialPrecaution(index: number) {
        this.specialPrecautions.removeAt(index);
    }

    addOtherDocument() {
        this.otherDocuments.push(this.fb.control('', Validators.required));
    }

    removeOtherDocument(index: number) {
        this.otherDocuments.removeAt(index);
    }

    calculateEstimatedDelivery() {
        const travelTime = this.shippingForm.get(
            'transportConditions.estimatedTravelTime'
        )?.value;
        if (travelTime) {
            const dispatchDate = new Date(
                this.shippingForm.get('dispatchDate')?.value
            );
            this.estimatedDeliveryTime = new Date(
                dispatchDate.getTime() + travelTime * 60 * 60 * 1000
            );
        }
    }

    onVehicleTypeChange() {
        const vehicleType = this.shippingForm.get('vehicle.type')?.value;

        // Configurar temperatura operativa según tipo de vehículo
        let defaultTemp = null;
        if (vehicleType === 'REFRIGERATED') {
            defaultTemp = -2;
        } else if (vehicleType === 'NORMAL_CARGO') {
            defaultTemp = 20;
        }

        this.shippingForm.patchValue({
            'vehicle.operatingTemperature': defaultTemp,
            'transportConditions.initialTemperature': defaultTemp,
        });
    }

    onShippingTypeChange() {
        const shippingType = this.shippingForm.get('shippingType')?.value;

        // Configurar destino automáticamente según tipo de envío
        let destinationType = 'CLIENT';
        if (shippingType === 'RETURN_PRODUCTS') {
            destinationType = 'ORIGIN_RETURN';
        } else if (shippingType === 'CONFISCATIONS') {
            destinationType = 'CONFISCATION';
        }

        this.shippingForm.patchValue({
            'destination.type': destinationType,
        });
    }

    // Funciones de Preparación
    async startPreparation() {
        if (this.shippingForm.invalid) {
            this.markFormGroupTouched(this.shippingForm);
            this.messageService.add({
                severity: 'error',
                summary: 'Error de Validación',
                detail: 'Por favor complete todos los campos requeridos',
            });
            return;
        }

        this.confirmationService.confirm({
            message: '¿Confirma que desea crear la guía de envío?',
            header: 'Crear Guía de Envío',
            icon: 'pi pi-check-circle',
            accept: async () => {
                try {
                    this.isLoading = true;

                    const formData = {
                        ...this.shippingForm.value,
                        status: 'PREPARATION',
                    };

                    const response = await this.shippingService
                        .create(formData)
                        .toPromise();

                    this.currentStatus = 'PREPARATION';
                    this.currentView = 'tracking';

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Éxito',
                        detail: 'Guía de envío creada correctamente',
                    });

                    // Iniciar tracking automático
                    this.startRealTimeTracking(response._id);
                } catch (error) {
                    console.error('Error creating shipping sheet:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Error al crear la guía de envío',
                    });
                } finally {
                    this.isLoading = false;
                }
            },
        });
    }

    // Funciones de Tracking
    private startRealTimeTracking(shippingId: string) {
        this.trackingInterval$.pipe(takeUntil(this.destroy$)).subscribe(() => {
            // Simular actualizaciones de tracking
            if (this.currentStatus === 'IN_TRANSIT') {
                this.simulateTrackingUpdate();
            }
        });
    }

    private simulateTrackingUpdate() {
        // Simulación de actualización de tracking en tiempo real
        const update: TrackingUpdate = {
            date: new Date(),
            status: 'EN_RUTA',
            location: `Punto de Control ${Math.floor(Math.random() * 10) + 1}`,
            temperature:
                this.shippingForm.get('transportConditions.initialTemperature')
                    ?.value +
                Math.random() * 2 -
                1,
            observations: 'Transporte normal',
            responsible: 'Sistema de Tracking',
        };

        this.realTimeTracking.push(update);

        // Mantener solo los últimos 10 registros
        if (this.realTimeTracking.length > 10) {
            this.realTimeTracking = this.realTimeTracking.slice(-10);
        }
    }

    async startShipment() {
        this.confirmationService.confirm({
            message:
                '¿Confirma que el vehículo ha salido para realizar la entrega?',
            header: 'Iniciar Envío',
            icon: 'pi pi-car',
            accept: async () => {
                try {
                    const trackingData = {
                        date: new Date(),
                        status: 'DESPACHO_INICIADO',
                        location: 'Matadero',
                        temperature: this.shippingForm.get(
                            'transportConditions.initialTemperature'
                        )?.value,
                        observations: 'Envío iniciado desde el matadero',
                        responsible: 'Operador de Despacho',
                    };

                    // Aquí llamarías al servicio para actualizar el tracking
                    // await this.shippingService.updateTracking(shippingId, trackingData).toPromise();

                    this.currentStatus = 'IN_TRANSIT';
                    this.realTimeTracking.push(trackingData);

                    this.messageService.add({
                        severity: 'info',
                        summary: 'Envío Iniciado',
                        detail: 'El vehículo ha salido para realizar la entrega',
                    });
                } catch (error) {
                    console.error('Error starting shipment:', error);
                }
            },
        });
    }

    async markAsDelivered() {
        this.currentView = 'delivery';
    }

    // Funciones de Entrega
    async confirmDelivery() {
        const deliveryForm = this.fb.group({
            receiverName: ['', Validators.required],
            receiverIdNumber: ['', Validators.required],
            deliveryObservations: [''],
            finalTemperature: [null, [Validators.min(-20), Validators.max(30)]],
            productCondition: ['GOOD', Validators.required],
        });

        // Aquí podrías mostrar un modal con el formulario de entrega
        // Por ahora simularemos la entrega

        this.confirmationService.confirm({
            message: '¿Confirma que la entrega se ha realizado correctamente?',
            header: 'Confirmar Entrega',
            icon: 'pi pi-check-circle',
            accept: async () => {
                try {
                    const deliveryData = {
                        deliveryDate: new Date(),
                        receiverName: 'Cliente Receptor',
                        receiverIdNumber: '1234567890',
                        deliveryObservations: 'Entrega realizada sin novedad',
                        receiverSignature: 'SIGNATURE_HASH',
                    };

                    // await this.shippingService.markAsDelivered(shippingId, deliveryData).toPromise();

                    this.currentStatus = 'DELIVERED';

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Entrega Confirmada',
                        detail: 'La entrega se ha registrado correctamente',
                    });

                    this.stepCompleted.emit({
                        shippingCompleted: true,
                        deliveryDate: deliveryData.deliveryDate,
                        finalStatus: 'DELIVERED',
                    });
                } catch (error) {
                    console.error('Error confirming delivery:', error);
                }
            },
        });
    }

    private markFormGroupTouched(formGroup: FormGroup) {
        Object.keys(formGroup.controls).forEach((key) => {
            const control = formGroup.get(key);
            control?.markAsTouched();

            if (control instanceof FormGroup) {
                this.markFormGroupTouched(control);
            } else if (control instanceof FormArray) {
                control.controls.forEach((arrayControl) => {
                    if (arrayControl instanceof FormGroup) {
                        this.markFormGroupTouched(arrayControl);
                    } else {
                        arrayControl.markAsTouched();
                    }
                });
            }
        });
    }

    // Utilidades
    getStatusIcon(status: string): string {
        const statusOption = this.statusOptions.find(
            (opt) => opt.value === status
        );
        return statusOption?.icon || 'pi-circle';
    }

    getStatusColor(status: string): string {
        const statusOption = this.statusOptions.find(
            (opt) => opt.value === status
        );
        return statusOption?.color || 'gray';
    }

    getTotalWeight(): number {
        return this.shippingProducts.value.reduce(
            (sum: number, product: any) => sum + (product.weight || 0),
            0
        );
    }

    getTotalProducts(): number {
        return this.shippingProducts.value.reduce(
            (sum: number, product: any) => sum + (product.quantity || 0),
            0
        );
    }

    formatTemperature(temp: number): string {
        return temp ? `${temp.toFixed(1)}°C` : '--°C';
    }

    exportShippingGuide() {
        const guideData = {
            guideNumber: this.shippingForm.get('guideNumber')?.value,
            dispatchDate: this.shippingForm.get('dispatchDate')?.value,
            shippingData: this.shippingForm.value,
            tracking: this.realTimeTracking,
            status: this.currentStatus,
        };

        const dataStr = JSON.stringify(guideData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `guia_envio_${guideData.guideNumber}.json`;
        link.click();

        URL.revokeObjectURL(url);

        this.messageService.add({
            severity: 'info',
            summary: 'Guía Exportada',
            detail: 'La guía de envío ha sido descargada',
        });
    }
}
