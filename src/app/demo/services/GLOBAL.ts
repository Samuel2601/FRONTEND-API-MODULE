// ===== GLOBAL CONFIGURATION =====
export const GLOBAL = {
    url: 'http://127.0.0.1:4202/new/',

    //url: 'https://geoapi.esmeraldas.gob.ec/new/',
    version: '1.0.0',
    appName: 'ESMERALDAS LA BELLA',
    defaultLanguage: 'es',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    pagination: {
        defaultPageSize: 10,
        pageSizeOptions: [10, 25, 50, 100],
    },
    scanner: {
        timeout: 30000, // 30 segundos
        retryAttempts: 3,
        supportedFormats: ['QR_CODE', 'CODE_128', 'CODE_39'],
    },
    notifications: {
        defaultDuration: 5000,
        position: 'top-right',
    },
    charts: {
        defaultColors: [
            '#3B82F6',
            '#10B981',
            '#F59E0B',
            '#EF4444',
            '#8B5CF6',
            '#06B6D4',
            '#84CC16',
            '#F97316',
        ],
    },
    reports: {
        maxExportRecords: 10000,
        defaultFormat: 'PDF',
        supportedFormats: ['PDF', 'EXCEL', 'CSV', 'JSON'],
    },
};
