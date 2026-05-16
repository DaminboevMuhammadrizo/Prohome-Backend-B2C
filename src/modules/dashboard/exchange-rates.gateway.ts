import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Server, Socket } from 'socket.io';
import { DashboardService } from './dashboard.service';

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: '/exchange-rates',
})
export class ExchangeRatesGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer() server: Server;

    private readonly logger = new Logger(ExchangeRatesGateway.name);

    // Oxirgi muvaffaqiyatli kurslar keshi — yangi client uchun darhol yuboriladi
    private cachedRates: { USD: number | null; EUR: number | null; RUB: number | null; updatedAt: string } | null = null;

    constructor(private readonly dashboardService: DashboardService) {}

    afterInit() {
        this.logger.log('ExchangeRatesGateway initialized');
        // Server ishga tushganda birinchi marta darhol olish
        this.broadcastRates();
    }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id} | total: ${this.server.sockets.sockets.size}`);

        // Kesh bo'lsa — yangi clientga darhol yuborish (API kutmasdan)
        if (this.cachedRates) {
            client.emit('exchange_rates', this.cachedRates);
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id} | total: ${this.server.sockets.sockets.size}`);
    }

    // Har 1 daqiqada barcha clientlarga yangi kurs yuborish
    @Interval(60_000)
    async broadcastRates() {
        try {
            const rates = await this.dashboardService.fetchExchangeRates();
            this.cachedRates = rates;
            this.server.emit('exchange_rates', rates);
            this.logger.log(`Rates broadcast → USD:${rates.USD} EUR:${rates.EUR} RUB:${rates.RUB}`);
        } catch (err) {
            this.logger.error('Failed to fetch exchange rates', err?.message);
            this.server.emit('exchange_rates_error', { message: 'Kurslarni yuklashda xatolik' });
        }
    }

    // Client o'zi so'rab olmoqchi bo'lsa
    @SubscribeMessage('get_rates')
    async handleGetRates(client: Socket) {
        if (this.cachedRates) {
            client.emit('exchange_rates', this.cachedRates);
            return;
        }

        try {
            const rates = await this.dashboardService.fetchExchangeRates();
            this.cachedRates = rates;
            client.emit('exchange_rates', rates);
        } catch {
            client.emit('exchange_rates_error', { message: 'Kurslarni yuklashda xatolik' });
        }
    }
}
