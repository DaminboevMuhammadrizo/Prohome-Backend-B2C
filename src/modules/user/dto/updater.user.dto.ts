import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { CreateUserDto } from './create.user.dto';

export class UpdateUserMeDto extends PartialType(CreateUserDto) {}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: 'secret123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
