import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateApTypeDto {
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
