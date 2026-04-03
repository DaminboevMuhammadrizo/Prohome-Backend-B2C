import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRegionDto {

  @ApiPropertyOptional()
  @IsString()
  nameUz: string;


  @ApiPropertyOptional()
  @IsString()
  nameUzCyrl: string;


  @ApiPropertyOptional()
  @IsString()
  nameRu: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryNameUz?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryNameUzCyrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryNameRu?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number;
}
