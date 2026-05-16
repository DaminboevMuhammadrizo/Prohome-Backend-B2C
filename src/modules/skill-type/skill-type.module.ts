import { Module } from '@nestjs/common';
import { SkillTypeController } from './skill-type.controller';
import { SkillTypeService } from './skill-type.service';

@Module({
  controllers: [SkillTypeController],
  providers: [SkillTypeService],
  exports: [SkillTypeService],
})
export class SkillTypeModule {}
