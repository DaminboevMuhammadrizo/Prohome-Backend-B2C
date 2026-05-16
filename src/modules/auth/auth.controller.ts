import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginOtpDto } from './dto/login.dto';
import { Login2Dto } from './dto/login2.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { MasterRegisterDto, RegisterAuthDto, ResetPasswordDto, SendOtpDto } from './dto/register.dto';

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
  @ApiOperation({ summary: 'Ro\'yxatdan o\'tish (telefon+OTP yoki email+parol)' })
  register(@Body() dto: RegisterAuthDto) {
    return this.authService.register(dto);
  }

  @Post('login/otp')
  @ApiOperation({ summary: 'OTP bilan kirish (parolsiz)' })
  loginOtp(@Body() dto: LoginOtpDto) {
    return this.authService.loginOtp(dto);
  }

  @Post('login/password')
  @ApiOperation({ summary: 'Parol bilan kirish (telefon yoki email)' })
  loginPassword(@Body() dto: Login2Dto) {
    return this.authService.loginPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'OTP orqali parolni tiklash' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh token orqali yangi token olish' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('master/register')
  @ApiOperation({
    summary: 'Usta ro\'yxatdan o\'tish — faqat majburiy ma\'lumotlar: ism, familiya, tajriba, skill turi va skilllar',
  })
  registerMaster(@Body() dto: MasterRegisterDto) {
    return this.authService.registerMaster(dto);
  }
}
