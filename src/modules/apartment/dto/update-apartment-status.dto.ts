import { ApartmentDealStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateApartmentStatusDto {
  @IsEnum(ApartmentDealStatus)
  dealStatus: ApartmentDealStatus;
}
