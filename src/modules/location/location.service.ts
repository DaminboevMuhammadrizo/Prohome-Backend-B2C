import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
import { PrismaService } from 'src/common/database/prisma.service';
import { LocationType } from '@prisma/client';
import { RedisService } from 'src/common/config/redis/redis.service';

@Injectable()
export class LocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private invalidate() {
    return this.redis.delByPattern('loc:*').catch(() => null);
  }

  async getAll(params: { page?: number; limit?: number; id?: number; type?: LocationType; parentId?: number; search?: string } = {}) {
    const { page = 1, limit = 200, id, type, parentId, search } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (id !== undefined) where.id = id;
    if (type) where.type = type;
    if (parentId !== undefined) where.parentId = parentId === 0 ? null : parentId;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.location.findMany({
        where, skip, take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { children: true } } },
      }),
      this.prisma.location.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
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

    const created = await this.prisma.location.create({
      data: dto,
      include: { parent: true },
    });
    await this.invalidate();
    return created;
  }

  async update(id: number, dto: UpdateLocationDto) {
    await this.getById(id);
    const updated = await this.prisma.location.update({
      where: { id },
      data: dto,
      include: { parent: true },
    });
    await this.invalidate();
    return updated;
  }

  async delete(id: number) {
    await this.getById(id);
    await this.prisma.location.delete({ where: { id } });
    await this.invalidate();
    return { message: 'Joylashuv o\'chirildi' };
  }
}
