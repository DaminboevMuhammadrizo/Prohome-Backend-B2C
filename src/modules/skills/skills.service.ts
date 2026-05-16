import { PrismaService } from 'src/common/database/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { SkillStatus } from '@prisma/client';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(typeId?: number, status?: SkillStatus) {
    return this.prisma.skills.findMany({
      where: {
        ...(typeId ? { typeId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { name: 'asc' },
      include: { type: { select: { id: true, name: true } } },
    });
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
    return this.prisma.skills.create({ data, include: { type: true } });
  }

  async update(id: number, data: { name?: string; typeId?: number; status?: SkillStatus }) {
    await this.getById(id);
    return this.prisma.skills.update({ where: { id }, data, include: { type: true } });
  }

  async delete(id: number) {
    await this.getById(id);
    await this.prisma.skills.delete({ where: { id } });
    return { message: 'Skill o\'chirildi' };
  }
}
