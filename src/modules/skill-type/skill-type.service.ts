import { PrismaService } from 'src/common/database/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { SkillStatus } from '@prisma/client';

export class CreateSkillTypeDto {
  name!: string;
}

@Injectable()
export class SkillTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(status?: SkillStatus) {
    return this.prisma.skillType.findMany({
      where: status ? { status } : undefined,
      orderBy: { name: 'asc' },
      include: { _count: { select: { skills: true, jobs: true } } },
    });
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
    return this.prisma.skillType.create({ data: { name: dto.name } });
  }

  async update(id: number, dto: Partial<CreateSkillTypeDto> & { status?: SkillStatus }) {
    await this.getById(id);
    return this.prisma.skillType.update({ where: { id }, data: dto });
  }

  async delete(id: number) {
    await this.getById(id);
    await this.prisma.skillType.delete({ where: { id } });
    return { message: 'Skill turi o\'chirildi' };
  }
}
