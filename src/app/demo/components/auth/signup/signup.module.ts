import { NgModule } from '@angular/core';
import { SignupComponent } from './signup.component';

import {
    DialogService,
    DynamicDialogConfig,
    DynamicDialogModule,
    DynamicDialogRef,
} from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';

@NgModule({
    imports: [ImportsModule],
    declarations: [SignupComponent],
    providers: [MessageService, DialogService, DynamicDialogRef],
})
export class SignupModule {}
