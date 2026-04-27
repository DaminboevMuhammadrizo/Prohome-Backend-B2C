import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ModerateRatingDto {
  @IsBoolean()
  isApproved: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moderationNote?: string;
}
