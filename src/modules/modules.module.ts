import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RegionModule } from './region/region.module';
import { ApartmentModule } from './apartment/apartment.module';
import { BannerModule } from './banner/banner.module';
import { JobModule } from './job/job.module';
import { UserModule } from './user/user.module';

@Module({
    imports: [
        AuthModule,
        RegionModule,
        UserModule,
        JobModule,
        BannerModule,
        ApartmentModule
    ]
})
export class ModulesModule { }
