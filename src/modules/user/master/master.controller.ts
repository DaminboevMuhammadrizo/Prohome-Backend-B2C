import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
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
  const webpBuffer = await sharp(buffer)
    .webp({ quality: 88, effort: 4 })
    .toBuffer();
  await writeFile(join(dest, filename), webpBuffer);
  return filename;
}

@ApiTags('Masters')
@Controller('masters')
export class MasterController {
  constructor(
    private readonly masterService: MasterService,
    private readonly jwtService: JwtService,
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

  @Get()
  @ApiOperation({ summary: "Ustalar ro'yxati" })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isFree', required: false })
  @ApiQuery({ name: 'skillTypeId', required: false })
  getAll(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('isFree') isFree?: string,
    @Query('skillTypeId') skillTypeId?: string,
  ) {
    return this.masterService.getAll(
      +page, +limit, search,
      isFree !== undefined ? isFree === 'true' : undefined,
      skillTypeId ? +skillTypeId : undefined,
      this.extractUserId(req),
    );
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Get('me/profile')
  @ApiOperation({ summary: 'Mening usta profilim' })
  getMyProfile(@UserData() user: JwtPayload) {
    return this.masterService.getByUserId(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta usta (o\'xshash ustalar ham qaytadi)' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.masterService.getById(id);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Post('me/register')
  @ApiOperation({ summary: "Foydalanuvchi usta bo'lish (o'zi)" })
  registerAsMaster(@Body() dto: RegisterAsMasterDto, @UserData() user: JwtPayload) {
    return this.masterService.registerAsMaster(user.id, dto);
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
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post()
  @ApiOperation({ summary: 'Usta yaratish (admin) — user ham yaratiladi' })
  createByAdmin(@Body() dto: CreateMasterByAdminDto) {
    return this.masterService.createByAdmin(dto);
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
