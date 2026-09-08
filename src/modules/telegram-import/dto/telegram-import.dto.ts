import { ApiPropertyOptional } from '@nestjs/swagger';
import { DealType, PropertyType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class AddChannelDto {
  @ApiPropertyOptional({ example: 'uyjoy_toshkent', description: '"@" belgisisiz kanal username\'i' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiPropertyOptional({ example: '2026-03-01', description: 'Backfill shu sanadan beri boshlanadi. Bo\'sh — hammasi' })
  @IsOptional()
  @IsDateString()
  sinceDate?: string;

  @ApiPropertyOptional({
    enum: DealType,
    description: 'Postda "sotiladi"/"ijara" so\'zi bo\'lmasa shu ishlatiladi (masalan butun kanal faqat sotuv uchun bo\'lsa)',
  })
  @IsOptional()
  @IsEnum(DealType)
  defaultDealType?: DealType;

  @ApiPropertyOptional({ enum: PropertyType, description: 'Postda mulk turi aniqlanmasa shu ishlatiladi' })
  @IsOptional()
  @IsEnum(PropertyType)
  defaultPropertyType?: PropertyType;
}

export class UpdateChannelDto {
  @ApiPropertyOptional({ description: 'false qilinsa — davomiy sync to\'xtaydi, lekin kanal ro\'yxatda qoladi' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  sinceDate?: string;

  @ApiPropertyOptional({ enum: DealType })
  @IsOptional()
  @IsEnum(DealType)
  defaultDealType?: DealType;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  defaultPropertyType?: PropertyType;
}

export class ChannelQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
