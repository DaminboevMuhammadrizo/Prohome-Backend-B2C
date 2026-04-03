import { IsBoolean } from 'class-validator';

export class UpdateCompanyStatusDto {
  @IsBoolean()
  isActive: boolean;
}
