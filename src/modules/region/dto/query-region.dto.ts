import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryRegionDto {
  @ApiPropertyOptional({ description: 'Viloyat ID si (tumanlarni olish uchun)', example: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  parentId?: number;

  @ApiPropertyOptional({ description: 'Qidiruv (nomi bo\'yicha)', example: 'Toshkent' })
  @IsOptional()
  @IsString()
  search?: string;
}
