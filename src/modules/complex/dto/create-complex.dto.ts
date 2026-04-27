import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateComplexDto {
    @IsString()
    name: string;

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

    @IsString()
    address: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    companyId: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    regionId: number;

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
