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


@NgModule({
    imports: [RouterModule.forChild([
        { path: '', component: LayersComponent },
        { path: 'categoria', component: IndexCategoriaComponent },
        { path: 'categoria/create-categoria', component: CreateCategoriaComponent },
        { path: 'subcategoria', component: IndexSubcategoriaComponent },
        { path: 'subcategoria/create-subcategoria', component: CreateSubcategoriaComponent },
        { path: 'ficha-sectorial', component: IndexFichaSectorialComponent },
        { path: 'incidente', component: IndexIncidentesDenunciaComponent },     
        { path: 'incidente/:id', component: IndexIncidentesDenunciaComponent },      
        { path: 'administracion', component: AdminComponent },
        { path: 'edit-user', component: EditUsuarioComponent },
        //{ path: '', loadChildren: () => import('./layers/layers.component').then(m => m.LayersComponent) },

    ])],
    exports: [RouterModule]
})
export class MapsRoutingModule { }
