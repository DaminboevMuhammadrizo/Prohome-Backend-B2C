import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class LoginOtpDto {
  @ApiProperty({ example: '+998901234567', description: 'Telefon raqam' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}

// Backward compat alias
export { LoginOtpDto as LoginAuthDto };
