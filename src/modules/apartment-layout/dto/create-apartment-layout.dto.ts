import { LayoutStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUrl,
  Min,
} from 'class-validator';

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

  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  images: string[];

  @ApiPropertyOptional({ enum: LayoutStatus })
  @IsOptional()
  @IsEnum(LayoutStatus)
  status?: LayoutStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalUnits?: number;
}
