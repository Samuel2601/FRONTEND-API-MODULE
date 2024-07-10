import { NgModule } from '@angular/core';
import { HashLocationStrategy, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AppLayoutModule } from './layout/app.layout.module';
import { NotfoundComponent } from './demo/components/notfound/notfound.component';
import { DialogService } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
    declarations: [AppComponent, NotfoundComponent],
    imports: [AppRoutingModule, AppLayoutModule,ButtonModule,TranslateModule.forRoot()],
    providers: [
        { provide: LocationStrategy, useClass: PathLocationStrategy },
        DialogService
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
