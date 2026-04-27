import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApartmentQueryDto } from 'src/modules/apartment/dto/apartment-query.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { GuardService } from 'src/common/guard/guard.service';
import { fileStorages } from 'src/common/types/upload_types';
import { CreateComplexDto } from './dto/create-complex.dto';
import { UpdateComplexDto } from './dto/update-complex.dto';
import { ComplexQueryDto } from './dto/complex-query.dto';
import { ComplexService } from './complex.service';

@ApiTags('Complexes')
@Controller('complexes')
export class ComplexController {
    constructor(private readonly complexService: ComplexService) { }

    @Get()
    @ApiOperation({ summary: 'Complexlar royxati' })
    getAll(@Query() query: ComplexQueryDto) {
        return this.complexService.getAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Bitta complex' })
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.complexService.getOne(id);
    }

    @Get(':id/apartments')
    @ApiOperation({ summary: 'Complexga tegishli apartmentlar' })
    getApartments(
        @Param('id', ParseIntPipe) id: number,
        @Query() query: ApartmentQueryDto,
    ) {
        return this.complexService.getApartments(id, query);
    }

    @Get(':id/cottages')
    @ApiOperation({ summary: 'Complexga tegishli kotejlar' })
    getCottages(
        @Param('id', ParseIntPipe) id: number,
        @Query() query: ApartmentQueryDto,
    ) {
        return this.complexService.getCottages(id, query);
    }

    @Post()
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @UseInterceptors(FilesInterceptor('images', 20, fileStorages(['image'])))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['name', 'address', 'companyId', 'regionId', 'images'],
            properties: {
                name: { type: 'string' },
                descriptionUz: { type: 'string' },
                descriptionUzCyrl: { type: 'string' },
                descriptionRu: { type: 'string' },
                address: { type: 'string' },
                companyId: { type: 'number' },
                regionId: { type: 'number' },
                latitude: { type: 'number' },
                longitude: { type: 'number' },
                images: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
            },
        },
    })
    @ApiOperation({ summary: 'Complex yaratish' })
    create(
        @UserData() user: JwtPayload,
        @Body() dto: CreateComplexDto,
        @UploadedFiles() images?: Express.Multer.File[],
    ) {
        return this.complexService.create(user, dto, images);
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
                name: { type: 'string' },
                descriptionUz: { type: 'string' },
                descriptionUzCyrl: { type: 'string' },
                descriptionRu: { type: 'string' },
                address: { type: 'string' },
                companyId: { type: 'number' },
                regionId: { type: 'number' },
                latitude: { type: 'number' },
                longitude: { type: 'number' },
                images: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
            },
        },
    })
    @ApiOperation({ summary: 'Complex yangilash' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @UserData() user: JwtPayload,
        @Body() dto: UpdateComplexDto,
        @UploadedFiles() images?: Express.Multer.File[],
    ) {
        return this.complexService.update(id, user, dto, images);
    }

    @Delete(':id')
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @ApiOperation({ summary: 'Complex ochirish' })
    delete(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
        return this.complexService.delete(id, user);
    }
}
