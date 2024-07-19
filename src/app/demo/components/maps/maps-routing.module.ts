import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LayersComponent } from './layers/layers.component';
import { IndexCategoriaComponent } from './categoria/index-categoria/index-categoria.component';
import { IndexFichaSectorialComponent } from './ficha-sectorial/index-ficha-sectorial/index-ficha-sectorial.component';
import { IndexIncidentesDenunciaComponent } from './incidentes-denuncia/index-incidentes-denuncia/index-incidentes-denuncia.component';
import { CreateCategoriaComponent } from './categoria/create-categoria/create-categoria.component';
import { IndexSubcategoriaComponent } from './categoria/sub/index-subcategoria/index-subcategoria.component';
import { CreateSubcategoriaComponent } from './categoria/sub/create-subcategoria/create-subcategoria.component';
import { AdminComponent } from './admin/admin.component';
import { EditUsuarioComponent } from './admin/usuario/edit-usuario/edit-usuario.component';
import { AuthGuard } from 'src/app/guards/auth.guard';
import { PermissionGuard } from 'src/app/guards/permission.guard';


@NgModule({
    imports: [RouterModule.forChild([
        { path: '', component: LayersComponent },
        { path: 'categoria', component: IndexCategoriaComponent ,canActivate: [AuthGuard,PermissionGuard],data: { expectedPermission: '/categoria' }},
        { path: 'categoria/create-categoria', component: CreateCategoriaComponent,canActivate: [AuthGuard,PermissionGuard],data: { expectedPermission: '/categoria' } },
        { path: 'subcategoria', component: IndexSubcategoriaComponent,canActivate: [AuthGuard,PermissionGuard],data: { expectedPermission: '/subcategoria' } },
        { path: 'subcategoria/create-subcategoria', component: CreateSubcategoriaComponent,canActivate: [AuthGuard,PermissionGuard],data: { expectedPermission: '/subcategoria' } },
        { path: 'ficha-sectorial', component: IndexFichaSectorialComponent,data: { expectedPermission: '/ficha_sectorial' } },
        { path: 'incidente', component: IndexIncidentesDenunciaComponent,canActivate: [AuthGuard,PermissionGuard],data: { expectedPermission: '/incidentes_denuncia' } },     
        { path: 'incidente/:id', component: IndexIncidentesDenunciaComponent,canActivate: [AuthGuard,PermissionGuard],data: { expectedPermission: '/incidentes_denuncia' } },      
        { path: 'administracion', component: AdminComponent,canActivate: [AuthGuard,PermissionGuard],data: { expectedPermission: '/usuario' } },
        { path: 'edit-user', component: EditUsuarioComponent,canActivate: [AuthGuard,PermissionGuard],data: { expectedPermission: '/usuario/:id' } },
        //{ path: '', loadChildren: () => import('./layers/layers.component').then(m => m.LayersComponent) },

    ])],
    exports: [RouterModule]
})
export class MapsRoutingModule { }
