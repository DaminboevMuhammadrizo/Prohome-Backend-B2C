import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateMasterProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => (value === '' || value === null ? undefined : Number(value)))
  experience?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => (value === '' || value === null ? undefined : Number(value)))
  salary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value === '' || value === null ? undefined : Number(value)))
  salaryTypeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  address?: string;
}