import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class Login2Dto {
  @ApiPropertyOptional({ example: '+998901234567', description: 'Telefon yoki email bilan kirish' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'strong-password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
