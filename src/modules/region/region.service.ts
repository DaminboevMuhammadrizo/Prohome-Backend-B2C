import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

@Injectable()
export class RegionService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureParent(parentId?: number) {
    if (!parentId) {
      return;
    }

    const parent = await this.prisma.region.findUnique({ where: { id: parentId } });

    if (!parent) {
      throw new NotFoundException('Parent region topilmadi');
    }
  }

  async getAll() {
    return this.prisma.region.findMany({
      include: { children: true, parent: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(id: number) {
    const region = await this.prisma.region.findUnique({
      where: { id },
      include: { children: true, parent: true },
    });

    if (!region) {
      throw new NotFoundException('Region topilmadi');
    }

    return region;
  }

  async create(dto: CreateRegionDto) {
    await this.ensureParent(dto.parentId);
    return this.prisma.region.create({ data: dto });
  }

  async update(id: number, dto: UpdateRegionDto) {
    await this.getOne(id);
    await this.ensureParent(dto.parentId);
    return this.prisma.region.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: number) {
    await this.getOne(id);
    return this.prisma.region.delete({ where: { id } });
  }
}
