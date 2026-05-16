import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, ValidateNested, IsArray, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class DashboardHomeStatsDto {
  @ApiProperty({ example: '12K+' })
  users: string;

  @ApiProperty({ example: '8K+' })
  realEstates: string;

  @ApiProperty({ example: '2.5K+' })
  masters: string;

  @ApiProperty({ example: '2.5K+' })
  jobs: string;
}

export class DashboardCategoryDto {
  @ApiProperty({ example: 'Kvartira' })
  name: string;

  @ApiProperty({ example: 1420 })
  count: number;
}

export class DashboardHeroDto {
  @ApiProperty({ example: 'PROHOME bilan o\'z orzuingizdagi uyni toping' })
  title: string;

  @ApiProperty({ example: 'O\'zbekiston bo\'ylab eng yaxshi ko\'chmas mulk va ish e\'lonlari platformasi' })
  subtitle: string;

  @ApiProperty({ example: 'Boshlash' })
  ctaText: string;

  @ApiProperty({ example: 'https://example.com/hero-bg.jpg' })
  backgroundImageUrl: string;
}

export class DashboardFeatureDto {
  @ApiProperty({ example: 'Ishonchli va xavfsiz' })
  title: string;

  @ApiProperty({ example: 'Biz bilan ishlash qulay va kafolatlangan' })
  description: string;
}

export class MastersStatsDto {
  @ApiProperty({ example: '850+' })
  total: string;

  @ApiProperty({ example: '4.8★' })
  rating: string;

  @ApiProperty({ example: '~24h' })
  responseTime: string;
}

export class RealEstateOptionsDto {
  @ApiProperty({ example: ['Sotish', 'Ijara', 'Yangi bino'] })
  types: string[];

  @ApiProperty({ example: ['Kvartira', 'Hovli-uy', 'Qurilgan'] })
  propertyTypes: string[];

  @ApiProperty({ example: ['Yevro', 'O\'rtacha', 'Ta\'mirsiz'] })
  repairs: string[];

  @ApiProperty({ example: ['Markaziy', 'Avtonom', 'Yo\'q'] })
  heating: string[];

  @ApiProperty({ example: ['Bor', 'Yo\'q'] })
  gas: string[];

  @ApiProperty({ example: ['Markaziy', 'Artezian', 'Yo\'q'] })
  water: string[];

  @ApiProperty({ example: ['Ochiq', 'Yopiq', 'Yo\'q'] })
  parking: string[];
}

export class FavoritesDto {
  @ApiProperty({ type: [Object] })
  realEstates: any[];

  @ApiProperty({ type: [Object] })
  jobs: any[];

  @ApiProperty({ type: [Object] })
  masters: any[];

  @ApiProperty({ type: [Object] })
  projects: any[];
}

export class ExchangeRatesDto {
  @ApiProperty({ example: 12500 })
  USD: number;

  @ApiProperty({ example: 13500 })
  EUR: number;

  @ApiProperty({ example: 140 })
  RUB: number;
}

// Draft DTOs
export class CreateDraftDto {
  @ApiProperty({ example: 'real-estate' })
  @IsString()
  type: string;

  @ApiProperty({ example: { title: 'Test', price: 1000 } })
  @IsObject()
  data: any;
}

export class DraftDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'real-estate' })
  type: string;

  @ApiProperty()
  data: any;

  @ApiProperty()
  createdAt: Date;
}
