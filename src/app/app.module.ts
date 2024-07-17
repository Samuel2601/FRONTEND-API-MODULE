import { NgModule } from '@angular/core';
import { HashLocationStrategy, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AppLayoutModule } from './layout/app.layout.module';
import { NotfoundComponent } from './demo/components/notfound/notfound.component';
import { DialogService } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';
import { PermissionGuard } from './guards/permission.guard';
import { AuthService } from './demo/services/auth.service';
import { SocketService } from './demo/services/socket.io.service';
import { MessageService } from 'primeng/api';

import { ToastModule } from 'primeng/toast';
@NgModule({
    declarations: [AppComponent, NotfoundComponent],
    imports: [AppRoutingModule, AppLayoutModule,ButtonModule,TranslateModule.forRoot(),ToastModule],
    providers: [
        { provide: LocationStrategy, useClass: PathLocationStrategy },
        DialogService,
        SocketService, AuthService, PermissionGuard,
        MessageService
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
