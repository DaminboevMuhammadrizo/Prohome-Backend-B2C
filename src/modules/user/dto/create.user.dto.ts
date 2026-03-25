import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Gender, UserRole, UserStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEmail, IsEnum, IsNumber, IsOptional, IsPhoneNumber, IsString } from "class-validator";

export class CreateUserDto {

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @Transform(({ value }) => (value === "" ? undefined : value))
    firstName?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @Transform(({ value }) => (value === "" ? undefined : value))
    lastName?: string


    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => (value === "" ? undefined : Number(value)))
    age?: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsEnum(Gender)
    @Transform(({ value }) => (value === "" ? undefined : value))
    gender?: Gender

    @ApiProperty()
    @IsString()
    @IsPhoneNumber('UZ')
    phone: string


    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @IsEmail()
    @Transform(({ value }) => (value === "" ? undefined : value))
    email?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => (value === "" ? undefined : Number(value)))
    regionId?: number

    @ApiProperty()
    @IsEnum(UserRole)
    role: UserRole

    @ApiPropertyOptional()
    @IsOptional()
    @IsEnum(UserStatus)
    @Transform(({ value }) => (value === "" ? undefined : value))
    status?: UserStatus
}

