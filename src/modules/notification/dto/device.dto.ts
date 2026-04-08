import { DevicePlatform } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'android-7f3aa8d9-11c2-4d72-b8b8-001' })
  @IsString()
  @MinLength(3)
  deviceId: string;

  @ApiProperty({ example: 'fJwH0Jm3Q1mS4_example_device_token_from_firebase' })
  @IsString()
  @MinLength(20)
  fcmToken: string;

  @ApiPropertyOptional({ example: 'Samsung S23' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ enum: DevicePlatform, default: DevicePlatform.UNKNOWN })
  @IsOptional()
  @IsEnum(DevicePlatform)
  platform?: DevicePlatform;
}
