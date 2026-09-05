import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Topilmagan qidiruvlar ro\'yxati (har bir maydon + id bo\'yicha filtr, pagination)' })
  listSearchSubscriptions(@Query() query: SearchSubscriptionQueryDto) {
    return this.notificationService.listSearchSubscriptions(query);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Bildirishnoma shablonlari ro\'yxati' })
  listTemplates() {
    return this.notificationService.listTemplates();
  }

  @Patch('templates/:key')
  @ApiOperation({ summary: 'Shablon matnini tahrirlash (title/body/isActive)' })
  updateTemplate(@Param('key') key: string, @Body() dto: UpdateTemplateDto) {
    return this.notificationService.updateTemplate(key, dto);
  }

  @Post('broadcast')
  @ApiOperation({ summary: 'Filtrlangan auditoriyaga xabar yozish (darhol yoki rejalashtirib)' })
  createBroadcast(@UserData() admin: JwtPayload, @Body() dto: CreateBroadcastDto) {
    return this.notificationService.createBroadcast(admin.id, dto);
  }

  @Get('broadcast')
  @ApiOperation({ summary: 'Yuborilgan/rejalashtirilgan xabarlar ro\'yxati' })
  listBroadcasts(@Query() query: BroadcastQueryDto) {
    return this.notificationService.listBroadcasts(query.status, query.page, query.limit);
  }
}
