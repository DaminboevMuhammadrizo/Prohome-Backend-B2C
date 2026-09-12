import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MasterWorkType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateMasterByAdminDto {
  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'master@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Ali' })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiPropertyOptional({ example: 'Valiyev' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  age?: number;

  @ApiPropertyOptional({ minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  locationId?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experience?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salary?: number;

  @ApiPropertyOptional({ example: [1, 2], description: 'Skill IDlari' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  skillIds?: number[];

  @ApiPropertyOptional({ enum: MasterWorkType, description: "Yakka o'zi (INDIVIDUAL) yoki jamoa (TEAM) bo'lib ishlaydi. Berilmasa — INDIVIDUAL" })
  @IsOptional()
  @IsEnum(MasterWorkType)
  workType?: MasterWorkType;
}

export class RegisterAsMasterDto {
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experience?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salary?: number;

  @ApiPropertyOptional({ example: [1, 2], description: 'Skill IDlari' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  skillIds?: number[];

  @ApiPropertyOptional({ enum: MasterWorkType, description: "Yakka o'zi (INDIVIDUAL) yoki jamoa (TEAM) bo'lib ishlaydi. Berilmasa — INDIVIDUAL" })
  @IsOptional()
  @IsEnum(MasterWorkType)
  workType?: MasterWorkType;
}

export class UpdateMasterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experience?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  skillIds?: number[];

  @ApiPropertyOptional({ enum: MasterWorkType })
  @IsOptional()
  @IsEnum(MasterWorkType)
  workType?: MasterWorkType;

  // Quyidagilar — usta emas, uning User yozuvidagi maydonlar. Shu yerdan
  // (bitta so'rov bilan) tahrirlash mumkin bo'lishi uchun qo'shildi.
  @ApiPropertyOptional({ example: 'Ali', description: "Usta ismi (User.firstName)" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Valiyev', description: "Usta familiyasi (User.lastName)" })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+998901234567', description: "Telefon raqami (User.phone) — band bo'lmagan bo'lishi kerak" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'master@example.com', description: "Email (User.email) — band bo'lmagan bo'lishi kerak" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  age?: number;

  @ApiPropertyOptional({ example: 1, description: "Joylashuv (shahar) ID si (User.locationId)" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  locationId?: number;

  @ApiPropertyOptional({ description: "Band/bo'sh holati (alohida PATCH /:id/toggle-free ham bor)" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFree?: boolean;
}
