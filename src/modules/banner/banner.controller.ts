import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CacheResource, HttpCacheInterceptor } from 'src/common/cache/http-cache.interceptor';
import { BannerLocation, MediaType, UserRole } from '@prisma/client';
import { memoryStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { toOptimizedWebp } from 'src/common/utils/image.util';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { BannerService } from './banner.service';

const bannerUpload = {
  storage: memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
};

// Rasm bo'lsa — webp'ga siqiladi (max 1600px, q76); video bo'lsa asl holida
// saqlanadi. Fayl nomini qaytaradi.
async function saveBannerFile(file: Express.Multer.File): Promise<string> {
  const isVideo = file.mimetype.startsWith('video/');
  const type = isVideo ? 'videos' : 'images';
  const dest = join(process.cwd(), 'core', 'uploads', type);
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  const filename = isVideo ? `${Date.now()}${extname(file.originalname)}` : `${Date.now()}.webp`;
  const buffer = isVideo ? file.buffer : await toOptimizedWebp(file.buffer);
  await writeFile(join(dest, filename), buffer);
  return filename;
}

@ApiTags('Banners')
@UseInterceptors(HttpCacheInterceptor)
@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  @CacheResource('banner')
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
    ...bannerUpload,
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
        cb(new BadRequestException('Faqat rasm yoki video'), false);
      } else cb(null, true);
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Banner yaratish (rasm yoki video)' })
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title?: string; link?: string; location?: BannerLocation; isActive?: string; order?: string },
  ) {
    const mediaType = file.mimetype.startsWith('video/') ? MediaType.VIDEO : MediaType.IMAGE;
    const filename = await saveBannerFile(file);
    return this.bannerService.create({
      title: body.title,
      link: body.link,
      location: body.location,
      isActive: body.isActive === 'false' ? false : true,
      order: body.order ? +body.order : 0,
    }, filename, mediaType);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @UseInterceptors(FileInterceptor('file', bannerUpload))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Banner yangilash' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
    @Body() body: any = {},
  ) {
    const mediaType = file?.mimetype.startsWith('video/') ? MediaType.VIDEO : MediaType.IMAGE;
    const filename = file ? await saveBannerFile(file) : undefined;
    return this.bannerService.update(id, {
      title: body.title,
      link: body.link,
      location: body.location,
      isActive: body.isActive !== undefined ? body.isActive !== 'false' : undefined,
      order: body.order !== undefined ? +body.order : undefined,
    }, filename, file ? mediaType : undefined);
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
