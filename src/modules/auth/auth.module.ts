import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SmsService } from 'src/common/services/sms.service';
import { JwtModules } from 'src/common/config/jwt/jwt.module';

@Module({
  imports:[JwtModules],
  providers: [AuthService,SmsService],
  controllers: [AuthController],
})
export class AuthModule {}
