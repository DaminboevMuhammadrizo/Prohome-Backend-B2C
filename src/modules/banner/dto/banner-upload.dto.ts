import { ApiPropertyOptional } from '@nestjs/swagger';
import { BannerLocation } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class BannerUploadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional({ enum: BannerLocation })
  @IsOptional()
  @IsEnum(BannerLocation)
  location?: BannerLocation;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
