import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { RedisService } from 'src/common/config/redis/redis.service';

@Injectable()
export class RatingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // Reyting o'zgarsa ustaning o'rtacha bahosi ham o'zgaradi — master cache'i eskiradi
  private invalidateMasterCache() {
    return this.redis.delByPattern('master:*').catch(() => null);
  }

  async getAll(params: {
    page?: number; limit?: number; id?: number; userId?: number; masterId?: number;
    rating?: number; minRating?: number; maxRating?: number; search?: string; createdFrom?: string; createdTo?: string;
  } = {}) {
    const { page = 1, limit = 20, id, userId, masterId, rating, minRating, maxRating, search, createdFrom, createdTo } = params;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (id !== undefined) where.id = id;
    if (userId !== undefined) where.userId = userId;
    if (masterId !== undefined) where.masterId = masterId;
    if (rating !== undefined) where.rating = rating;
    else if (minRating !== undefined || maxRating !== undefined) {
      where.rating = {};
      if (minRating !== undefined) where.rating.gte = minRating;
      if (maxRating !== undefined) where.rating.lte = maxRating;
    }
    if (search) where.comment = { contains: search, mode: 'insensitive' };
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) where.createdAt.gte = new Date(createdFrom);
      if (createdTo) where.createdAt.lte = new Date(createdTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.rating.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true } }, master: { select: { id: true, user: { select: { firstName: true, lastName: true } } } } } }),
      this.prisma.rating.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getByMaster(masterId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where = { masterId };
    const [data, total] = await Promise.all([
      this.prisma.rating.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true } } } }),
      this.prisma.rating.count({ where }),
    ]);
    const avg = data.length ? data.reduce((sum, r) => sum + r.rating, 0) / data.length : 0;
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, averageRating: Math.round(avg * 10) / 10 };
  }

  async getMyRatings(userId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where = { userId };
    const [data, total] = await Promise.all([
      this.prisma.rating.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { master: { select: { id: true, user: { select: { firstName: true, lastName: true } } } } } }),
      this.prisma.rating.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async create(userId: number, dto: { masterId: number; rating: number; comment?: string }) {
    if (dto.rating < 1 || dto.rating > 5) throw new BadRequestException('Reyting 1-5 oralig\'ida bo\'lishi kerak');

    const master = await this.prisma.master.findUnique({ where: { id: dto.masterId } });
    if (!master) throw new NotFoundException('Usta topilmadi');

    const existing = await this.prisma.rating.findUnique({ where: { userId_masterId: { userId, masterId: dto.masterId } } });
    if (existing) throw new BadRequestException('Siz bu ustaga allaqachon baho bergansiz');

    const created = await this.prisma.rating.create({
      data: { userId, masterId: dto.masterId, rating: dto.rating, comment: dto.comment },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    // Usta like count yangilash
    const avg = await this.prisma.rating.aggregate({ where: { masterId: dto.masterId }, _avg: { rating: true } });

    await this.invalidateMasterCache();
    return { ...created, masterAvgRating: avg._avg.rating };
  }

  async update(id: number, userId: number, dto: { rating?: number; comment?: string }) {
    const existing = await this.prisma.rating.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Reyting topilmadi');
    if (existing.userId !== userId) throw new ForbiddenException('Ruxsat yo\'q');
    if (dto.rating && (dto.rating < 1 || dto.rating > 5)) throw new BadRequestException('Reyting 1-5 oralig\'ida bo\'lishi kerak');

    const updated = await this.prisma.rating.update({ where: { id }, data: dto,
      include: { user: { select: { id: true, firstName: true, lastName: true } } } });
    await this.invalidateMasterCache();
    return updated;
  }

  async delete(id: number, userId: number, isAdmin: boolean) {
    const existing = await this.prisma.rating.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Reyting topilmadi');
    if (!isAdmin && existing.userId !== userId) throw new ForbiddenException('Ruxsat yo\'q');

    await this.prisma.rating.delete({ where: { id } });
    await this.invalidateMasterCache();
    return { message: 'Reyting o\'chirildi' };
  }
}
