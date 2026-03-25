import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSalaryTypeDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => value?.trim())
  nameUz: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => value?.trim())
  nameUzCyrl: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => value?.trim())
  nameRu: string;
}