import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { RegionModule } from './modules/region/region.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './modules/user/user.module';
import { JobModule } from './modules/job/job.module';
import { BannerModule } from './modules/banner/banner.module';
import { ApartmentModule } from './modules/apartment/apartment.module';
import { ModulesModule } from './modules/modules.module';

@Module({
    imports: [CommonModule, ConfigModule.forRoot({ isGlobal: true }), ModulesModule],
    controllers: [],
    providers: [],
})
export class AppModule { }
