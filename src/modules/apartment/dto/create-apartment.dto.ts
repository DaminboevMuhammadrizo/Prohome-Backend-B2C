import { IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApartmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApartmentDto {
    @ApiProperty()
    @IsString()
    addressUz: string;

    @ApiProperty()
    @IsString()
    addressUzCyrl: string;

    @ApiProperty()
    @IsString()
    addressRu: string;

    @Type(() => Number)
    @IsInt()
    regionId: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    roomCount?: number;

    @IsOptional()
    @ApiProperty()
    @IsString()
    descUz?: string;

    @IsOptional()
    @ApiProperty()
    @IsString()
    descUzCyrl?: string;

    @IsOptional()
    @ApiProperty()
    @IsString()
    descRu?: string;

    @ApiProperty()
    @IsString()
    titleUz: string;

    @ApiProperty()
    @IsString()
    titleUzCyrl: string;

    @ApiProperty()
    @IsString()
    titleRu: string;

    @Type(() => Number)
    @IsNumber()
    area: number;

    @Type(() => Number)
    @IsNumber()
    pricePerMetr: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    price?: number;

    @Type(() => Number)
    @IsInt()
    apartmentTypeId: number;

    @IsEnum(ApartmentStatus)
    apartmentStatus: ApartmentStatus;
}
