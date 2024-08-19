import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginRoutingModule } from './login-routing.module';
import { LoginComponent } from './login.component';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { PasswordModule } from 'primeng/password';
import { InputTextModule } from 'primeng/inputtext';
import { ReactiveFormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { ImageModule } from 'primeng/image';
import { InputOtpModule } from 'primeng/inputotp';
import { DialogModule } from 'primeng/dialog';
import { ImportsModule } from 'src/app/demo/services/import';
@NgModule({
    imports: [
        ImportsModule,
        CommonModule,
        LoginRoutingModule,
        ButtonModule,
        CheckboxModule,
        InputTextModule,
        FormsModule,
        PasswordModule,
        ReactiveFormsModule,
        ToastModule,
        AvatarGroupModule,
        AvatarModule,
        ImageModule,
        InputOtpModule,
        DialogModule
    ],
    declarations: [LoginComponent]
})
export class LoginModule { }
