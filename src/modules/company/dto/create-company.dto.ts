import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class CreateCompanyDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsString()
    @Length(9, 20)
    phone: string;

    @ApiPropertyOptional()
    @IsString()
    @MinLength(6)
    password: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    website?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isVerified?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
