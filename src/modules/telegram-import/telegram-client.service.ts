import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

export interface TelegramFetchedMessage {
  id: number;
  text: string;
  date: Date;
}

// GramJS (MTProto "userbot") ustidan yupqa qatlam — Bot API'dan farqli, bu oddiy
// Telegram hisobi kabi ishlaydi, shuning uchun ochiq kanalga admin bo'lmasdan ham
// obuna bo'lib, barcha (jumladan eski) postlarni o'qiy oladi.
//
// TELEGRAM_API_ID/TELEGRAM_API_HASH/TELEGRAM_SESSION sozlanmagan bo'lsa xizmat
// o'chiq holatda ishlaydi (ilova qulamaydi) — sozlash uchun scripts/telegram-login.ts
// ga qarang.
@Injectable()
export class TelegramClientService implements OnModuleInit {
  private readonly logger = new Logger(TelegramClientService.name);
  private client: TelegramClient | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const apiId = this.config.get<string>('TELEGRAM_API_ID');
    const apiHash = this.config.get<string>('TELEGRAM_API_HASH');
    const session = this.config.get<string>('TELEGRAM_SESSION');

    if (!apiId || !apiHash || !session) {
      this.logger.warn(
        "TELEGRAM_API_ID/TELEGRAM_API_HASH/TELEGRAM_SESSION topilmadi — Telegram import o'chirilgan. " +
          'Sozlash uchun: scripts/telegram-login.ts',
      );
      return;
    }

    try {
      this.client = new TelegramClient(new StringSession(session), parseInt(apiId, 10), apiHash, {
        connectionRetries: 5,
      });
      await this.client.connect();
      this.logger.log('Telegram (userbot) ulandi ✅');
    } catch (e) {
      this.logger.error('Telegram ulanishda xatolik', e as Error);
      this.client = null;
    }
  }

  isEnabled(): boolean {
    return !!this.client;
  }

  // `sinceDate` berilsa — shu sanadan keyingi barcha postlar (backfill).
  // `afterMessageId` berilsa — undan keyingi yangi postlar (davomiy sync).
  async fetchMessages(
    username: string,
    opts: { sinceDate?: Date | null; afterMessageId?: number | null; limit?: number },
  ): Promise<TelegramFetchedMessage[]> {
    if (!this.client) return [];
    const result: TelegramFetchedMessage[] = [];

    try {
      if (opts.afterMessageId) {
        const iter = this.client.iterMessages(username, {
          minId: opts.afterMessageId,
          reverse: true,
          limit: opts.limit ?? 200,
        });
        for await (const msg of iter) {
          if (!msg.message) continue;
          result.push({ id: msg.id, text: msg.message, date: new Date(msg.date * 1000) });
        }
      } else {
        const iter = this.client.iterMessages(username, { limit: opts.limit ?? 500 });
        for await (const msg of iter) {
          const msgDate = new Date(msg.date * 1000);
          if (opts.sinceDate && msgDate < opts.sinceDate) break; // eskilariga yetdik, to'xtatamiz
          if (!msg.message) continue;
          result.push({ id: msg.id, text: msg.message, date: msgDate });
        }
      }
    } catch (e) {
      this.logger.error(`"${username}" kanalidan o'qishda xatolik`, e as Error);
    }

    return result;
  }
}
