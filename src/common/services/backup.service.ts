import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { TelegramBotService } from './telegram-bot.service';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramBot: TelegramBotService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async sendPeriodicBackup() {
    const lastBackup = await this.prisma.backupLog.findFirst({
      where: { kind: 'FULL_EXPORT' },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;

    if (lastBackup && now - lastBackup.createdAt.getTime() < fiveDaysMs) {
      return;
    }

    const [users, companies, complexes, apartments, masters, leads] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.company.count(),
        this.prisma.complex.count(),
        this.prisma.apartment.count(),
        this.prisma.masterProfile.count(),
        this.prisma.lead.count(),
      ]);

    const text = [
      '5 kunlik backup snapshot',
      `Vaqt: ${new Date().toISOString()}`,
      `Users: ${users}`,
      `Companies: ${companies}`,
      `Complexes: ${complexes}`,
      `Apartments: ${apartments}`,
      `Masters: ${masters}`,
      `Leads: ${leads}`,
    ].join('\n');

    const telegramMessageId = await this.telegramBot.sendMessage(text);

    await this.prisma.backupLog.create({
      data: {
        kind: 'FULL_EXPORT',
        telegramMessageId,
      },
    });

    this.logger.log('Periodic backup summary yuborildi');
  }
}
