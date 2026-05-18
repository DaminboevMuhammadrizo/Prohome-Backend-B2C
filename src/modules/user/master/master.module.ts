import { Module } from '@nestjs/common';
import { DashboardModule } from 'src/modules/dashboard/dashboard.module';
import { MasterController } from './master.controller';
import { MasterService } from './master.service';

@Module({
  imports: [DashboardModule],
  controllers: [MasterController],
  providers: [MasterService],
})
export class MasterModule {}
