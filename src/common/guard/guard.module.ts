import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CompanyGuardService } from './company-guard.service';
import { GuardService } from './guard.service';

@Global()
@Module({
  imports: [ConfigModule, JwtModule.register({ global: true })],
  providers: [GuardService, CompanyGuardService],
  exports: [GuardService, CompanyGuardService],
})
export class GuardModule { }
