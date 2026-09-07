import { BadRequestException, Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { memoryStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import sharp from 'sharp';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { DashboardService } from 'src/modules/dashboard/dashboard.service';
import { CreateMasterByAdminDto, RegisterAsMasterDto, UpdateMasterDto } from './dto/create-master.dto';
import { MasterService } from './master.service';

function ensureImgDir() {
  const dest = join(process.cwd(), 'core', 'uploads', 'images');
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  return dest;
}

async function saveAsWebp(buffer: Buffer): Promise<string> {
  const filename = `${Date.now()}.webp`;
  const dest = ensureImgDir();
  const webpBuffer = await sharp(buffer).webp({ quality: 88, effort: 4 }).toBuffer();
  await writeFile(join(dest, filename), webpBuffer);
  return filename;
}

@ApiTags('Masters')
@Controller('masters')
export class MasterController {
  constructor(
    private readonly masterService: MasterService,
    private readonly jwtService: JwtService,
    private readonly dashboardService: DashboardService,
  ) {}

  private extractUserId(req: any): number | undefined {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return undefined;
      const payload = this.jwtService.decode(token) as JwtPayload | null;
      return payload?.id ?? undefined;
    } catch {
      return undefined;
    }
  }

  // ── Statik route'lar — har doim /:id dan OLDIN bo'lishi shart ──────────

  @Get()
  @ApiOperation({
    summary: "Ustalar ro'yxati (jadval uchun — har ustun bo'yicha filtr)",
    description: 'Javob: `{ data: Master[], meta: {page, limit, total, totalPages} }`.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Sahifa raqami', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Bir sahifadagi son', example: 20 })
  @ApiQuery({ name: 'id', required: false, description: 'Aniq usta (Master) ID si' })
  @ApiQuery({ name: 'search', required: false, description: 'Ism, familiya, telefon yoki bio bo\'yicha umumiy qidiruv' })
  @ApiQuery({ name: 'isFree', required: false, description: 'true — faqat band bo\'lmagan (bo\'sh) ustalar' })
  @ApiQuery({ name: 'skillTypeId', required: false, description: 'Kasb turi ID si (/skill-types dan)' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Usta profilidagi foydalanuvchining joylashuvi (shahar) ID si' })
  @ApiQuery({ name: 'status', required: false, description: 'Usta profilidagi foydalanuvchi holati (ACTIVE/BLOCKED/ARCHIVED)' })
  @ApiQuery({ name: 'createdFrom', required: false, description: 'Qo\'shilgan sana — shundan boshlab', example: '2026-01-01' })
  @ApiQuery({ name: 'createdTo', required: false, description: 'Qo\'shilgan sana — shungacha', example: '2026-12-31' })
  getAll(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('id') id?: string,
    @Query('search') search?: string,
    @Query('isFree') isFree?: string,
    @Query('skillTypeId') skillTypeId?: string,
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
  ) {
    return this.masterService.getAll({
      page: +page, limit: +limit, search,
      isFree: isFree !== undefined ? isFree === 'true' : undefined,
      skillTypeId: skillTypeId ? +skillTypeId : undefined,
      subscriberUserId: this.extractUserId(req),
      id: id ? +id : undefined,
      locationId: locationId ? +locationId : undefined,
      status: status as any,
      createdFrom, createdTo,
    });
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Get('me/profile')
  @ApiOperation({ summary: 'Mening usta profilim' })
  getMyProfile(@UserData() user: JwtPayload) {
    return this.masterService.getByUserId(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Post('me/register')
  @ApiOperation({ summary: "Foydalanuvchi usta bo'lish (o'zi)" })
  registerAsMaster(@Body() dto: RegisterAsMasterDto, @UserData() user: JwtPayload) {
    return this.masterService.registerAsMaster(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post()
  @ApiOperation({ summary: 'Usta yaratish (admin) — user ham yaratiladi' })
  createByAdmin(@Body() dto: CreateMasterByAdminDto) {
    return this.masterService.createByAdmin(dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Ustalar umumiy statistikasi' })
  getMastersStats() {
    return this.dashboardService.getMastersStats();
  }

  @Get('top')
  @ApiOperation({ summary: 'Eng yaxshi ustalar (like va reyting bo\'yicha)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopMasters(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) {
    return this.dashboardService.getTopMasters(limit);
  }

  // DELETE /masters/img — /:id dan OLDIN, aks holda "img" /:id ga tushadi
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Delete('img')
  @ApiOperation({ summary: "Usta rasmini o'chirish — profileImg yoki workImg (tokendan tekshiriladi)" })
  deleteImg(@Query('imgname') imgname: string, @UserData() user: JwtPayload) {
    return this.masterService.deleteImg(user.id, imgname);
  }

  // ── Parametrli route'lar — statik route'lardan KEYIN ───────────────────

  @Get(':id')
  @ApiOperation({ summary: "Bitta usta (o'xshash ustalar ham qaytadi)" })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.masterService.getById(id);
  }

  @Post(':id/view')
  @ApiOperation({ summary: "Ko'rishni qayd etish" })
  recordView(@Param('id', ParseIntPipe) id: number) {
    return this.masterService.recordView(id);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Post(':id/like')
  @ApiOperation({ summary: 'Ustaga like bosish/olib tashlash' })
  toggleLike(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
    return this.masterService.toggleLike(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Patch(':id')
  @ApiOperation({ summary: 'Ustani yangilash' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMasterDto) {
    return this.masterService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch(':id/toggle-free')
  @ApiOperation({ summary: "Usta band/bo'sh holatini almashtirish" })
  toggleFree(@Param('id', ParseIntPipe) id: number) {
    return this.masterService.toggleFree(id);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: "Ustani o'chirish" })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.masterService.delete(id);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Post(':id/profile-img')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) return cb(new Error('Faqat rasm yuklash mumkin'), false);
      cb(null, true);
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Usta profil rasmi yuklash (WebP ga aylantiriladi)' })
  async uploadProfileImg(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File) {
    const filename = await saveAsWebp(file.buffer);
    return this.masterService.uploadProfileImg(id, filename);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Post(':id/work-img')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) return cb(new Error('Faqat rasm yuklash mumkin'), false);
      cb(null, true);
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: "Usta ish rasmi qo'shish (WebP ga aylantiriladi)" })
  async addWorkImg(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File) {
    const filename = await saveAsWebp(file.buffer);
    return this.masterService.addWorkImg(id, filename);
  }
}
