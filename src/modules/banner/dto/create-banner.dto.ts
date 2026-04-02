import { BannerLocation } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateBannerDto {
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'image URL bo‘lishi kerak' })
  image: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsEnum(BannerLocation)
  location?: BannerLocation;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
