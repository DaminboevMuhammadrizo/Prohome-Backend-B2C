import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { ConfigModule } from '@nestjs/config';
import { ModulesModule } from './modules/modules.module';

@Module({
    imports: [CommonModule, ConfigModule.forRoot({ isGlobal: true }), ModulesModule],
    controllers: [],
    providers: [],
})
export class AppModule { }
