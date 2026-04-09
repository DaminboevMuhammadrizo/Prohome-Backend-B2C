import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuthUser } from '../types/auth-user.type';
import { TelegramBotService } from './telegram-bot.service';

type AuditPayload = {
  entityType: string;
  entityId: number;
  action: string;
  actor: AuthUser;
  description?: string;
  payload?: Prisma.InputJsonValue;
  replyToMessageId?: number | null;
};

@Injectable()
export class DataAccessAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramBot: TelegramBotService,
  ) {}

  async logAccess({
    entityType,
    entityId,
    action,
    actor,
    description,
    payload,
    replyToMessageId,
  }: AuditPayload) {
    const text = [
      `Audit: ${action}`,
      `Entity: ${entityType}#${entityId}`,
      `Actor: ${actor.entityType}#${actor.id} (${actor.phone})`,
      description ? `Izoh: ${description}` : undefined,
      `Vaqt: ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    const telegramMessageId = await this.telegramBot.sendMessage(
      text,
      replyToMessageId ?? undefined,
    );

    return this.prisma.dataAccessAudit.create({
      data: {
        entityType,
        entityId,
        action,
        actorType: actor.entityType,
        actorId: actor.id,
        actorLabel: actor.phone,
        description,
        payload,
        telegramMessageId,
      },
    });
  }

  async findLatestAudit(
    entityType: string,
    entityId: number,
    action?: string,
  ) {
    return this.prisma.dataAccessAudit.findFirst({
      where: {
        entityType,
        entityId,
        action,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
