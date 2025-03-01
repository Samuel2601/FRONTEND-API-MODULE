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

//modulo primeng
import { AccordionModule } from 'primeng/accordion';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { BadgeModule } from 'primeng/badge';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CarouselModule } from 'primeng/carousel';
import { CascadeSelectModule } from 'primeng/cascadeselect';
import { ChartModule } from 'primeng/chart';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { ChipsModule } from 'primeng/chips';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ContextMenuModule } from 'primeng/contextmenu';
import { DataViewModule } from 'primeng/dataview';
import { VirtualScrollerModule } from 'primeng/virtualscroller';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DockModule } from 'primeng/dock';
import { DragDropModule } from 'primeng/dragdrop';
import { DropdownModule } from 'primeng/dropdown';
import {
    DialogService,
    DynamicDialogConfig,
    DynamicDialogModule,
    DynamicDialogRef,
} from 'primeng/dynamicdialog';
import { EditorModule } from 'primeng/editor';
import { FieldsetModule } from 'primeng/fieldset';
import { FileUploadModule } from 'primeng/fileupload';
import { GalleriaModule } from 'primeng/galleria';
import { InplaceModule } from 'primeng/inplace';
import { InputMaskModule } from 'primeng/inputmask';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputGroupModule } from 'primeng/inputgroup';
import { ImageModule } from 'primeng/image';
import { KnobModule } from 'primeng/knob';
import { ListboxModule } from 'primeng/listbox';
import { MegaMenuModule } from 'primeng/megamenu';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';
import { MessageModule } from 'primeng/message';
import { MessagesModule } from 'primeng/messages';
import { MultiSelectModule } from 'primeng/multiselect';
import { OrderListModule } from 'primeng/orderlist';
import { OrganizationChartModule } from 'primeng/organizationchart';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { PaginatorModule } from 'primeng/paginator';
import { PanelModule } from 'primeng/panel';
import { PanelMenuModule } from 'primeng/panelmenu';
import { PasswordModule } from 'primeng/password';
import { PickListModule } from 'primeng/picklist';
import { ProgressBarModule } from 'primeng/progressbar';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RatingModule } from 'primeng/rating';
import { ScrollerModule } from 'primeng/scroller';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { ScrollTopModule } from 'primeng/scrolltop';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SidebarModule } from 'primeng/sidebar';
import { SkeletonModule } from 'primeng/skeleton';
import { SlideMenuModule } from 'primeng/slidemenu';
import { SliderModule } from 'primeng/slider';
import { SpeedDialModule } from 'primeng/speeddial';
import { SpinnerModule } from 'primeng/spinner';
import { SplitButtonModule } from 'primeng/splitbutton';
import { SplitterModule } from 'primeng/splitter';
import { StepsModule } from 'primeng/steps';
import { TabMenuModule } from 'primeng/tabmenu';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { TagModule } from 'primeng/tag';
import { TerminalModule } from 'primeng/terminal';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { TimelineModule } from 'primeng/timeline';
import { ToastModule } from 'primeng/toast';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { TriStateCheckboxModule } from 'primeng/tristatecheckbox';
import { TreeModule } from 'primeng/tree';
import { TreeSelectModule } from 'primeng/treeselect';
import { TreeTableModule } from 'primeng/treetable';
import { AnimateModule } from 'primeng/animate';
import { CardModule } from 'primeng/card';
import { BlockUIModule } from 'primeng/blockui';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RippleModule } from 'primeng/ripple';
import { StyleClassModule } from 'primeng/styleclass';
import { MessageService } from 'primeng/api';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { StepperModule } from 'primeng/stepper';
import { FloatLabelModule } from 'primeng/floatlabel';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { IndexDireccionGeoComponent } from './direccion-geo/index-direccion-geo/index-direccion-geo.component';
import { CreateDireccionGeoComponent } from './direccion-geo/create-direccion-geo/create-direccion-geo.component';
import { EditDireccionGeoComponent } from './direccion-geo/edit-direccion-geo/edit-direccion-geo.component';
import { EditFichaSectorialComponent } from './ficha-sectorial/edit-ficha-sectorial/edit-ficha-sectorial.component';
import { EditIncidentesDenunciaComponent } from './incidentes-denuncia/edit-incidentes-denuncia/edit-incidentes-denuncia.component';
import { EditActividadProyectoComponent } from './ficha-sectorial/actividad-proyecto/edit-actividad-proyecto/edit-actividad-proyecto.component';
import { MapaMostrarFichasComponent } from '../static-page/mapa-mostrar-fichas/mapa-mostrar-fichas.component';

@NgModule({
    imports: [
        MapaMostrarFichasComponent,
        NgbModule,
        CommonModule,
        MapsRoutingModule,
        SidebarModule,
        InputGroupModule,
        InputGroupAddonModule,
        IconFieldModule,
        InputIconModule,
        SpeedDialModule,
        GoogleMapsModule,
        ToastModule,
        FormsModule,
        ReactiveFormsModule,
        AutoCompleteModule,
        TableModule,
        DialogModule,
        TagModule,
        GalleriaModule,
        ImageModule,
        FileUploadModule,
        CalendarModule,
        DropdownModule,
        InputTextModule,
        DashboardModule,
        SkeletonModule,
        TreeTableModule,
        StepperModule,

        AccordionModule,
        AvatarModule,
        AvatarGroupModule,
        BadgeModule,
        BreadcrumbModule,
        ButtonModule,
        CarouselModule,
        CascadeSelectModule,
        ChartModule,
        CheckboxModule,
        ChipModule,
        ChipsModule,
        ConfirmDialogModule,
        ConfirmPopupModule,
        ColorPickerModule,
        ContextMenuModule,
        DataViewModule,
        VirtualScrollerModule,
        DividerModule,
        DockModule,
        DragDropModule,
        DynamicDialogModule,
        EditorModule,
        FieldsetModule,
        InplaceModule,
        InputMaskModule,
        InputSwitchModule,
        InputNumberModule,
        InputTextareaModule,
        KnobModule,
        ListboxModule,
        MegaMenuModule,
        MenuModule,
        MenubarModule,
        MessageModule,
        MessagesModule,
        MultiSelectModule,
        OrderListModule,
        OrganizationChartModule,
        OverlayPanelModule,
        PaginatorModule,
        PanelModule,
        PanelMenuModule,
        PasswordModule,
        PickListModule,
        ProgressBarModule,
        RadioButtonModule,
        RatingModule,
        ScrollerModule,
        ScrollPanelModule,
        ScrollTopModule,
        SelectButtonModule,
        SlideMenuModule,
        SliderModule,
        SpinnerModule,
        SplitButtonModule,
        SplitterModule,
        StepsModule,
        TabMenuModule,
        TabViewModule,
        TerminalModule,
        TieredMenuModule,
        TimelineModule,
        ToggleButtonModule,
        ToolbarModule,
        TooltipModule,
        TriStateCheckboxModule,
        TreeModule,
        TreeSelectModule,
        AnimateModule,
        CardModule,
        BlockUIModule,
        ProgressSpinnerModule,
        RippleModule,
        StyleClassModule,
        FloatLabelModule,
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
    providers: [
        MessageService,
        DialogService,
        DynamicDialogConfig,
        DynamicDialogRef,
    ],
    bootstrap: [IndexUsuarioComponent],
})
export class MapsModule {}
