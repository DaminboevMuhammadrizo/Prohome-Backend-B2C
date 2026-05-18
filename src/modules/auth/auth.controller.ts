import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { AuthService } from './auth.service';
import { LoginOtpDto } from './dto/login.dto';
import { Login2Dto } from './dto/login2.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { MasterRegisterDto, OtpPurpose, RegisterAuthDto, ResetPasswordDto, SendOtpDto } from './dto/register.dto';

class VerifyOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString() @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString() @IsNotEmpty() @Length(6, 6)
  otp!: string;

  @ApiProperty({ enum: OtpPurpose, example: OtpPurpose.REGISTER })
  @IsString() @IsNotEmpty()
  purpose!: OtpPurpose;
}

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
  @ApiOperation({ summary: 'Royxatdan otish (telefon+OTP yoki email+parol)' })
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

  @Post('verify-otp')
  @ApiOperation({ summary: 'OTP togri yoki notogriligini tekshirish (consume qilmaydi)' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.checkOtp(dto.phone, dto.otp, dto.purpose);
  }

  @Post('master/register')
  @ApiOperation({
    summary: 'Usta royxatdan otish — faqat majburiy malumotlar: ism, familiya, tajriba, skill turi va skilllar',
  })
  registerMaster(@Body() dto: MasterRegisterDto) {
    return this.authService.registerMaster(dto);
  }
}
