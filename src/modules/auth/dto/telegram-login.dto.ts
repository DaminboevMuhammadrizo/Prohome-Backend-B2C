import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class TelegramVerifyDto {
  @ApiProperty({ example: '482913' })
  @IsString()
  @Length(6, 6, { message: 'OTP 6 xonali bo\'lishi kerak' })
  otp: string;
}
