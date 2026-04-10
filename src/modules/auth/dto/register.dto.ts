import { DevicePlatform } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Min,
  MinLength,
} from 'class-validator';

export enum OtpPurpose {
  REGISTER = 'REGISTER',
  LOGIN = 'LOGIN',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

export class SendOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  @Length(9, 20)
  phone: string;

  @ApiProperty({ enum: OtpPurpose, example: OtpPurpose.LOGIN })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}

export class RegisterAuthDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  @Length(9, 20)
  phone: string;

  @ApiProperty({ example: 'Ali' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiPropertyOptional({ example: 'Valiyev' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'strong-password' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  regionId?: number;

  @ApiPropertyOptional({ example: 'android-7f3aa8d9-11c2-4d72-b8b8-001' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  deviceId?: string;

  @ApiPropertyOptional({
    example: 'fJwH0Jm3Q1mS4_example_device_token_from_firebase',
  })
  @IsOptional()
  @IsString()
  @MinLength(20)
  fcmToken?: string;

  @ApiPropertyOptional({ example: 'Samsung S23' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    enum: DevicePlatform,
    default: DevicePlatform.UNKNOWN,
  })
  @IsOptional()
  @IsEnum(DevicePlatform)
  platform?: DevicePlatform;
}

export class ResetPasswordDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  @Length(9, 20)
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ example: 'new-strong-password' })
  @IsString()
  @MinLength(6)
  password: string;
}
