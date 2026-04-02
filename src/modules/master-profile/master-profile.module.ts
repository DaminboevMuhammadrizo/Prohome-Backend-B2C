import { Module } from '@nestjs/common';
import { MasterProfileController } from './master-profile.controller';
import { MasterProfileService } from './master-profile.service';

@Module({
  controllers: [MasterProfileController],
  providers: [MasterProfileService],
  exports: [MasterProfileService],
})
export class MasterProfileModule {}
