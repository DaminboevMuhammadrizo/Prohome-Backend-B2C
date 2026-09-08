import { Module } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';
import { TelegramClientService } from './telegram-client.service';
import { TelegramImportController } from './telegram-import.controller';
import { TelegramImportService } from './telegram-import.service';
import { TelegramParserService } from './telegram-parser.service';

@Module({
  controllers: [TelegramImportController],
  providers: [TelegramClientService, TelegramParserService, GeocodingService, TelegramImportService],
})
export class TelegramImportModule {}
