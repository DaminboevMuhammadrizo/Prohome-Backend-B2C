import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import axios from 'axios';
import { spawn } from 'child_process';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import { stat, unlink } from 'fs/promises';
import FormData from 'form-data';
import { join } from 'path';
import { createGzip } from 'zlib';
import { PrismaService } from 'src/common/database/prisma.service';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

// Har 3 kunda butun bazani (pg_dump) siqib, Telegram guruhga hujjat sifatida
// yuboradi. Guruhda ortiqcha eski nusxalar to'planib qolmasligi uchun, yangisini
// yuborishdan oldin avvalgi yuborilgan xabarni o'chiradi — guruhda doim FAQAT
// eng oxirgi backup turadi.
//
// .env: BACKUP_BOT_TOKEN (bo'lmasa mavjud BOT_TOKEN — auth botidan — ishlatiladi,
// ya'ni bitta botni ikkalasi uchun ham ishlatish mumkin) + GROUP_ID (backup
// yuboriladigan guruh/kanal ID'si, botni o'sha guruhga admin qilib qo'shish kerak).
@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private getToken(): string | undefined {
    return this.config.get<string>('BACKUP_BOT_TOKEN') || this.config.get<string>('BOT_TOKEN');
  }

  private getGroupId(): string | undefined {
    return this.config.get<string>('GROUP_ID') || this.config.get<string>('BACKUP_GROUP_ID');
  }

  isEnabled(): boolean {
    return !!this.getToken() && !!this.getGroupId();
  }

  onModuleInit() {
    if (!this.isEnabled()) {
      this.logger.warn(
        "BACKUP_BOT_TOKEN (yoki BOT_TOKEN) / GROUP_ID topilmadi — avtomatik baza zaxirasi o'chirilgan.",
      );
      return;
    }
    this.logger.log("Baza zaxirasi (backup) yoqilgan — har 3 kunda avtomatik yuboriladi ✅");
  }

  // Ilova ishga tushgandan 3 kun o'tgach, keyin har 3 kunda bir marta
  @Interval(THREE_DAYS_MS)
  async scheduledBackup() {
    if (!this.isEnabled()) return;
    await this.runBackup().catch((e) => this.logger.error('Rejalashtirilgan backup xatosi', e as Error));
  }

  // Admin qo'lda ham chaqira oladi (POST /backup/run)
  async runBackup(): Promise<{ message: string; sizeKb: number }> {
    if (!this.isEnabled()) throw new BadRequestException('Backup sozlanmagan (BACKUP_BOT_TOKEN/BOT_TOKEN yoki GROUP_ID yo\'q)');

    const token = this.getToken()!;
    const groupId = this.getGroupId()!;

    const dumpPath = await this.createDump();
    try {
      const { size } = await stat(dumpPath);

      // Avvalgi backup xabarini o'chiramiz — guruhda faqat oxirgisi qolsin
      const state = await this.prisma.backupState.findUnique({ where: { id: 1 } });
      if (state?.lastMessageId) {
        await this.deleteMessage(token, groupId, state.lastMessageId).catch((e) =>
          this.logger.warn(`Eski backup xabarini o'chirib bo'lmadi: ${(e as Error).message}`),
        );
      }

      const messageId = await this.sendDocument(token, groupId, dumpPath);

      await this.prisma.backupState.upsert({
        where: { id: 1 },
        update: { lastMessageId: messageId, lastBackupAt: new Date() },
        create: { id: 1, lastMessageId: messageId, lastBackupAt: new Date() },
      });

      this.logger.log(`Backup yuborildi ✅ (${(size / 1024).toFixed(0)} KB)`);
      return { message: 'Backup yuborildi', sizeKb: Math.round(size / 1024) };
    } finally {
      await unlink(dumpPath).catch(() => null);
    }
  }

  // Prisma DATABASE_URL'ida bo'ladigan "?schema=public" kabi Prisma'ga xos
  // parametr `pg_dump`ga (libpq) notanish — "invalid URI query parameter" xatosi
  // beradi. pg_dump baribir butun bazani (barcha sxemalar bilan) zaxiralaydi,
  // shuning uchun bu parametrni shunchaki olib tashlaymiz.
  private sanitizeForPgDump(rawUrl: string): string {
    try {
      const url = new URL(rawUrl);
      url.searchParams.delete('schema');
      return url.toString();
    } catch {
      return rawUrl;
    }
  }

  // `pg_dump`ni bola-jarayon sifatida ishga tushirib, chiqishini to'g'ridan-to'g'ri
  // gzip orqali faylga oqizadi (DATABASE_URL shell orqali emas, argument sifatida
  // uzatiladi — shell-injection xavfi yo'q).
  private createDump(): Promise<string> {
    const rawUrl = this.config.get<string>('DATABASE_URL');
    if (!rawUrl) return Promise.reject(new Error('DATABASE_URL topilmadi'));
    const dbUrl = this.sanitizeForPgDump(rawUrl);

    const dir = join(process.cwd(), 'core', 'tmp');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const filepath = join(dir, `backup-${Date.now()}.sql.gz`);

    return new Promise((resolve, reject) => {
      const dump = spawn('pg_dump', [dbUrl]);
      const gzip = createGzip();
      const out = createWriteStream(filepath);
      let stderr = '';

      dump.stderr.on('data', (d) => (stderr += d.toString()));
      dump.on('error', (e) => reject(new Error(`pg_dump ishga tushmadi (o'rnatilganmi?): ${e.message}`)));

      dump.stdout.pipe(gzip).pipe(out);

      dump.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`pg_dump xato bilan tugadi (${code}): ${stderr}`));
        }
      });
      out.on('finish', () => resolve(filepath));
      out.on('error', reject);
    });
  }

  private async sendDocument(token: string, chatId: string, filepath: string): Promise<number> {
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', `📦 Baza zaxira nusxasi — ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`);
    form.append('document', createReadStream(filepath));

    const { data } = await axios.post(`https://api.telegram.org/bot${token}/sendDocument`, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    if (!data.ok) throw new Error(`Telegram xatosi: ${JSON.stringify(data)}`);
    return data.result.message_id;
  }

  private async deleteMessage(token: string, chatId: string, messageId: number) {
    const { data } = await axios.post(`https://api.telegram.org/bot${token}/deleteMessage`, {
      chat_id: chatId,
      message_id: messageId,
    });
    if (!data.ok) throw new Error(`Telegram xatosi: ${JSON.stringify(data)}`);
  }
}
