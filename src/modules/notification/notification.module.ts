import { Global, Module } from '@nestjs/common';
import { AdminNotificationController } from './admin-notification.controller';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';

// Global qilingan — real-estate/job/master servislari bo'sh qidiruvni saqlash va
// yangi e'lon/usta yaratilganda moslik qidirish uchun NotificationService'ni
// alohida import qilmasdan ham ishlata olishi uchun (chat/dashboard'dagi kabi emas,
// guard/redis modullaridagi @Global() patterniga mos).
@Global()
@Module({
  controllers: [NotificationController, AdminNotificationController],
  providers: [NotificationService, NotificationGateway],
  exports: [NotificationService],
})
export class NotificationModule {}
