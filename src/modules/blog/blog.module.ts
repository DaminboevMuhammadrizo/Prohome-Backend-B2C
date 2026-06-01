import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { ReelsController } from './reels.controller';
import { ReelsService } from './reels.service';

@Module({
  controllers: [NewsController, ReelsController],
  providers: [NewsService, ReelsService],
})
export class BlogModule {}
