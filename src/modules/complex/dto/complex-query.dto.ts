import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ComplexQueryDto extends PaginationDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

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
    regionId?: number;

    @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
    @IsOptional()
    @IsDateString()
    createdFrom?: string;

    @ApiPropertyOptional({ example: '2026-04-30T23:59:59.999Z' })
    @IsOptional()
    @IsDateString()
    createdTo?: string;
}
