import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { B2bModule } from './b2b/b2b.module';
import { BannerModule } from './banner/banner.module';
import { BlogModule } from './blog/blog.module';
import { BotModule } from './bot/bot.module';
import { ChatModule } from './chat/chat.module';
import { CompanyModule } from './company/company.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { JobModule } from './job/job.module';
import { LocationModule } from './location/location.module';
import { RatingModule } from './rating/rating.module';
import { RealEstateModule } from './real-estate/real-estate.module';
import { SkillTypeModule } from './skill-type/skill-type.module';
import { SkillsModule } from './skills/skills.module';
import { SocialModule } from './social/social.module';
import { MasterModule } from './user/master/master.module';
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TelegramImportModule } from './telegram-import/telegram-import.module';
import { BackupModule } from './backup/backup.module';

@Module({
  imports: [
    NotificationModule,
    AnalyticsModule,
    TelegramImportModule,
    BackupModule,
    AuthModule,
    UserModule,
    MasterModule,
    LocationModule,
    SkillTypeModule,
    SkillsModule,
    RealEstateModule,
    JobModule,
    BannerModule,
    RatingModule,
    SocialModule,
    DashboardModule,
    BlogModule,
    B2bModule,
    CompanyModule,
    ChatModule,
    BotModule
  ]
})
export class ModulesModule { }
