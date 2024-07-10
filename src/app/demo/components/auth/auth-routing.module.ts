import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PasswordRecoveryComponent } from './password-recovery/password-recovery.component';

@NgModule({
    imports: [RouterModule.forChild([
        { path: 'error', loadChildren: () => import('./error/error.module').then(m => m.ErrorModule) },
        { path: 'access', loadChildren: () => import('./access/access.module').then(m => m.AccessModule) },
        { path: 'login', loadChildren: () => import('./login/login.module').then(m => m.LoginModule) },
        { path: 'signup', loadChildren: () => import('./signup/signup.module').then(m => m.SignupModule) },
        { path: 'politicas', loadChildren: () => import('./politicas/politicas.module').then(m => m.PoliticasModule) },
        { path: 'recovery',component:PasswordRecoveryComponent },
        { path: '**', redirectTo: '/notfound' },
    ])],
    exports: [RouterModule]
})
export class AuthRoutingModule { }
