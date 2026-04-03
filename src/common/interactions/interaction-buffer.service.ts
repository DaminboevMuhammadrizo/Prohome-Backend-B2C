import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type ApartmentLikeEvent = {
  userId: number;
  apartmentId: number;
};

type MasterSaveEvent = {
  userId: number;
  masterProfileId: number;
};

type MasterViewEvent = {
  userId: number | null;
  masterProfileId: number;
  createdAt: Date;
};

@Injectable()
export class InteractionBufferService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InteractionBufferService.name);
  private readonly batchSize = 10;
  private flushTimer: NodeJS.Timeout | null = null;

  private pendingApartmentLikeKeys = new Set<string>();
  private pendingApartmentLikes: ApartmentLikeEvent[] = [];

  private pendingMasterSaveKeys = new Set<string>();
  private pendingMasterSaves: MasterSaveEvent[] = [];

  private pendingMasterViews: MasterViewEvent[] = [];

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.flushTimer = setInterval(() => {
      void this.flushAll();
    }, 5000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flushAll();
  }

  private apartmentLikeKey(userId: number, apartmentId: number): string {
    return `${userId}:${apartmentId}`;
  }

  private masterSaveKey(userId: number, masterProfileId: number): string {
    return `${userId}:${masterProfileId}`;
  }

  getPendingApartmentLikeCount(apartmentId: number): number {
    return this.pendingApartmentLikes.filter(
      (event) => event.apartmentId === apartmentId,
    ).length;
  }

  getPendingMasterSaveCount(masterProfileId: number): number {
    return this.pendingMasterSaves.filter(
      (event) => event.masterProfileId === masterProfileId,
    ).length;
  }

  getPendingMasterViewCount(masterProfileId: number): number {
    return this.pendingMasterViews.filter(
      (event) => event.masterProfileId === masterProfileId,
    ).length;
  }

  getPendingApartmentLikeIdsForUser(userId: number): number[] {
    return this.pendingApartmentLikes
      .filter((event) => event.userId === userId)
      .map((event) => event.apartmentId);
  }

  getPendingMasterSaveIdsForUser(userId: number): number[] {
    return this.pendingMasterSaves
      .filter((event) => event.userId === userId)
      .map((event) => event.masterProfileId);
  }

  hasPendingApartmentLike(userId: number, apartmentId: number): boolean {
    return this.pendingApartmentLikeKeys.has(this.apartmentLikeKey(userId, apartmentId));
  }

  hasPendingMasterSave(userId: number, masterProfileId: number): boolean {
    return this.pendingMasterSaveKeys.has(this.masterSaveKey(userId, masterProfileId));
  }

  async toggleApartmentLike(
    userId: number,
    apartmentId: number,
  ): Promise<{ liked: boolean }> {
    const key = this.apartmentLikeKey(userId, apartmentId);

    if (this.pendingApartmentLikeKeys.has(key)) {
      this.pendingApartmentLikeKeys.delete(key);
      this.pendingApartmentLikes = this.pendingApartmentLikes.filter(
        (event) => this.apartmentLikeKey(event.userId, event.apartmentId) !== key,
      );
      return { liked: false };
    }

    const existingLike = await this.prisma.apartmentLike.findUnique({
      where: {
        userId_apartmentId: {
          userId,
          apartmentId,
        },
      },
    });

    if (existingLike) {
      await this.prisma.$transaction([
        this.prisma.apartmentLike.delete({
          where: { id: existingLike.id },
        }),
        this.prisma.apartment.update({
          where: { id: apartmentId },
          data: {
            likeCount: {
              decrement: 1,
            },
          },
        }),
      ]);
      return { liked: false };
    }

    this.pendingApartmentLikeKeys.add(key);
    this.pendingApartmentLikes.push({ userId, apartmentId });

    if (this.pendingApartmentLikes.length >= this.batchSize) {
      await this.flushApartmentLikes();
    }

    return { liked: true };
  }

  async toggleMasterSave(
    userId: number,
    masterProfileId: number,
  ): Promise<{ saved: boolean }> {
    const key = this.masterSaveKey(userId, masterProfileId);

    if (this.pendingMasterSaveKeys.has(key)) {
      this.pendingMasterSaveKeys.delete(key);
      this.pendingMasterSaves = this.pendingMasterSaves.filter(
        (event) => this.masterSaveKey(event.userId, event.masterProfileId) !== key,
      );
      return { saved: false };
    }

    const existingSave = await this.prisma.masterProfileSave.findUnique({
      where: {
        userId_masterProfileId: {
          userId,
          masterProfileId,
        },
      },
    });

    if (existingSave) {
      await this.prisma.$transaction([
        this.prisma.masterProfileSave.delete({
          where: { id: existingSave.id },
        }),
        this.prisma.masterProfile.update({
          where: { id: masterProfileId },
          data: {
            savedCount: {
              decrement: 1,
            },
          },
        }),
      ]);
      return { saved: false };
    }

    this.pendingMasterSaveKeys.add(key);
    this.pendingMasterSaves.push({ userId, masterProfileId });

    if (this.pendingMasterSaves.length >= this.batchSize) {
      await this.flushMasterSaves();
    }

    return { saved: true };
  }

  async addMasterView(userId: number | null, masterProfileId: number): Promise<void> {
    this.pendingMasterViews.push({
      userId,
      masterProfileId,
      createdAt: new Date(),
    });

    if (this.pendingMasterViews.length >= this.batchSize) {
      await this.flushMasterViews();
    }
  }

  private async flushApartmentLikes(): Promise<void> {
    if (!this.pendingApartmentLikes.length) {
      return;
    }

    const batch = [...this.pendingApartmentLikes];
    this.pendingApartmentLikes = [];
    this.pendingApartmentLikeKeys.clear();

    const counters = new Map<number, number>();
    for (const event of batch) {
      counters.set(
        event.apartmentId,
        (counters.get(event.apartmentId) ?? 0) + 1,
      );
    }

    await this.prisma.apartmentLike.createMany({
      data: batch,
      skipDuplicates: true,
    });

    for (const [apartmentId, count] of counters.entries()) {
      await this.prisma.apartment.update({
        where: { id: apartmentId },
        data: {
          likeCount: {
            increment: count,
          },
        },
      });
    }
  }

  private async flushMasterSaves(): Promise<void> {
    if (!this.pendingMasterSaves.length) {
      return;
    }

    const batch = [...this.pendingMasterSaves];
    this.pendingMasterSaves = [];
    this.pendingMasterSaveKeys.clear();

    const counters = new Map<number, number>();
    for (const event of batch) {
      counters.set(
        event.masterProfileId,
        (counters.get(event.masterProfileId) ?? 0) + 1,
      );
    }

    await this.prisma.masterProfileSave.createMany({
      data: batch,
      skipDuplicates: true,
    });

    for (const [masterProfileId, count] of counters.entries()) {
      await this.prisma.masterProfile.update({
        where: { id: masterProfileId },
        data: {
          savedCount: {
            increment: count,
          },
        },
      });
    }
  }

  private async flushMasterViews(): Promise<void> {
    if (!this.pendingMasterViews.length) {
      return;
    }

    const batch = [...this.pendingMasterViews];
    this.pendingMasterViews = [];

    const counters = new Map<number, number>();
    for (const event of batch) {
      counters.set(
        event.masterProfileId,
        (counters.get(event.masterProfileId) ?? 0) + 1,
      );
    }

    await this.prisma.masterProfileView.createMany({
      data: batch,
    });

    for (const [masterProfileId, count] of counters.entries()) {
      await this.prisma.masterProfile.update({
        where: { id: masterProfileId },
        data: {
          viewCount: {
            increment: count,
          },
        },
      });
    }
  }

  async flushAll(): Promise<void> {
    try {
      await this.flushApartmentLikes();
      await this.flushMasterSaves();
      await this.flushMasterViews();
    } catch (error) {
      this.logger.error('Buffered interaction flush failed', error);
    }
  }
}
