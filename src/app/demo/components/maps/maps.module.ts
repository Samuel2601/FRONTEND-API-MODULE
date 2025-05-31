import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapsRoutingModule } from './maps-routing.module';

import { GoogleMapsModule } from '@angular/google-maps';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { LayersComponent } from './layers/layers.component';
import { IndexIncidentesDenunciaComponent } from './incidentes-denuncia/index-incidentes-denuncia/index-incidentes-denuncia.component';
import { IndexEstadoIncidenteComponent } from './incidentes-denuncia/estado-incidente/index-estado-incidente/index-estado-incidente.component';
import { CreateEstadoIncidenteComponent } from './incidentes-denuncia/estado-incidente/create-estado-incidente/create-estado-incidente.component';
import { DashboardModule } from '../dashboard/dashboard.module';
import { IndexFichaSectorialComponent } from './ficha-sectorial/index-ficha-sectorial/index-ficha-sectorial.component';
import { IndexEstadoActividadProyectoComponent } from './ficha-sectorial/estado-actividad-proyecto/index-estado-actividad-proyecto/index-estado-actividad-proyecto.component';
import { CreateEstadoActividadProyectoComponent } from './ficha-sectorial/estado-actividad-proyecto/create-estado-actividad-proyecto/create-estado-actividad-proyecto.component';
import { IndexActividadProyectoComponent } from './ficha-sectorial/actividad-proyecto/index-actividad-proyecto/index-actividad-proyecto.component';
import { CreateActividadProyectoComponent } from './ficha-sectorial/actividad-proyecto/create-actividad-proyecto/create-actividad-proyecto.component';
import { CreateIncidentesDenunciaComponent } from './incidentes-denuncia/create-incidentes-denuncia/create-incidentes-denuncia.component';
import { CreateFichaSectorialComponent } from './ficha-sectorial/create-ficha-sectorial/create-ficha-sectorial.component';
import { IndexCategoriaComponent } from './categoria/index-categoria/index-categoria.component';
import { CreateCategoriaComponent } from './categoria/create-categoria/create-categoria.component';
import { EditCategoriaComponent } from './categoria/edit-categoria/edit-categoria.component';
import { CreateSubcategoriaComponent } from './categoria/sub/create-subcategoria/create-subcategoria.component';
import { IndexSubcategoriaComponent } from './categoria/sub/index-subcategoria/index-subcategoria.component';
import { EditSubcategoriaComponent } from './categoria/sub/edit-subcategoria/edit-subcategoria.component';
import { AdminComponent } from './admin/admin.component';
import { IndexUsuarioComponent } from './admin/usuario/index-usuario/index-usuario.component';
import { CreateUsuarioComponent } from './admin/usuario/create-usuario/create-usuario.component';
import { EditUsuarioComponent } from './admin/usuario/edit-usuario/edit-usuario.component';
import { CreateRolUserComponent } from './admin/rol-user/create-rol-user/create-rol-user.component';
import { IndexRolUserComponent } from './admin/rol-user/index-rol-user/index-rol-user.component';
import { CreatePermisosComponent } from './admin/permisos/create-permisos/create-permisos.component';
import { EditPermisosComponent } from './admin/permisos/edit-permisos/edit-permisos.component';
import { IndexPermisosComponent } from './admin/permisos/index-permisos/index-permisos.component';
import { CreateEncargadoCategoriaComponent } from './admin/encargado-categoria/create-encargado-categoria/create-encargado-categoria.component';
import { EditEncargadoCategoriaComponent } from './admin/encargado-categoria/edit-encargado-categoria/edit-encargado-categoria.component';
import { IndexEncargadoCategoriaComponent } from './admin/encargado-categoria/index-encargado-categoria/index-encargado-categoria.component';

import { MessageService } from 'primeng/api';

import { IndexDireccionGeoComponent } from './direccion-geo/index-direccion-geo/index-direccion-geo.component';
import { CreateDireccionGeoComponent } from './direccion-geo/create-direccion-geo/create-direccion-geo.component';
import { EditDireccionGeoComponent } from './direccion-geo/edit-direccion-geo/edit-direccion-geo.component';
import { EditFichaSectorialComponent } from './ficha-sectorial/edit-ficha-sectorial/edit-ficha-sectorial.component';
import { EditIncidentesDenunciaComponent } from './incidentes-denuncia/edit-incidentes-denuncia/edit-incidentes-denuncia.component';
import { EditActividadProyectoComponent } from './ficha-sectorial/actividad-proyecto/edit-actividad-proyecto/edit-actividad-proyecto.component';
import { MapaMostrarFichasComponent } from '../static-page/mapa-mostrar-fichas/mapa-mostrar-fichas.component';
import { ImportsModule } from '../../services/import';
import { ListIncidentesComponent } from '../dashboard/list-incidentes/list-incidentes.component';

@NgModule({
    imports: [
        ImportsModule,
        MapaMostrarFichasComponent,
        ListIncidentesComponent,
    ],
    declarations: [
        LayersComponent,
        IndexIncidentesDenunciaComponent,
        IndexEstadoIncidenteComponent,
        CreateEstadoIncidenteComponent,
        IndexFichaSectorialComponent,
        IndexEstadoActividadProyectoComponent,
        CreateEstadoActividadProyectoComponent,
        IndexActividadProyectoComponent,
        CreateActividadProyectoComponent,
        CreateIncidentesDenunciaComponent,
        CreateFichaSectorialComponent,
        IndexCategoriaComponent,
        CreateCategoriaComponent,
        EditCategoriaComponent,
        CreateSubcategoriaComponent,
        IndexSubcategoriaComponent,
        EditSubcategoriaComponent,
        AdminComponent,
        IndexUsuarioComponent,
        CreateUsuarioComponent,
        EditUsuarioComponent,
        CreateRolUserComponent,
        EditUsuarioComponent,
        IndexRolUserComponent,
        CreatePermisosComponent,
        EditPermisosComponent,
        IndexPermisosComponent,
        CreateEncargadoCategoriaComponent,
        EditEncargadoCategoriaComponent,
        IndexEncargadoCategoriaComponent,
        IndexDireccionGeoComponent,
        CreateDireccionGeoComponent,
        EditDireccionGeoComponent,
        EditFichaSectorialComponent,
        EditIncidentesDenunciaComponent,
        EditActividadProyectoComponent,
    ],
    providers: [MessageService],
    bootstrap: [IndexUsuarioComponent],
})
export class MapsModule {}
