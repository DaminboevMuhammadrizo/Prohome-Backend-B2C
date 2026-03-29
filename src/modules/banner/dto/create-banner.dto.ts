import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ImgType, LocationType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBannerDto {
    @ApiProperty({enum: Object.values(ImgType)})
    @IsEnum(ImgType)
    imgType: ImgType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    link?: string;

    @ApiProperty()
    @IsEnum(LocationType)
    location: LocationType;
}
