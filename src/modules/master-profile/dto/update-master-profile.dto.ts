import { PartialType } from '@nestjs/swagger';
import { CreateMasterProfileDto } from './create-master-profile.dto';

export class UpdateMasterProfileDto extends PartialType(CreateMasterProfileDto) {}
