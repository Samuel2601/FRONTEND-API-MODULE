import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'ec.gob.esmeraldas.labella',
    appName: 'Esmeraldas la Bella',
    webDir: 'dist/esmeraldas-labella',
    plugins: {
        GoogleAuth: {
            scopes: ['profile', 'email'],
            serverClientId:'489368244321-6teu4bgvf9rvqbosn01df840nf83ffmc.apps.googleusercontent.com',
            androidClientId:'489368244321-6teu4bgvf9rvqbosn01df840nf83ffmc.apps.googleusercontent.com',
            forceCodeForRefreshToken: true,
        },
    },
    android: {
        webContentsDebuggingEnabled: true,
    },
};

export default config;
