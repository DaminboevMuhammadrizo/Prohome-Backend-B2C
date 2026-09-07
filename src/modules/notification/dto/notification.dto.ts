import { ApiPropertyOptional } from '@nestjs/swagger';
import { DevicePlatform, NotificationStatus, SearchType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class RegisterDeviceDto {
  @ApiPropertyOptional({ example: 'fcm-device-token-xxxxx' })
  @IsString()
  @MinLength(10)
  token: string;

  @ApiPropertyOptional({ enum: DevicePlatform, default: DevicePlatform.ANDROID })
  @IsOptional()
  @IsEnum(DevicePlatform)
  platform?: DevicePlatform;
}

export class UnregisterDeviceDto {
  @ApiPropertyOptional({ example: 'fcm-device-token-xxxxx' })
  @IsString()
  token: string;
}

export class NotificationQueryDto {
  @ApiPropertyOptional({ default: 1, description: 'Sahifa raqami' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Bir sahifadagi son' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'true — faqat o\'qilganlar, false — faqat o\'qilmaganlar, berilmasa — hammasi' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRead?: boolean;
}

// Admin uchun — search_subscriptions (topilmagan qidiruvlar) jadvalini har qanday maydon bo'yicha filtrlash
export class SearchSubscriptionQueryDto {
  @ApiPropertyOptional({ default: 1, description: 'Sahifa raqami' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Bir sahifadagi son' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Aniq yozuv ID si' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number;

  @ApiPropertyOptional({ enum: SearchType, description: 'Qidiruv qaysi bo\'limda bo\'lgan: uy (REAL_ESTATE), ish (JOB) yoki usta (MASTER)' })
  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType;

  @ApiPropertyOptional({ description: 'Qidirilgan joylashuv (shahar/viloyat) ID si' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  locationId?: number;

  @ApiPropertyOptional({ description: 'Qidirgan foydalanuvchi ID si' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({ description: 'false — moslik topilib yopilgan (endi kuzatilmaydigan) qidiruvlar ham ko\'rinadi. Berilmasa — hammasi' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Notification yuborilganlarni ham/faqat ko\'rsatish' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  notified?: boolean;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ description: 'Bildirishnoma sarlavhasi. {location}/{title}/{price}/{skillType} kabi placeholder ishlatish mumkin' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Bildirishnoma matni. Xuddi shu placeholder\'lar bilan' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ description: 'false qilinsa — shu shablon bo\'yicha avtomatik xabar yuborilmaydi' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BroadcastFiltersDto {
  @ApiPropertyOptional({ enum: SearchType, description: 'Faqat shu turdagi qidiruvni saqlaganlarga' })
  @IsOptional()
  @IsEnum(SearchType)
  searchType?: SearchType;

  @ApiPropertyOptional({ description: 'Faqat shu joylashuv (yoki uning hududi) bo\'yicha qidirganlarga' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  locationId?: number;
}

export class CreateBroadcastDto {
  @ApiPropertyOptional({ example: '🎉 Aksiya!' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional({ example: 'Farg\'onadagi barcha e\'lonlarga chegirma!' })
  @IsString()
  @MinLength(2)
  body: string;

  @ApiPropertyOptional({ type: BroadcastFiltersDto, description: 'Bo\'sh qoldirilsa — hamma foydalanuvchiga yuboriladi' })
  @IsOptional()
  @IsObject()
  filters?: BroadcastFiltersDto;

  @ApiPropertyOptional({ example: '2026-09-10T09:00:00.000Z', description: 'Bo\'sh bo\'lsa — darhol yuboriladi' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class BroadcastQueryDto {
  @ApiPropertyOptional({ default: 1, description: 'Sahifa raqami' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Bir sahifadagi son' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: NotificationStatus, description: 'PENDING — hali yuborilmagan (rejalashtirilgan), SENT — yuborilgan, FAILED — xatolik' })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;
}
