import { IsString } from 'class-validator';

export class CreateApartmentCategoryDto {
  @IsString()
  nameUz: string;

  @IsString()
  nameUzCyrl: string;

  @IsString()
  nameRu: string;
}
