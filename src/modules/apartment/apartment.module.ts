import { Module } from '@nestjs/common';
import { ApartmentCategoryController } from './apartment-category/apartment-category.controller';
import { ApartmentCategoryService } from './apartment-category/apartment-category.service';
import { ApartmentController } from './apartment.controller';
import { ApartmentService } from './apartment.service';

@Module({
  controllers: [ApartmentController, ApartmentCategoryController],
  providers: [ApartmentService, ApartmentCategoryService],
})
export class ApartmentModule {}
