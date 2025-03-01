import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MessageService } from 'primeng/api';
import { ImportsModule } from 'src/app/demo/services/import';
import { ListService } from 'src/app/demo/services/list.service';
import { HelperService } from 'src/app/demo/services/helper.service';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

@Component({
    selector: 'app-pdf-list',
    templateUrl: './pdf-list.component.html',
    styleUrl: './pdf-list.component.scss',
    standalone: true,
    imports: [ImportsModule],
    providers: [MessageService],
})
export class PdfListComponent implements OnInit {
    name: string = '';
    pdfUrl: SafeResourceUrl | null = null;
    loading: boolean = true;
    error: string | null = null;
    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient,
        private sanitizer: DomSanitizer,
        private messageService: MessageService,
        private listService: ListService,
        private helperService: HelperService
    ) {}

    async ngOnInit() {
        this.route.queryParamMap.subscribe(async (params) => {
            this.name = params.get('name') || '';
            //console.log('Cargando PDF:', this.name);
            if (this.name) {
                await this.loadPdf(); // Asegurar que esperamos a cargar el PDF
            } else {
                this.loading = false; // No es un error, simplemente mostramos la lista
                this.router.navigate(['/mapa-turistico']); // Corregido: El path debe estar en un array
            }
        });
    }

    async getPdfUrl(): Promise<string | null> {
        return new Promise((resolve) => {
            this.listService
                .listarTiposActividadesProyecto(null, {
                    is_tourism: true,
                })
                .subscribe({
                    next: (response) => {
                        //console.log(response);
                        if (response.data && response.data.length > 0) {
                            const matchedPdf = response.data.find(
                                (e) =>
                                    e.nombre.trim().toLowerCase() ===
                                    this.name.trim().toLowerCase()
                            );
                            resolve(matchedPdf ? matchedPdf.url_pdf : null);
                        } else {
                            resolve(null);
                        }
                    },
                    error: (err) => {
                        console.error('Error al obtener PDF:', err);
                        resolve(null);
                    },
                });
        });
    }

    async loadPdf() {
        this.loading = true;
        this.error = null;

        try {
            const pdfFileName = await this.getPdfUrl();

            if (!pdfFileName) {
                throw new Error(
                    `No se encontró un PDF para la categoría: ${this.name}`
                );
            }

            // Different approach for mobile vs web
            if (this.helperService.isMobil()) {
                await this.loadPdfNative(pdfFileName);
            } else {
                await this.loadPdfWeb(pdfFileName);
            }
        } catch (error: any) {
            this.handleError(error.message);
        }
    }

    /**
     * Carga el PDF para plataformas móviles nativas usando Capacitor Filesystem
     */
    private async loadPdfNative(pdfFileName: string) {
        try {
            const assetPath = `assets/pdfs/${pdfFileName}`; // Cambiado para ser accesible vía HTTP

            // Verificar si el PDF ya está en caché
            try {
                const fileStats = await Filesystem.stat({
                    directory: Directory.Cache,
                    path: pdfFileName,
                });
                console.log('Detalles del archivo:', fileStats);
            } catch (statError) {
                console.warn(
                    'El archivo no existe en caché, procederemos a copiarlo.'
                );
            }

            // Intentar obtenerlo desde la caché
            try {
                const cachedFileInfo = await Filesystem.getUri({
                    directory: Directory.Cache,
                    path: pdfFileName,
                });

                const fileUrl = Capacitor.convertFileSrc(cachedFileInfo.uri);
                this.pdfUrl =
                    this.sanitizer.bypassSecurityTrustResourceUrl(fileUrl);
                this.loading = false;

                console.log('URL segura generada desde caché:', this.pdfUrl);
                return;
            } catch (cacheError) {
                console.warn(
                    'PDF no encontrado en caché, copiando desde activos...'
                );
            }

            // Descargar el PDF usando HttpClient
            const response = await fetch(assetPath);
            if (!response.ok)
                throw new Error(
                    `Error al descargar PDF: ${response.statusText}`
                );

            const blob = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            await new Promise((resolve) => (reader.onloadend = resolve));

            // Guardar en caché
            await Filesystem.writeFile({
                path: pdfFileName,
                directory: Directory.Cache,
                data: reader.result!.toString().split(',')[1], // Base64 sin encabezado
            });

            // Obtener URI y convertirla a URL segura
            const fileInfo = await Filesystem.getUri({
                directory: Directory.Cache,
                path: pdfFileName,
            });

            const fileUrl = Capacitor.convertFileSrc(fileInfo.uri);
            this.pdfUrl =
                this.sanitizer.bypassSecurityTrustResourceUrl(fileUrl);
            this.loading = false;

            console.log('URL segura generada después de copiar:', this.pdfUrl);
        } catch (error: any) {
            console.error('Error al cargar el PDF de forma nativa:', error);
            this.handleError(
                `Error al cargar el PDF en dispositivo móvil: ${error.message}`
            );
        }
    }

    /**
     * Load PDF for web platforms
     */
    private loadPdfWeb(pdfFileName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const pdfPath = `assets/pdfs/${encodeURIComponent(pdfFileName)}`;

            // Use fetch instead of HttpClient for better error handling with binary files
            fetch(pdfPath)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(
                            `HTTP error! status: ${response.status}`
                        );
                    }

                    // Create a blob URL for the PDF
                    return response.blob();
                })
                .then((blob) => {
                    const blobUrl = URL.createObjectURL(blob);
                    this.pdfUrl =
                        this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
                    this.loading = false;
                    resolve();
                })
                .catch((error) => {
                    console.error('Error loading PDF for web:', error);
                    reject(
                        new Error(`No se pudo cargar el PDF: ${error.message}`)
                    );
                });
        });
    }

    handleError(message: string): void {
        this.error = message;
        this.loading = false;
        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: message,
        });
    }

    showAllPdfs(): void {
        this.router.navigate([], { queryParams: {} });
        this.name = '';
        this.pdfUrl = null;
        this.error = null;
    }

    selectPdf(name: string): void {
        this.router.navigate([], { queryParams: { name } });
    }
}
