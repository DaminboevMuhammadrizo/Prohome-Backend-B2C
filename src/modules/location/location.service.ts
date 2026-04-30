import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
import { PrismaService } from 'src/common/database/prisma.service';
import { LocationType } from '@prisma/client';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(type?: LocationType, parentId?: number, search?: string) {
    const where: any = {};
    if (type) where.type = type;
    if (parentId !== undefined) where.parentId = parentId === 0 ? null : parentId;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    return this.prisma.location.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { children: true } },
      },
    });
  }

  async getTree() {
    const countries = await this.prisma.location.findMany({
      where: { type: LocationType.COUNTRY },
      orderBy: { name: 'asc' },
      include: {
        children: {
          orderBy: { name: 'asc' },
          include: {
            children: {
              orderBy: { name: 'asc' },
            },
          },
        },
      },
    });
    return countries;
  }

  async getById(id: number) {
    const loc = await this.prisma.location.findUnique({
      where: { id },
      include: {
        parent: true,
        children: { orderBy: { name: 'asc' } },
        _count: { select: { children: true, users: true, realEstates: true, jobs: true } },
      },
    });
    if (!loc) throw new NotFoundException('Joylashuv topilmadi');
    return loc;
  }

  async create(dto: CreateLocationDto) {
    if (dto.parentId) {
      const parent = await this.prisma.location.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Ota-joylashuv topilmadi');

      const typeOrder = { COUNTRY: 0, REGION: 1, CITY: 2 };
      if (typeOrder[dto.type] <= typeOrder[parent.type]) {
        throw new BadRequestException('Joylashuv turi noto\'g\'ri');
      }
    } else if (dto.type !== LocationType.COUNTRY) {
      throw new BadRequestException('Ota-joylashuvsiz faqat COUNTRY yaratish mumkin');
    }

    return this.prisma.location.create({
      data: dto,
      include: { parent: true },
    });
  }

  async update(id: number, dto: UpdateLocationDto) {
    await this.getById(id);
    return this.prisma.location.update({
      where: { id },
      data: dto,
      include: { parent: true },
    });
  }

  async delete(id: number) {
    await this.getById(id);
    await this.prisma.location.delete({ where: { id } });
    return { message: 'Joylashuv o\'chirildi' };
  }
}
