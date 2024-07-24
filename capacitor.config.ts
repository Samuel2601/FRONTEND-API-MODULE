import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'ec.gob.esmeraldas.labella',
    appName: 'Esmeraldas la Bella',
    webDir: 'dist/esmeraldas-labella',
    plugins: {
        GoogleAuth: {
            scopes: ['profile', 'email'],
            serverClientId:
                '700625404417-apcets2tvdf368bquike6ip6hcckgthb.apps.googleusercontent.com',
            forceCodeForRefreshToken: true,
        },
    },
};

export default config;
