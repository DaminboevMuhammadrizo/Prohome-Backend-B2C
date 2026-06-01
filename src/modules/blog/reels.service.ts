import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus } from '@prisma/client';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateReelDto, UpdateReelDto } from './dto/reels.dto';

@Injectable()
export class ReelsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    master: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
    job: { select: { id: true, title: true } },
  };

  async getAll(params: {
    page?: number;
    limit?: number;
    status?: ContentStatus;
    masterId?: number;
    jobId?: number;
  }) {
    const { page = 1, limit = 10, status, masterId, jobId } = params;
    const skip = (page - 1) * limit;

    const where: any = { status: status ?? ContentStatus.PUBLISHED };
    if (masterId !== undefined) where.masterId = masterId;
    if (jobId !== undefined) where.jobId = jobId;

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
    await this.prisma.reel.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return reel;
  }

  async create(dto: CreateReelDto) {
    return this.prisma.reel.create({ data: dto, include: this.include });
  }

  async update(id: number, dto: UpdateReelDto) {
    await this.getById(id);
    return this.prisma.reel.update({ where: { id }, data: dto, include: this.include });
  }

  async delete(id: number) {
    await this.getById(id);
    await this.prisma.reel.delete({ where: { id } });
    return { message: 'Reel o\'chirildi' };
  }
}
