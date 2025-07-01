// src/app/demo/components/oracle-credentials-dialog/oracle-credentials-dialog.component.ts

import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    Validators,
    ReactiveFormsModule,
} from '@angular/forms';

import { MessageService } from 'primeng/api';
import {
    ConnectionTestResult,
    OracleCredentials,
    OracleService,
} from 'src/app/zoosanitario/services/oracle.service';
import { ImportsModule } from 'src/app/demo/services/import';

@Component({
    selector: 'app-oracle-credentials-dialog',
    standalone: true,
    imports: [ImportsModule],
    templateUrl: './oracle-credentials-dialog-component.html',
    styleUrls: ['./oracle-credentials-dialog-component.scss'],
    providers: [MessageService],
})
export class OracleCredentialsDialogComponent {
    @Input() visible: boolean = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() credentialsConfigured = new EventEmitter<void>();
    @Output() cancelled = new EventEmitter<void>();

    credentialsForm: FormGroup;
    testingConnection = false;
    saving = false;
    connectionTestResult: ConnectionTestResult | null = null;

    constructor(
        private fb: FormBuilder,
        private oracleService: OracleService,
        private messageService: MessageService
    ) {
        this.credentialsForm = this.fb.group({
            user: ['', [Validators.required, Validators.minLength(2)]],
            password: ['', [Validators.required, Validators.minLength(3)]],
            connectString: [''],
        });
    }

    validateConnectString(control: any) {
        const value = control.value;
        if (!value) return null;

        // Validación mínima: solo verificar que no esté vacío y tenga formato básico
        // El backend se encargará de la validación real
        const hasBasicFormat = value.includes(':') && value.length > 5;
        return hasBasicFormat ? null : { invalidFormat: true };
    }

    testConnection() {
        if (!this.credentialsForm.valid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulario Inválido',
                detail: 'Por favor, completa todos los campos correctamente.',
                life: 3000,
            });
            return;
        }

        this.testingConnection = true;
        this.connectionTestResult = null;

        const credentials: OracleCredentials = this.credentialsForm.value;

        this.oracleService.setupConnection(credentials).subscribe({
            next: (result) => {
                this.connectionTestResult = result;
                this.testingConnection = false;

                if (result.success) {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Conexión Exitosa',
                        detail: 'Las credenciales son válidas y la conexión funciona correctamente.',
                        life: 5000,
                    });
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error de Conexión',
                        detail:
                            result.message ||
                            'No se pudo establecer la conexión con Oracle.',
                        life: 5000,
                    });
                }
            },
            error: (error) => {
                this.testingConnection = false;
                this.connectionTestResult = {
                    success: false,
                    message:
                        error.error?.message || 'Error al probar la conexión',
                };

                this.messageService.add({
                    severity: 'error',
                    summary: 'Error de Conexión',
                    detail: 'No se pudo probar la conexión. Verifica tus credenciales.',
                    life: 5000,
                });
            },
        });
    }

    onSave() {
        if (
            !this.credentialsForm.valid ||
            !this.connectionTestResult?.success
        ) {
            return;
        }

        this.saving = true;

        // Las credenciales ya fueron guardadas en el backend durante el test
        // Solo necesitamos notificar que la configuración está completa
        setTimeout(() => {
            this.saving = false;
            this.messageService.add({
                severity: 'success',
                summary: 'Configuración Guardada',
                detail: 'Las credenciales de Oracle han sido configuradas exitosamente.',
                life: 3000,
            });

            this.credentialsConfigured.emit();
            this.onHide();
        }, 1000);
    }

    public onCancel() {
        this.cancelled.emit();
        this.onHide();
    }

    private onHide() {
        this.visible = false;
        this.visibleChange.emit(false);
        this.resetForm();
    }

    private resetForm() {
        this.credentialsForm.reset();
        this.connectionTestResult = null;
        this.testingConnection = false;
        this.saving = false;
    }
}
