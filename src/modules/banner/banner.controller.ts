import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { fileStorages } from 'src/common/types/upload_types';
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerStatusDto } from './dto/update-banner-status.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@ApiTags('Banners')
@Controller('banners')
export class BannerController {
    constructor(private readonly bannerService: BannerService) { }

    @Get()
    @ApiOperation({ summary: 'Faol bannerlar' })
    getAll() {
        return this.bannerService.getAll();
    }

    @Get('admin/all')
    @ApiBearerAuth()
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Barcha bannerlar' })
    getAdminList() {
        return this.bannerService.getAdminList();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Bitta banner' })
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.bannerService.getOne(id);
    }

    @Post()
    @ApiBearerAuth()
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
    @UseInterceptors(FileInterceptor('image', fileStorages(['image'])))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['image'],
            properties: {
                image: { type: 'string', format: 'binary' },
                link: { type: 'string' },
                location: { type: 'string' },
                isActive: { type: 'boolean' },
            },
        },
    })
    @ApiOperation({ summary: 'Banner yaratish' })
    create(
        @Body() dto: CreateBannerDto,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.bannerService.create(dto, file.filename);
    }

    @Patch(':id')
    @ApiBearerAuth()
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
    @UseInterceptors(FileInterceptor('image', fileStorages(['image'])))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                image: { type: 'string', format: 'binary' },
                link: { type: 'string' },
                location: { type: 'string' },
                isActive: { type: 'boolean' },
            },
        },
    })
    @ApiOperation({ summary: 'Banner yangilash' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateBannerDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.bannerService.update(id, dto, file?.filename);
    }

    @Patch(':id/status')
    @ApiBearerAuth()
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Banner statusini o‘zgartirish' })
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateBannerStatusDto,
    ) {
        return this.bannerService.updateStatus(id, dto);
    }

    @Delete(':id')
    @ApiBearerAuth()
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Banner o‘chirish' })
    delete(@Param('id', ParseIntPipe) id: number) {
        return this.bannerService.delete(id);
    }
}
