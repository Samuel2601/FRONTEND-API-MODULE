import {
    Component,
    OnInit,
    Output,
    EventEmitter,
    OnDestroy,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { QrScannerService } from '../../services/QrScanner.service';
import { ZoosanitaryCertificateService } from '../../services/ZoosanitaryCertificate.service';

@Component({
    standalone: false,
    selector: 'app-reception',
    templateUrl: './reception.component.html',
    styleUrls: ['./reception.component.scss'],
})
export class ReceptionComponent implements OnInit, OnDestroy {
    @Output() stepCompleted = new EventEmitter<any>();

    private destroy$ = new Subject<void>();

    receptionForm: FormGroup;
    isLoading = false;
    isScanning = false;
    certificateData: any = null;
    showCertificateDetails = false;
    validationStatus: 'pending' | 'valid' | 'invalid' | 'expired' = 'pending';

    constructor(
        private fb: FormBuilder,
        private qrService: QrScannerService,
        private certificateService: ZoosanitaryCertificateService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {
        this.initForm();
    }

    ngOnInit() {
        // Auto-focus en el campo de certificado cuando se carga el componente
        setTimeout(() => {
            const input = document.getElementById('certificateNumber');
            if (input) input.focus();
        }, 500);
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();

        // Detener scanner si está activo
        if (this.isScanning) {
            this.qrService.stopScan();
        }
    }

    private initForm() {
        this.receptionForm = this.fb.group({
            certificateNumber: [
                '',
                [Validators.required, Validators.minLength(5)],
            ],
            manualValidation: [false],
            receptionNotes: [''],
        });
    }

    async scanQRCode() {
        try {
            this.isScanning = true;
            this.messageService.add({
                severity: 'info',
                summary: 'Escaneando',
                detail: 'Apunte la cámara hacia el código QR',
            });

            const qrResult = await this.qrService.scanQR();

            if (qrResult) {
                this.receptionForm.patchValue({
                    certificateNumber: qrResult,
                });
                await this.validateCertificate();
            }
        } catch (error) {
            console.error('Error during QR scan:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al escanear el código QR',
            });
        } finally {
            this.isScanning = false;
        }
    }

    async manualEntry() {
        try {
            const certificateNumber = await this.qrService.manualEntry();
            if (certificateNumber) {
                this.receptionForm.patchValue({
                    certificateNumber: certificateNumber,
                });
                await this.validateCertificate();
            }
        } catch (error) {
            console.error('Error during manual entry:', error);
        }
    }

    async validateCertificate() {
        const certificateNumber =
            this.receptionForm.get('certificateNumber')?.value;

        if (!certificateNumber) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Advertencia',
                detail: 'Ingrese un número de certificado válido',
            });
            return;
        }

        this.isLoading = true;
        this.validationStatus = 'pending';

        try {
            // Validar certificado por número
            const result = await this.certificateService
                .validateByQR(certificateNumber)
                .toPromise();

            if (result && result.certificate) {
                this.certificateData = result.certificate;

                // Verificar vigencia
                const validUntil = new Date(this.certificateData.validUntil);
                const now = new Date();

                if (validUntil <= now) {
                    this.validationStatus = 'expired';
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Certificado Expirado',
                        detail: `El certificado expiró el ${validUntil.toLocaleDateString()}`,
                    });
                } else {
                    this.validationStatus = 'valid';
                    this.showCertificateDetails = true;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Certificado Válido',
                        detail: 'El certificado ha sido validado correctamente',
                    });
                }
            } else {
                this.validationStatus = 'invalid';
                this.messageService.add({
                    severity: 'error',
                    summary: 'Certificado No Encontrado',
                    detail: 'No se encontró un certificado con este número',
                });
            }
        } catch (error) {
            console.error('Error validating certificate:', error);
            this.validationStatus = 'invalid';
            this.messageService.add({
                severity: 'error',
                summary: 'Error de Validación',
                detail: 'Error al validar el certificado. Verifique la conexión.',
            });
        } finally {
            this.isLoading = false;
        }
    }

    acceptCertificate() {
        if (this.validationStatus !== 'valid' || !this.certificateData) {
            return;
        }

        this.confirmationService.confirm({
            message:
                '¿Confirma que desea procesar este certificado zoosanitario?',
            header: 'Confirmar Recepción',
            icon: 'pi pi-check-circle',
            accept: () => {
                const receptionData = {
                    certificateNumber: this.certificateData.certificateNumber,
                    certificateId: this.certificateData._id,
                    certificateData: this.certificateData,
                    receptionDate: new Date(),
                    receptionNotes:
                        this.receptionForm.get('receptionNotes')?.value,
                    validationStatus: this.validationStatus,
                };

                this.stepCompleted.emit(receptionData);
            },
        });
    }

    rejectCertificate() {
        this.confirmationService.confirm({
            message: '¿Está seguro que desea rechazar este certificado?',
            header: 'Rechazar Certificado',
            icon: 'pi pi-times-circle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.resetForm();
                this.messageService.add({
                    severity: 'info',
                    summary: 'Certificado Rechazado',
                    detail: 'El certificado ha sido rechazado',
                });
            },
        });
    }

    resetForm() {
        this.receptionForm.reset();
        this.certificateData = null;
        this.showCertificateDetails = false;
        this.validationStatus = 'pending';
    }

    formatDate(date: string | Date): string {
        return new Date(date).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    getValidationIcon(): string {
        switch (this.validationStatus) {
            case 'valid':
                return 'pi-check-circle text-green-500';
            case 'invalid':
                return 'pi-times-circle text-red-500';
            case 'expired':
                return 'pi-clock text-orange-500';
            default:
                return 'pi-question-circle text-gray-500';
        }
    }

    getValidationMessage(): string {
        switch (this.validationStatus) {
            case 'valid':
                return 'Certificado válido y vigente';
            case 'invalid':
                return 'Certificado no válido o no encontrado';
            case 'expired':
                return 'Certificado expirado';
            default:
                return 'Pendiente de validación';
        }
    }
}

