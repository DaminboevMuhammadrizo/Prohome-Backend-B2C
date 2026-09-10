import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class SetB2bCompanyStatusDto {
  @ApiProperty({
    example: false,
    description: 'true — kompaniya loyihalari GET /b2b/projects da hammaga ko\'rinadi; false — yashiriladi',
  })
  @Type(() => Boolean)
  @IsBoolean()
  isActive: boolean;
}
