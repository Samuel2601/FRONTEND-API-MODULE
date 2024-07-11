import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { LayoutService } from "./service/app.layout.service";
import { GLOBAL } from '../demo/services/GLOBAL';
import { HelperService } from '../demo/services/helper.service';
import { Router } from '@angular/router';
import { AuthService } from '../demo/services/auth.service';

@Component({
    selector: 'app-topbar',
    templateUrl: './app.topbar.component.html'
})
export class AppTopBarComponent implements OnInit {
    url = GLOBAL.url;
    foto=sessionStorage.getItem('foto')?sessionStorage.getItem('foto'):localStorage.getItem('foto');
    items!: MenuItem[];

    @ViewChild('menubutton') menuButton!: ElementRef;

    @ViewChild('topbarmenubutton') topbarMenuButton!: ElementRef;

    @ViewChild('topbarmenu') menu!: ElementRef;
    
    constructor(public layoutService: LayoutService, private helper: HelperService,private router: Router,private auth:AuthService) { }
    ngOnInit(): void {
        //console.log(this.foto);
    }
    token = this.auth.token()||undefined;
    logout(): void {
        if(this.helper.isMobil()){
            const nombreUsuario = localStorage.getItem('nombreUsuario') || sessionStorage.getItem('nombreUsuario');
            const fotoUsuario = localStorage.getItem('fotoUsuario') || sessionStorage.getItem('fotoUsuario');
            const correo = localStorage.getItem('correo') || sessionStorage.getItem('correo');
            const pass = localStorage.getItem('pass') || sessionStorage.getItem('pass');
            
            // Limpiar todo excepto los valores preservados
            sessionStorage.clear();
            localStorage.clear();
    
            // Restaurar los valores preservados
            if (nombreUsuario) localStorage.setItem('nombreUsuario', nombreUsuario);
            if (fotoUsuario) localStorage.setItem('fotoUsuario', fotoUsuario);
            if (correo) localStorage.setItem('correo', correo);
            if (pass) localStorage.setItem('pass', pass);
        } else {
            sessionStorage.clear();
            localStorage.clear();
        }
    
        this.router.navigate(["/maps"]).then(() => {
            window.location.reload();
        });
    }
    

}
