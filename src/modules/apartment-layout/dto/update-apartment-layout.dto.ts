import { PartialType } from '@nestjs/swagger';
import { CreateApartmentLayoutDto } from './create-apartment-layout.dto';

export class UpdateApartmentLayoutDto extends PartialType(CreateApartmentLayoutDto) {}
