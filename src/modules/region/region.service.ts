import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { QueryRegionDto } from './dto/query-region.dto';
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

  async getAll(query: QueryRegionDto) {
    const { parentId, search } = query;

    return this.prisma.region.findMany({
      where: {
        parentId: parentId !== undefined ? parentId : null,
        ...(search && {
          nameUz: { contains: search, mode: 'insensitive' },
        }),
      },
      orderBy: { nameUz: 'asc' },
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
