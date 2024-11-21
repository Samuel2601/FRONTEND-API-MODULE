import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { NotfoundComponent } from './demo/components/notfound/notfound.component';
import { AppLayoutComponent } from './layout/app.layout.component';
import { HomeComponent } from './demo/components/static-page/home/home.component';
import { AuthGuard } from './guards/auth.guard'; // Importa tu guard
import { PermissionGuard } from './guards/permission.guard';
import { MapaFichaComponent } from './demo/components/static-page/mapa-ficha/mapa-ficha.component';
import { MapaComponent } from './demo/components/static-page/mapa/mapa.component';
import { ViewFichasArticulosComponent } from './demo/components/static-page/view-fichas-articulos/view-fichas-articulos.component';
import { MapaTrashComponent } from './demo/components/static-page/mapa-trash/mapa-trash.component';
import { MostrarFichasArticulosComponent } from './demo/components/static-page/mostrar-fichas-articulos/mostrar-fichas-articulos.component';

@NgModule({
    imports: [
        RouterModule.forRoot(
            [
                {
                    path: '',
                    component: AppLayoutComponent,
                    children: [
                        {
                            path: 'ficha-socio-economica',
                            loadChildren: () =>
                                import(
                                    './ficha-socio-economica/ficha-socio-economica.module'
                                ).then((m) => m.FichaSocioEconomicaModule),
                            canActivate: [AuthGuard],
                            data: { expectedPermission: '/registro' },
                        },
                        {
                            path: 'recolectores',
                            loadChildren: () =>
                                import(
                                    './recolectores-municipales/recolectores-municipales.module'
                                ).then((m) => m.RecolectoresMunicipalesModule),
                            canActivate: [AuthGuard],
                            data: { expectedPermission: '/recolector/:id' },
                        },
                        {
                            path: 'dashboard',
                            loadChildren: () =>
                                import(
                                    './demo/components/dashboard/dashboard.module'
                                ).then((m) => m.DashboardModule),
                            canActivate: [AuthGuard, PermissionGuard],
                            data: { expectedPermission: 'dashboard' },
                        },
                        {
                            path: 'maps',
                            loadChildren: () =>
                                import(
                                    './demo/components/maps/maps.module'
                                ).then((m) => m.MapsModule),
                            //canActivate: [AuthGuard] // Aplica el guard aquí
                        },
                        { path: 'home', component: HomeComponent },
                        {
                            path: 'crear-ficha',
                            component: MapaFichaComponent,
                            canActivate: [AuthGuard],
                        },
                        {
                            path: 'crear-incidente',
                            component: MapaComponent,
                            canActivate: [AuthGuard],
                        },
                        {
                            path: 'crear-incidente/:cate',
                            component: MapaComponent,
                            canActivate: [AuthGuard],
                        },
                        {
                            path: 'crear-incidente/:cate/:sub',
                            component: MapaComponent,
                            canActivate: [AuthGuard],
                        },
                        {
                            path: 'ver-ficha/:id',
                            component: ViewFichasArticulosComponent,
                            canActivate: [AuthGuard],
                        },
                        {
                            path: 'lista-fichas',
                            component: MostrarFichasArticulosComponent,
                            canActivate: [AuthGuard],
                        },

                        { path: '', component: HomeComponent },
                        {
                            path: 'mapa-recolectores',
                            component: MapaTrashComponent,
                        },
                    ],
                },

                {
                    path: 'auth',
                    loadChildren: () =>
                        import('./demo/components/auth/auth.module').then(
                            (m) => m.AuthModule
                        ),
                },
                { path: 'notfound', component: NotfoundComponent },
                { path: '**', redirectTo: '/notfound' },
            ],
            {
                scrollPositionRestoration: 'enabled',
                anchorScrolling: 'enabled',
                onSameUrlNavigation: 'reload',
            }
        ),
    ],
    exports: [RouterModule],
})
export class AppRoutingModule {}
