import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { GuardService } from 'src/common/guard/guard.service';
import { NotificationQueryDto, RegisterDeviceDto, UnregisterDeviceDto } from './dto/notification.dto';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(GuardService)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({
    summary: 'Mening bildirishnomalarim',
    description: 'Javob: `{ data: Notification[], meta: {page, limit, total, totalPages, unread} }` — `meta.unread` umumiy o\'qilmagan son.',
  })
  getMy(@UserData() user: JwtPayload, @Query() query: NotificationQueryDto) {
    return this.notificationService.getMyNotifications(user.id, query.page, query.limit, query.isRead);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'O\'qilmagan bildirishnomalar soni' })
  unreadCount(@UserData() user: JwtPayload) {
    return this.notificationService.unreadCount(user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Barchasini o\'qilgan deb belgilash' })
  markAllRead(@UserData() user: JwtPayload) {
    return this.notificationService.markAllRead(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Bittasini o\'qilgan deb belgilash' })
  markRead(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
    return this.notificationService.markRead(id, user.id);
  }

  @Post('device-token')
  @ApiOperation({ summary: 'Push uchun qurilma tokenini ro\'yxatdan o\'tkazish (FCM)' })
  registerDevice(@UserData() user: JwtPayload, @Body() dto: RegisterDeviceDto) {
    return this.notificationService.registerDevice(user.id, dto.token, dto.platform);
  }

  @Delete('device-token')
  @ApiOperation({ summary: 'Qurilma tokenini o\'chirish (logout paytida)' })
  unregisterDevice(@UserData() user: JwtPayload, @Body() dto: UnregisterDeviceDto) {
    return this.notificationService.unregisterDevice(user.id, dto.token);
  }
}
