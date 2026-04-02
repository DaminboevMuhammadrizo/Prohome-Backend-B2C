import { Module } from '@nestjs/common';
import { ApartmentLayoutModule } from './apartment-layout/apartment-layout.module';
import { ApartmentModule } from './apartment/apartment.module';
import { AuthModule } from './auth/auth.module';
import { BannerModule } from './banner/banner.module';
import { CompanyModule } from './company/company.module';
import { ComplexModule } from './complex/complex.module';
import { JobModule } from './job/job.module';
import { MasterProfileModule } from './master-profile/master-profile.module';
import { RatingModule } from './rating/rating.module';
import { RegionModule } from './region/region.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    RegionModule,
    BannerModule,
    JobModule,
    MasterProfileModule,
    RatingModule,
    CompanyModule,
    ComplexModule,
    ApartmentLayoutModule,
    ApartmentModule,
  ],
})
export class ModulesModule {}
