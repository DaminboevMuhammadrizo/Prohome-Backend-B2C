import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Length, Min, MinLength } from 'class-validator';

export enum OtpPurpose {
  REGISTER = 'REGISTER',
  LOGIN = 'LOGIN',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

export class SendOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ enum: OtpPurpose, example: OtpPurpose.LOGIN })
  @IsString()
  purpose!: OtpPurpose;
}

export class RegisterAuthDto {
  @ApiPropertyOptional({ example: '+998901234567', description: 'Telefon yoki email kerak' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Ali' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Valiyev' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  age?: number;

  @ApiPropertyOptional({ example: 'strong-password' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: '123456', description: 'Telefon bilan ro\'yxatdan o\'tishda kerak' })
  @IsOptional()
  @IsString()
  @Length(4, 6)
  otp?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  locationId?: number;
}

export class MasterRegisterDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 6)
  otp!: string;

  @ApiProperty({ example: 'Ali' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Valiyev' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: 3, description: 'Tajriba yillari' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experience!: number;

  @ApiProperty({ example: 1, description: 'Asosiy skill turi (SkillType ID)' })
  @Type(() => Number)
  @IsInt()
  skillTypeId!: number;

  @ApiProperty({ example: [1, 2], description: 'Skill IDlari (kamida 1 ta)' })
  @IsArray()
  @IsInt({ each: true })
  skillIds!: number[];

  @ApiPropertyOptional({ example: 'Santexnik, elektrik ishlari bo\'yicha 5 yillik tajriba' })
  @IsOptional()
  @IsString()
  bio?: string;
}

export class CompanyLoginDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: 'strong-password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 6)
  otp!: string;

  @ApiProperty({ example: 'new-strong-password' })
  @IsString()
  @MinLength(6)
  password!: string;
}
