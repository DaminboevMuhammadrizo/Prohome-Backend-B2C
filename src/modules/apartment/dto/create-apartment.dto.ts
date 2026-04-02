import { ApartmentListingType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateApartmentDto {
  @IsString()
  titleUz: string;

  @IsString()
  titleUzCyrl: string;

  @IsString()
  titleRu: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionUz?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionUzCyrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionRu?: string;

  @Type(() => Number)
  @IsNumber()
  price: number;

  @Type(() => Number)
  @IsNumber()
  area: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomCount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  floor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalFloors?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  landArea?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCottage?: boolean;

  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  images: string[];

  @ApiPropertyOptional({ enum: ApartmentListingType })
  @IsOptional()
  @IsEnum(ApartmentListingType)
  listingType?: ApartmentListingType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  regionId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId: number;

  @IsString()
  address: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  complexId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  layoutId?: number;
}
