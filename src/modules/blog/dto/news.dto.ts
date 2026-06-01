import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateNewsCategoryDto {
  @ApiProperty({ example: 'Tahlil' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateNewsCategoryDto {
  @ApiProperty({ example: 'Tahlil' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreateNewsDto {
  @ApiProperty({ example: "Ko'chmas mulk narxlari 2025-yilda" })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'kochmas-mulk-narxlari-2025' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({ example: 'Qisqa tavsif' })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiProperty({ example: "To'liq maqola matni..." })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ example: 'https://cdn.prohome.uz/news/cover-1.jpg' })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({ enum: ContentStatus, default: ContentStatus.DRAFT })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({ example: '2025-05-20T10:00:00.000Z' })
  @IsOptional()
  @IsString()
  publishedAt?: string;

  @ApiPropertyOptional({ example: 1, description: 'Ushbu maqola tegishli usta ID (ixtiyoriy)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  masterId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Ushbu maqola tegishli loyiha/ish ID (ixtiyoriy)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  jobId?: number;
}

export class UpdateNewsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() excerpt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coverImage?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) categoryId?: number;
  @ApiPropertyOptional({ enum: ContentStatus }) @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() publishedAt?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) masterId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) jobId?: number;
}
