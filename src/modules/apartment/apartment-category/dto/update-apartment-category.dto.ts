import { PartialType } from '@nestjs/swagger';
import { CreateApartmentCategoryDto } from './create-apartment-category.dto';

export class UpdateApartmentCategoryDto extends PartialType(
  CreateApartmentCategoryDto,
) {}
