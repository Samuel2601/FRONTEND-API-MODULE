import { Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { LayoutService } from './service/app.layout.service';
import { GLOBAL } from '../demo/services/GLOBAL';
import { HelperService } from '../demo/services/helper.service';
import { Router } from '@angular/router';
import { AuthService } from '../demo/services/auth.service';

@Component({
    selector: 'app-topbar',
    templateUrl: './app.topbar.component.html',
})
export class AppTopBarComponent implements OnInit {
    url = GLOBAL.url;
    foto = sessionStorage.getItem('fotoUsuario')
        ? sessionStorage.getItem('fotoUsuario')
        : localStorage.getItem('fotoUsuario');
    items!: MenuItem[];

    @ViewChild('menubutton') menuButton!: ElementRef;

    @ViewChild('topbarmenubutton') topbarMenuButton!: ElementRef;

    @ViewChild('topbarmenu') menu!: ElementRef;

    constructor(
        public layoutService: LayoutService,
        private auth: AuthService,
        private helpers: HelperService,
        private renderer: Renderer2
    ) {}
    ngOnInit(): void {
        //console.log(this.foto);
        if (this.helpers.isMobil() && !this.helpers.isAndroid()) {
            const topbar = document.querySelector('.layout-topbar');
            if (topbar) {
                this.renderer.addClass(topbar, 'mobile-topbar');
            }
        }
    }
    token = this.auth.token();
    logout(): void {
        this.auth.clearSession();
        window.location.reload();
    }
}
