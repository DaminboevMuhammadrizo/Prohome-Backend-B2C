import { Module } from '@nestjs/common';
import { ApartmentController } from './apartment.controller';
import { ApartmentService } from './apartment.service';
import { ApTypeController } from './ap-type/ap-type.controller';
import { ApTypeService } from './ap-type/ap-type.service';

@Module({
  controllers: [ApartmentController, ApTypeController],
  providers: [ApartmentService, ApTypeService],
})
export class ApartmentModule {}
