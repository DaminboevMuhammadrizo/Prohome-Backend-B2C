import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileStorages } from 'src/common/types/upload_types';
import { UserRole } from '@prisma/client';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { Role } from 'src/common/decorators/role.decorator';

@Controller('banner')
export class BannerController {
    constructor(private readonly service: BannerService) { }

    @Get()
    getAll() {
        return this.service.getAll();
    }

    @Get(':id')
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.service.getOne(id);
    }

    @Post()
    @ApiOperation({ summary: `${UserRole.ADMIN}` })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['img', 'imgType', 'location'],
            properties: {
                img: { type: 'string', format: 'binary' },
                imgType: { type: 'string', enum: ['MOBILE', 'DESKTOP', 'TABLET'] },
                link: { type: 'string' },
                location: { type: 'string', enum: ['HEADER', 'MID_HEADER', 'FOOTER', 'OTHER'] },
            },
        },
    })
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN)
    @Post()
    @UseInterceptors(FileInterceptor('img', fileStorages(['image'])))
    create(@Body() payload: CreateBannerDto, @UploadedFile() file: Express.Multer.File) {
        return this.service.create(payload, file.filename);
    }

    @ApiOperation({ summary: `${UserRole.ADMIN}` })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                img: { type: 'string', format: 'binary' },
                imgType: { type: 'string', enum: ['MOBILE', 'DESKTOP', 'TABLET'] },
                link: { type: 'string' },
                location: { type: 'string', enum: ['HEADER', 'MID_HEADER', 'FOOTER', 'OTHER'] },
            },
        },
    })
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN)
    @Patch(':id')
    @UseInterceptors(FileInterceptor('img', fileStorages(['image'])))
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateBannerDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.service.update(id, dto, file?.filename);
    }

    @ApiOperation({ summary: `${UserRole.ADMIN}` })
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN)
    @Delete(':id')
    delete(@Param('id', ParseIntPipe) id: number) {
        return this.service.delete(id);
    }
}
