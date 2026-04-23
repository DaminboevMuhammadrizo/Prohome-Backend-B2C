import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  APARTMENT_LISTING_TYPES,
} from 'src/common/constants/property.constants';
import type { ApartmentListingTypeValue } from 'src/common/constants/property.constants';

export class CreateApartmentDto {
  @ApiProperty()
  @IsString()
  titleUz: string;

  @ApiProperty()
  @IsString()
  titleUzCyrl: string;

  @ApiProperty()
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

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  price: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  area: number;

  @ApiProperty()
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

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCottage?: boolean;

  @ApiPropertyOptional({ enum: APARTMENT_LISTING_TYPES })
  @IsOptional()
  @IsIn(APARTMENT_LISTING_TYPES)
  listingType?: ApartmentListingTypeValue;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  regionId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId: number;

  @ApiProperty()
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

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}
