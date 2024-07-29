import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'ec.gob.esmeraldas.labella',
    appName: 'Esmeraldas la Bella',
    webDir: 'dist/esmeraldas-labella',
    plugins: {
        GoogleAuth: {
            scopes: ['profile', 'email'],
            serverClientId:'489368244321-bslt4irqup8hlc0c59tp3h52v05fbh89.apps.googleusercontent.com',
            androidClientId:'489368244321-bslt4irqup8hlc0c59tp3h52v05fbh89.apps.googleusercontent.com',
            forceCodeForRefreshToken: true,
        },
    },
    android: {
        webContentsDebuggingEnabled: true,
    },
};

export default config;
