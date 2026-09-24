import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

// Bitta postda nechta rasmgacha yuklab olinadi (albomda ortig'i bo'lsa
// tashlab yuboriladi — server/Telegram'ni behuda charchatmaslik uchun).
const MAX_PHOTOS_PER_POST = 10;

// Telegram albomida (bir nechta rasm bitta izoh bilan) barcha rasmlar bitta
// "post" — bitta e'lon sifatida birlashtiriladi (`groupIntoPosts` orqali).
export interface TelegramFetchedPost {
  id: number; // guruhdagi eng kichik message id — externalId uchun
  maxId: number; // guruhdagi eng katta id — lastMessageId'ni yangilash uchun
  text: string;
  date: Date;
  photoRefs: Api.Message[]; // faqat rasm (video EMAS) tashuvchi xabarlar
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

    this.client = new TelegramClient(new StringSession(session), parseInt(apiId, 10), apiHash, {
      connectionRetries: Infinity,
      retryDelay: 2000,
      autoReconnect: true,
    });

    try {
      await this.client.connect();
      this.logger.log('Telegram (userbot) ulandi ✅');
    } catch (e) {
      // MUHIM: `this.client`ni null qilib qo'ymaymiz — vaqtinchalik uzilish
      // bo'lsa ham GramJS orqada avtomatik qayta ulanadi (autoReconnect).
      // Avval shu yerda `this.client = null` qilingani uchun bitta vaqtinchalik
      // tarmoq uzilishida butun import butunlay "o'chib" qolar edi.
      this.logger.warn(`Telegram ulanishda vaqtinchalik xatolik (avtomatik qayta urinadi): ${(e as Error).message}`);
    }
  }

  // Obyekt mavjudligini emas, HOZIRGI ulanish holatini tekshiradi — shuning
  // uchun vaqtinchalik uzilib, keyin o'zi tiklangan aloqa ham to'g'ri aniqlanadi.
  isEnabled(): boolean {
    return !!this.client?.connected;
  }

  // `sinceDate` berilsa — shu sanadan keyingi barcha postlar (backfill).
  // `afterMessageId` berilsa — undan keyingi yangi postlar (davomiy sync).
  async fetchMessages(
    username: string,
    opts: { sinceDate?: Date | null; afterMessageId?: number | null; limit?: number },
  ): Promise<TelegramFetchedPost[]> {
    if (!this.client?.connected) return [];
    const raw: Api.Message[] = [];

    try {
      if (opts.afterMessageId) {
        const iter = this.client.iterMessages(username, {
          minId: opts.afterMessageId,
          reverse: true,
          limit: opts.limit ?? 200,
        });
        for await (const msg of iter) {
          // Matni bo'lmasa ham, rasmi bo'lsa saqlaymiz — albomdagi
          // izohsiz rasmlar shu tufayli tashlanib ketmaydi (groupIntoPosts
          // ularni izohli a'zosi bilan birlashtiradi).
          if (!msg.message && !msg.photo) continue;
          raw.push(msg);
        }
      } else {
        const iter = this.client.iterMessages(username, { limit: opts.limit ?? 500 });
        for await (const msg of iter) {
          const msgDate = new Date(msg.date * 1000);
          if (opts.sinceDate && msgDate < opts.sinceDate) break; // eskilariga yetdik, to'xtatamiz
          if (!msg.message && !msg.photo) continue;
          raw.push(msg);
        }
      }
    } catch (e) {
      this.logger.error(`"${username}" kanalidan o'qishda xatolik`, e as Error);
    }

    return this.groupIntoPosts(raw);
  }

  // Telegram albomida (bir nechta rasm) faqat BITTA a'zoda matn (caption)
  // bo'ladi, qolganlari matnisiz — barchasini `groupedId` bo'yicha bitta
  // "post"ga (bitta e'lon) birlashtiramiz, shunda barcha rasmlar + yagona
  // izoh birga keladi. Albom bo'lmagan (yakka) xabarlar o'zining shaxsiy id'i
  // bilan alohida guruh hisoblanadi.
  private groupIntoPosts(messages: Api.Message[]): TelegramFetchedPost[] {
    const groups = new Map<string, Api.Message[]>();
    for (const msg of messages) {
      const key = msg.groupedId ? `g:${msg.groupedId.toString()}` : `s:${msg.id}`;
      const arr = groups.get(key);
      if (arr) arr.push(msg);
      else groups.set(key, [msg]);
    }

    const posts: TelegramFetchedPost[] = [];
    for (const members of groups.values()) {
      const ids = members.map((m) => m.id);
      const textMember = members.find((m) => !!m.message);
      const photoRefs = members.filter((m) => m.photo && !m.video).slice(0, MAX_PHOTOS_PER_POST);
      const dateSource = textMember ?? members[0];
      posts.push({
        id: Math.min(...ids),
        maxId: Math.max(...ids),
        text: textMember?.message ?? '',
        date: new Date(dateSource.date * 1000),
        photoRefs,
      });
    }

    return posts.sort((a, b) => a.id - b.id);
  }

  // Bitta xabardagi rasmni yuklab, Buffer sifatida qaytaradi (video/hujjatlar
  // yuklanmaydi — chaqiruvchi tomon buni `photoRefs` orqali oldindan filtrlaydi).
  // Xato bo'lsa (Telegram xatosi, o'chirilgan fayl va h.k.) `null` qaytaradi —
  // bitta rasm muvaffaqiyatsiz bo'lishi butun postni import qilishni to'xtatmasin.
  async downloadPhoto(msg: Api.Message): Promise<Buffer | null> {
    if (!this.client?.connected) return null;
    try {
      const result = await this.client.downloadMedia(msg, {});
      return Buffer.isBuffer(result) ? result : null;
    } catch (e) {
      this.logger.warn(`Rasmni Telegram'dan yuklab olishda xato: ${(e as Error).message}`);
      return null;
    }
  }
}
