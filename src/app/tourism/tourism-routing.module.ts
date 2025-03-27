import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TourismComponent } from './home/tourism.component';
import { ItemComponent } from './views/item/item.component';
import { ListComponent } from './views/list/list.component';
import { MapsComponent } from './views/maps/maps.component';
import { PdfListComponent } from './views/pdf-list/pdf-list.component';
import { AppLayoutComponent } from './layout/apptourism.component';

const routes: Routes = [
    {
        path: '',
        component: AppLayoutComponent,
        children: [
            { path: '', redirectTo: 'home', pathMatch: 'full' }, // Default redirect
            { path: 'home', component: TourismComponent },
            { path: 'item', component: ItemComponent },
            { path: 'item/:id', component: ItemComponent },
            { path: 'item/:name', component: ItemComponent },
            { path: 'list', component: ListComponent },
            { path: 'list/:name', component: ListComponent },
            { path: 'maps', component: MapsComponent },
            { path: 'maps/:name', component: MapsComponent },
            { path: 'pdf-list', component: PdfListComponent },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TourismRoutingModule {}
