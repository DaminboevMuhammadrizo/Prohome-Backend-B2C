import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ContentStatus, UserRole } from '@prisma/client';
import { memoryStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { toOptimizedWebp } from 'src/common/utils/image.util';
import { CacheResource, HttpCacheInterceptor } from 'src/common/cache/http-cache.interceptor';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { CreateNewsCategoryDto, CreateNewsDto, UpdateNewsCategoryDto, UpdateNewsDto } from './dto/news.dto';
import { NewsService } from './news.service';

const IMAGE_INTERCEPTOR = FileInterceptor('coverImage', {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/'))
      return cb(new BadRequestException('Faqat rasm yuklash mumkin'), false);
    cb(null, true);
  },
});

async function saveImage(file: Express.Multer.File): Promise<string> {
  const dir = join(process.cwd(), 'core', 'uploads', 'images');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}.webp`;
  await writeFile(join(dir, filename), await toOptimizedWebp(file.buffer));
  return `image/${filename}`;
}

@ApiTags('News')
@UseInterceptors(HttpCacheInterceptor)
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  // ── Statik route'lar — /:id dan OLDIN ───────────────────────────────────

  @Get()
  @CacheResource('news')
  @ApiOperation({
    summary: "Yangiliklar ro'yxati (jadval uchun)",
    description: '`status` berilmasa faqat PUBLISHED qaytadi. Javob: `{ data: News[], meta: {page, limit, total, totalPages} }`.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Sahifa raqami', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Bir sahifadagi son', example: 10 })
  @ApiQuery({ name: 'id', required: false, description: 'Aniq yangilik ID si' })
  @ApiQuery({ name: 'search', required: false, description: 'Sarlavha, qisqacha mazmun yoki matn bo\'yicha umumiy qidiruv' })
  @ApiQuery({ name: 'status', required: false, enum: ContentStatus, description: 'Berilmasa — faqat PUBLISHED' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Yangilik kategoriyasi ID si' })
  @ApiQuery({ name: 'masterId', required: false, description: 'Faqat shu usta bilan bog\'liq yangiliklar' })
  @ApiQuery({ name: 'jobId', required: false, description: 'Faqat shu ish e\'loni bilan bog\'liq yangiliklar' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Faqat shu kompaniya yangiliklari' })
  @ApiQuery({ name: 'createdFrom', required: false, description: 'Yaratilgan sana — shundan boshlab', example: '2026-01-01' })
  @ApiQuery({ name: 'createdTo', required: false, description: 'Yaratilgan sana — shungacha', example: '2026-12-31' })
  getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('id') id?: string,
    @Query('search') search?: string,
    @Query('status') status?: ContentStatus,
    @Query('categoryId') categoryId?: string,
    @Query('masterId') masterId?: string,
    @Query('jobId') jobId?: string,
    @Query('companyId') companyId?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
  ) {
    return this.newsService.getAll({
      page: +page, limit: +limit, status, search,
      id: id ? +id : undefined,
      categoryId: categoryId ? +categoryId : undefined,
      masterId: masterId ? +masterId : undefined,
      jobId: jobId ? +jobId : undefined,
      companyId: companyId ? +companyId : undefined,
      createdFrom, createdTo,
    });
  }

  @Get('categories')
  @CacheResource('news')
  @ApiOperation({ summary: "Yangilik kategoriyalari ro'yxati" })
  getCategories() {
    return this.newsService.getCategories();
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post('categories')
  @ApiOperation({ summary: 'Kategoriya yaratish (admin)' })
  createCategory(@Body() dto: CreateNewsCategoryDto) {
    return this.newsService.createCategory(dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch('categories/:id')
  @ApiOperation({ summary: 'Kategoriyani yangilash (admin)' })
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNewsCategoryDto) {
    return this.newsService.updateCategory(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete('categories/:id')
  @ApiOperation({ summary: "Kategoriyani o'chirish (admin)" })
  deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.newsService.deleteCategory(id);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post()
  @UseInterceptors(IMAGE_INTERCEPTOR)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'slug', 'content'],
      properties: {
        title:       { type: 'string', example: "Ko'chmas mulk narxlari 2025-yilda" },
        slug:        { type: 'string', example: 'kochmas-mulk-narxlari-2025' },
        content:     { type: 'string', example: "To'liq maqola matni..." },
        excerpt:     { type: 'string' },
        coverImage:  { type: 'string', format: 'binary', description: 'Muqova rasmi (ixtiyoriy)' },
        categoryId:  { type: 'integer' },
        status:      { type: 'string', enum: Object.values(ContentStatus) },
        publishedAt: { type: 'string', example: '2025-05-20T10:00:00.000Z' },
        masterId:    { type: 'integer' },
        jobId:       { type: 'integer' },
        companyId:   { type: 'integer' },
      },
    },
  })
  @ApiOperation({ summary: 'Yangilik yaratish (admin) — muqova rasmi yuklab yuboriladi' })
  async create(@Body() dto: CreateNewsDto, @UploadedFile() file?: Express.Multer.File) {
    if (file) dto.coverImage = await saveImage(file);
    return this.newsService.create(dto);
  }

  // ── Parametrli route'lar ─────────────────────────────────────────────────

  @Get('slug/:slug')
  @ApiOperation({ summary: "Yangilik slug bo'yicha" })
  getBySlug(@Param('slug') slug: string) {
    return this.newsService.getBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: "Bitta yangilik (ko'rishlar avtomatik ko'payadi)" })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.newsService.getById(id);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch(':id')
  @UseInterceptors(IMAGE_INTERCEPTOR)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title:       { type: 'string' },
        slug:        { type: 'string' },
        content:     { type: 'string' },
        excerpt:     { type: 'string' },
        coverImage:  { type: 'string', format: 'binary', description: 'Yangi muqova rasmi (ixtiyoriy)' },
        categoryId:  { type: 'integer' },
        status:      { type: 'string', enum: Object.values(ContentStatus) },
        publishedAt: { type: 'string' },
        masterId:    { type: 'integer' },
        jobId:       { type: 'integer' },
      },
    },
  })
  @ApiOperation({ summary: 'Yangilikni yangilash (admin) — muqova rasmini ham yangilash mumkin' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNewsDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) dto.coverImage = await saveImage(file);
    return this.newsService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: "Yangilikni o'chirish (admin)" })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.newsService.delete(id);
  }
}
