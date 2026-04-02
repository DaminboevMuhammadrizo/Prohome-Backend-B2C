import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateMasterProfileDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  experience: number;

  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  portfolios: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salary?: number;
}
