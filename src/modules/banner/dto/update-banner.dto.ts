import { PartialType } from '@nestjs/swagger';
import { BannerUploadDto } from './banner-upload.dto';

export class UpdateBannerDto extends PartialType(BannerUploadDto) {}
