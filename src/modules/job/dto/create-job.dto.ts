import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateJobDto {
  @ApiProperty({ example: 'Santexnik kerak' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({ example: 'Hammom ta\'miri kerak...' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: 200000, description: 'null bo\'lsa "kelishiladi"' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ example: '+998901234567' })
  @IsString()
  contactPhone: string;

  @ApiPropertyOptional({ example: 1, description: 'null bo\'lsa remote' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  locationId?: number;

  @ApiProperty({ example: 1, description: 'SkillType ID' })
  @Type(() => Number)
  @IsInt()
  skillTypeId: number;

  @ApiPropertyOptional({ example: [1, 2], description: 'Skill IDlari' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  skillIds?: number[];
}

export class UpdateJobDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  locationId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  skillIds?: number[];
}

export class ChangeJobStatusDto {
  @ApiProperty({ enum: JobStatus })
  @IsEnum(JobStatus)
  status: JobStatus;
}
