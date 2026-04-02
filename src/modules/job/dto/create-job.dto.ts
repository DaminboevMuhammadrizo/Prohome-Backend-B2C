import { IsString } from 'class-validator';

export class CreateJobDto {
  @IsString()
  nameUz: string;

  @IsString()
  nameUzCyrl: string;

  @IsString()
  nameRu: string;
}
