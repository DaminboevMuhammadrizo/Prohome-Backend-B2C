import { Injectable, NotFoundException } from '@nestjs/common';
import { BannerLocation, MediaType } from '@prisma/client';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from 'src/common/database/prisma.service';

export class CreateBannerDto {
  title?: string;
  link?: string;
  isActive?: boolean;
  location?: BannerLocation;
  order?: number;
}

@Injectable()
export class BannerService {
  constructor(private readonly prisma: PrismaService) {}

  private async deleteFile(url?: string) {
    if (!url) return;
    try {
      const filename = url.split('/').pop();
      const folder = url.startsWith('video') ? 'videos' : 'images';
      await unlink(join(process.cwd(), 'core', 'uploads', folder, filename!));
    } catch {}
  }

  async getAll() {
    return this.prisma.banner.findMany({ where: { isActive: true }, orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  }

  async getAdminAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.banner.findMany({ skip, take: limit, orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] }),
      this.prisma.banner.count(),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: number) {
    const b = await this.prisma.banner.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Banner topilmadi');
    return b;
  }

  async create(dto: CreateBannerDto, filename: string, mediaType: MediaType) {
    const mediaUrl = `${mediaType === MediaType.IMAGE ? 'image' : 'video'}/${filename}`;
    return this.prisma.banner.create({
      data: {
        ...dto,
        mediaUrl,
        mediaType,
        isActive: dto.isActive ?? true,
        location: dto.location ?? BannerLocation.OTHER,
        order: dto.order ?? 0,
      },
    });
  }

  async update(id: number, dto: CreateBannerDto, filename?: string, mediaType?: MediaType) {
    const banner = await this.getById(id);
    let mediaUrl: string | undefined;

    if (filename && mediaType) {
      await this.deleteFile(banner.mediaUrl);
      mediaUrl = `${mediaType === MediaType.IMAGE ? 'image' : 'video'}/${filename}`;
    }

    return this.prisma.banner.update({
      where: { id },
      data: { ...dto, ...(mediaUrl ? { mediaUrl, mediaType } : {}) },
    });
  }

  async updateStatus(id: number, isActive: boolean) {
    await this.getById(id);
    return this.prisma.banner.update({ where: { id }, data: { isActive } });
  }

  async delete(id: number) {
    const banner = await this.getById(id);
    await this.deleteFile(banner.mediaUrl);
    await this.prisma.banner.delete({ where: { id } });
    return { message: 'Banner o\'chirildi' };
  }
}
