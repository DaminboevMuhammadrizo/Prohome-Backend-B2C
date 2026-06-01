import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ContentStatus, UserRole } from '@prisma/client';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { CreateNewsCategoryDto, CreateNewsDto, UpdateNewsCategoryDto, UpdateNewsDto } from './dto/news.dto';
import { NewsService } from './news.service';

@ApiTags('News')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  // ── Statik route'lar — /:id dan OLDIN ───────────────────────────────────

  @Get()
  @ApiOperation({ summary: "Yangiliklar ro'yxati (sahifalangan)" })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ContentStatus })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'masterId', required: false })
  @ApiQuery({ name: 'jobId', required: false })
  getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: ContentStatus,
    @Query('categoryId') categoryId?: string,
    @Query('masterId') masterId?: string,
    @Query('jobId') jobId?: string,
  ) {
    return this.newsService.getAll({
      page: +page, limit: +limit, status,
      categoryId: categoryId ? +categoryId : undefined,
      masterId: masterId ? +masterId : undefined,
      jobId: jobId ? +jobId : undefined,
    });
  }

  @Get('categories')
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
  @ApiOperation({ summary: 'Yangilik yaratish (admin)' })
  create(@Body() dto: CreateNewsDto) {
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
  @ApiOperation({ summary: 'Yangilikni yangilash (admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNewsDto) {
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
