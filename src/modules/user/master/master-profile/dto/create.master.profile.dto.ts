import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateMasterProfileDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  experience: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  salary: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  salaryTypeId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  address?: string;
}