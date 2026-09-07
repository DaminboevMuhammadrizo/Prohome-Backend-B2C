import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ContentStatus, UserRole } from '@prisma/client';
import { memoryStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { CompanyData } from 'src/common/decorators/auth.decorators';
import { Role } from 'src/common/decorators/role.decorator';
import { CompanyGuardService } from 'src/common/guard/company-guard.service';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import type { CompanyJwtPayload } from 'src/common/config/jwt/jwt.service';
import { CreateReelDto, UpdateReelDto } from './dto/reels.dto';
import { ReelsService } from './reels.service';

const MAX_VIDEO_MB = 100;

function ensureVideoDir() {
  const dest = join(process.cwd(), 'core', 'uploads', 'videos');
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  return dest;
}

@ApiTags('Reels')
@Controller('reels')
export class ReelsController {
  constructor(private readonly reelsService: ReelsService) {}

  @Get()
  @ApiOperation({
    summary: "Reels ro'yxati (jadval uchun)",
    description: '`status` berilmasa faqat PUBLISHED qaytadi. Javob: `{ data: Reel[], meta: {page, limit, total, totalPages} }`.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Sahifa raqami', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Bir sahifadagi son', example: 10 })
  @ApiQuery({ name: 'id', required: false, description: 'Aniq reel ID si' })
  @ApiQuery({ name: 'search', required: false, description: 'Sarlavha yoki tavsif bo\'yicha umumiy qidiruv' })
  @ApiQuery({ name: 'status', required: false, enum: ContentStatus, description: 'Berilmasa — faqat PUBLISHED' })
  @ApiQuery({ name: 'masterId', required: false, description: 'Faqat shu usta reels\'lari' })
  @ApiQuery({ name: 'jobId', required: false, description: 'Faqat shu ish e\'loni bilan bog\'liq reels' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Faqat shu kompaniya reels\'lari' })
  @ApiQuery({ name: 'createdFrom', required: false, description: 'Yaratilgan sana — shundan boshlab', example: '2026-01-01' })
  @ApiQuery({ name: 'createdTo', required: false, description: 'Yaratilgan sana — shungacha', example: '2026-12-31' })
  getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('id') id?: string,
    @Query('search') search?: string,
    @Query('status') status?: ContentStatus,
    @Query('masterId') masterId?: string,
    @Query('jobId') jobId?: string,
    @Query('companyId') companyId?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
  ) {
    return this.reelsService.getAll({
      page: +page, limit: +limit, status, search,
      id: id ? +id : undefined,
      masterId: masterId ? +masterId : undefined,
      jobId: jobId ? +jobId : undefined,
      companyId: companyId ? +companyId : undefined,
      createdFrom, createdTo,
    });
  }

  // ─── Admin: video file yuklash yoki URL ─────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('video/')) return cb(new BadRequestException('Faqat video yuklash mumkin'), false);
      cb(null, true);
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: `Reel yaratish (admin) — video file YOKI videoUrl (biri shart, max ${MAX_VIDEO_MB}MB)` })
  async create(@Body() dto: CreateReelDto, @UploadedFile() file?: Express.Multer.File) {
    if (!file && !dto.videoUrl) throw new BadRequestException('Video file yoki videoUrl kiritish shart');
    if (file && dto.videoUrl) throw new BadRequestException('Video file va videoUrl bir vaqtda yuborilmasin');

    let videoUrl = dto.videoUrl as string;
    if (file) {
      const ext = file.originalname.split('.').pop() || 'mp4';
      const filename = `${Date.now()}.${ext}`;
      await writeFile(join(ensureVideoDir(), filename), file.buffer);
      videoUrl = `video/${filename}`;
    }

    return this.reelsService.create({ ...dto, videoUrl });
  }

  // ─── Company: o'z reelini qo'shish ──────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(CompanyGuardService)
  @Post('company')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('video/')) return cb(new BadRequestException('Faqat video yuklash mumkin'), false);
      cb(null, true);
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: `Kompaniya reeli yaratish — video file YOKI videoUrl (biri shart, max ${MAX_VIDEO_MB}MB)` })
  async createByCompany(
    @Body() dto: CreateReelDto,
    @CompanyData() company: CompanyJwtPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file && !dto.videoUrl) throw new BadRequestException('Video file yoki videoUrl kiritish shart');
    if (file && dto.videoUrl) throw new BadRequestException('Video file va videoUrl bir vaqtda yuborilmasin');

    let videoUrl = dto.videoUrl as string;
    if (file) {
      const ext = file.originalname.split('.').pop() || 'mp4';
      const filename = `${Date.now()}.${ext}`;
      await writeFile(join(ensureVideoDir(), filename), file.buffer);
      videoUrl = `video/${filename}`;
    }

    return this.reelsService.create({ ...dto, videoUrl, companyId: company.companyId });
  }

  // ─── Parametrli route'lar ────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: "Bitta reel (ko'rishlar avtomatik ko'payadi)" })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.reelsService.getById(id);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Reelni yangilash (admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReelDto) {
    return this.reelsService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: "Reelni o'chirish (admin)" })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.reelsService.delete(id);
  }
}
