import { ApiPropertyOptional } from "@nestjs/swagger";
import { Gender, UserRole, UserStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEmail, IsEnum, IsNumber, IsOptional, IsPhoneNumber, IsString } from "class-validator";

export class UpdateUserDto {

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
    @Transform(({ value }) => (value === "" || value === null ? undefined : Number(value)))
    age?: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsEnum(Gender)
    @Transform(({ value }) => (value === "" ? undefined : value))
    gender?: Gender

    @ApiPropertyOptional() 
    @IsPhoneNumber('UZ')
    @IsOptional()
    @IsString()
    phone?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @IsEmail()
    @Transform(({ value }) => (value === "" ? undefined : value))
    email?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => (value === "" || value === null ? undefined : Number(value))) 
    regionId?: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole

    @ApiPropertyOptional()
    @IsOptional()
    @IsEnum(UserStatus)
    @Transform(({ value }) => (value === "" ? undefined : value))
    status?: UserStatus
}



export class UpdateUserMeDto {

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
    @Transform(({ value }) => (value === "" || value === null ? undefined : Number(value)))
    age?: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsEnum(Gender)
    @Transform(({ value }) => (value === "" ? undefined : value))
    gender?: Gender

    @ApiPropertyOptional() 
    @IsPhoneNumber('UZ')
    @IsOptional()
    @IsString()
    phone?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @IsEmail()
    @Transform(({ value }) => (value === "" ? undefined : value))
    email?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Transform(({ value }) => (value === "" || value === null ? undefined : Number(value))) 
    regionId?: number
}