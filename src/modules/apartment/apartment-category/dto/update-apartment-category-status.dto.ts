import { IsBoolean } from 'class-validator';

export class UpdateApartmentCategoryStatusDto {
  @IsBoolean()
  isActive: boolean;
}
