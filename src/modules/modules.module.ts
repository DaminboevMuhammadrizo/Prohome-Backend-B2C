import { B2bModule } from './b2b/b2b.module';
import { BlogModule } from './blog/blog.module';
import { CompanyModule } from './company/company.module';
import { RealEstateModule } from './real-estate/real-estate.module';
import { SkillTypeModule } from './skill-type/skill-type.module';
import { LocationModule } from './location/location.module';
import { MasterModule } from './user/master/master.module';
import { SkillsModule } from './skills/skills.module';
import { RatingModule } from './rating/rating.module';
import { SocialModule } from './social/social.module';
import { BannerModule } from './banner/banner.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { JobModule } from './job/job.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { Module } from '@nestjs/common';

@Module({
    imports: [
        AuthModule, UserModule, MasterModule, LocationModule, SkillTypeModule,
        SkillsModule, RealEstateModule, JobModule, BannerModule, RatingModule, SocialModule,
        DashboardModule, BlogModule, B2bModule, CompanyModule,
    ]
})
export class ModulesModule { }
