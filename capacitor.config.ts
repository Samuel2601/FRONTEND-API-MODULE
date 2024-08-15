import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'ec.gob.esmeraldas.labella',
    appName: 'Esmeraldas la Bella',
    webDir: 'dist/esmeraldas-labella',
    plugins: {
        GoogleAuth: {
            scopes: ['profile', 'email'],
            serverClientId:'489368244321-c2vr1nvlg7qlfo85ttd75poi1c1h0365.apps.googleusercontent.com',
            androidClientId:'489368244321-c2vr1nvlg7qlfo85ttd75poi1c1h0365.apps.googleusercontent.com',
            forceCodeForRefreshToken: true,
        },
    },
    android: {
        webContentsDebuggingEnabled: true,
    },
};

export default config;
