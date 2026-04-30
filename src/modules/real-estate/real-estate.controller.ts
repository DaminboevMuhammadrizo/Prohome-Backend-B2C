import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DealType, MediaType, PropertyType, RealEstateStatus, SellerType, UserRole } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { ChangeRealEstateStatusDto, CreateRealEstateDto, UpdateRealEstateDto } from './dto/real-estate.dto';
import { RealEstateService } from './real-estate.service';

const MAX_VIDEO_MB = 50;

const mediaStorage = (type: 'images' | 'videos') =>
    diskStorage({
        destination: (req, file, cb) => {
            const dest = join(process.cwd(), 'core', 'uploads', type);
            if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
            cb(null, dest);
        },
        filename: (req, file, cb) => {
            cb(null, `${Date.now()}${extname(file.originalname)}`);
        },
    });

@ApiTags('Real Estate')
@Controller('real-estates')
export class RealEstateController {
    constructor(private readonly realEstateService: RealEstateService) { }

    @Get()
    @ApiOperation({ summary: 'Ko\'chmas mulklar ro\'yxati (filtrlash bilan)' })
    getAll(
        @Query('page') page = 1,
        @Query('limit') limit = 20,
        @Query('search') search?: string,
        @Query('propertyType') propertyType?: PropertyType,
        @Query('dealType') dealType?: DealType,
        @Query('sellerType') sellerType?: SellerType,
        @Query('locationId') locationId?: string,
        @Query('minPrice') minPrice?: string,
        @Query('maxPrice') maxPrice?: string,
        @Query('roomCount') roomCount?: string,
        @Query('status') status?: RealEstateStatus,
        @Query('userId') userId?: string,
    ) {
        return this.realEstateService.getAll({
            page: +page, limit: +limit, search, propertyType, dealType, sellerType,
            locationId: locationId ? +locationId : undefined,
            minPrice: minPrice ? +minPrice : undefined,
            maxPrice: maxPrice ? +maxPrice : undefined,
            roomCount: roomCount ? +roomCount : undefined,
            status,
            userId: userId ? +userId : undefined,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Bitta ko\'chmas mulk' })
    getById(@Param('id', ParseIntPipe) id: number) {
        return this.realEstateService.getById(id);
    }

    @ApiBearerAuth()
    @UseGuards(GuardService)
    @Post()
    @ApiOperation({ summary: 'Ko\'chmas mulk qo\'shish' })
    create(@UserData() user: JwtPayload, @Body() dto: CreateRealEstateDto) {
        return this.realEstateService.create(user.id, dto);
    }

    @ApiBearerAuth()
    @UseGuards(GuardService)
    @Patch(':id')
    @ApiOperation({ summary: 'Ko\'chmas mulkni yangilash' })
    update(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload, @Body() dto: UpdateRealEstateDto) {
        const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;
        return this.realEstateService.update(id, user.id, isAdmin, dto);
    }

    @ApiBearerAuth()
    @UseGuards(GuardService)
    @Patch(':id/status')
    @ApiOperation({ summary: 'Mulk statusini o\'zgartirish (ACTIVE/SOLD/ARCHIVED)' })
    changeStatus(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload, @Body() dto: ChangeRealEstateStatusDto) {
        const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;
        return this.realEstateService.changeStatus(id, user.id, isAdmin, dto);
    }

    @ApiBearerAuth()
    @UseGuards(GuardService)
    @Delete(':id')
    @ApiOperation({ summary: 'Ko\'chmas mulkni o\'chirish' })
    delete(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
        const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;
        return this.realEstateService.delete(id, user.id, isAdmin);
    }

    @Post(':id/view')
    @ApiOperation({ summary: 'Ko\'rishni qayd etish' })
    recordView(@Param('id', ParseIntPipe) id: number) {
        return this.realEstateService.recordView(id);
    }

    @ApiBearerAuth()
    @UseGuards(GuardService)
    @Post(':id/like')
    @ApiOperation({ summary: 'Like bosish' })
    toggleLike(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
        return this.realEstateService.toggleLike(id, user.id);
    }

    // Rasm yuklash
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @Post(':id/media/image')
    @UseInterceptors(FileInterceptor('file', {
        storage: mediaStorage('images'),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.startsWith('image/')) cb(new BadRequestException('Faqat rasm yuklash mumkin'), false);
            else cb(null, true);
        },
    }))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Mulk rasmi yuklash (max 5MB)' })
    uploadImage(
        @Param('id', ParseIntPipe) id: number,
        @UploadedFile() file: Express.Multer.File,
        @Query('isMain') isMain = 'false',
    ) {
        return this.realEstateService.addMedia(id, file.filename, isMain === 'true', MediaType.IMAGE);
    }

    // Video yuklash
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @Post(':id/media/video')
    @UseInterceptors(FileInterceptor('file', {
        storage: mediaStorage('videos'),
        limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.startsWith('video/')) cb(new BadRequestException('Faqat video yuklash mumkin'), false);
            else cb(null, true);
        },
    }))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: `Mulk videosi yuklash (max ${MAX_VIDEO_MB}MB)` })
    uploadVideo(
        @Param('id', ParseIntPipe) id: number,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.realEstateService.addMedia(id, file.filename, false, MediaType.VIDEO);
    }

    @ApiBearerAuth()
    @UseGuards(GuardService)
    @Delete(':id/media/:mediaId')
    @ApiOperation({ summary: 'Media faylni o\'chirish' })
    deleteMedia(@Param('id', ParseIntPipe) id: number, @Param('mediaId', ParseIntPipe) mediaId: number) {
        return this.realEstateService.deleteMedia(id, mediaId);
    }
}
