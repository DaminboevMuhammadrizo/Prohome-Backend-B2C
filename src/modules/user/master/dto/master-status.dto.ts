import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class MasterStatusDto {
  @ApiPropertyOptional({ description: "Ustaning ish holati (band/bo'sh)" })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ description: 'Foydalanuvchini bloklash/blokdan chiqarish' })
  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;
}
