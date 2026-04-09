import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UserData } from 'src/common/decorators/auth.decorators';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { RegisterDeviceDto } from './dto/device.dto';
import { SendNotificationDto } from './dto/notification.dto';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(GuardService)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('devices')
  @ApiOperation({ summary: 'Current user device/Firebase token saqlash' })
  registerMyDevice(
    @UserData() user: JwtPayload,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.notificationService.registerMyDevice(user, dto);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Current user qurilmalari' })
  getMyDevices(@UserData() user: JwtPayload) {
    return this.notificationService.getMyDevices(user);
  }

  @Delete('devices/:id')
  @ApiOperation({ summary: 'Current user qurilmasini o‘chirish' })
  removeMyDevice(
    @UserData() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationService.removeMyDevice(user, id);
  }

  @Post('test')
  @ApiOperation({ summary: 'Current user barcha device lariga test notification yuborish' })
  sendTestToMe(@UserData() user: JwtPayload, @Body() dto: SendNotificationDto) {
    return this.notificationService.sendTestToMe(user, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Current user notificationlari' })
  getMyNotifications(
    @UserData() user: JwtPayload,
    @Query() pagination: PaginationDto,
  ) {
    return this.notificationService.getMyNotifications(user, pagination);
  }

  @Get('me/:id')
  @ApiOperation({ summary: 'Current user bitta notificationi' })
  getMyNotificationById(
    @UserData() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationService.getMyNotificationById(user, id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Bitta notificationni o‘qilgan qilish' })
  markAsRead(
    @UserData() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationService.markAsRead(user, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Barcha notificationlarni o‘qilgan qilish' })
  markAllAsRead(@UserData() user: JwtPayload) {
    return this.notificationService.markAllAsRead(user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Bitta notificationni o‘chirish' })
  deleteMyNotification(
    @UserData() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationService.deleteMyNotification(user, id);
  }

  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post('users/:userId')
  @ApiOperation({ summary: 'Admin tomonidan userning barcha device lariga notification yuborish' })
  sendToUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: SendNotificationDto,
  ) {
    return this.notificationService.sendToUser(userId, dto);
  }

  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('users/:userId/devices')
  @ApiOperation({ summary: 'Admin uchun user qurilmalarini ko‘rish' })
  getUserDevices(@Param('userId', ParseIntPipe) userId: number) {
    return this.notificationService.getUserDevices(userId);
  }
}
