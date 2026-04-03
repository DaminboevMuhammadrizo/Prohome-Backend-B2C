import { IsBoolean } from 'class-validator';

export class UpdateJobStatusDto {
  @IsBoolean()
  isActive: boolean;
}
