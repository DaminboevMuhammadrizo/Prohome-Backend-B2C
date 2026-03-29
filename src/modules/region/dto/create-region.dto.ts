import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateRegionDto {
    @ApiProperty()
    @IsString()
    nameUz: string;

    @ApiProperty()
    @IsString()
    nameUzCyrl: string;

    @ApiProperty()
    @IsString()
    nameRu: string;

    @ApiProperty()
    @IsString()
    countryNameUz: string;

    @ApiProperty()
    @IsString()
    countryNameUzCyrl: string;

    @ApiProperty()
    @IsString()
    countryNameRu: string;
}
