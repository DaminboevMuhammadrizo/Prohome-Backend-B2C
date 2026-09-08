import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class LoginOtpDto {
  @ApiProperty({ example: '+998901234567', description: 'Telefon raqam' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123456', description: 'Haqiqiy kod 6 xonali; sinov raqamlari uchun "1617" ham qabul qilinadi' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 6)
  otp: string;
}

// Backward compat alias
export { LoginOtpDto as LoginAuthDto };
