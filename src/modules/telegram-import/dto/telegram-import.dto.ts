import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class AddChannelDto {
  @ApiPropertyOptional({ example: 'uyjoy_toshkent', description: '"@" belgisisiz kanal username\'i' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiPropertyOptional({ example: '2026-03-01', description: 'Backfill shu sanadan beri boshlanadi. Bo\'sh — hammasi' })
  @IsOptional()
  @IsDateString()
  sinceDate?: string;
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
