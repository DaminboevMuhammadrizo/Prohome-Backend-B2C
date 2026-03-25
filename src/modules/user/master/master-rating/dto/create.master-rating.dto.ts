import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateMasterRatingDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  rating: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  desc?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  masterProfileId: number;

}