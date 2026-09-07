import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { BannerLocation, MediaType, UserRole } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { BannerService } from './banner.service';

const bannerStorage = (type: 'images' | 'videos') =>
  diskStorage({
    destination: (req, file, cb) => {
      const dest = join(process.cwd(), 'core', 'uploads', type);
      if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (req, file, cb) => cb(null, `${Date.now()}${extname(file.originalname)}`),
  });

@ApiTags('Banners')
@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  @ApiOperation({ summary: 'Faol bannerlar (public)' })
  getAll() {
    return this.bannerService.getAll();
  }

  @Get('admin/all')
  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Barcha bannerlar (admin, jadval uchun)',
    description: 'Filtrsiz — holatidan qat\'i nazar barcha bannerlar. Javob: `{ data: Banner[], meta: {page, limit, total, totalPages} }`.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Sahifa raqami', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Bir sahifadagi son', example: 20 })
  @ApiQuery({ name: 'id', required: false, description: 'Aniq banner ID si' })
  @ApiQuery({ name: 'search', required: false, description: 'Sarlavha bo\'yicha qidiruv' })
  @ApiQuery({ name: 'isActive', required: false, description: 'true/false' })
  @ApiQuery({ name: 'location', required: false, enum: BannerLocation, description: 'Banner qayerda ko\'rsatilishi' })
  @ApiQuery({ name: 'mediaType', required: false, enum: MediaType })
  @ApiQuery({ name: 'createdFrom', required: false, description: 'Yaratilgan sana — shundan boshlab', example: '2026-01-01' })
  @ApiQuery({ name: 'createdTo', required: false, description: 'Yaratilgan sana — shungacha', example: '2026-12-31' })
  getAdminAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('id') id?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('location') location?: BannerLocation,
    @Query('mediaType') mediaType?: MediaType,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
  ) {
    return this.bannerService.getAdminAll({
      page: +page, limit: +limit,
      id: id ? +id : undefined,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      location, mediaType, createdFrom, createdTo,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta banner' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.bannerService.getById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @UseInterceptors(FileInterceptor('file', {
    storage: bannerStorage('images'),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
        cb(new BadRequestException('Faqat rasm yoki video'), false);
      } else cb(null, true);
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Banner yaratish (rasm yoki video)' })
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title?: string; link?: string; location?: BannerLocation; isActive?: string; order?: string },
  ) {
    const mediaType = file.mimetype.startsWith('video/') ? MediaType.VIDEO : MediaType.IMAGE;
    return this.bannerService.create({
      title: body.title,
      link: body.link,
      location: body.location,
      isActive: body.isActive === 'false' ? false : true,
      order: body.order ? +body.order : 0,
    }, file.filename, mediaType);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @UseInterceptors(FileInterceptor('file', {
    storage: bannerStorage('images'),
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Banner yangilash' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
    @Body() body: any = {},
  ) {
    const mediaType = file?.mimetype.startsWith('video/') ? MediaType.VIDEO : MediaType.IMAGE;
    return this.bannerService.update(id, {
      title: body.title,
      link: body.link,
      location: body.location,
      isActive: body.isActive !== undefined ? body.isActive !== 'false' : undefined,
      order: body.order !== undefined ? +body.order : undefined,
    }, file?.filename, file ? mediaType : undefined);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Banner statusini o\'zgartirish' })
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: { isActive: boolean }) {
    return this.bannerService.updateStatus(id, body.isActive);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Banner o\'chirish' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.bannerService.delete(id);
  }
}
