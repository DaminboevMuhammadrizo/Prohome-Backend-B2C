import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerStatusDto } from './dto/update-banner-status.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class BannerService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminList() {
    return this.prisma.banner.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(id: number) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });

    if (!banner) {
      throw new NotFoundException('Banner topilmadi');
    }

    return banner;
  }

  async create(dto: CreateBannerDto) {
    return this.prisma.banner.create({ data: dto });
  }

  async update(id: number, dto: UpdateBannerDto) {
    await this.getOne(id);
    return this.prisma.banner.update({
      where: { id },
      data: dto,
    });
  }

  async updateStatus(id: number, dto: UpdateBannerStatusDto) {
    await this.getOne(id);
    return this.prisma.banner.update({
      where: { id },
      data: { isActive: dto.isActive },
    });
  }

  async delete(id: number) {
    await this.getOne(id);
    return this.prisma.banner.delete({ where: { id } });
  }
}
