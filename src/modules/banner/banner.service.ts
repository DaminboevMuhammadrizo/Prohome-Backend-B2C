import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from 'src/common/database/prisma.service';
import {
  getPathInFileType,
  urlGenerator,
} from 'src/common/types/generator.types';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerStatusDto } from './dto/update-banner-status.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class BannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private async deleteOldImage(imageUrl?: string): Promise<void> {
    if (!imageUrl) {
      return;
    }

    try {
      const filename = imageUrl.split('/').pop();
      if (!filename) {
        return;
      }

      const folder = getPathInFileType(filename);
      await unlink(join(folder, filename));
    } catch {
      return;
    }
  }

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

  async create(dto: CreateBannerDto, filename: string) {
    return this.prisma.banner.create({
      data: {
        ...dto,
        image: urlGenerator(this.config, filename),
      },
    });
  }

  async update(id: number, dto: UpdateBannerDto, filename?: string) {
    const banner = await this.getOne(id);
    const image = filename ? urlGenerator(this.config, filename) : undefined;

    if (filename) {
      await this.deleteOldImage(banner.image);
    }

    return this.prisma.banner.update({
      where: { id },
      data: {
        ...dto,
        image,
      },
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
    const banner = await this.getOne(id);
    await this.deleteOldImage(banner.image);
    return this.prisma.banner.delete({ where: { id } });
  }
}
