﻿import { Component } from '@angular/core';
import { LayoutService } from "./service/app.layout.service";

@Component({
    standalone: false,
    selector: 'app-footer',
    templateUrl: './app.footer.component.html'
})
export class AppFooterComponent {
    constructor(public layoutService: LayoutService) { }
}

