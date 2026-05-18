import { Module } from '@nestjs/common';
import { DashboardModule } from 'src/modules/dashboard/dashboard.module';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';

@Module({
  imports: [DashboardModule],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
