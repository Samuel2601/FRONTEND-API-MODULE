import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReCaptchaV3Service } from 'ng-recaptcha';
import { AdminService } from 'src/app/demo/services/admin.service';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';

@Component({
    selector: 'app-password-recovery',
    templateUrl: './password-recovery.component.html',
    styleUrls: ['./password-recovery.component.scss'],
    providers: [MessageService],
})
export class PasswordRecoveryComponent implements OnInit {
    recoveryForm: FormGroup;
    submitted = false;
    recaptchaVerified = false;

    constructor(
        private formBuilder: FormBuilder,
        private recaptchaV3Service: ReCaptchaV3Service,
        private admin: AdminService,
        private messageService: MessageService,
        private router: Router,
    ) {}

    ngOnInit() {
        this.recoveryForm = this.formBuilder.group({
            email: ['', [Validators.required, Validators.email]],
            recaptcha: ['', Validators.required],
        });
    }

    get f(): any {
        return this.recoveryForm.controls;
    }

    resolved(captchaResponse: string) {
        this.recaptchaVerified = true;
        this.recoveryForm.controls['recaptcha'].setValue(captchaResponse);
    }

    onSubmit() {
        this.submitted = true;

        if (this.recoveryForm.invalid || !this.recaptchaVerified) {
            return;
        }

        const formData = this.recoveryForm.value;
        this.admin.recoverPassword(formData).subscribe(
            (response) => {
                console.log(response);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Clave Temporal',
                    detail: response.message,
                });
                setTimeout(() => {
                    this.router.navigate(['/auth/login']); 
                }, 2000);
            },
            (error) => {
                console.error(error);
                this.messageService.add({
                    severity: 'error',
                    summary: ('(' + error.status + ')').toString(),
                    detail: error.error.message || 'Sin conexión',
                });
            }
        );
    }
}
