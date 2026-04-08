import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DevicePlatform, Prisma } from '@prisma/client';
import { FirebaseService } from 'src/common/services/firebase.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { PrismaService } from 'src/common/database/prisma.service';
import { AuthUser } from 'src/common/types/auth-user.type';
import { RegisterDeviceDto } from './dto/device.dto';
import { SendNotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseService: FirebaseService,
  ) {}

  private async ensureUserExists(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }
  }

  private async findOwnedDeviceOrThrow(userId: number, deviceId: number) {
    const device = await this.prisma.userDevice.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Qurilma topilmadi');
    }

    if (device.userId !== userId) {
      throw new ForbiddenException('Bu qurilma sizga tegishli emas');
    }

    return device;
  }

  private async removeInvalidTokensForUser(userId: number, invalidTokens: string[]) {
    if (!invalidTokens.length) {
      return;
    }

    await this.prisma.userDevice.deleteMany({
      where: {
        userId,
        fcmToken: {
          in: invalidTokens,
        },
      },
    });
  }

  async registerDeviceForUser(userId: number, dto?: Partial<RegisterDeviceDto>) {
    if (!dto?.deviceId || !dto?.fcmToken) {
      return null;
    }

    await this.ensureUserExists(userId);

    return this.prisma.userDevice.upsert({
      where: {
        userId_deviceId: {
          userId,
          deviceId: dto.deviceId.trim(),
        },
      },
      update: {
        fcmToken: dto.fcmToken.trim(),
        deviceName: dto.deviceName?.trim(),
        platform: dto.platform ?? DevicePlatform.UNKNOWN,
        isActive: true,
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        deviceId: dto.deviceId.trim(),
        fcmToken: dto.fcmToken.trim(),
        deviceName: dto.deviceName?.trim(),
        platform: dto.platform ?? DevicePlatform.UNKNOWN,
        isActive: true,
      },
    });
  }

  async getMyDevices(user: AuthUser) {
    return this.prisma.userDevice.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getUserDevices(userId: number) {
    await this.ensureUserExists(userId);
    return this.prisma.userDevice.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async registerMyDevice(user: AuthUser, dto: RegisterDeviceDto) {
    const device = await this.registerDeviceForUser(user.id, dto);

    return {
      message: 'Qurilma saqlandi',
      firebaseConfigured: this.firebaseService.isConfigured(),
      device,
    };
  }

  async removeMyDevice(user: AuthUser, deviceId: number) {
    await this.findOwnedDeviceOrThrow(user.id, deviceId);
    await this.prisma.userDevice.delete({ where: { id: deviceId } });

    return { message: 'Qurilma o‘chirildi' };
  }

  async sendToUser(userId: number, dto: SendNotificationDto) {
    await this.ensureUserExists(userId);

    const devices = await this.prisma.userDevice.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const tokens = devices.map((device) => device.fcmToken);
    const result = await this.firebaseService.sendPushNotification({
      tokens,
      title: dto.title,
      body: dto.body,
      data: dto.data,
    });

    await this.removeInvalidTokensForUser(userId, result.invalidTokens);

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title: dto.title,
        body: dto.body,
        data: dto.data as Prisma.InputJsonValue | undefined,
        deliveredCount: result.successCount,
        failedCount: result.failureCount,
      },
    });

    return {
      message: 'Notification yuborildi',
      notification,
      successCount: result.successCount,
      failureCount: result.failureCount,
      invalidTokens: result.invalidTokens,
      devicesCount: devices.length,
    };
  }

  async sendTestToMe(user: AuthUser, dto: SendNotificationDto) {
    return this.sendToUser(user.id, dto);
  }

  async getMyNotifications(user: AuthUser, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId: user.id },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyNotificationById(user: AuthUser, id: number) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification topilmadi');
    }

    return notification;
  }

  async markAsRead(user: AuthUser, id: number) {
    await this.getMyNotificationById(user, id);

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(user: AuthUser) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      message: 'Barcha notification o‘qilgan deb belgilandi',
      updatedCount: result.count,
    };
  }

  async deleteMyNotification(user: AuthUser, id: number) {
    await this.getMyNotificationById(user, id);
    await this.prisma.notification.delete({ where: { id } });

    return { message: 'Notification o‘chirildi' };
  }
}
