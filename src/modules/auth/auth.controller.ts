import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login.dto';
import { Login2Dto } from './dto/login2.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterAuthDto, SendOtpDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @ApiOperation({ summary: 'Telefon raqamga OTP yuborish' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('register')
  @ApiOperation({ summary: 'OTP va parol bilan ro‘yxatdan o‘tish' })
  register(@Body() dto: RegisterAuthDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'OTP bilan kirish' })
  login(@Body() dto: LoginAuthDto) {
    return this.authService.login(dto);
  }

  @Post('login2')
  @ApiOperation({ summary: 'Parol bilan kirish' })
  login2(@Body() dto: Login2Dto) {
    return this.authService.login2(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh token orqali yangi token olish' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }
}
