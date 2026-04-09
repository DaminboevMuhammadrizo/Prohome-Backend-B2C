import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
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

  @ApiPropertyOptional({ example: 'Toshkent shahri, Chilonzor' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 41.3111 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 69.2797 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}
