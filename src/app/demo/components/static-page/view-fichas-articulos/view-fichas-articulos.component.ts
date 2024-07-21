import { Component, Input, OnInit } from '@angular/core';
import { FilterService } from 'src/app/demo/services/filter.service';
import { GLOBAL } from 'src/app/demo/services/GLOBAL';
import { ImportsModule } from 'src/app/demo/services/import';
import { MapaMostrarFichasComponent } from '../mapa-mostrar-fichas/mapa-mostrar-fichas.component';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-view-fichas-articulos',
    standalone: true,
    imports: [ImportsModule, MapaMostrarFichasComponent],
    templateUrl: './view-fichas-articulos.component.html',
    styleUrl: './view-fichas-articulos.component.scss',
})
export class ViewFichasArticulosComponent implements OnInit {
    @Input() fichaId!: string;
    ficha: any;
    public url = GLOBAL.url;
    responsiveOptions = [
        {
            breakpoint: '1199px',
            numVisible: 1,
            numScroll: 1,
        },
        {
            breakpoint: '991px',
            numVisible: 2,
            numScroll: 1,
        },
        {
            breakpoint: '767px',
            numVisible: 1,
            numScroll: 1,
        },
    ];

    constructor(
        private route: ActivatedRoute,
        private filterService: FilterService
    ) {}

    ngOnInit(): void {
        this.route.paramMap.subscribe((params) => {
            this.fichaId = params.get('id') || '';
            console.log('RECIBIO LA FICHA: ', this.fichaId);
            if (this.fichaId) {
                this.obtenerFicha();
            }
        });
    }

    obtenerFicha(): void {
        this.filterService.obtenerFichaPublica(this.fichaId).subscribe(
            (response: any) => {
                if (response.data) {
                    this.ficha = response.data;
                    this.iniciarCambioDeImagen();
                }
            },
            (error) => {
                console.error(error);
            }
        );
    }

    isMobile(): boolean {
        return window.innerWidth <= 768;
    }
    currentImage: string = '';
    imageIndex: number = 0;
    iniciarCambioDeImagen(): void {
        if (this.ficha.foto && this.ficha.foto.length > 0) {
            this.currentImage = this.ficha.foto[0];
            setInterval(() => {
                this.imageIndex =
                    (this.imageIndex + 1) % this.ficha.foto.length;
                this.currentImage = this.ficha.foto[this.imageIndex];
            }, 5000); // Cambia la imagen cada 5 segundos
        }
    }

    compartirEnTwitter(): void {
        const url = `http://localhost:4200/ver-ficha/${this.fichaId}`;
        const text = `Mira este artículo: ${this.ficha.title_marcador}`;
        const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
            url
        )}&text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank');
    }

    compartirEnFacebook(): void {
        const url = `http://localhost:4200/ver-ficha/${this.fichaId}`;
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            url
        )}`;
        window.open(facebookUrl, '_blank');
    }

    copiarEnlace(): void {
        const url = `http://localhost:4200/ver-ficha/${this.fichaId}`;
        navigator.clipboard.writeText(url).then(
            () => {
                alert('Enlace copiado al portapapeles');
            },
            (err) => {
                console.error('Error al copiar el enlace: ', err);
            }
        );
    }
}
