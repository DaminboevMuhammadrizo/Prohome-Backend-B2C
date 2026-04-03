import { IsBoolean } from 'class-validator';

export class UserBlockDto {
  @IsBoolean()
  isBlocked: boolean;
}

export class UserArchiveDto {
  @IsBoolean()
  isArchived: boolean;
}
