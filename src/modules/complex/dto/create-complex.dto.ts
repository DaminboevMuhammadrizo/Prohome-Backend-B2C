import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateComplexDto {
  @IsString()
  nameUz: string;

  @IsString()
  nameUzCyrl: string;

  @IsString()
  nameRu: string;

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

  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  images: string[];

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
