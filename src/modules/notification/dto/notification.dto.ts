import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class SendNotificationDto {
  @ApiProperty({ example: 'Yangi eʼlon' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiProperty({ example: 'Hududingizda yangi eʼlon joylandi' })
  @IsString()
  @MinLength(2)
  body: string;

  @ApiPropertyOptional({
    example: {
      screen: 'apartment_detail',
      apartmentId: '14',
    },
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}
