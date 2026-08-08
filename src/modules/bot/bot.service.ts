import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RedisService } from 'src/common/config/redis/redis.service';
import { Markup, Telegraf } from 'telegraf';
import {
  contactButtonText,
  detectLang,
  foreignContactWarning,
  otpMessage,
  TELEGRAM_OTP_TTL,
  telegramOtpKey,
  welcomeText,
} from './bot.constants';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  public bot: Telegraf;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    const token = this.config.get<string>('BOT_TOKEN');
    if (!token) {
      throw new Error('BOT_TOKEN .env faylida topilmadi');
    }
    this.bot = new Telegraf(token);
    this.registerHandlers();
  }

  private normalizePhone(phone: string): string {
    let p = phone.replace(/\s+/g, '').trim();
    if (!p.startsWith('+')) p = '+' + p;
    return p;
  }

  // Kolliziyasiz (band bo'lmagan) kod generatsiya qilish
  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const code = crypto.randomInt(100000, 999999).toString();
      const exists = await this.redis.get(telegramOtpKey(code));
      if (!exists) return code;
    }
    // Juda kam ehtimol, lekin ehtiyot uchun: 5 urinishdan keyin ham topilmasa
    throw new Error("OTP kod generatsiya qilib bo'lmadi, qayta urinib ko'ring");
  }

  private registerHandlers() {
    this.bot.start((ctx) => {
      const lang = detectLang(ctx.from?.language_code);
      const name = ctx.from?.first_name ?? '';

      ctx.reply(
        welcomeText(lang, name),
        {
          parse_mode: 'HTML',
          ...Markup.keyboard([Markup.button.contactRequest(contactButtonText(lang))])
            .resize()
            .oneTime(),
        },
      );
    });

    this.bot.on('contact', async (ctx) => {
      const lang = detectLang(ctx.from?.language_code);
      const contact = ctx.message.contact;

      if (contact.user_id !== ctx.from.id) {
        ctx.reply(foreignContactWarning(lang), { parse_mode: 'HTML' });
        return;
      }

      const phone = this.normalizePhone(contact.phone_number);
      const code = await this.generateUniqueCode();

      await this.redis.set(
        telegramOtpKey(code),
        JSON.stringify({ phone, telegramId: ctx.from.id }),
        TELEGRAM_OTP_TTL,
      );

      ctx.reply(otpMessage(lang, code), {
        parse_mode: 'HTML',
        ...Markup.removeKeyboard(),
      });
      this.logger.log(`OTP yuborildi: ${phone} (code: ${code})`);
    });
  }

  async onModuleInit() {
    const webhookUrl = this.config.get<string>('BOT_WEBHOOK_URL');
    const webhookPath = this.config.get<string>('BOT_WEBHOOK_PATH') ?? '/bot/webhook';

    if (!webhookUrl) {
      this.logger.warn('BOT_WEBHOOK_URL topilmadi — bot ishga tushmadi');
      return;
    }

    this.bot.telegram
      .setWebhook(`${webhookUrl}${webhookPath}`)
      .then(() => this.logger.log(`Telegram webhook o'rnatildi ✅ (${webhookUrl}${webhookPath})`))
      .catch((err) => this.logger.error("❌ Webhook o'rnatilmadi: " + err.message));
  }

  onModuleDestroy() {
    // Webhook rejimida to'xtatish shart emas
  }

  async handleUpdate(update: any) {
    await this.bot.handleUpdate(update);
  }
}
