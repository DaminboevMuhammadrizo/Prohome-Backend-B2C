import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { GuardService } from 'src/common/guard/guard.service';
import { fileStorages } from 'src/common/types/upload_types';
import { ApartmentLayoutService } from './apartment-layout.service';
import { CreateApartmentLayoutDto } from './dto/create-apartment-layout.dto';
import { UpdateApartmentLayoutDto } from './dto/update-apartment-layout.dto';

@ApiTags('Apartment Layouts')
@Controller('apartment-layouts')
export class ApartmentLayoutController {
    constructor(private readonly apartmentLayoutService: ApartmentLayoutService) { }

    @Get()
    @ApiOperation({ summary: 'Apartment layoutlar ro‘yxati' })
    getAll() {
        return this.apartmentLayoutService.getAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Bitta apartment layout' })
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.apartmentLayoutService.getOne(id);
    }

    @Post()
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @UseInterceptors(FilesInterceptor('images', 20, fileStorages(['image'])))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['complexId', 'roomCount', 'area', 'images'],
            properties: {
                complexId: { type: 'number' },
                roomCount: { type: 'number' },
                area: { type: 'number' },
                priceMin: { type: 'number' },
                priceMax: { type: 'number' },
                status: { type: 'string' },
                totalUnits: { type: 'number' },
                images: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
            },
        },
    })
    @ApiOperation({ summary: 'Apartment layout yaratish' })
    create(
        @UserData() user: JwtPayload,
        @Body() dto: CreateApartmentLayoutDto,
        @UploadedFiles() images?: Express.Multer.File[],
    ) {
        return this.apartmentLayoutService.create(user, dto, images);
    }

    @Patch(':id')
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @UseInterceptors(FilesInterceptor('images', 20, fileStorages(['image'])))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                complexId: { type: 'number' },
                roomCount: { type: 'number' },
                area: { type: 'number' },
                priceMin: { type: 'number' },
                priceMax: { type: 'number' },
                status: { type: 'string' },
                totalUnits: { type: 'number' },
                images: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
            },
        },
    })
    @ApiOperation({ summary: 'Apartment layout yangilash' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @UserData() user: JwtPayload,
        @Body() dto: UpdateApartmentLayoutDto,
        @UploadedFiles() images?: Express.Multer.File[],
    ) {
        return this.apartmentLayoutService.update(id, user, dto, images);
    }

    @Delete(':id')
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @ApiOperation({ summary: 'Apartment layout o‘chirish' })
    delete(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
        return this.apartmentLayoutService.delete(id, user);
    }
}
