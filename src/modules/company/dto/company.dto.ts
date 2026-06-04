import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ example: 5, description: 'B2B backendagi company ID' })
  @Type(() => Number)
  @IsInt()
  b2bCompanyId!: number;

  @ApiProperty({ example: 'Navruz Qurilish' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({ example: 'strongpassword123', description: "Kompaniyaning B2C login paroli (admin o'rnatadi)" })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: 2, description: 'Haftaik news limiti (default: global config)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  newsWeeklyLimit?: number;

  @ApiPropertyOptional({ example: 2, description: 'Haftaik reels limiti (default: global config)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reelsWeeklyLimit?: number;
}

export class UpdateCompanyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(6) password?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ example: 3 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) newsWeeklyLimit?: number;
  @ApiPropertyOptional({ example: 3 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) reelsWeeklyLimit?: number;
}

export class ContentLimitDto {
  @ApiProperty({ example: 2, description: 'Kompaniyalar haftada necha ta yangilik qo\'ya oladi' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  newsWeeklyLimit!: number;

  @ApiProperty({ example: 2, description: 'Kompaniyalar haftada necha ta reel qo\'ya oladi' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reelsWeeklyLimit!: number;
}
