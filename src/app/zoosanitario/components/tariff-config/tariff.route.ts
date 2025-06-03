import { Routes } from '@angular/router';

// Importar componentes del sistema de tarifas
import { TARIFF_COMPONENTS } from './index';

/**
 * Configuración de rutas para el módulo de tarifas
 */
export const tariffRoutes: Routes = [
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
    },
    {
        path: 'dashboard',
        component: TARIFF_COMPONENTS[0],
        data: {
            title: 'Dashboard de Tarifas',
            breadcrumb: 'Dashboard',
            icon: 'pi pi-chart-line',
        },
    },
    {
        path: 'configuracion',
        component: TARIFF_COMPONENTS[1],
        data: {
            title: 'Configuración de Tarifas',
            breadcrumb: 'Configuración',
            icon: 'pi pi-cog',
        },
    },
    {
        path: 'calculadora',
        component: TARIFF_COMPONENTS[2],
        data: {
            title: 'Calculadora de Tarifas',
            breadcrumb: 'Calculadora',
            icon: 'pi pi-calculator',
        },
    },
    {
        path: 'rbu',
        component: TARIFF_COMPONENTS[3],
        data: {
            title: 'Gestión de RBU',
            breadcrumb: 'RBU',
            icon: 'pi pi-dollar',
        },
    },
];

/**
 * Configuración de rutas para lazy loading
 */
export const TARIFF_ROUTING = {
    path: 'tarifas',
    loadChildren: () => import('./tariff.module').then((m) => m.TariffModule),
    data: {
        title: 'Sistema de Tarifas',
        breadcrumb: 'Tarifas',
        icon: 'pi pi-calculator',
    },
};

/**
 * Configuración de menú para el sistema de tarifas
 */
export const TARIFF_MENU_ITEMS = [
    {
        label: 'Sistema de Tarifas',
        icon: 'pi pi-calculator',
        items: [
            {
                label: 'Dashboard',
                icon: 'pi pi-chart-line',
                routerLink: ['/tarifas/dashboard'],
                tooltip: 'Vista general del sistema',
            },
            {
                label: 'Configuración',
                icon: 'pi pi-cog',
                routerLink: ['/tarifas/configuracion'],
                tooltip: 'Gestionar configuraciones de tarifas',
            },
            {
                label: 'Calculadora',
                icon: 'pi pi-calculator',
                routerLink: ['/tarifas/calculadora'],
                tooltip: 'Calcular tarifas específicas',
            },
            {
                label: 'Gestión RBU',
                icon: 'pi pi-dollar',
                routerLink: ['/tarifas/rbu'],
                tooltip: 'Administrar RBU',
            },
        ],
    },
];

/**
 * Breadcrumbs para el sistema de tarifas
 */
export const TARIFF_BREADCRUMBS = {
    '/tarifas': [{ label: 'Inicio', routerLink: '/' }, { label: 'Tarifas' }],
    '/tarifas/dashboard': [
        { label: 'Inicio', routerLink: '/' },
        { label: 'Tarifas', routerLink: '/tarifas' },
        { label: 'Dashboard' },
    ],
    '/tarifas/configuracion': [
        { label: 'Inicio', routerLink: '/' },
        { label: 'Tarifas', routerLink: '/tarifas' },
        { label: 'Configuración' },
    ],
    '/tarifas/calculadora': [
        { label: 'Inicio', routerLink: '/' },
        { label: 'Tarifas', routerLink: '/tarifas' },
        { label: 'Calculadora' },
    ],
    '/tarifas/rbu': [
        { label: 'Inicio', routerLink: '/' },
        { label: 'Tarifas', routerLink: '/tarifas' },
        { label: 'RBU' },
    ],
};
