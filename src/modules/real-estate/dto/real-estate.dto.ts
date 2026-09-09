import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealType, PropertyType, RealEstateStatus, SellerType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

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

  @ApiPropertyOptional({ example: "Chilonzor tumani, Bunyodkor ko'chasi 12-uy", description: 'Xarita orqali tanlangan aniq manzil (matn ko\'rinishida)' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 41.311081, description: 'Xaritadan tanlangan nuqtaning kengligi (latitude)' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 69.240562, description: 'Xaritadan tanlangan nuqtaning uzunligi (longitude)' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: 'Kelishiladi', description: 'Narx haqida qo\'shimcha izoh (masalan "Kelishiladi", "1 m² narxi")' })
  @IsOptional()
  @IsString()
  priceDesc?: string;
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

  @ApiPropertyOptional({ example: "Chilonzor tumani, Bunyodkor ko'chasi 12-uy" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 41.311081 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 69.240562 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: 'Kelishiladi', description: 'Narx haqida qo\'shimcha izoh (masalan "Kelishiladi", "1 m² narxi")' })
  @IsOptional()
  @IsString()
  priceDesc?: string;
}

export class ChangeRealEstateStatusDto {
  @ApiProperty({ enum: RealEstateStatus })
  @IsEnum(RealEstateStatus)
  status: RealEstateStatus;
}
