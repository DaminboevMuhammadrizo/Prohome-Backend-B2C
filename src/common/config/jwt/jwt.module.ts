import { Global, Module } from '@nestjs/common';
import { JwtServices } from './jwt.service';
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
    imports: [JwtModule, ConfigModule],
    providers: [JwtServices],
    exports: [JwtServices]
})
export class JwtModules { }
``