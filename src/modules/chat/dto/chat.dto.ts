import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageFileType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class StartChatDto {
    @ApiProperty({ description: "Usta ID (Master.id)" })
    @IsInt()
    @Min(1)
    @Type(() => Number)
    masterId: number;
}

export class SendMessageDto {
    @ApiPropertyOptional({ description: "Matn xabar" })
    @IsOptional()
    @IsString()
    content?: string;
}

export class ChatQueryDto {
    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    page?: number = 1;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    limit?: number = 20;
}
