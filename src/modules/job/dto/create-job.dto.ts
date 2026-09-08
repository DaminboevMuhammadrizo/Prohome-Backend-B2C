import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength, ValidateIf } from 'class-validator';

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

  @ApiPropertyOptional({ example: false, default: false, description: "true bo'lsa — masofaviy (remote) ish, manzil shart emas" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRemote?: boolean;

  @ApiPropertyOptional({ example: 'Chilonzor tumani, ofis 5-qavat' })
  @IsOptional()
  @IsString()
  address?: string;

  // isRemote=true bo'lmasa (ya'ni ish joyida bo'lsa) lat/lng majburiy
  @ApiPropertyOptional({ example: 41.311081, description: "isRemote=false bo'lsa MAJBURIY" })
  @ValidateIf((o) => o.isRemote !== true)
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 69.240562, description: "isRemote=false bo'lsa MAJBURIY" })
  @ValidateIf((o) => o.isRemote !== true)
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
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

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRemote?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class ChangeJobStatusDto {
  @ApiProperty({ enum: JobStatus })
  @IsEnum(JobStatus)
  status: JobStatus;
}
