import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { NotfoundComponent } from './demo/components/notfound/notfound.component';
import { AppLayoutComponent } from "./layout/app.layout.component";
import { HomeComponent } from './demo/components/static-page/home/home.component';
import { AuthGuard } from './guards/auth.guard'; // Importa tu guard
import { PermissionGuard } from './guards/permission.guard';
import { MapaFichaComponent } from './demo/components/static-page/mapa-ficha/mapa-ficha.component';
import { MapaComponent } from './demo/components/static-page/mapa/mapa.component';
@NgModule({
    imports: [
        RouterModule.forRoot([
            {
                path: '', component: AppLayoutComponent,
                children: [
                    { 
                        path: 'dashboard', 
                        loadChildren: () => import('./demo/components/dashboard/dashboard.module').then(m => m.DashboardModule), 
                        canActivate: [AuthGuard,PermissionGuard],
                        data: { expectedPermission: '/permiso' }
                    },
                    { 
                        path: 'maps', 
                        loadChildren: () => import('./demo/components/maps/maps.module').then(m => m.MapsModule), 
                        //canActivate: [AuthGuard] // Aplica el guard aquí
                    },
                    { path: 'home', component: HomeComponent },
                    { path: 'crear-ficha', component: MapaFichaComponent },
                    { path: 'crear-incidente', component: MapaComponent },
                    { path: '', component: HomeComponent }
                ]
            },
            { 
                path: 'auth', 
                loadChildren: () => import('./demo/components/auth/auth.module').then(m => m.AuthModule) 
            },
            { path: 'notfound', component: NotfoundComponent },
            { path: '**', redirectTo: '/notfound' },
        ], { 
            scrollPositionRestoration: 'enabled', 
            anchorScrolling: 'enabled', 
            onSameUrlNavigation: 'reload' 
        })
    ],
    exports: [RouterModule]
})
export class AppRoutingModule { }
