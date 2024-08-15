import { Component, OnInit } from '@angular/core';
import { PrimeNGConfig } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
    constructor(
        private primengConfig: PrimeNGConfig,
        private config: PrimeNGConfig,
        private translateService: TranslateService
    ) {}

    ngOnInit() {
        this.translateService.setDefaultLang('es');
        this.primengConfig.ripple = true;
        this.config.setTranslation({
            accept: 'Accept',
            reject: 'Cancel',
            //translations
        });
        this.translate('es'); // Aquí se pasa el idioma 'es' como argumento
    }

    translate(lang: string) {
        this.translateService.use(lang);
        this.translateService
            .get('primeng')
            .subscribe((res) => this.config.setTranslation(res));
    }
}
