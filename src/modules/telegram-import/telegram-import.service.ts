import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DealType, PropertyType, RealEstateStatus, SellerType, TelegramImportChannel, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from 'src/common/database/prisma.service';
import { AddChannelDto, UpdateChannelDto } from './dto/telegram-import.dto';
import { GeocodingService } from './geocoding.service';
import { TelegramClientService } from './telegram-client.service';
import { TelegramParserService } from './telegram-parser.service';

// Import qilingan e'lonlar shu "tizim" foydalanuvchisiga bog'lanadi (asl muallif
// noma'lum/tekshirilmagan) — admin PENDING_REVIEW'da ko'rib, kerak bo'lsa keyin
// haqiqiy egasiga o'tkazishi mumkin.
const IMPORT_SYSTEM_USER_PHONE = '+998000000000';

@Injectable()
export class TelegramImportService {
  private readonly logger = new Logger(TelegramImportService.name);
  private importUserId: number | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramClient: TelegramClientService,
    private readonly parser: TelegramParserService,
    private readonly geocoding: GeocodingService,
  ) {}

  // ───────────────────────── Kanallarni boshqarish ─────────────────────────

  async listChannels(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.telegramImportChannel.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.telegramImportChannel.count(),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  addChannel(dto: AddChannelDto) {
    const username = dto.username.replace(/^@/, '').trim();
    return this.prisma.telegramImportChannel.create({
      data: { username, sinceDate: dto.sinceDate ? new Date(dto.sinceDate) : undefined },
    });
  }

  async updateChannel(id: number, dto: UpdateChannelDto) {
    await this.getChannelOrThrow(id);
    return this.prisma.telegramImportChannel.update({
      where: { id },
      data: { isActive: dto.isActive, sinceDate: dto.sinceDate ? new Date(dto.sinceDate) : undefined },
    });
  }

  async deleteChannel(id: number) {
    await this.getChannelOrThrow(id);
    await this.prisma.telegramImportChannel.delete({ where: { id } });
    return { message: "Kanal kuzatishdan olib tashlandi" };
  }

  private async getChannelOrThrow(id: number) {
    const channel = await this.prisma.telegramImportChannel.findUnique({ where: { id } });
    if (!channel) throw new NotFoundException('Kanal topilmadi');
    return channel;
  }

  // ───────────────────────── Import jarayoni ─────────────────────────

  async runBackfill(id: number) {
    const channel = await this.getChannelOrThrow(id);
    return this.importFromChannel(channel, true);
  }

  // Har 10 daqiqada faol kanallarni tekshiradi (davomiy sync)
  @Interval(10 * 60_000)
  async syncActiveChannels() {
    if (!this.telegramClient.isEnabled()) return;

    const channels = await this.prisma.telegramImportChannel.findMany({ where: { isActive: true } });
    for (const channel of channels) {
      await this.importFromChannel(channel, false).catch((e) =>
        this.logger.error(`"${channel.username}" sync xatosi`, e as Error),
      );
    }
  }

  private async importFromChannel(channel: TelegramImportChannel, isBackfill: boolean) {
    if (!this.telegramClient.isEnabled()) {
      this.logger.warn("Telegram ulanmagan — import bajarilmadi. scripts/telegram-login.ts orqali sozlang.");
      return { imported: 0, skipped: 0 };
    }

    const messages = isBackfill
      ? await this.telegramClient.fetchMessages(channel.username, { sinceDate: channel.sinceDate })
      : await this.telegramClient.fetchMessages(channel.username, { afterMessageId: channel.lastMessageId });

    const fallbackLocation = await this.prisma.location.findFirst({ where: { type: 'CITY' } });
    if (!fallbackLocation) {
      this.logger.error("Bazada birorta ham shahar (Location) topilmadi — import to'xtatildi");
      return { imported: 0, skipped: messages.length };
    }
    const systemUserId = await this.getOrCreateImportUser();

    let imported = 0;
    let skipped = 0;
    let maxMessageId = channel.lastMessageId ?? 0;

    for (const msg of messages) {
      maxMessageId = Math.max(maxMessageId, msg.id);
      const externalId = `telegram:${channel.username}:${msg.id}`;

      const exists = await this.prisma.realEstate.findUnique({ where: { externalId } });
      if (exists) continue;

      const parsed = this.parser.parse(msg.text);

      // Narx VA telefon ikkalasi ham topilmasa — bu haqiqiy e'lon emas
      // (kanal qoidasi, reklama va h.k.) deb hisoblab o'tkazib yuboramiz
      if (parsed.price === null && parsed.contactPhone === null) {
        skipped++;
        continue;
      }

      let coords: { latitude: number; longitude: number } | null = null;
      if (parsed.addressCandidate) {
        coords = await this.geocoding.geocode(`${parsed.addressCandidate}, O'zbekiston`);
      }

      try {
        await this.prisma.realEstate.create({
          data: {
            title: parsed.title,
            description: msg.text,
            price: parsed.price ?? 0,
            propertyType: parsed.propertyType ?? PropertyType.APARTMENT,
            dealType: parsed.dealType ?? DealType.SALE,
            sellerType: SellerType.INDIVIDUAL,
            userId: systemUserId,
            locationId: fallbackLocation.id,
            contactPhone: parsed.contactPhone ?? IMPORT_SYSTEM_USER_PHONE,
            areaSize: parsed.areaSize ?? 0,
            roomCount: parsed.roomCount ?? 1,
            address: parsed.addressCandidate,
            latitude: coords?.latitude,
            longitude: coords?.longitude,
            status: RealEstateStatus.PENDING_REVIEW,
            externalId,
            apiUrl: `https://t.me/${channel.username}/${msg.id}`,
            syncStatus: {
              rawText: msg.text,
              parsedFields: {
                price: parsed.price,
                roomCount: parsed.roomCount,
                areaSize: parsed.areaSize,
                dealType: parsed.dealType,
                propertyType: parsed.propertyType,
              },
              missingFields: parsed.missingFields,
              channel: channel.username,
              importedAt: new Date().toISOString(),
            },
          },
        });
        imported++;
      } catch (e) {
        this.logger.warn(`Import xatosi (${externalId}): ${(e as Error).message}`);
        skipped++;
      }
    }

    await this.prisma.telegramImportChannel.update({ where: { id: channel.id }, data: { lastMessageId: maxMessageId } });
    this.logger.log(`"${channel.username}": ${imported} ta yangi e'lon import qilindi, ${skipped} ta o'tkazib yuborildi`);
    return { imported, skipped };
  }

  private async getOrCreateImportUser(): Promise<number> {
    if (this.importUserId) return this.importUserId;

    let user = await this.prisma.user.findUnique({ where: { phone: IMPORT_SYSTEM_USER_PHONE } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: IMPORT_SYSTEM_USER_PHONE,
          firstName: 'Telegram',
          lastName: 'Import',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
        },
      });
    }
    this.importUserId = user.id;
    return user.id;
  }
}
