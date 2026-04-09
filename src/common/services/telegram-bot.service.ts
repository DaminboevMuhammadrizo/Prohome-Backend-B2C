import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);

  constructor(private readonly config: ConfigService) {}

  private get token(): string | undefined {
    return this.config.get<string>('TELEGRAM_BOT_TOKEN');
  }

  private get chatId(): string | undefined {
    return this.config.get<string>('TELEGRAM_GROUP_ID');
  }

  isConfigured(): boolean {
    return Boolean(this.token && this.chatId);
  }

  async sendMessage(text: string, replyToMessageId?: number): Promise<number | null> {
    if (!this.isConfigured()) {
      this.logger.warn('Telegram bot sozlanmagan, xabar yuborilmadi');
      return null;
    }

    try {
      const { data } = await axios.post(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        {
          chat_id: this.chatId,
          text,
          reply_to_message_id: replyToMessageId,
        },
      );

      return data?.result?.message_id ?? null;
    } catch (error) {
      this.logger.error('Telegramga xabar yuborilmadi', error);
      return null;
    }
  }
}
