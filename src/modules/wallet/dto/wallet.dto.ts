import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BoostableEntityType, TopUpStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCurrencySettingsDto {
  @ApiPropertyOptional({ example: 'Coin', description: "Ichki valyutaning nomi (frontendda ko'rsatish uchun)" })
  @IsOptional()
  @IsString()
  currencyName?: string;

  @ApiPropertyOptional({ example: 50, description: "Ro'yxatdan o'tganda beriladigan default bonus" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  signupBonus?: number;

  @ApiPropertyOptional({ example: 20, description: "Do'stni taklif qilgan foydalanuvchiga beriladigan bonus" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  referralBonus?: number;

  @ApiPropertyOptional({ example: 5, description: "Har kuni ilova/saytga kirganda beriladigan bonus" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  dailyCheckInBonus?: number;

  @ApiPropertyOptional({ example: 10, description: "E'lonni 1 kun 'eng tepada' ko'rsatish narxi" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  boostCostPerDay?: number;
}

export class RequestTopUpDto {
  @ApiProperty({ example: 100, description: "Sotib olinmoqchi bo'lgan valyuta miqdori" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ example: "Click orqali to'ladim, screenshot yuboraman" })
  @IsOptional()
  @IsString()
  note?: string;
}

export class PurchaseBoostDto {
  @ApiProperty({ enum: BoostableEntityType, description: "Qaysi kontent turi boost qilinadi" })
  @IsEnum(BoostableEntityType)
  entityType: BoostableEntityType;

  @ApiProperty({ example: 1, description: "Boost qilinadigan yozuvning ID si (masalan RealEstate.id)" })
  @Type(() => Number)
  @IsInt()
  entityId: number;

  @ApiProperty({ example: 7, description: "Necha kun 'eng tepada' turishi" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days: number;
}

export class BoostCostQueryDto {
  @ApiPropertyOptional({ example: 7 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days: number;
}

export class WalletTxQueryDto {
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

export class AdjustBalanceDto {
  @ApiProperty({ example: 10, description: "Qaysi foydalanuvchining balansi tuzatiladi" })
  @Type(() => Number)
  @IsInt()
  userId: number;

  @ApiProperty({ example: 50, description: "Musbat — qo'shish, manfiy — ayirish" })
  @Type(() => Number)
  @IsInt()
  amount: number;

  @ApiPropertyOptional({ example: "Qo'llab-quvvatlash xizmati tomonidan tuzatildi" })
  @IsOptional()
  @IsString()
  description?: string;
}

export class TopUpQueryDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number;

  @ApiPropertyOptional({ enum: TopUpStatus })
  @IsOptional()
  @IsEnum(TopUpStatus)
  status?: TopUpStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  createdFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  createdTo?: string;
}
