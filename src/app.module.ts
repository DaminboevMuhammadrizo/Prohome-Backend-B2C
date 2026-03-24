import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { RegionModule } from './modules/region/region.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [CommonModule, AuthModule, RegionModule,ConfigModule.forRoot({
      isGlobal: true, 
    }),],
  controllers: [],
  providers: [],
})
export class AppModule {}
