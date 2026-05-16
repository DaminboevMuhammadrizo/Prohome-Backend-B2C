import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealType, PropertyType, RealEstateStatus, SellerType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateRealEstateDto {
  @ApiProperty({ example: '3 xonali kvartira Yunusobodda' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 85000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ enum: PropertyType })
  @IsEnum(PropertyType)
  propertyType: PropertyType;

  @ApiProperty({ enum: DealType })
  @IsEnum(DealType)
  dealType: DealType;

  @ApiProperty({ enum: SellerType })
  @IsEnum(SellerType)
  sellerType: SellerType;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  locationId: number;

  @ApiProperty({ example: '+998901234567' })
  @IsString()
  contactPhone: string;

  @ApiPropertyOptional({ example: 'Mega Qurilish' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ example: 75.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  areaSize: number;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomCount: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floor?: number;

  @ApiPropertyOptional({ example: 9 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  totalFloors?: number;

  @ApiPropertyOptional({ example: 120.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  plotSize?: number;
}

export class UpdateRealEstateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({ enum: DealType })
  @IsOptional()
  @IsEnum(DealType)
  dealType?: DealType;

  @ApiPropertyOptional({ enum: SellerType })
  @IsOptional()
  @IsEnum(SellerType)
  sellerType?: SellerType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  locationId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  areaSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roomCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  totalFloors?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  plotSize?: number;
}

export class ChangeRealEstateStatusDto {
  @ApiProperty({ enum: RealEstateStatus })
  @IsEnum(RealEstateStatus)
  status: RealEstateStatus;
}
