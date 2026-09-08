import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { BroadcastQueryDto, CreateBroadcastDto, SearchSubscriptionQueryDto, UpdateTemplateDto } from './dto/notification.dto';
import { NotificationService } from './notification.service';

@ApiTags('Notifications (Admin)')
@ApiBearerAuth()
@UseGuards(GuardService, RoleGuardService)
@Role(UserRole.ADMIN, UserRole.SUPERADMIN)
@Controller('notifications/admin')
export class AdminNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('search-subscriptions')
  @ApiOperation({
    summary: 'Topilmagan qidiruvlar ro\'yxati (jadval uchun)',
    description:
      'Foydalanuvchi biror narsa qidirib topa olmagan holatlar shu yerda saqlanadi. `isActive: false` yoki `notified: true` — ' +
      'shu qidiruvga mos yangi e\'lon/usta topilib, foydalanuvchiga avtomatik xabar yuborilgan degani. Javob: `{ data, meta }`.',
  })
  listSearchSubscriptions(@Query() query: SearchSubscriptionQueryDto) {
    return this.notificationService.listSearchSubscriptions(query);
  }

  @Delete('search-subscriptions/:id')
  @ApiOperation({ summary: "Bitta 'topilmagan qidiruv' yozuvini o'chirish" })
  deleteSearchSubscription(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.deleteSearchSubscription(id);
  }

  @Get('templates')
  @ApiOperation({
    summary: 'Bildirishnoma shablonlari ro\'yxati',
    description: 'Moslik topilganda avtomatik yuboriladigan matnlar (masalan `search_match_real_estate`). Bu yerda tahrirlab, `PATCH :key` bilan saqlanadi.',
  })
  listTemplates(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('id') id?: string,
    @Query('search') search?: string,
  ) {
    return this.notificationService.listTemplates({ page: +page, limit: +limit, id: id ? +id : undefined, search });
  }

  @Patch('templates/:key')
  @ApiOperation({ summary: 'Shablon matnini tahrirlash (title/body/isActive)' })
  updateTemplate(@Param('key') key: string, @Body() dto: UpdateTemplateDto) {
    return this.notificationService.updateTemplate(key, dto);
  }

  @Post('broadcast')
  @ApiOperation({
    summary: 'Filtrlangan auditoriyaga xabar yozish (darhol yoki rejalashtirib)',
    description:
      '`filters` bo\'sh — hammaga; `filters.searchType`/`filters.locationId` berilsa — faqat shu turdagi/hududdagi ' +
      'qidiruvni saqlagan foydalanuvchilarga boradi. `scheduledAt` bo\'sh bo\'lsa darhol yuboriladi, aks holda o\'sha vaqtda.',
  })
  createBroadcast(@UserData() admin: JwtPayload, @Body() dto: CreateBroadcastDto) {
    return this.notificationService.createBroadcast(admin.id, dto);
  }

  @Get('broadcast')
  @ApiOperation({ summary: 'Yuborilgan/rejalashtirilgan xabarlar ro\'yxati', description: 'Javob: `{ data: AdminBroadcast[], meta }`.' })
  listBroadcasts(@Query() query: BroadcastQueryDto) {
    return this.notificationService.listBroadcasts(query.status, query.page, query.limit);
  }
}
