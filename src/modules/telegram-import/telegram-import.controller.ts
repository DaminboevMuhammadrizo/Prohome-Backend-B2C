import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { AddChannelDto, ChannelQueryDto, UpdateChannelDto } from './dto/telegram-import.dto';
import { TelegramImportService } from './telegram-import.service';

// Faqat admin uchun — o'ziga tegishli bo'lmagan (ochiq) Telegram kanallardan
// ko'chmas mulk e'lonlarini import qilishni boshqarish. Import qilingan e'lonlar
// RealEstateStatus.PENDING_REVIEW bilan tushadi — mavjud
// `GET /real-estates?status=PENDING_REVIEW` va `PATCH /real-estates/:id/status`
// orqali admin ko'rib tasdiqlaydi/rad etadi (bu yerda alohida endpoint kerak emas).
@ApiTags('Telegram Import (Admin)')
@ApiBearerAuth()
@UseGuards(GuardService, RoleGuardService)
@Role(UserRole.ADMIN, UserRole.SUPERADMIN)
@Controller('telegram-import/channels')
export class TelegramImportController {
  constructor(private readonly telegramImportService: TelegramImportService) {}

  @Get()
  @ApiOperation({ summary: 'Kuzatilayotgan kanallar ro\'yxati' })
  list(@Query() query: ChannelQueryDto) {
    return this.telegramImportService.listChannels(query.page, query.limit);
  }

  @Post()
  @ApiOperation({
    summary: 'Yangi kanal qo\'shish (kuzatishni boshlash)',
    description: 'Kanal ochiq (public) bo\'lishi kerak. Qo\'shilgandan keyin darhol import boshlanmaydi — buning uchun POST :id/backfill chaqiring.',
  })
  add(@Body() dto: AddChannelDto) {
    return this.telegramImportService.addChannel(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Kanal sozlamalarini yangilash (isActive/sinceDate)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateChannelDto) {
    return this.telegramImportService.updateChannel(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Kanalni kuzatishdan olib tashlash' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.telegramImportService.deleteChannel(id);
  }

  @Post(':id/backfill')
  @ApiOperation({
    summary: 'Kanal uchun bir martalik backfill\'ni (qayta) ishga tushirish',
    description: 'Kanalning `sinceDate` maydonidan (bo\'sh bo\'lsa — bor-yo\'g\'i) hozirgacha bo\'lgan barcha postlarni tekshiradi. Natija: { imported, skipped }.',
  })
  backfill(@Param('id', ParseIntPipe) id: number) {
    return this.telegramImportService.runBackfill(id);
  }
}
