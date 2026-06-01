import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateReelDto {
  @ApiProperty({ example: "Toshkentda eng go'zal penthouse" })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'Shahar manzarasi ochilgan 5-qavat penthouse' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'https://cdn.prohome.uz/reels/video-1.mp4' })
  @IsString()
  @IsNotEmpty()
  videoUrl!: string;

  @ApiPropertyOptional({ example: 'https://cdn.prohome.uz/reels/thumb-1.jpg' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ enum: ContentStatus, default: ContentStatus.DRAFT })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ example: 28, description: 'Video davomiyligi (soniyada)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ example: 1, description: 'Tegishli usta ID (ixtiyoriy)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  masterId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Tegishli loyiha/ish ID (ixtiyoriy)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  jobId?: number;
}

export class UpdateReelDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() videoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() thumbnailUrl?: string;
  @ApiPropertyOptional({ enum: ContentStatus }) @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) duration?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) masterId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) jobId?: number;
}
