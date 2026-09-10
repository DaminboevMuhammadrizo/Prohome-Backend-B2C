import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus } from '@prisma/client';
import { PrismaService } from 'src/common/database/prisma.service';
import { RedisService } from 'src/common/config/redis/redis.service';
import { CreateReelDto, UpdateReelDto } from './dto/reels.dto';

@Injectable()
export class ReelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private invalidate() {
    return this.redis.delByPattern('reels:*').catch(() => null);
  }

  private readonly include = {
    master: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
    job: { select: { id: true, title: true } },
    company: { select: { id: true, name: true, logo: true, isActive: true } },
  };

  async getAll(params: {
    page?: number;
    limit?: number;
    id?: number;
    search?: string;
    status?: ContentStatus;
    masterId?: number;
    jobId?: number;
    companyId?: number;
    createdFrom?: string;
    createdTo?: string;
  }) {
    const { page = 1, limit = 10, id, search, status, masterId, jobId, companyId, createdFrom, createdTo } = params;
    const skip = (page - 1) * limit;

    const where: any = { status: status ?? ContentStatus.PUBLISHED };
    if (id !== undefined) where.id = id;
    // Public ko'rinish (admin `status` bermagan) — bloklangan (isActive=false)
    // kompaniyaning reels'lari hech kimga ko'rinmasin.
    if (status === undefined) {
      where.AND = [{ OR: [{ companyId: null }, { company: { isActive: true } }] }];
    }
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
    if (masterId !== undefined) where.masterId = masterId;
    if (jobId !== undefined) where.jobId = jobId;
    if (companyId !== undefined) where.companyId = companyId;
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) where.createdAt.gte = new Date(createdFrom);
      if (createdTo) where.createdAt.lte = new Date(createdTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.reel.findMany({
        where, skip, take: limit,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        include: this.include,
      }),
      this.prisma.reel.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: number) {
    const reel = await this.prisma.reel.findUnique({ where: { id }, include: this.include });
    if (!reel) throw new NotFoundException('Reel topilmadi');
    if (reel.company && !reel.company.isActive) throw new NotFoundException('Reel topilmadi');
    await this.prisma.reel.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return reel;
  }

  // Admin mutatsiyalari (update/delete) uchun — kompaniya bloklangan bo'lsa ham
  // yozuv "mavjud" sanaladi (getById public bo'lgani uchun uni yashiradi).
  private async ensureExists(id: number) {
    const r = await this.prisma.reel.findUnique({ where: { id }, select: { id: true } });
    if (!r) throw new NotFoundException('Reel topilmadi');
  }

  private async checkCompanyWeeklyLimit(companyId: number) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { reelsWeeklyLimit: true } });
    const limit = company?.reelsWeeklyLimit ?? 2;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const count = await this.prisma.reel.count({ where: { companyId, createdAt: { gte: weekAgo } } });
    if (count >= limit) throw new BadRequestException(`Kompaniya haftada ${limit} tadan ko'p reel qo'ya olmaydi`);
  }

  async create(dto: CreateReelDto & { videoUrl: string }) {
    if (dto.companyId) await this.checkCompanyWeeklyLimit(dto.companyId);
    const created = await this.prisma.reel.create({ data: dto, include: this.include });
    await this.invalidate();
    return created;
  }

  async update(id: number, dto: UpdateReelDto) {
    await this.ensureExists(id);
    const updated = await this.prisma.reel.update({ where: { id }, data: dto, include: this.include });
    await this.invalidate();
    return updated;
  }

  async delete(id: number) {
    await this.ensureExists(id);
    await this.prisma.reel.delete({ where: { id } });
    await this.invalidate();
    return { message: 'Reel o\'chirildi' };
  }
}
