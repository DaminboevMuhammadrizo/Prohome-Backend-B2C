import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { ExchangeRatesGateway } from './exchange-rates.gateway';

@Module({
    providers: [DashboardService, ExchangeRatesGateway],
    controllers: [DashboardController],
    exports: [DashboardService],
})
export class DashboardModule {}
