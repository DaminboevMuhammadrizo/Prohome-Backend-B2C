import { Module } from '@nestjs/common';
import { ApartmentLayoutController } from './apartment-layout.controller';
import { ApartmentLayoutService } from './apartment-layout.service';

@Module({
  controllers: [ApartmentLayoutController],
  providers: [ApartmentLayoutService],
})
export class ApartmentLayoutModule {}
