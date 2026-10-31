import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { BoostableEntityType, TopUpStatus, Wallet, WalletTxType } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/common/database/prisma.service';
import { AdjustBalanceDto, TopUpQueryDto, UpdateCurrencySettingsDto } from './dto/wallet.dto';

// Platformaning ichki valyuta (coin) tizimi: ro'yxatdan o'tish bonusi,
// do'stni taklif qilish (referral) bonusi, kunlik tashrif (strike) bonusi,
// haqiqiy pulga top-up (hozircha admin-tasdiqlovchi so'rov — Payme/Click
// keyinroq shu bosqichga ulanadi), va ASOSIY MAQSAD: coin to'lab istalgan
// kontentni (uy-joy, ish e'loni, usta, yangilik, reels) ro'yxat boshida
// ko'rsatish ("boost").
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────── Admin: sozlamalar (singleton) ─────────────────────────
  // ContentLimitConfig'dagi (src/modules/company/company.service.ts) bilan bir xil naqsh.

  async getSettings() {
    const existing = await this.prisma.currencySettings.findUnique({ where: { id: 1 } });
    if (existing) return existing;
    return this.prisma.currencySettings.create({ data: { id: 1 } });
  }

  async updateSettings(dto: UpdateCurrencySettingsDto) {
    return this.prisma.currencySettings.upsert({
      where: { id: 1 },
      update: dto,
      create: { id: 1, ...dto },
    });
  }

  // ───────────────────────── Wallet hayot aylanishi ─────────────────────────

  private async generateReferralCode(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const code = randomBytes(5).toString('hex').toUpperCase().slice(0, 8);
      const taken = await this.prisma.wallet.findUnique({ where: { referralCode: code } });
      if (!taken) return code;
    }
    return `U${Date.now()}`.slice(0, 10); // amalda deyarli hech qachon kerak bo'lmaydigan zaxira yo'l
  }

  // Eski foydalanuvchilarda wallet bo'lmasligi mumkin (masalan bu tizim
  // qo'shilishidan OLDIN ro'yxatdan o'tganlar) — shuning uchun hamma joyda
  // "lazy create": bo'lmasa shu yerda yaratiladi, hech qachon qulamaydi.
  async getOrCreateWallet(userId: number): Promise<Wallet> {
    const existing = await this.prisma.wallet.findUnique({ where: { userId } });
    if (existing) return existing;
    const referralCode = await this.generateReferralCode();
    return this.prisma.wallet.create({ data: { userId, referralCode } });
  }

  // Ro'yxatdan o'tishda chaqiriladi (auth.service.ts) — signupBonus kreditlanadi,
  // agar referralCode berilgan bo'lsa — kodning egasiga referralBonus beriladi.
  // Xato bo'lsa HAM ro'yxatdan o'tishning o'zi buzilmasin deb, chaqiruvchi joyda
  // `.catch(() => null)` bilan chaqiriladi — shuning uchun bu yerda ham ichkarida
  // himoyalanadi.
  async createWalletForNewUser(userId: number, referralCode?: string): Promise<Wallet | null> {
    try {
      const existing = await this.prisma.wallet.findUnique({ where: { userId } });
      if (existing) return existing; // ehtiyot uchun — ikki marta chaqirilsa ham xavfsiz

      const settings = await this.getSettings();
      const code = await this.generateReferralCode();

      let referredByUserId: number | undefined;
      if (referralCode) {
        const referrer = await this.prisma.wallet.findUnique({ where: { referralCode } });
        if (referrer && referrer.userId !== userId) referredByUserId = referrer.userId;
      }

      const wallet = await this.prisma.wallet.create({
        data: { userId, referralCode: code, balance: settings.signupBonus, referredByUserId },
      });

      if (settings.signupBonus > 0) {
        await this.prisma.walletTransaction.create({
          data: {
            userId,
            type: WalletTxType.SIGNUP_BONUS,
            amount: settings.signupBonus,
            balanceAfter: wallet.balance,
            description: "Ro'yxatdan o'tish bonusi",
          },
        });
      }

      if (referredByUserId && settings.referralBonus > 0) {
        await this.credit(
          referredByUserId,
          settings.referralBonus,
          WalletTxType.REFERRAL_BONUS,
          `Do'stni taklif qilish bonusi (yangi foydalanuvchi #${userId})`,
          { relatedUserId: userId },
        );
      }

      return wallet;
    } catch (e) {
      this.logger.warn(`createWalletForNewUser(${userId}) xatosi: ${(e as Error).message}`);
      return null;
    }
  }

  // Balans + ledger birga — hamma kredit/debet shu orqali o'tadi, shu tufayli
  // `balanceAfter` har doim to'g'ri bo'ladi.
  private async credit(
    userId: number,
    amount: number,
    type: WalletTxType,
    description?: string,
    extra?: { relatedUserId?: number; entityType?: BoostableEntityType; entityId?: number },
  ): Promise<Wallet> {
    await this.getOrCreateWallet(userId);
    const updated = await this.prisma.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    });
    await this.prisma.walletTransaction.create({
      data: { userId, type, amount, balanceAfter: updated.balance, description, ...extra },
    });
    return updated;
  }

  // ───────────────────────── Kunlik tashrif (strike) ─────────────────────────

  // LOGIN paytida chaqiriladi (auth.service.ts: loginOtp + loginPassword) —
  // SAYT va MOBIL ikkalasi ham shu ikki endpoint orqali kiradi, shuning uchun
  // bitta joyda ishlatilgan logika ikkalasida ham bir xil ishlaydi.
  async recordDailyVisit(userId: number): Promise<Wallet | null> {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      const now = new Date();
      const today = this.dateOnly(now);
      const last = wallet.lastCheckInAt ? this.dateOnly(wallet.lastCheckInAt) : null;

      if (last && last.getTime() === today.getTime()) return wallet; // bugun allaqachon belgilangan

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isConsecutive = !!last && last.getTime() === yesterday.getTime();
      const newStreak = isConsecutive ? wallet.currentStreak + 1 : 1;

      const settings = await this.getSettings();
      const updated = await this.prisma.wallet.update({
        where: { userId },
        data: {
          lastCheckInAt: now,
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, wallet.longestStreak),
          balance: { increment: settings.dailyCheckInBonus },
        },
      });

      if (settings.dailyCheckInBonus > 0) {
        await this.prisma.walletTransaction.create({
          data: {
            userId,
            type: WalletTxType.DAILY_CHECKIN,
            amount: settings.dailyCheckInBonus,
            balanceAfter: updated.balance,
            description: `Kunlik tashrif bonusi (${newStreak}-kunlik strike)`,
          },
        });
      }
      return updated;
    } catch (e) {
      this.logger.warn(`recordDailyVisit(${userId}) xatosi: ${(e as Error).message}`);
      return null;
    }
  }

  private dateOnly(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // ───────────────────────── Foydalanuvchi uchun ma'lumot ─────────────────────────

  async getMyWallet(userId: number) {
    const [wallet, settings, recentTransactions] = await Promise.all([
      this.getOrCreateWallet(userId),
      this.getSettings(),
      this.prisma.walletTransaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);

    return {
      balance: wallet.balance,
      currencyName: settings.currencyName,
      currentStreak: wallet.currentStreak,
      longestStreak: wallet.longestStreak,
      referralCode: wallet.referralCode,
      lastCheckInAt: wallet.lastCheckInAt,
      recentTransactions,
    };
  }

  async getMyTransactions(userId: number, page = 1, limit = 20) {
    await this.getOrCreateWallet(userId);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.walletTransaction.count({ where: { userId } }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ───────────────────────── Top-up (haqiqiy pulga sotib olish) ─────────────────────────
  // Hozircha to'lov tizimi (Payme/Click) ULANMAGAN — bu oddiy "so'rov yuborish,
  // admin tasdiqlaydi" oqimi. Keyin haqiqiy to'lov integratsiyasi qilinganda,
  // shu `approveTopUp` chaqiruvi avtomatik (to'lov callback'idan) bo'ladi.

  async requestTopUp(userId: number, amount: number, note?: string) {
    if (amount <= 0) throw new BadRequestException("Miqdor musbat bo'lishi kerak");
    await this.getOrCreateWallet(userId);
    return this.prisma.topUpRequest.create({ data: { userId, amount, note } });
  }

  async listTopUpRequests(query: TopUpQueryDto) {
    const { page = 1, limit = 20, id, status, userId, createdFrom, createdTo } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (id !== undefined) where.id = id;
    if (status) where.status = status;
    if (userId !== undefined) where.userId = userId;
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) where.createdAt.gte = new Date(createdFrom);
      if (createdTo) where.createdAt.lte = new Date(createdTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.topUpRequest.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.topUpRequest.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async approveTopUp(id: number, adminUserId: number) {
    const req = await this.prisma.topUpRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException("So'rov topilmadi");
    if (req.status !== TopUpStatus.PENDING) throw new BadRequestException("Bu so'rov allaqachon ko'rib chiqilgan");

    await this.credit(req.userId, req.amount, WalletTxType.TOPUP, `Top-up tasdiqlandi (so'rov #${id})`);
    return this.prisma.topUpRequest.update({
      where: { id },
      data: { status: TopUpStatus.APPROVED, reviewedByUserId: adminUserId, reviewedAt: new Date() },
    });
  }

  async rejectTopUp(id: number, adminUserId: number) {
    const req = await this.prisma.topUpRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException("So'rov topilmadi");
    if (req.status !== TopUpStatus.PENDING) throw new BadRequestException("Bu so'rov allaqachon ko'rib chiqilgan");

    return this.prisma.topUpRequest.update({
      where: { id },
      data: { status: TopUpStatus.REJECTED, reviewedByUserId: adminUserId, reviewedAt: new Date() },
    });
  }

  async adjustBalance(dto: AdjustBalanceDto) {
    if (dto.amount === 0) throw new BadRequestException("Miqdor 0 bo'lmasligi kerak");
    return this.credit(dto.userId, dto.amount, WalletTxType.ADMIN_ADJUSTMENT, dto.description ?? 'Admin tomonidan tuzatish');
  }

  // ───────────────────────── Boost ("eng tepada ko'rsatish") ─────────────────────────

  async getBoostCost(days: number): Promise<number> {
    const settings = await this.getSettings();
    return settings.boostCostPerDay * days;
  }

  async purchaseBoost(
    requesterUserId: number,
    isAdmin: boolean,
    entityType: BoostableEntityType,
    entityId: number,
    days: number,
  ) {
    if (days < 1) throw new BadRequestException("Kun soni kamida 1 bo'lishi kerak");

    const ownerUserId = await this.resolveOwnerUserId(entityType, entityId);
    if (ownerUserId === undefined) throw new NotFoundException('Kontent topilmadi');
    // ownerUserId === null — News/Reels faqat kompaniyaga tegishli (shaxsiy egasi yo'q) — faqat admin boost qila oladi
    if (!isAdmin && (ownerUserId === null || ownerUserId !== requesterUserId)) {
      throw new ForbiddenException("Ruxsat yo'q — faqat o'zingizning e'loningizni boost qila olasiz");
    }

    const cost = isAdmin ? 0 : await this.getBoostCost(days);
    if (!isAdmin) {
      const wallet = await this.getOrCreateWallet(requesterUserId);
      if (wallet.balance < cost) throw new BadRequestException("Balansda mablag' yetarli emas");
    }

    const currentExpiry = await this.getCurrentBoostedUntil(entityType, entityId);
    const base = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();
    const expiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    if (cost > 0) {
      await this.credit(
        requesterUserId,
        -cost,
        WalletTxType.BOOST_PURCHASE,
        `${entityType} #${entityId} — ${days} kunga boost`,
        { entityType, entityId },
      );
    }

    await this.updateBoostedUntil(entityType, entityId, expiresAt);
    await this.prisma.contentBoost.create({
      data: { entityType, entityId, userId: requesterUserId, days, costPaid: cost, expiresAt },
    });

    return { entityType, entityId, days, costPaid: cost, boostedUntil: expiresAt };
  }

  // Har entityType uchun "egasi" userId'ni topadi. RealEstate/Job/Master'da
  // to'g'ridan-to'g'ri userId bor. News/Reel'da esa yo'q — masterId/jobId orqali
  // hal qilinadi; agar faqat companyId bo'lsa (yoki hech biri bo'lmasa) — shaxsiy
  // egasi yo'q (`null`), faqat admin boost qila oladi. Topilmasa `undefined`.
  private async resolveOwnerUserId(entityType: BoostableEntityType, entityId: number): Promise<number | null | undefined> {
    if (entityType === BoostableEntityType.REAL_ESTATE) {
      const e = await this.prisma.realEstate.findUnique({ where: { id: entityId }, select: { userId: true } });
      return e ? e.userId : undefined;
    }
    if (entityType === BoostableEntityType.JOB) {
      const e = await this.prisma.job.findUnique({ where: { id: entityId }, select: { userId: true } });
      return e ? e.userId : undefined;
    }
    if (entityType === BoostableEntityType.MASTER) {
      const e = await this.prisma.master.findUnique({ where: { id: entityId }, select: { userId: true } });
      return e ? e.userId : undefined;
    }
    if (entityType === BoostableEntityType.NEWS) {
      const e = await this.prisma.news.findUnique({
        where: { id: entityId },
        select: { master: { select: { userId: true } }, job: { select: { userId: true } } },
      });
      if (!e) return undefined;
      return e.master?.userId ?? e.job?.userId ?? null;
    }
    // REELS
    const e = await this.prisma.reel.findUnique({
      where: { id: entityId },
      select: { master: { select: { userId: true } }, job: { select: { userId: true } } },
    });
    if (!e) return undefined;
    return e.master?.userId ?? e.job?.userId ?? null;
  }

  private async getCurrentBoostedUntil(entityType: BoostableEntityType, entityId: number): Promise<Date | null> {
    if (entityType === BoostableEntityType.REAL_ESTATE) {
      return (await this.prisma.realEstate.findUnique({ where: { id: entityId }, select: { boostedUntil: true } }))?.boostedUntil ?? null;
    }
    if (entityType === BoostableEntityType.JOB) {
      return (await this.prisma.job.findUnique({ where: { id: entityId }, select: { boostedUntil: true } }))?.boostedUntil ?? null;
    }
    if (entityType === BoostableEntityType.MASTER) {
      return (await this.prisma.master.findUnique({ where: { id: entityId }, select: { boostedUntil: true } }))?.boostedUntil ?? null;
    }
    if (entityType === BoostableEntityType.NEWS) {
      return (await this.prisma.news.findUnique({ where: { id: entityId }, select: { boostedUntil: true } }))?.boostedUntil ?? null;
    }
    return (await this.prisma.reel.findUnique({ where: { id: entityId }, select: { boostedUntil: true } }))?.boostedUntil ?? null;
  }

  private async updateBoostedUntil(entityType: BoostableEntityType, entityId: number, expiresAt: Date): Promise<void> {
    if (entityType === BoostableEntityType.REAL_ESTATE) {
      await this.prisma.realEstate.update({ where: { id: entityId }, data: { boostedUntil: expiresAt } });
    } else if (entityType === BoostableEntityType.JOB) {
      await this.prisma.job.update({ where: { id: entityId }, data: { boostedUntil: expiresAt } });
    } else if (entityType === BoostableEntityType.MASTER) {
      await this.prisma.master.update({ where: { id: entityId }, data: { boostedUntil: expiresAt } });
    } else if (entityType === BoostableEntityType.NEWS) {
      await this.prisma.news.update({ where: { id: entityId }, data: { boostedUntil: expiresAt } });
    } else {
      await this.prisma.reel.update({ where: { id: entityId }, data: { boostedUntil: expiresAt } });
    }
  }

  // Muddati tugagan boost'larni tozalaydi — shunda ro'yxat servislaridagi
  // `orderBy: [{boostedUntil: {sort:'desc', nulls:'last'}}, ...]` doim to'g'ri
  // ishlaydi (muddati o'tgan yozuv "boost qilingan" bo'lib ko'rinmaydi).
  @Interval(5 * 60_000)
  async clearExpiredBoosts() {
    try {
      const now = new Date();
      await Promise.all([
        this.prisma.realEstate.updateMany({ where: { boostedUntil: { lte: now } }, data: { boostedUntil: null } }),
        this.prisma.job.updateMany({ where: { boostedUntil: { lte: now } }, data: { boostedUntil: null } }),
        this.prisma.master.updateMany({ where: { boostedUntil: { lte: now } }, data: { boostedUntil: null } }),
        this.prisma.news.updateMany({ where: { boostedUntil: { lte: now } }, data: { boostedUntil: null } }),
        this.prisma.reel.updateMany({ where: { boostedUntil: { lte: now } }, data: { boostedUntil: null } }),
      ]);
    } catch (e) {
      this.logger.warn(`clearExpiredBoosts xatosi: ${(e as Error).message}`);
    }
  }
}
