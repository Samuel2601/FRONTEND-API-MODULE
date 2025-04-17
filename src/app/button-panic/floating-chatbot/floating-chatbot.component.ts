import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-floating-chatbot',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './floating-chatbot.component.html',
    styleUrls: ['./floating-chatbot.component.scss'],
})
export class FloatingChatbotComponent {
    // WhatsApp URL
    whatsappUrl = 'https://wa.me/593998741173';

    openWhatsApp() {
        window.open(this.whatsappUrl, '_blank');
    }
}
