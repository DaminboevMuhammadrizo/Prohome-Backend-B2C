import { IsBoolean, IsDateString, IsEnum, IsInt, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type { ApartmentListingTypeValue } from 'src/common/constants/property.constants';
import { APARTMENT_LISTING_TYPES } from 'src/common/constants/property.constants';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApartmentDealStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class ApartmentQueryDto extends PaginationDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    regionId?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    categoryId?: number;

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
    @IsInt()
    @Min(1)
    sellerId?: number;

    @ApiPropertyOptional({ enum: APARTMENT_LISTING_TYPES })
    @IsOptional()
    @IsIn(APARTMENT_LISTING_TYPES)
    listingType?: ApartmentListingTypeValue;

    @ApiPropertyOptional({ enum: ApartmentDealStatus })
    @IsOptional()
    @IsEnum(ApartmentDealStatus)
    dealStatus?: ApartmentDealStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    roomCountMin?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    roomCountMax?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    areaMin?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    areaMax?: number;

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

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    floorMin?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    floorMax?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isCottage?: boolean;

    @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
    @IsOptional()
    @IsDateString()
    createdFrom?: string;

    @ApiPropertyOptional({ example: '2026-04-30T23:59:59.999Z' })
    @IsOptional()
    @IsDateString()
    createdTo?: string;
}
