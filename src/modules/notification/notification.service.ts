import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DevicePlatform, LocationType, NotificationCategory, NotificationStatus, SearchType } from '@prisma/client';
import { FirebaseService } from 'src/common/config/firebase/firebase.service';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateBroadcastDto, SearchSubscriptionQueryDto, UpdateTemplateDto } from './dto/notification.dto';
import { NotificationGateway } from './notification.gateway';

// Yangi e'lon/usta moslik hisoblanganda kamida shuncha ulush (30%) mos kelishi kerak
const MATCH_THRESHOLD = 0.3;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
    private readonly firebase: FirebaseService,
  ) {}

  // ───────────────────────── Foydalanuvchi bildirishnomalari ─────────────────────────

  async getMyNotifications(userId: number, page = 1, limit = 20, isRead?: boolean) {
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (isRead !== undefined) where.isRead = isRead;

    const [data, total, unread] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit), unread } };
  }

  async unreadCount(userId: number) {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }

  async markRead(id: number, userId: number) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) throw new NotFoundException('Bildirishnoma topilmadi');
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: number) {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { message: 'Barcha bildirishnomalar o\'qilgan deb belgilandi' };
  }

  async registerDevice(userId: number, token: string, platform: DevicePlatform = DevicePlatform.ANDROID) {
    return this.prisma.userDevice.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    });
  }

  async unregisterDevice(userId: number, token: string) {
    await this.prisma.userDevice.deleteMany({ where: { userId, token } });
    return { message: 'Qurilma o\'chirildi' };
  }

  // ───────────────────────── Bo'sh qidiruvlarni saqlash ─────────────────────────

  async recordEmptySearch(type: SearchType, criteria: Record<string, any>, locationId?: number | null, userId?: number | null) {
    try {
      const cleanCriteria = Object.fromEntries(Object.entries(criteria).filter(([, v]) => v !== undefined && v !== null && v !== ''));
      if (Object.keys(cleanCriteria).length === 0) return; // hech qanday filtr berilmagan bo'lsa saqlashning ma'nosi yo'q

      await this.prisma.searchSubscription.create({
        data: { type, criteria: cleanCriteria, locationId: locationId ?? undefined, userId: userId ?? undefined },
      });
    } catch (e) {
      this.logger.warn(`recordEmptySearch xatosi: ${(e as Error).message}`);
    }
  }

  // ───────────────────────── Admin: search-subscription ro'yxati ─────────────────────────

  async listSearchSubscriptions(query: SearchSubscriptionQueryDto) {
    const { page = 1, limit = 20, id, type, locationId, userId, isActive, notified, createdFrom, createdTo } = query;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (id !== undefined) where.id = id;
    if (type) where.type = type;
    if (locationId !== undefined) where.locationId = locationId;
    if (userId !== undefined) where.userId = userId;
    if (isActive !== undefined) where.isActive = isActive;
    if (notified !== undefined) where.notifiedAt = notified ? { not: null } : null;
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) where.createdAt.gte = new Date(createdFrom);
      if (createdTo) where.createdAt.lte = new Date(createdTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.searchSubscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      }),
      this.prisma.searchSubscription.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ───────────────────────── Admin: shablonlar (NotificationTemplate) ─────────────────────────

  async listTemplates(params: { page?: number; limit?: number; id?: number; search?: string } = {}) {
    const { page = 1, limit = 50, id, search } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (id !== undefined) where.id = id;
    if (search) where.OR = [
      { key: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
    ];

    const [data, total] = await Promise.all([
      this.prisma.notificationTemplate.findMany({ where, skip, take: limit, orderBy: { key: 'asc' } }),
      this.prisma.notificationTemplate.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateTemplate(key: string, dto: UpdateTemplateDto) {
    const existing = await this.prisma.notificationTemplate.findUnique({ where: { key } });
    if (!existing) throw new NotFoundException('Shablon topilmadi');
    return this.prisma.notificationTemplate.update({ where: { key }, data: dto });
  }

  // ───────────────────────── Admin: broadcast (filtrli ommaviy xabar) ─────────────────────────

  async createBroadcast(adminId: number, dto: CreateBroadcastDto) {
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    const broadcast = await this.prisma.adminBroadcast.create({
      data: {
        title: dto.title,
        body: dto.body,
        filters: { ...(dto.filters ?? {}) },
        scheduledAt: scheduledAt ?? undefined,
        createdByAdminId: adminId,
      },
    });

    if (!scheduledAt || scheduledAt <= new Date()) {
      await this.dispatchBroadcast(broadcast.id);
    }

    return this.prisma.adminBroadcast.findUnique({ where: { id: broadcast.id } });
  }

  listBroadcasts(status?: NotificationStatus, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status } : {};
    return Promise.all([
      this.prisma.adminBroadcast.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.adminBroadcast.count({ where }),
    ]).then(([data, total]) => ({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }));
  }

  private async dispatchBroadcast(broadcastId: number) {
    const broadcast = await this.prisma.adminBroadcast.findUnique({ where: { id: broadcastId } });
    if (!broadcast || broadcast.status !== NotificationStatus.PENDING) return;

    const targetUserIds = await this.resolveBroadcastAudience(broadcast.filters as any);

    const notifications = await Promise.all(
      targetUserIds.map((userId) =>
        this.prisma.notification.create({
          data: {
            userId,
            title: broadcast.title,
            body: broadcast.body,
            category: NotificationCategory.ADMIN_BROADCAST,
            broadcastId: broadcast.id,
          },
        }),
      ),
    );

    await Promise.all(notifications.map((n) => this.dispatch(n)));

    await this.prisma.adminBroadcast.update({
      where: { id: broadcastId },
      data: { status: NotificationStatus.SENT, targetCount: targetUserIds.length, sentAt: new Date() },
    });
  }

  // filters bo'sh bo'lsa — hamma foydalanuvchi; aks holda SearchSubscription orqali (hudud-moslikni hisobga olib) auditoriya topiladi
  private async resolveBroadcastAudience(filters: { searchType?: SearchType; locationId?: number }): Promise<number[]> {
    if (!filters || (!filters.searchType && !filters.locationId)) {
      const users = await this.prisma.user.findMany({ select: { id: true } });
      return users.map((u) => u.id);
    }

    const where: any = { userId: { not: null } };
    if (filters.searchType) where.type = filters.searchType;

    const subs = await this.prisma.searchSubscription.findMany({ where, select: { userId: true, locationId: true } });
    const cache = new Map<number, number | null>();
    const matched = new Set<number>();

    for (const sub of subs) {
      if (!sub.userId) continue;
      if (!filters.locationId) {
        matched.add(sub.userId);
        continue;
      }
      if (await this.isLocationMatch(filters.locationId, sub.locationId, cache)) matched.add(sub.userId);
    }

    return Array.from(matched);
  }

  // ───────────────────────── Moslik (matching) dvigateli ─────────────────────────

  async matchAndNotify(type: SearchType, entity: any) {
    try {
      const candidates = await this.prisma.searchSubscription.findMany({
        where: { type, isActive: true, notifiedAt: null },
      });
      if (candidates.length === 0) return;

      const locationCache = new Map<number, number | null>();
      const template = await this.prisma.notificationTemplate.findUnique({ where: { key: this.templateKeyFor(type) } });

      for (const sub of candidates) {
        if (!sub.userId) continue; // egasi bo'lmagan (anonim) qidiruvlarga xabar yuborib bo'lmaydi

        const score = await this.calculateMatchScore(type, sub.criteria as Record<string, any>, entity, locationCache);
        if (score < MATCH_THRESHOLD) continue;

        const { title, body } = this.renderNotificationText(type, template, entity);
        const notification = await this.prisma.notification.create({
          data: {
            userId: sub.userId,
            title,
            body,
            category: NotificationCategory.SEARCH_MATCH,
            data: { entityType: type, entityId: entity.id },
          },
        });

        await this.dispatch(notification);
        await this.prisma.searchSubscription.update({
          where: { id: sub.id },
          data: { notifiedAt: new Date(), isActive: false },
        });
      }
    } catch (e) {
      this.logger.error(`matchAndNotify(${type}) xatosi`, e as Error);
    }
  }

  private templateKeyFor(type: SearchType) {
    return { REAL_ESTATE: 'search_match_real_estate', JOB: 'search_match_job', MASTER: 'search_match_master' }[type];
  }

  private renderNotificationText(type: SearchType, template: { title: string; body: string } | null, entity: any) {
    const vars: Record<string, string> = {};
    if (type === SearchType.REAL_ESTATE) {
      vars.location = entity.location?.name ?? '';
      vars.title = entity.title ?? '';
      vars.price = entity.price?.toString?.() ?? '';
    } else if (type === SearchType.JOB) {
      vars.location = entity.location?.name ?? '';
      vars.title = entity.title ?? '';
    } else if (type === SearchType.MASTER) {
      vars.skillType = entity.skills?.[0]?.skill?.type?.name ?? entity.skillTypeName ?? '';
      vars.title = [entity.user?.firstName, entity.user?.lastName].filter(Boolean).join(' ') || 'Usta';
    }

    const fallback = { title: 'Yangi moslik topildi!', body: 'Siz qidirgan narsaga mos yangi e\'lon paydo bo\'ldi.' };
    const source = template && template.title && template.body ? template : fallback;
    const render = (text: string) => text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
    return { title: render(source.title), body: render(source.body) };
  }

  private async calculateMatchScore(
    type: SearchType,
    criteria: Record<string, any>,
    entity: any,
    locationCache: Map<number, number | null>,
  ): Promise<number> {
    const fields: { considered: boolean; matched: boolean }[] = [];
    const check = (considered: boolean, matched: boolean) => fields.push({ considered, matched });

    if (criteria.locationId) {
      const isMatch = await this.isLocationMatch(criteria.locationId, entity.locationId, locationCache);
      check(true, isMatch);
    }

    if (type === SearchType.REAL_ESTATE) {
      if (criteria.propertyType) check(true, criteria.propertyType === entity.propertyType);
      if (criteria.dealType) check(true, criteria.dealType === entity.dealType);
      if (criteria.sellerType) check(true, criteria.sellerType === entity.sellerType);
      if (criteria.roomCount) check(true, Number(criteria.roomCount) === entity.roomCount);
      if (criteria.minPrice !== undefined || criteria.maxPrice !== undefined) {
        const price = Number(entity.price);
        const min = criteria.minPrice !== undefined ? Number(criteria.minPrice) : -Infinity;
        const max = criteria.maxPrice !== undefined ? Number(criteria.maxPrice) : Infinity;
        check(true, price >= min && price <= max);
      }
      if (criteria.search) check(true, this.textMatches(criteria.search, entity.title, entity.description));
    } else if (type === SearchType.JOB) {
      if (criteria.skillTypeId) check(true, Number(criteria.skillTypeId) === (entity.skillTypeId ?? entity.skillType?.id));
      if (criteria.search) check(true, this.textMatches(criteria.search, entity.title, entity.description));
    } else if (type === SearchType.MASTER) {
      if (criteria.skillTypeId) {
        const skillTypeIds: number[] = (entity.skills ?? []).map((s: any) => s.skill?.typeId ?? s.skill?.type?.id).filter(Boolean);
        check(true, skillTypeIds.includes(Number(criteria.skillTypeId)));
      }
      if (criteria.isFree !== undefined) check(true, criteria.isFree === entity.isFree);
      if (criteria.search) check(true, this.textMatches(criteria.search, entity.bio, `${entity.user?.firstName ?? ''} ${entity.user?.lastName ?? ''}`));
    }

    const considered = fields.filter((f) => f.considered);
    if (considered.length === 0) return 0;
    const matched = considered.filter((f) => f.matched).length;
    return matched / considered.length;
  }

  private textMatches(search: string, ...texts: (string | null | undefined)[]) {
    const needle = search.trim().toLowerCase();
    if (!needle) return false;
    return texts.some((t) => t && t.toLowerCase().includes(needle));
  }

  // Ikkita joylashuv "bir xil hudud" hisoblanadimi — aynan bir xil bo'lsa yoki bir xil
  // REGION (yoki COUNTRY, agar REGION bo'lmasa) ostida bo'lsa mos deb hisoblanadi.
  private async isLocationMatch(a?: number | null, b?: number | null, cache?: Map<number, number | null>): Promise<boolean> {
    if (!a || !b) return false;
    if (a === b) return true;
    const [regionA, regionB] = await Promise.all([this.getRegionId(a, cache), this.getRegionId(b, cache)]);
    return !!regionA && regionA === regionB;
  }

  private async getRegionId(locationId: number, cache?: Map<number, number | null>): Promise<number | null> {
    if (cache?.has(locationId)) return cache.get(locationId)!;

    let current = await this.prisma.location.findUnique({ where: { id: locationId } });
    let depth = 0;
    while (current && current.type !== LocationType.REGION && current.parentId && depth < 5) {
      current = await this.prisma.location.findUnique({ where: { id: current.parentId } });
      depth++;
    }
    const result = current?.id ?? null;
    cache?.set(locationId, result);
    return result;
  }

  // ───────────────────────── Yuborish (dispatch) ─────────────────────────

  async dispatch(notification: { id: number; userId: number; title: string; body: string; data?: any }) {
    try {
      this.gateway.emitToUser(notification.userId, notification);
      await this.sendPush(notification);

      await this.prisma.notification.update({ where: { id: notification.id }, data: { status: NotificationStatus.SENT } });
    } catch (e) {
      this.logger.error(`Notification #${notification.id} yuborishda xatolik`, e as Error);
      await this.prisma.notification.update({ where: { id: notification.id }, data: { status: NotificationStatus.FAILED } }).catch(() => null);
    }
  }

  // Foydalanuvchining barcha qurilmalariga FCM push yuboradi, yaroqsiz tokenlarni bazadan tozalaydi
  private async sendPush(notification: { userId: number; title: string; body: string; data?: any }) {
    if (!this.firebase.isEnabled()) return;

    const devices = await this.prisma.userDevice.findMany({ where: { userId: notification.userId } });
    if (devices.length === 0) return;

    const dataStrings = notification.data
      ? Object.fromEntries(Object.entries(notification.data).map(([k, v]) => [k, String(v)]))
      : undefined;

    const response = await this.firebase.sendToTokens({
      tokens: devices.map((d) => d.token),
      title: notification.title,
      body: notification.body,
      data: dataStrings,
    });

    const invalidTokens: string[] = [];
    response.responses.forEach((r: any, i: number) => {
      if (!r.success) {
        const code = r.error?.code;
        if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(devices[i].token);
        } else {
          this.logger.warn(`FCM yuborish xatosi (${devices[i].token}): ${r.error?.message}`);
        }
      }
    });

    if (invalidTokens.length) {
      await this.prisma.userDevice.deleteMany({ where: { token: { in: invalidTokens } } }).catch(() => null);
    }
  }

  // Rejalashtirilgan (scheduledAt kelajakda bo'lgan) notification/broadcast'larni har daqiqada tekshiradi
  @Interval(60_000)
  async processScheduled() {
    const now = new Date();

    const dueNotifications = await this.prisma.notification.findMany({
      where: { status: NotificationStatus.PENDING, scheduledAt: { lte: now } },
    });
    for (const n of dueNotifications) await this.dispatch(n);

    const dueBroadcasts = await this.prisma.adminBroadcast.findMany({
      where: { status: NotificationStatus.PENDING, scheduledAt: { lte: now } },
    });
    for (const b of dueBroadcasts) await this.dispatchBroadcast(b.id);
  }
}
