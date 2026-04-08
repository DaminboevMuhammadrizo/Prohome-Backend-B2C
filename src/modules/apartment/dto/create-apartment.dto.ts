import { ApartmentListingType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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

  @ApiPropertyOptional({ enum: ApartmentListingType })
  @IsOptional()
  @IsEnum(ApartmentListingType)
  listingType?: ApartmentListingType;

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
}
