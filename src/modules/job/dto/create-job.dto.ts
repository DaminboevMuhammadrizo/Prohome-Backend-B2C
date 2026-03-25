import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJobDto {
    @ApiProperty()
    @IsString()
    nameUz: string;

    @ApiProperty()
    @IsString()
    nameUzCyrl: string;

    @ApiProperty()
    @IsString()
    nameRu: string;
}
