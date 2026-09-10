import { PrismaService } from 'src/common/database/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { SkillStatus } from '@prisma/client';
import { RedisService } from 'src/common/config/redis/redis.service';

export class CreateSkillTypeDto {
  name!: string;
}

@Injectable()
export class SkillTypeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private invalidate() {
    return Promise.all([
      this.redis.delByPattern('skilltype:*'),
      this.redis.delByPattern('skill:*'),
    ]).catch(() => null);
  }

  async getAll(params: { page?: number; limit?: number; id?: number; search?: string; status?: SkillStatus } = {}) {
    const { page = 1, limit = 50, id, search, status } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (id !== undefined) where.id = id;
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.skillType.findMany({
        where, skip, take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { skills: true, jobs: true } } },
      }),
      this.prisma.skillType.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: number) {
    const st = await this.prisma.skillType.findUnique({
      where: { id },
      include: { skills: { where: { status: SkillStatus.ACTIVE }, orderBy: { name: 'asc' } } },
    });
    if (!st) throw new NotFoundException('Skill turi topilmadi');
    return st;
  }

  async create(dto: CreateSkillTypeDto) {
    const created = await this.prisma.skillType.create({ data: { name: dto.name } });
    await this.invalidate();
    return created;
  }

  async update(id: number, dto: Partial<CreateSkillTypeDto> & { status?: SkillStatus }) {
    await this.getById(id);
    const updated = await this.prisma.skillType.update({ where: { id }, data: dto });
    await this.invalidate();
    return updated;
  }

  async delete(id: number) {
    await this.getById(id);
    await this.prisma.skillType.delete({ where: { id } });
    await this.invalidate();
    return { message: 'Skill turi o\'chirildi' };
  }
}
