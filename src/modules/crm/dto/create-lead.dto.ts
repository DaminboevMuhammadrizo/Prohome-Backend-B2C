import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LeadStatus,
  LeadType,
  SearchIntentType,
  SearchSurveyStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateLeadDto {
  @ApiProperty({ enum: LeadType })
  @IsEnum(LeadType)
  type: LeadType;

  @ApiProperty({ example: 'Ali Valiyev' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '+998901234567' })
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  companyId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  complexId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  apartmentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  masterProfileId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  downPayment?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  otherDetails?: Record<string, unknown>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  searchSnapshot?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;
}

export class CreateComplexInterestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  apartmentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateSearchSessionDto {
  @ApiProperty({ enum: SearchIntentType })
  @IsEnum(SearchIntentType)
  intentType: SearchIntentType;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  query: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  resultsCount?: number;
}

export class SubmitSearchSurveyDto {
  @ApiProperty({ enum: SearchSurveyStatus })
  @IsEnum(SearchSurveyStatus)
  surveyStatus: SearchSurveyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLeadStatusDto {
  @ApiProperty({ enum: LeadStatus })
  @IsEnum(LeadStatus)
  status: LeadStatus;
}
