import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterAuthDto, SendOtpDto, TestSmsDto } from './dto/register.dto';
import { LoginAuthDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('send-otp')
  @ApiOperation({ summary: 'SMS OTP yuborish' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Ro\'yxatdan o\'tish' })
  register(@Body() dto: RegisterAuthDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Kirish' })
  login(@Body() dto: LoginAuthDto) {
    return this.authService.login(dto);
  }


  @Post('test-sms-booking')
  async testSms(@Body() dto: TestSmsDto) {
    return await this.authService.sendBookingInfo(dto.phone);
  }
}