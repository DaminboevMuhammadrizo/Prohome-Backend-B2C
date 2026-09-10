import { PrismaService } from 'src/common/database/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { SkillStatus } from '@prisma/client';
import { RedisService } from 'src/common/config/redis/redis.service';

@Injectable()
export class SkillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private invalidate() {
    return Promise.all([
      this.redis.delByPattern('skill:*'),
      this.redis.delByPattern('skilltype:*'),
    ]).catch(() => null);
  }

  async getAll(params: { page?: number; limit?: number; id?: number; search?: string; typeId?: number; status?: SkillStatus } = {}) {
    const { page = 1, limit = 50, id, search, typeId, status } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (id !== undefined) where.id = id;
    if (typeId) where.typeId = typeId;
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.skills.findMany({
        where, skip, take: limit,
        orderBy: { name: 'asc' },
        include: { type: { select: { id: true, name: true } } },
      }),
      this.prisma.skills.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: number) {
    const skill = await this.prisma.skills.findUnique({
      where: { id },
      include: { type: true },
    });
    if (!skill) throw new NotFoundException('Skill topilmadi');
    return skill;
  }

  async create(data: { name: string; typeId: number; status?: SkillStatus }) {
    const type = await this.prisma.skillType.findUnique({ where: { id: data.typeId } });
    if (!type) throw new NotFoundException('Skill turi topilmadi');
    const created = await this.prisma.skills.create({ data, include: { type: true } });
    await this.invalidate();
    return created;
  }

  async update(id: number, data: { name?: string; typeId?: number; status?: SkillStatus }) {
    await this.getById(id);
    const updated = await this.prisma.skills.update({ where: { id }, data, include: { type: true } });
    await this.invalidate();
    return updated;
  }

  async delete(id: number) {
    await this.getById(id);
    await this.prisma.skills.delete({ where: { id } });
    await this.invalidate();
    return { message: 'Skill o\'chirildi' };
  }
}
