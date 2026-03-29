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

export class CreateMasterJobDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  masterInfoId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  jobId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  experience: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  desc: string;
}
