import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import {
  APARTMENT_LAYOUT_STATUSES,
} from 'src/common/constants/property.constants';
import type { ApartmentLayoutStatusValue } from 'src/common/constants/property.constants';

export class CreateApartmentLayoutDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  complexId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomCount: number;

  @Type(() => Number)
  @IsNumber()
  area: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMax?: number;

  @ApiPropertyOptional({ enum: APARTMENT_LAYOUT_STATUSES })
  @IsOptional()
  @IsIn(APARTMENT_LAYOUT_STATUSES)
  status?: ApartmentLayoutStatusValue;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalUnits?: number;
}
