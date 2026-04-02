import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtServices } from './jwt.service';

@Global()
@Module({
  imports: [JwtModule.register({}), ConfigModule],
  providers: [JwtServices],
  exports: [JwtServices],
})
export class JwtModules {}
