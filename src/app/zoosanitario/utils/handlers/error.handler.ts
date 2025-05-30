// ===== ERROR HANDLER =====
export class VeterinaryErrorHandler {
    static handleApiError(error: any): string {
        if (error.status === 401) {
            return 'Sesión expirada. Por favor, inicie sesión nuevamente.';
        }

        if (error.status === 403) {
            return 'No tiene permisos para realizar esta acción.';
        }

        if (error.status === 404) {
            return 'El recurso solicitado no fue encontrado.';
        }

        if (error.status === 422) {
            return 'Datos de entrada inválidos. Verifique la información.';
        }

        if (error.status >= 500) {
            return 'Error interno del servidor. Intente nuevamente más tarde.';
        }

        if (error.error?.message) {
            return error.error.message;
        }

        return 'Error inesperado. Por favor, contacte al administrador.';
    }

    static handleScannerError(error: any): string {
        if (error.name === 'NotAllowedError') {
            return 'Permisos de cámara denegados. Habilite el acceso a la cámara.';
        }

        if (error.name === 'NotFoundError') {
            return 'No se encontró una cámara disponible en el dispositivo.';
        }

        if (error.name === 'NotSupportedError') {
            return 'El navegador no soporta el acceso a la cámara.';
        }

        if (error.name === 'NotReadableError') {
            return 'La cámara está siendo utilizada por otra aplicación.';
        }

        return 'Error al acceder a la cámara. Intente con ingreso manual.';
    }
}
