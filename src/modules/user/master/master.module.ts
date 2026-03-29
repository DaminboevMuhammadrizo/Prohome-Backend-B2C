import { Module } from '@nestjs/common';
import { MasterProfileController } from './master-profile/master-profile.controller';
import { MasterProfileService } from './master-profile/master-profile.service';
import { MasterJobController } from './master-job/master-job.controller';
import { MasterJobService } from './master-job/master-job.service';
import { MasterRatingController } from './master-rating/master-rating.controller';
import { MasterRatingService } from './master-rating/master-rating.service';

@Module({
    controllers: [MasterProfileController, MasterJobController, MasterRatingController],
    providers: [MasterProfileService, MasterJobService, MasterRatingService]
})
export class MasterModule { }
